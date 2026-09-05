# EVIDENCE MATRIX

## Skutečný stav mechanismů v existujících projektech

| | |
|---|---|
| **Datum skenu** | 5. 9. 2026 |
| **Metoda** | Read-only průchod kódem na stavu GitHubu (po `git pull --ff-only`). Každá položka má status, odkaz na soubor a řádek a jednu větu o **skutečné** sémantice, ne o zamýšlené. |
| **Účel** | Vstup pro Core Admission Process (`FOUNDATION-core.md §9`). Do sdíleného Core smí jen mechanismus s `EXISTS` a stejnou sémantikou ve dvou nezávislých projektech. |

### Skenované projekty

| Projekt | Commit | Charakter | Nasazeno |
|---|---|---|---|
| `job-watch` | `ad4245f` (2026-09-01) | CF Worker + D1, cron pipeline, AI scoring, notifikace | ano, za CF Access |
| `gmail-mcp` | `c5f87f1` (2026-06-28) | CF Worker, MCP server + OAuth, Durable Objects, KV | ano, multi-user |
| `domlov` | `b3a29e3` (2026-07-20) | CF Worker, Workers AI + RDAP + Brave, bezstavový | ano, veřejné |
| `faxx-hr` | `77e4d83` (2026-08-07) | CF Worker, Workers AI, detekce skrytého textu v CV, stav jen v prohlížeči | ano |
| `faxx-dox` | `d36dae3` (2026-06-21) | **jen návrh** (DESIGN.md, README, HANDOFF), nula kódu | ne |

Statusy: `EXISTS` | `PARTIAL` | `ABSENT` | `DIFFERENT_SEMANTICS` (stejný název, jiný význam) | `DESIGNED` (specifikováno v návrhu bez kódu) | `MENTIONED` (jen pojmenováno).

---

## 1. Matice

### 1.1 Correlation (CORR)

| Projekt | Status | Ref | Skutečná sémantika |
|---|---|---|---|
| job-watch | PARTIAL | `src/pipeline.ts:62-95`, `schema.sql:80-89` | `runs.id` seskupuje log jednoho běhu do blobu; nikdy se nepropaguje do `console.log`, notifikací ani řádků `seen_jobs`. HTTP cesta nemá žádné id. |
| gmail-mcp | ABSENT | `src/` (žádné `console.*`) | Nic se neloguje, takže není co propagovat. `jobId` je klientský handle, ne trace. |
| domlov | ABSENT | `src/index.ts:44-59` | Nula logování, žádné request id směrem k RDAP/Brave/AI. |
| faxx-hr | ABSENT | `worker/src/app.ts:346` | Žádné id, jediný `console.log` je v nenasazeném skeletu. |
| faxx-dox | ABSENT | `DESIGN.md:78,99` | `documents.id` je FK datového modelu, ne trace klíč. |

**Verdikt:** 0× EXISTS. Standardizovat význam (`correlationId` v obálce), není co extrahovat.

### 1.2 Error contract (ERR)

| Projekt | Status | Ref | Skutečná sémantika |
|---|---|---|---|
| job-watch | PARTIAL | `src/anthropic.ts:74-81`, `src/access.ts:30-37`, `src/index.ts:485` | Dva lokální verdict objekty (`AnthropicHealth.reason`, `AccessVerdict`); zbytek `throw new Error(string)` a `{error: String(e)}` 500. Retryability je privátní `Set` HTTP kódů, ne vlastnost objektu. |
| gmail-mcp | ABSENT | `src/gmail.ts:21`, `src/index.ts:60-67` | Každé selhání `throw new Error(...)` se surovým tělem upstream odpovědi; MCP catch-all zploští na `isError:true` + text. |
| domlov | ABSENT | `src/index.ts:55,67,89` | `{error: "<český řetězec>"}` 400/500, frontend renderuje surový string. |
| faxx-hr | PARTIAL | `worker/src/app.ts:404,527,420` | `{error: String(e.message)}`; jediný strojový signál je `/api/health` `{quota, resetAt}`. |
| faxx-dox | DESIGNED (partial) | `DESIGN.md:33,85,128` | Per-field výsledek `ok\|warn\|missing\|mismatch` a „engine nikdy hard-fail"; žádná chybová obálka ani kódy. |

**Verdikt:** 0× EXISTS. Sémantika chyb se liší (jw: důvod probe, fd: kvalita pole). Standardizovat error object z `contracts/result-envelope.v1.schema.json`.

### 1.3 Execution state (STATE)

| Projekt | Status | Ref | Skutečná sémantika |
|---|---|---|---|
| job-watch | PARTIAL | `src/liveness.ts:17-33`, `schema.sql:22-33,68,80-88` | Jediný pravý enum: `Liveness = active\|gone\|unknown` (`unknown` nesmí přepsat `active`). Stav jobu je implicitní v nullable sloupcích (`relevance NULL`, `rescore=1`, `notified_at`), stav běhu odvozený z `finished_at IS NULL` + `ok`. |
| gmail-mcp | PARTIAL | `src/trash-job.ts:37,44,63,72,85` | Holé stringy `running → done \| error` na jedné cestě; `"unknown"` syntetizováno při čtení prázdného DO storage. Částečné selhání je jen čítač, „některé id možná smazány" nelze vyjádřit. |
| domlov | PARTIAL | `src/index.ts:41,110-129,218-225` | Per-doména `free\|taken\|unknown`, RDAP timeout/429/5xx → `unknown` (správně ≠ free), ale skóre `unknown` tiše počítá jako ne-volné. Žádný stav běhu. |
| faxx-hr | DIFFERENT_SEMANTICS | `worker/src/view.ts:17`, `worker/src/rubric.ts:80` | `unknown` existuje **per kritérium** (`strong\|partial\|weak\|unknown`, „not evidenced ≠ 0"), ne per evaluace. Lifecycle enum jen v nepoužité migraci. |
| faxx-dox | DESIGNED | `DESIGN.md:85,33,102` | `received\|classified\|extracted\|reviewed\|error`; chybí stav pro zahozený mail prefiltrem a pro „doručeno do DMS". |

**Verdikt:** Execution state enum: 0× EXISTS. **Explicitní `unknown`, který se nesmí zhroutit na negativní hodnotu: EXISTS ×3** (jw liveness, dl availability, fh criterion). To je datový vzor, ne execution state; patří do provenance kontraktu, ne do balíčku.

### 1.4 Retry (RETRY)

| Projekt | Status | Ref | Skutečná sémantika |
|---|---|---|---|
| job-watch | DIFFERENT_SEMANTICS | `src/anthropic.ts:24-53`, `src/ai.ts:59-74`, `src/pipeline.ts:576-583` | Bounded 4 pokusy + Retry-After/backoff **jen pro Anthropic HTTP**; Workers AI bez retry. Per-item retry neomezený a implicitní: selhání zapíše `null`, řádek zůstane ve frontě navždy. Jiná strategie existuje (provider fallback, `rescore=1`), ale z jiných důvodů. |
| gmail-mcp | ABSENT | `src/trash-job.ts:71-78`, `src/index.ts:176-179` | `Promise.allSettled` spočítá selhání a jde dál; selhané id se zahodí. Selhání refresh tokenu zastaví alarm loop trvale. |
| domlov | PARTIAL | `src/index.ts:113-128,149-168` | Přesně 1 okamžitý retry na 429/5xx pro RDAP a Brave, bez backoffu, **bez timeoutu kdekoli**; Workers AI bez retry. |
| faxx-hr | PARTIAL | `worker/src/extract.ts:69`, `worker/src/app.ts:155`, `worker/src/detect.ts:416` | 1–2 fixní fallbacky bez backoffu: drop `response_format` a znovu; toMarkdown ×2 → LLaVA (**skutečný quality retry jinou strategií**); PDF md → raw. |
| faxx-dox | ABSENT | `DESIGN.md:62,100,122` | Text-layer vs vision je vstupní volba, ne fallback. Žádný technický retry, žádné re-render. |

**Verdikt:** „Retry" znamená v pěti projektech čtyři různé věci. Přesně případ, před kterým varuje oponentura §17. Sdílený helper by sjednotil jen název. Quality retry jinou strategií: fh EXISTS, jw PARTIAL (jiný trigger). Nekvalifikuje.

### 1.5 Idempotence (IDEM)

| Projekt | Status | Ref | Skutečná sémantika |
|---|---|---|---|
| job-watch | EXISTS | `src/store.ts:7-35,88-107,158-167`, `schema.sql:6,77` | PK `seen_jobs.id` s prefixem zdroje + `ON CONFLICT DO UPDATE`; `contentHash` pro změnu, `dedup_key` + `fingerprint` pro cross-source duplicitu, `notified_at` proti opakované notifikaci. **Žádná retence, nic se nemaže.** |
| gmail-mcp | ABSENT | `src/app.ts:208-215`, `src/index.ts:170-183` | Žádný klíč ani constraint; opakovaný POST mintuje nové UUID a spustí celý seznam znovu. Bezpečné jen díky přirozené idempotenci Gmail trash. |
| domlov | PARTIAL | `src/index.ts:151,97-107` | Jen edge cache Brave (3600 s); RDAP se ptá při každém requestu. |
| faxx-hr | PARTIAL | `worker/src/app.ts:1666,1305` | Klientský cache klíč `name\|size\|model\|vision\|hash31(prompt)`, ne obsah. TTL 30 d zamkne read-only, nikdy nemaže. |
| faxx-dox | DESIGNED (partial) | `DESIGN.md:79,95,129` | `sha256` je explicitně jen double-click cache, „NE business identita"; skutečný dedup `UNIQUE(tenant_id, ico, cislo_faktury)` jen pro faktury. Opakované doručení e-mailu neřešeno. |

**Verdikt:** 1× EXISTS. Retence dedup evidence: 0/5 (jw nikdy nemaže by design). `IDM-RET-002` zatím nemá kde běžet.

### 1.6 Durable queue (QUEUE)

| Projekt | Status | Ref | Skutečná sémantika |
|---|---|---|---|
| job-watch | PARTIAL | `src/store.ts:158-200,232-248`, `src/pipeline.ts:462-586`, `wrangler.toml:11-16` | Fronta = D1 predikát (`relevance IS NULL OR rescore=1`), drenáž cronem po 8. **Skutečný backpressure** (`MAX_SCORES_PER_RUN`, wall-clock deadline, `dryBatches` circuit breaker). Bez lease, DLQ, visibility timeoutu. |
| gmail-mcp | PARTIAL | `src/trash-job.ts:12,38,55-87`, `wrangler.jsonc:10-19` | DO alarm loop po 40 id/tick (subrequest cap). Enqueue vždy přijme, žádný backpressure, DLQ, storage se po `done` nemaže. Archive obchází frontu synchronně. |
| domlov | ABSENT | `src/index.ts:80,99-103` | Request-scoped `Promise.all`; jediný limit je statický rozpočet subrequestů. |
| faxx-hr | ABSENT | `worker/src/app.ts:336,502-524` | Sekvenční smyčka ve `fetch` s NDJSON progressem; bez durability a resume. |
| faxx-dox | MENTIONED | `DESIGN.md:61,169,191` | „E-mail je fronta"; CF Queues odloženo na F4; žádná job tabulka, DLQ ani poison path. |

**Verdikt:** 0× EXISTS. Dva různé durable mechanismy (D1 predikát vs DO alarm), DLQ 0/5. Backpressure jen jw.

### 1.7 Identity a tenant (TENANT)

| Projekt | Status | Ref | Skutečná sémantika |
|---|---|---|---|
| job-watch | PARTIAL (single) | `src/access.ts:62-118`, `src/index.ts:306-318` | Identita ověřena **v aplikaci**, ne jen na perimetru: celé `/api/*` porovnává hodnotu `Cf-Access-Authenticated-User-Email` s allowlistem. Striktně single-tenant, žádný tenant sloupec. Prázdný allowlist = projde kdokoli přes Access; `DEV_OPEN=1` obchází vše. |
| gmail-mcp | PARTIAL (multi-user) | `src/google-handler.ts:110-121`, `src/app.ts:117-118,210-214`, `src/trash-job.ts:24-40` | Reálný per-user OAuth (`userId = email`), MCP props šifrované per grant, DO per session, `appjob:<id> === sid` kontrola na čtení. **Mezera: `TrashJob` DO nemá žádnou authz; `/start` přijme libovolný refresh token v těle.** |
| domlov | ABSENT | `src/index.ts:44-59` | Veřejné neautentizované POST endpointy, bez rate limitu. |
| faxx-hr | DIFFERENT_SEMANTICS | `worker/src/app.ts:344,360,1298` | Žádná auth ani identita. „Řízení" je klientská adresa `/YYYYMMDD-HHMM`, server vrací stejnou stránku pro cokoli; data v `localStorage`. Izolace = origin prohlížeče. |
| faxx-dox | DESIGNED (partial) | `DESIGN.md:80,143-144` | `tenant_id` sloupec od začátku, Entra ID jako cíl; odvození tenantu z příchozího e-mailu a vynucení při čtení nespecifikováno. |

**Verdikt:** `MULTI_TENANT_ACTIVE` s vynucením v datové vrstvě: 0× EXISTS. gmail-mcp je jediný multi-user a nejblíž F4, ale s dírou v DO. Profil `TEN` zatím nemá reálného kandidáta.

### 1.8 Human gate (REVIEW)

| Projekt | Status | Ref | Skutečná sémantika |
|---|---|---|---|
| job-watch | ABSENT | `src/pipeline.ts:302-330,547-561` | `relevance >= threshold` odešle Telegram/e-mail/Slack ve stejné iteraci. Lidská kontrola jen po faktu (bulk re-score, Stop flag). |
| gmail-mcp | PARTIAL | `src/app-page.ts:200,253-254`, `src/index.ts:137,157,170` | Gate **jen v prohlížeči**: preview + `window.confirm()`. Checkbox „always confirm" je localStorage, server nevynucuje. **MCP cesta, tj. hlavní use case, nemá potvrzení, dry-run ani preview.** |
| domlov | ABSENT (N/A) | — | Výstup je advisory JSON. |
| faxx-hr | PARTIAL | `worker/src/app.ts:881,1914` | AI výstup agresivně označen jako decision support (AI Act §14, GDPR §22 v UI i tisku), ale rozhodnutí člověka se **nezaznamenává**: žádný reviewer, rationale ani `overrode_ai`; tabulka `decisions` jen v migraci. |
| faxx-dox | DESIGNED (partial) | `DESIGN.md:106-108,164,37` | `review_priority` rozsvítí výjimky; `review_revisions` jako flywheel. Žádné role, přiřazení, expiry ani auto-pass threshold. |

**Verdikt:** 0× EXISTS. Žádný projekt nemá server-side vynucený human gate před side effectem. `WF-REV-*` nemá kde běžet.

### 1.9 Evidence a provenance (EVIDENCE)

| Projekt | Status | Ref | Skutečná sémantika |
|---|---|---|---|
| job-watch | PARTIAL | `src/pipeline.ts:82-95`, `src/store.ts:13-35,100-107`, `src/score.ts:80-88` | Audit = `runs(log, stats JSON vč. promptVersion, providers)` + `first_seen/last_seen/notified_at`. Hashe slouží dedupu, **ne immutabilitě**: `saveJob` přepisuje `description` i skóre in place. Který model řádek skóroval, se ukládá jen agregátně (kód to komentuje jako známou mezeru). `EnrichResult.confidence` se spočítá a zahodí. |
| gmail-mcp | ABSENT | `src/trash-job.ts:78-80`, `src/index.ts:137-183` | Nic nezaznamenává, co bylo smazáno, kým a kdy. Selhaná id se zahazují. |
| domlov | ABSENT | `src/index.ts:106,110-129` | Odpověď bez timestampu, RDAP serveru ani stavu; tvrzení „doména volná" nemá provenance. |
| faxx-hr | PARTIAL | `worker/src/app.ts:127`, `worker/src/rubric.ts:134`, `worker/src/detect.ts:18` | Doslovné snippet kotvy vyřezává **kód**, ne model; confidence jako druhá osa (`stated\|inferred\|unknown`); flagy nesou `evidence` + `method: deterministic\|classifier`. Chybí hash originálu, immutable kopie a audit. |
| faxx-dox | DESIGNED | `DESIGN.md:47,100-101,110` | Originál do R2 + `sha256`; `extractions` drží `model, schema_version, prompt_version, input_mode` + surový JSON. Immutabilita R2 nedeklarována; ARES jen ve sdílené cache, ne per-dokument snapshot. |

**Verdikt:** Per-field provenance s confidence osou: fh EXISTS, jw počítá a zahazuje, fd DESIGNED. 1× EXISTS. Immutable originál s hashem: 0× v kódu.

### 1.10 Health a version (HEALTH)

| Projekt | Status | Ref | Skutečná sémantika |
|---|---|---|---|
| job-watch | EXISTS | `src/index.ts:142-213,333-336,393-395`, `.github/workflows/deploy.yml:47` | `/api/health` dělá živé probe (D1, placený 1-token Anthropic probe, Telegram, e-mail binding, cron heartbeat, migrace) + seznam capabilities a model; `/api/version` vrací `GIT_COMMIT` + `BUILT_AT` z deploye; `/api/selftest` spouští ~60 invariantů proti nasazenému buildu. Vše za Access, žádný veřejný liveness. |
| gmail-mcp | PARTIAL | `src/google-handler.ts:29-34`, `src/index.ts:18` | `/health` hardcoded `{status:"ok", version:"0.1.0"}`, nemůže selhat; verze duplikovaná na 3 místech. |
| domlov | EXISTS | `src/index.ts:48-51`, `src/version.json`, `scripts/stamp-version.mjs:16-19` | `/api/health` liveness stub (`ai:true` hardcoded); `/api/version` skutečný commit/branch/builtAt stampnutý v CI před deployem. |
| faxx-hr | PARTIAL | `worker/src/app.ts:407-431`, `scripts/deploy-app.mjs:20` | `/api/health` je AI probe (utrácí token) s `{commit, built, quota, resetAt}` přes `wrangler --define`; `/version` chybí. |
| faxx-dox | ABSENT | — | Nic. |

**Verdikt:** **`/version` s `commit` + `builtAt` injektovaným při deployi: EXISTS ×2 (jw, dl) + fh v health.** První mechanismus, který prochází Core Admission. Tři různé injekční mechanismy (env při deployi, stamp script, `--define`): standardizovat **tvar JSON**, ne skript.

### 1.11 Čas a deadline (CLOCK)

| Projekt | Status | Ref | Skutečná sémantika |
|---|---|---|---|
| job-watch | PARTIAL | `src/pipeline.ts:114,188-191`, `src/store.ts:530-548` | ~21 přímých `Date.now()` + `datetime('now')` v SQL. **Deadline bere vážně:** per-run rozpočet 60 s / 26 s, per-source `timed()` 12–25 s, `AbortSignal.timeout` na všech fetch, 6min zombie watchdog. Testovatelnost přes předávání `now` do čistých funkcí, ne přes clock abstrakci. Bez TTL na frontě. |
| gmail-mcp | ABSENT | `src/index.ts:28-37`, `src/app.ts:50,54,77` | 8 přímých `Date.now()`; TTL magic numbers (600 s, 30 d, 86400 s). |
| domlov | PARTIAL | `src/index.ts:151` | Žádný `Date.now()` ve Workeru, ale ani žádný timeout na odchozí volání; výsledek nemá as-of čas. |
| faxx-hr | PARTIAL | `worker/src/app.ts:1313,1305,421` | Surový `Date.now()`; TTL relace vyhodnocuje **prohlížeč**. |
| faxx-dox | DESIGNED (partial) | `DESIGN.md:110,128,159` | ARES cache 30 d, timeout 2 s → `warn`, F0 cíl <15 s; bez per-stage deadline a review expiry. |

**Verdikt:** Injektovatelné hodiny 0/5. Deadline na odchozí volání: jw EXISTS, ostatní ABSENT (domlov má nula timeoutů). `IDM-DEADLINE-001` je dnes flaky z principu všude.

### 1.12 Secrets (SECRETS)

| Projekt | Status | Ref | Skutečná sémantika |
|---|---|---|---|
| job-watch | PARTIAL | `src/secrets.ts:8-56`, `src/index.ts:339-347`, `src/anthropic.ts:45` | Dvě cesty: wrangler secrets **a** UI-zapisovatelný plaintext v D1 `meta['secret:NAME']`, D1 přebíjí env. Surové tělo Anthropic odpovědi jde přes `onFail` do `runs.log` a je čitelné v UI. Telegram token ve fetch URL. CV uživatele doslovně v system promptu. |
| gmail-mcp | PARTIAL | `src/app.ts:79,213`, `src/trash-job.ts:29-37` | MCP grant props šifrované knihovnou; **`/app` cesta drží access + refresh token plaintext v KV 30 d** a kopíruje refresh token do DO storage bez TTL. Logout nerevokuje u Googlu. |
| domlov | EXISTS | `src/index.ts:146`, `.github/workflows/deploy.yml:20` | `BRAVE_API_KEY` přes wrangler secret, gitignored, záměrně mimo CI env, nikdy echo (health jen boolean přítomnosti). |
| faxx-hr | PARTIAL | `wrangler.app.jsonc:8` | Nasazený worker nemá žádný secret (jen `AI` binding). |
| faxx-dox | MENTIONED | `.gitignore:12-18`, `DESIGN.md:146,199` | Jen hygiena `.gitignore`; M365 ingest credential je otevřená otázka. |

**Verdikt:** Mechanismus = wrangler secrets (3×). Nálezy k opravě v projektech: jw plaintext v D1 + únik do logu, gm plaintext tokeny v KV/DO.

### 1.13 AI output validation a injection (AIVAL)

| Projekt | Status | Ref | Skutečná sémantika |
|---|---|---|---|
| job-watch | PARTIAL (silné) | `src/score.ts:10-19,31-66`, `src/prompts.ts:32-81`, `src/discover.ts:40-65,119-129` | `json_schema` output_config + enum `seniority` (Anthropic), tolerantní parse + `normalizeScore` (`null` ≠ 0), pak **deterministický `applyRegionGate` přebíjí verdikt modelu**. Untrusted vstup obalen `<inzerat>` / `<cizi>` + klauzule, uzavírací tagy neutralizovány. Model nikdy nevolá akci aplikace. Nepřímé efekty: skóre ≥ threshold pošle notifikaci; `discover` ukládá modelem dodané URL do `sources` (allowlist + exact-domain `isHost`, oprava = HEAD commit). Enrich/discover parsují posledním `{…}` bez schématu. |
| gmail-mcp | PARTIAL (slabé) | `src/index.ts:84-88,135,151,168`, `src/gmail.ts:155-174` | Zod na vstupech všech 8 toolů, fixní allowlist. **Model ale přímo spouští destruktivní Gmail operace bez potvrzení, dry-runu nebo limitu na relaci.** Těla e-mailů (`from`, `subject`, `snippet`, `text/plain`) jdou modelu doslovně bez oddělovačů, ve stejné relaci, která umí `gmail_trash`. Pravidlo „TRASH cannot be set here" je jen text popisu, ne kódový guard. |
| domlov | PARTIAL | `src/index.ts:277-296,267-275,157-163` | Bez schématu, ale efektivní whitelist: `[...]` → `JSON.parse` → regex fallback → `normalizeName` na `[a-z0-9-]`. Obsah z Brave se nikdy nevrací uživateli ani modelu. `theme` uživatele jde do promptu neescapovaný. |
| faxx-hr | PARTIAL (nejsilnější detekce) | `worker/src/detect.ts:187,203,361`, `worker/src/extract.ts:85,112`, `worker/src/app.ts:276` | Skrytý text oddělen **deterministicky** (w:vanish, kontrast <1.6, font <4 pt, neviditelný Unicode, hlavičky/patičky/komentáře/docProps/alt-text, PDF glyph ≠ ToUnicode) a modelu jde jen `visible`. Untrusted označeno jen slovy promptu. Výstup **není** validován schématem (`response_format` best-effort, ruční coerce). Verdikt modelem strukturálně nemožný: schéma nemá score pole, ranking je čistý `rubric.ts`. |
| faxx-dox | DESIGNED / injection ABSENT | `DESIGN.md:120-121,22-25,72` | `output_config` json_schema per typ, registr schémat. **Žádné zacházení s prompt injection**; jediná kontrola důvěry je allowlist „přeposláno mnou", DESIGN.md:72 sám přiznává, že skutečný odesílatel je libovolný. |

**Verdikt:** **Deterministický kód přebíjí nebo ohraničuje výstup modelu: EXISTS ×3** (jw `applyRegionGate`, fh `rubric.ts` bez score pole, dl whitelist normalize). Princip F1/F2 je prakticky implementován ve třech projektech. Strukturovaný výstup se schématem: jw EXISTS, fd DESIGNED, fh best-effort. Obalení untrusted obsahu: jw EXISTS, fh PARTIAL, gm ABSENT. **gmail-mcp v hlavním use case porušuje F1** (model → destruktivní side effect bez brány).

### 1.14 Model governance (MODELGOV)

| Projekt | Status | Ref | Skutečná sémantika |
|---|---|---|---|
| job-watch | PARTIAL (nejsilnější) | `src/prompts.ts:19`, `scripts/prompt-check.ts:24`, `src/evals.ts:112-175`, `wrangler.toml:57-58` | Model id pinovány (`claude-haiku-4-5`, `claude-sonnet-4-6`, Llama const). `PROMPT_VERSION` v jednom souboru, zapisován do `runs.stats`; **CI gate selže, když se `prompts.ts` změní bez bumpu verze.** Golden set existuje, ale threshold-gated je jen deterministická polovina; model scoring se reportuje bez gate. |
| gmail-mcp | ABSENT | `src/index.ts:74,82,106,134,146,166` | Popisy toolů inline bez verze; změna popisu je nesledovaná behaviorální změna. |
| domlov | PARTIAL | `src/index.ts:35,175-183` | Model id pinován s poznámkou o deprecation; prompt inline bez verze, `temperature 0.9`, nic z toho v `/api/version`. |
| faxx-hr | PARTIAL | `worker/src/extract.ts:22`, `worker/src/app.ts:146,439` | Defaulty pinovány, ale **klient volí model a server přijme libovolný string**. System prompt neverzovaný, uživatelsky editovatelný. Adversarial korpus jen pro detektor, ne pro LLM extrakci. |
| faxx-dox | DESIGNED (partial) | `DESIGN.md:118-122,157-159`, `HANDOFF.md:34-35` | Haiku → Sonnet, `prompt_version` ukládán. **Nekonzistence:** HANDOFF říká 15–20 faktur, DESIGN 50–100; HANDOFF chce měřit Opus, DESIGN:187 ho zamítá. Model id jsou marketingová jména. |

**Verdikt:** Pinovaný model id: EXISTS ×3 (jw, dl, fh default). `PROMPT_VERSION` s CI gate: 1× (jw), nejsilnější jednotlivý mechanismus v celém skenu. Eval s gate na kritická pole: 0×.

### 1.15 Náklady a limity (AICOST)

| Projekt | Status | Ref | Skutečná sémantika |
|---|---|---|---|
| job-watch | PARTIAL | `wrangler.toml:60-77`, `src/pipeline.ts:200-224,486-509`, `src/metrics.ts:14-21` | Per-run capy (150 AI volání, 5 discovery, 10 notifikací) + wall-clock. **Deterministický prefiltr před modelem** (keyword/ISCO/region), free model first. Účtuje subrequesty, ne tokeny ani peníze; bez denního stropu. |
| gmail-mcp | PARTIAL | `src/index.ts:86,135,151,168,173` | Statické capy (≤50/≤1000/≤100/≤5000) + concurrency. Bez rate limitu per user; HTTP 429 je fatální `Error` bez backoffu. |
| domlov | PARTIAL | `src/index.ts:71-76,66,192` | Solidní per-request capy, ale **žádný rate limit na veřejném endpointu**: anonym vyčerpá Workers AI i Brave kvótu. |
| faxx-hr | DIFFERENT_SEMANTICS | `worker/src/app.ts:411,1666,532` | **Kaskáda Workers AI → Claude v kódu neexistuje**; vše free Workers AI, `claude*` odmítnut. Rozpočet = reaktivní detekce chyby 4006. |
| faxx-dox | DESIGNED (partial) | `DESIGN.md:151-152,103` | Haiku prefiltr, `tokens_in/out` + `cost_czk` per extrakce, alert na denní práh. Jen alert, žádný vynucený strop. |

**Verdikt:** Levný deterministický krok před modelem: jw EXISTS, fh EXISTS (detektor před LLM), fd DESIGNED. Tvrdé per-request capy: 4×. Účtování nákladů: 0×.

### 1.16 Testy a CI (TESTS)

| Projekt | Status | Ref | Skutečná sémantika |
|---|---|---|---|
| job-watch | PARTIAL | `tests/` (16 souborů, 168 případů), `src/selftest.ts:67-284`, `.github/workflows/deploy.yml:25-39` | Unit testy čistých funkcí (vč. 9 prompt-injection), ~60 selftest invariantů běžících v CI **i** v nasazeném Workeru. CI: `typecheck → test → check:prompt → evals → deploy`. Bez integračních, contract a e2e testů. |
| gmail-mcp | ABSENT | `package.json:7-12` | Nula testů, žádné CI, deploy bez prerekvizit. |
| domlov | ABSENT | `package.json:7-16`, `.github/workflows/deploy.yml:11-21` | Nula testů, **chybí `tsconfig.json`**, TS se nikdy netypechecks; CI = `npm ci → stamp → deploy` bez brány. |
| faxx-hr | PARTIAL | `worker/src/vr.test.mjs`, `detector/test_vectors.py:86` | 6 ručních `*.test.mjs` bez `test` scriptu a bez CI; reálný adversarial korpus (14 DOCX + 11 PDF vektorů) v Pythonu, netestuje `detect.ts` ani LLM cestu. |
| faxx-dox | DESIGNED (F0) | `HANDOFF.md:34-36` | F0 = samostatný Python skript, per-field accuracy proti ručním labelům. Bez unit/CI plánu. |

**Verdikt:** CI gate s testy: 1× (jw). Adversarial korpus: 2× (jw, fh) s různým cílem. Selftest invariantů v nasazeném buildu (jw) je vzor hodný kopírování, ne ještě sdílení.

---

## 2. Co prochází Core Admission (EXISTS × 2, stejná sémantika)

| # | Mechanismus | Kde | Co standardizovat | Co NE |
|---|---|---|---|---|
| 1 | `/version` s `commit` + `builtAt` injektovaným při deployi | jw, dl (+ fh v health) | tvar JSON odpovědi (`componentVersion`, `buildCommit`, `builtAt`, `capabilities[]`), viz `module-descriptor` | injekční skript (3 různé, každý funguje) |
| 2 | Deterministický kód přebíjí nebo ohraničuje výstup modelu | jw, fh, dl | požadavek profilu `AI_CAPABILITY`: model nemá pole s rozhodnutím nebo je jeho výstup gateován kódem; řádek do `navrhovy-list.md` | sdílená knihovna, každá doména gateuje jinak |
| 3 | Pinovaný model id jako konstanta v kódu | jw, dl, fh | pravidlo kontraktu + `modelId` v provenance výsledku | — |
| 4 | Explicitní `unknown`, který se nesmí zhroutit na negativní hodnotu | jw, dl, fh | `trustLevel` / `validation.status` v provenance objektu; `UNKNOWN_OUTCOME` v result envelope | — |
| 5 | Tvrdé per-request capy bez účtování | jw, gm, dl, fh | poznámka do `PLATFORM-NOTES`: capy jsou, accounting není nikde | — |

**Závěr:** první kontrakty k adopci jsou `/version` tvar a `result-envelope` s provenance. **Žádný sdílený balíček zatím není doložený.** To je v souladu s `FOUNDATION-core.md §9`.

## 3. Co neexistuje nikde (0 × EXISTS)

Tyto věci Foundation definuje, ale žádný projekt je nemá. Není co extrahovat, je co standardizovat a pak implementovat ve dvou projektech:

- `correlationId` propagovaný přes logy a zápisy,
- strukturovaný error object s `code` / `class` / `retryable`,
- execution state enum s terminálními stavy a `UNKNOWN_OUTCOME`,
- dead-letter / poison path,
- retence idempotency evidence,
- injektovatelné hodiny,
- server-side human gate před side effectem,
- audit záznam side effectu (co, kdo, kdy, výsledek),
- immutable originál s hashem (v kódu; fd má v návrhu),
- účtování nákladů modelu.

## 4. Varování DIFFERENT_SEMANTICS

| Pojem | Významy nalezené v kódu |
|---|---|
| „retry" | bounded HTTP backoff (jw Anthropic) · nekonečný implicitní per-item (jw fronta) · 1 okamžitý pokus (dl) · quality fallback jinou strategií (fh) · provider fallback (jw) |
| „state" | lifecycle jobu implicitní v NULL sloupcích (jw) · per-kritérium kvalita (fh) · per-doména dostupnost (dl) · DO job string (gm) |
| „session / tenant" | CF Access e-mail allowlist single-tenant (jw) · per-user OAuth (gm) · klientská adresa bez serveru (fh) · sloupec bez odvození (fd) |
| „cache" | edge cache HTTP (dl) · klientský cache klíč (fh) · dedup PK (jw) |

Sdílený helper, který by sjednotil jen název, by byl škodlivý.

## 5. Nálezy k vrácení do projektů

Vedlejší produkt skenu. Nepatří do Foundation, patří do `HANDOFF.md` příslušných repo.

| Projekt | Nález | Invariant |
|---|---|---|
| gmail-mcp | model spouští destruktivní Gmail operace přes MCP bez potvrzení, dry-runu a limitu na relaci; e-mailová těla jdou modelu doslovně ve stejné relaci | F1, F2 |
| gmail-mcp | access + refresh token plaintext v KV (30 d) a refresh token v DO storage bez TTL; logout nerevokuje | F4 |
| gmail-mcp | `TrashJob` DO `/start` bez authz, přijme libovolný refresh token | F4 |
| gmail-mcp | nic nezaznamenává, co bylo smazáno | F7 |
| job-watch | UI-zapisovatelné secrets plaintext v D1 `meta`, přebíjí env; surové tělo API odpovědi do `runs.log` čitelného v UI | F4 |
| job-watch | per-item retry neomezený, selhaný řádek se zkouší navždy; bez DLQ | F5 |
| job-watch | provenance per řádek (který model skóroval) se zahazuje; `confidence` z enrich se nezapisuje | F7 |
| domlov | žádný timeout na odchozí RDAP/Brave/AI volání | F5 |
| domlov | veřejný endpoint bez rate limitu, anonym vyčerpá kvóty | F6 |
| domlov | chybí `tsconfig.json`, TS se nikdy nekontroluje; nula testů, CI bez brány | P1 |
| faxx-hr | server přijme libovolný model id od klienta; system prompt neverzovaný a uživatelsky editovatelný | F2 |
| faxx-hr | výstup modelu bez schématu, ruční coerce | F2 |
| faxx-hr | rozhodnutí člověka se nezaznamenává, ač je AI výstup správně označen jako decision support | F7 |
| faxx-dox | žádné zacházení s prompt injection v návrhu; allowlist „přeposláno mnou" není důvěra | F2 |
| faxx-dox | žádná idempotence pro DMS write a notifikaci; `sha256` explicitně jen double-click | F6 |
| faxx-dox | nekonzistence HANDOFF vs DESIGN (15–20 vs 50–100 faktur; Opus) | — |

## 6. Doporučené první dva consumery kontraktů

1. **job-watch**: nejzralejší. Adoptovat `result-envelope` error object místo `throw new Error(string)` a `/api/version` tvar. Přidat `correlationId = runs.id` do logů a notifikací. Získá nejvíc při nejmenší změně.
2. **faxx-dox F1**: první kód po F0 bráně se píše rovnou proti `message-envelope` + `result-envelope` + `module-descriptor`. Doplnit do DESIGN.md: injection boundary, idempotence DMS write, review expiry.

Až oba používají stejný error object a stejný `/version` tvar, je splněna podmínka `EXISTS × 2` pro první sdílený balíček. Dřív ne.
