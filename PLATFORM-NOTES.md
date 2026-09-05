# PLATFORM NOTES

## CANDIDATE a DEFERRED backlog

| | |
|---|---|
| **Verze** | 1.0-rc2.1 |
| **Datum** | 5. 9. 2026 |
| **Status** | Nezávazné. Znalostní backlog vytažený z `docs/history/AGENT-PLATFORM-FOUNDATION-v0.2.md` a z oponentury. Nic tady neblokuje release. |

Každá položka má **trigger**: událost, po které se téma znovu otevře a případně přesune do `FOUNDATION-core.md` nebo `VERIFICATION-CONTRACT.md`. Bez triggeru se položka nestaví.

---

## 1. CANDIDATE — vzor existuje, čeká na druhé použití

| Téma | Odkud (v0.2) | Co je dnes | Trigger |
|---|---|---|---|
| Sdílený balíček `version` endpoint | §45, evidence 1.10 | 2× EXISTS (job-watch, domlov), 3 injekční mechanismy | oba projekty adoptují stejný JSON tvar → extrahovat schéma, ne skript |
| Sdílený result/error helper | §12, §68 | 0× EXISTS | job-watch + faxx-dox F1 používají `result-envelope` → zvážit tiny package |
| Testovací fixtures (`TwoTenantFixture`, `IdempotencyReplayFixture`, `ClockFixture`, `AdapterFakeFixture`) | oponentura §7, §11 | 0× | první `WRITE_EXECUTOR` a první `MULTI_TENANT` komponenta |
| Generátor testů z `module-descriptor` | oponentura §7 | 0× | tři komponenty s descriptorem |
| Endpoint Agent Core (one endpoint = one service = N modules) | §40–41, v0.1 §23 | USB Guardian jako pracovní precedent | druhý endpoint use-case (Inventory / Diagnostics) v osobním portfoliu, implementovaný znovu podle vlastního kontraktu |
| Compatibility lifecycle `ACTIVE → DEPRECATED → SUNSET → REMOVED` s měřením consumerů | §37 | nula paralelních major verzí | první capability se dvěma živými major verzemi |
| Common execution journal (durable stavy kroků) | §42 | jw = D1 predikát, gm = DO alarm; různá sémantika | dva projekty s workflow o více než jednom kroku |
| Review Service jako sdílená služba | §18, §6.6 | 0× server-side gate | dva projekty s human gate |
| Artifact / provenance service | §20–21 | fh per-field provenance, fd designed | faxx-dox F1 + druhý dokumentový projekt |
| Audit envelope | §31–32 | jw runs log jen agregát | dva projekty zapisující audit side effectu |
| Observability contract (`queueDepth`, `oldestPendingAge`, `lastSuccessfulOperation`, `lastError`) | §45, §121 | jw health probe je bohatší, ostatní stub | druhý async worker |
| Schema registry (soubor, ne služba) | §116 | `contracts/` v tomto repu | počet capability > 10 |
| Component registry | §117 | — | více runtime instancí téže capability |
| Workflow registry / versioned definitions | §118 | — | první sdílené workflow |
| Audit integrity (hash chain, WORM) | §119 | — | první zákazník s regulatorním požadavkem |
| Compliance evidence package (export pro audit) | §120 | — | první externí audit |
| Supply chain: signing, SBOM | §84 | — | první deployable distribuovaný mimo vlastní účet |
| Hot / warm / archive tiering | §88 | jw nikdy nemaže | první tabulka nad 1 GB nebo první retention požadavek |
| ADR formát | §140 | rozhodnutí žijí v HANDOFF | první rozhodnutí, které někdo za rok zpochybní |
| Per-tenant policy (rozdíly v config, ne v kódu) | §53 | — | druhý tenant s jinou politikou |
| Mutation testing nástroj (Stryker / PIT) a převod CANDIDATE mutantů na automatizované | oponentura kolo 1 | MUST mutanty ručně nebo v harnessu | třetí `WRITE_EXECUTOR` komponenta |
| Ověření seznamu tenant povrchů (`FOUNDATION-core.md §6.2`) proti reálnému incidentu nebo pentestu | oponentura kolo 1, X-11 | seznam z hlavy | první `MULTI_TENANT_ACTIVE` projekt |
| Standardní rozhraní `statusQuery` pro externí systémy bez idempotency API (starší ERP, e-mailové brány) | oponentura kolo 1 | pole `statusQuery` v descriptoru jako volný text | druhý `IRREVERSIBLE` executor proti systému bez business identity |
| Schéma platform policy | oponentura kolo 1, IV-6; kolo 4 | formát rozhodnut (JSON, ADR-016), vzor `contracts/policy/payment.execute.v1.policy.example.json`; schéma zatím ne | první komponenta, která policy čte (M1), napíše schéma podle vzoru |
| Scope penetračního testu in-process izolace jako ADR-017 **před** spuštěním testu | oponentura kolo 4 | scope navržen v části VII (ADR-017), zatím neproveden | první `LOGICAL` host se dvěma handlery (M3) |
| Empirické ověření blast radius Executor Hostu: penetrační test in-process izolace (prototype pollution, path traversal v `require`, únik přes env a `globalThis`) na reálném runtime; výsledek jako ADR | oponentura kolo 1 + 2 | schéma vynucuje izolační třídy, `SEC-HOST-001`/`002` definovány, `PRINCIPAL` vyžaduje broker mimo proces | první Executor Host se dvěma handlery; **podmínka přechodu 1.0-rc2 → 1.0** |
| Credential broker pro `PRINCIPAL` izolaci uvnitř jednoho deployable (token broker ověřující identitu handleru) | oponentura kolo 2 | `PRINCIPAL` dnes prakticky = vlastní deployable | druhý handler `MEDIUM` v témže hostu |
| Standardní MUST pole per doména pro `semantic` conformance tier | oponentura kolo 2 | faktura a klasifikace vyjmenovány v VC §5 | třetí doména |

## 2. DEFERRED — legitimní, ale bez doložené potřeby

| Téma | Odkud | Trigger |
|---|---|---|
| Tenant lifecycle (create / suspend / export / legal hold / delete vč. cache, indexů, AI memory) | §56, v0.1 §56 | první `CLOUD_MULTI_TENANT` produkt s reálným druhým zákazníkem |
| Deployment waves DEV → TEST → CANARY → PILOT → 10 % → 50 % → 100 % | §85, v0.1 §25 | fleet > 20 endpointů nebo > 2 zákazníci na jedné codebase |
| RPO / RTO per modul + restore test | §86 | první modul s daty, která nejdou znovu vyrobit ze zdroje |
| Core N a N-1 major souběžně | v0.1 §8.2 | druhý externí consumer Core |
| Univerzální Saga engine | §16 | tři workflow s kompenzací |
| LLM-based planning jako capability | §6.1 | až workflow definice přestanou stačit; vlastní trust boundary povinná |
| Multi-region | příloha H | zákazník s residency požadavkem mimo EU |
| Billing | příloha H | první placený tenant |
| Marketplace / plugin loader | §66 | nikdy bez tří externích dodavatelů modulů |
| Generický observability portál | příloha H | > 5 komponent v provozu |
| Povinný SBOM pro každý prototyp | §84 | CRA relevance produktu |

## 3. Design principles (ne-normativní, z v0.2 §141–150)

Zachováno jako review checklist, ne jako pravidla:

- explicit over clever: farmu mají tvořit nudné mechanismy,
- local autonomy, global contracts: uvnitř modulu svoboda, na hranici kontrakt,
- failure is part of API: kontrakt bez chybového chování je neúplný,
- history matters: systém musí umět pracovat se stavem z minulé verze,
- restore is a feature: backup bez restore testu není záruka,
- humans are part of the system: review není výjimka mimo systém,
- external systems lie by failure: timeout, partial data, 200 bez efektu,
- data quality is not binary: confidence, provenance, validace,
- security beats compatibility: zranitelnou starou verzi lze zakázat,
- no feature without lifecycle: kdo vlastní, kdo verzuje, kdy končí.

## 4. Anti-patterns (z v0.1 §67 a v0.2 §96–104)

Slouží jako negativní checklist při code review. Každý má odpovídající test nebo pravidlo ve `VERIFICATION-CONTRACT.md`, kde to jde.

| Anti-pattern | Test / pravidlo |
|---|---|
| AI s přímými write credentials | `SEC-PRIV-001` |
| univerzální executor se širokými právy | §3 executor model, `SEC-PRIV-002` |
| modul čte DB jiného modulu | `ARCH-DEP-001` |
| tenant izolace jen v promptu nebo UI | `TEN-*` |
| raw shell / SQL z modelu | `SEC-INJ-001` |
| neomezený retry | `RES-DEP-001`, retry budget v descriptoru |
| unknown outcome zapsaný jako success | `WF-UNK-001` |
| HTTP 200 = business success | `CTR-ERR-001` (transport ≠ business) |
| jeden API key pro všechny tenanty nebo agenty | §6.4 identity minimum |
| originál přepsaný během workflow | `EVD-001` |
| audit editovatelný aplikací | `EVD-003` |
| breaking change bez nové major | `CDC-*` |
| prompt nebo model měněný přímo v produkci | `AI-EVAL-REG-001` + prompt version gate |
| debug log jako úložiště dokumentů | `EVD-004` |
| nasazení všem bez canary | DEFERRED (trigger fleet > 20) |
| data bez retention policy | §7 retence |
| secret bez ownera / expirace | §6.4 |
| Core plný domain logiky | §9 admission |
| distributed monolith (10 služeb, koordinovaný release) | §3 modularita je vlastnost hranic, ne topologie |
| univerzální JSON blob bez kontraktu | `CTR-001` |
| AI jako autorizace | `SEC-PRIV-001`, `SEC-CTX-002` |
| AI přímo označí dokument jako právně schválený | F7, `WF-REV-004` |

## 5. Vztah k `ai-agenti`

`ai-agenti` zůstává metodickým domovem. Tento repozitář ho nenahrazuje, rozšiřuje ho na úroveň více komponent. Doporučené doplnění `sablony/navrhovy-list.md` o řádky, které tam chybí (zjištěno 5. 9. 2026):

- deployment model (`ON_PREM_SINGLE_TENANT` … `HYBRID`),
- tenant mode komponenty,
- capabilities, které agent poskytuje a které smí navrhovat (allowlist),
- `sideEffects` / `reversibility` / `idempotency` každé write akce,
- retence každé datové třídy,
- evidence: co se ukládá jako originál, co jako odvozenina,
- verifikační profily podle `VERIFICATION-CONTRACT.md §1`,
- pravidlo „model nemá pole s rozhodnutím, nebo je jeho výstup gateován kódem" (evidence 2.2).

Do `sablony/BUILD-PREDPIS.md`: security invariant testy jako release gate i pro první prototyp (`SEC-PRIV-001`, `SEC-INJ-001`, `ARCH-DEP-001`).

## 7. Cena izolace na Cloudflare Workers (po 3. kole)

`PRINCIPAL` = vlastní execution context s vlastními bindingy. Na Workers to znamená vlastní Worker; broker uvnitř téhož Workeru `PRINCIPAL` nevytvoří. Hranice je credential doména, ne handler, takže počet Workerů roste s počtem externích identit.

| Portfolio | Deployables | Deploy / CI / monitoring | Bindingy | Poznámka |
|---|---|---|---|---|
| 10 handlerů LOW, jedna DMS identita | 1 `LOGICAL` host | 1 | 1 sada | výchozí stav dnešního portfolia |
| + 3 handlery MEDIUM ve 2 doménách (ERP, e-mail) | + 2 `PRINCIPAL` Workery | 3 | 3 sady | ne 5 Workerů; `prepare` a `release` sdílejí ERP context |
| + 1 handler HIGH (banka) | + 1 `PRINCIPAL` s `isolationDecision`, nebo `PROCESS` | 4 | 4 sady | banka je vždy vlastní identita |
| + 1 CRITICAL (identita, destruktivní zásah) | + 1 `PROCESS` | 5 | 5 sad | vlastní service identity a síťová policy |

Inženýrská cena per Worker: jeden `wrangler.jsonc`, jeden deploy job, jeden `/health` a `/version`, jeden alert. Provozní cena Workers je zanedbatelná. Řešení, aby cena nerostla lineárně: jeden monorepo s generovanými `wrangler.jsonc` z descriptorů a jedním deploy workflow, který nasadí všechny Workery, jejichž descriptor se změnil (CANDIDATE, trigger: třetí `PRINCIPAL` Worker).

Návrh „MEDIUM jako `LOGICAL` s `isolationDecision`" (3. kolo) byl odmítnut: `MEDIUM` je business záznam s vlastní externí identitou; `LOGICAL` s papírem je `LOW` s papírem. Kde je MEDIUM handlerů víc v jedné doméně, sdílejí context, a tím se cena drží.

Ed25519 vyžaduje WebCrypto s podporou `Ed25519` (Cloudflare Workers ji mají od roku 2023; ověřit `crypto.subtle.generateKey({ name: "Ed25519" })` v `/health` gateway). Kde chybí, je fallback HMAC-SHA256 povolen **jen** uvnitř jednoho deployable, nikdy sdílený mezi příjemci (T19).

## 8. Otevřené otázky

Zapsané, nerozhodnuté, s vlastníkem „Milan":

1. Kde bude tento repozitář žít na GitHubu: `Anamax443/agent-platform-foundation` (public jako výkladní skříň) vs. private. Dokumenty zmiňují pracovní projekt USB Guardian jen jako pattern source bez kódu; před zveřejněním zkontrolovat, zda je to přijatelné.
2. Anglická parita dokumentů (klasika: CZ-first + EN). README je bilingvní, normy zatím jen CZ.
3. Který ze dvou doporučených consumerů (`EVIDENCE-MATRIX.md §6`) adoptuje kontrakty první. Doporučení: job-watch, protože má CI a testy.
4. Zda se `/version` tvar sjednotí ve všech třech nasazených projektech naráz, nebo jen ve dvou.
