# HANDOFF — deník stavu: agent-platform-foundation

Append-only. Nejnovější záznam nahoru. Slouží k pokračování z jiného počítače / po pauze.

## 2026-09-06 — publikováno na GitHub, ai-agenti doplněno, začíná první implementace

- **GitHub:** `https://github.com/Anamax443/agent-platform-foundation` (public), první commit `12a3c32`,
  CI `kontrola.yml` = `npm test` + `build:pack` + gitleaks + kontrola odkazů (bez `docs/history`).
- **ai-agenti:** návrhový list doplněn o osm řádků podle `PLATFORM-NOTES.md §5`, F3 brána v build předpisu
  má bezpečnostní invariant testy; commit `020e818` na `main`.
- **První implementace:** nové repo `Anamax443/agent-platform-first-slice` (public), kontrakty pinované
  na `1.0-rc2.1 12a3c32` (`contracts/CONTRACTS-VERSION`). Řez `document.classify` → `document.validate`
  → `document.stamp` podle XII.G; měření podle XVI.4 v `docs/MEASUREMENT.md` tam.
- **Lean (dotaz vlastníka):** norma lean principy obsahuje implicitně (evidence před abstrakcí, Core na tah,
  jidoka přes UNVERIFIED, standardní práce přes Test ID, malý řez). Porušila je čtyřmi koly papíru; proto freeze.
  V první implementaci se plýtvání měří explicitně (kategorie muda v MEASUREMENT.md), WIP limit = jeden řez.
- **Zmrazené soubory se nemění.** Tento záznam mění jen HANDOFF.

## 2026-09-05 (uzavření) — 4. kolo oponentury, freeze rc2.1, konec textové fáze

**Vstup:** tři posudky rc2.1 (9,2 / 9,5 / 9,5) + jeden opakovaný text 3. kola. 1 MINOR, 3 NOTE, 0 MAJOR. Protokol: `docs/review-pack/parts/16-oponentura-kolo4-uzavreni.md` (část XVI).

**Hotové:**
- MINOR: ukázka dispatch obálky v jádru §4.3 přepnuta z HMAC-SHA256 na Ed25519 (default).
- Příprava implementace podle tří NOTE: ADR-016 formát platform policy (JSON per capability a verze) + vzor `contracts/policy/payment.execute.v1.policy.example.json`; rozhraní `CredentialResolverFixture` se dvěma režimy ve VC §6; ADR-017 scope penetračního testu izolace (runtime, výchozí pozice útočníka, cíle, vektory, mitigace, vyhodnocení).
- **FREEZE:** `FOUNDATION-core.md`, `VERIFICATION-CONTRACT.md`, `contracts/*.schema.json` zmrazeny na 1.0-rc2.1. Změny jen s evidencí z kódu (nález z implementace, změřený čas, výsledek pentestu). Žádné další posudky na papíře.
- Celkem: 4 kola, 80 nálezů, 71 přijato, 5 odmítnuto s důvodem, 4 na vědomí. Skóre posledního kola 9,2 až 9,5.

**Další krok = kód (XII.G, XVI.4):** `document.classify` → `document.validate` → `document.stamp`; měřit hodiny (limit 40 h na MUST sadu), zapisovat zachycené nálezy s Test ID; pak `mail.received` → `email.send`; pak `INT-REPLACE-001`; pentest podle ADR-017 v M3. Část XVII bude „Protokol implementace".

**Zbývá (Milan):** GitHub repo public/private + první push (teď je vhodná chvíle, stav je zmrazený); kde bude první implementace žít (nové repo pod Anamax443 vs. faxx-dox F1); návrhový list v ai-agenti; EN parita.

## 2026-09-05 (pozdě v noci) — 3. kolo oponentury, errata 1.0-rc2.1

**Vstup:** čtyři posudky rc2 (9,3 / 9,0 / bez skóre / 9,4). Protokol 14 nálezů: `docs/review-pack/parts/15-oponentura-kolo3.md` (část XV).

**Proč errata, když rc2 mělo být poslední:** dva posudky nezávisle našly rozpor mezi částmi II, III a IV: jádro i verifikace vyžadovaly sémantické validátory u HIGH capability, descriptor je neuměl deklarovat. Rozpor normativních částí nelze nechat do kódu. Opraveno jako errata, ne revize.

**Hotové:**
- Schéma descriptoru: `effectFields[]` (field, role target/scope/amount/resource, validator jako nápověda) + `semanticValidation.policyRef`; povinné pro HIGH/CRITICAL. Claim polí v descriptoru, autorita validátorů v policy, evidence v provenance payloadu. `SEC-SEM-001` na tři vrstvy. 32 negativních testů. **`EVD-006` odmítlo původní ukázku v části VI**, první reálný úlovek toho testu; ukázka přepsána na `bank-executor`.
- `PRINCIPAL` = vlastní execution context (isolate/Worker/proces), broker v témže procesu nestačí; `PROCESS` = navíc vlastní security principal end-to-end; hranice `PRINCIPAL` = credential doména, ne handler. Ekonomika na Workers v `PLATFORM-NOTES.md §7` (5 deployables pro 15 handlerů, ne 15). Odmítnuto „MEDIUM jako LOGICAL s rozhodnutím".
- Migrace: drained state, `MIGRATION_DEFERRED`, callback v kontextu verze při odeslání (`WF-VER-004`). Klíče s okny platnosti, ověření v `signedAt` (`SEC-CRED-003`). Publikovaný stav při reconciliaci (`WF-UNK-003`). `CredentialResolverFixture`, generátor mutant doubles. `maxQueueAgeFactor` default 2 s důvodem. Ed25519 na Workers poznámka. Zbytky textu (čtyři/pět kontraktů, HMAC v XII.A) vyčištěny.
- Matice 56 řádků. `npm test` zelené. Balíček `OPONENTNI-BALICEK-v1.0-rc2.1.md` + kopie v Downloads (posílat rc2.1).

**Závazek trvá:** žádné rc3 bez kódu. Další verze z první implementace (XII.G). Příklad 6.2 teď ukazuje, co to znamená prakticky: tři deployables místo jednoho hostu.

## 2026-09-05 (noc) — 2. kolo oponentury zapracováno, vydání 1.0-rc2, poslední textové vydání před kódem

**Vstup:** čtyři posudky balíčku 1.0-rc (9,1 / 9,1 / 8,5 / bez skóre). Shoda všech čtyř: architektura oddělených modulů obhájena, další text má klesající návratnost. Protokol 21 nálezů: `docs/review-pack/parts/14-oponentura-kolo2.md` (část XIV).

**Hotové:**
- Triáž: 15 přijato, 4 s úpravou, 1 odmítnut (INT jako CANDIDATE), 1 na vědomí (`canonicalization` enum).
- Jádro 1.0-rc2: F2 sémantické validátory pro pole vybírající cíl side effectu u HIGH (`SEC-SEM-001`, odpověď na X-20); `PRINCIPAL` = credential od brokera mimo proces hostu, N handlerů v jednom Workeru se společnými bindingy = `LOGICAL`; Ed25519 default, privátní klíč jen v gateway, HMAC jen v jednom deployable (T19, `SEC-HOST-002`); key registry příjemce pro rotaci; command vs query vyjasněno; UTC se `Z`; přechod UNKNOWN → review provádí orchestrátor; `conformanceTier` na workflow; atomická migrace (`WF-VER-003`); stárnoucí fronta → `DEGRADED` (`RES-QUEUE-001`).
- Verifikace 1.0-rc2: matice 53 řádků; `INT-FAIL-004` dvě varianty bez business logiky ve fake; `INT-E2E-001` obecný, jen workflow se zápisem; trigger `INT-REPLACE-001`; MUST pole vlastní kontrakt, ne provider; **zrušena výjimka manuální evidence pro MUST mutanty** (dva posudky nezávisle: solo self-review není evidence).
- Schémata: všechna `date-time` pole s patternem `Z`; `algorithm` default Ed25519 v popisu; tvar beze změny. `npm test`: 29 negativních + EVD-006, zelené.
- Balíček `docs/review-pack/OPONENTNI-BALICEK-v1.0-rc2.md` + kopie v Downloads. V Downloads teď leží draft, rc i rc2; posílat rc2.

**Rozhodnuto:** žádné 1.0-rc3 bez kódu. Další verze vznikne z první implementace podle XII.G: `document.classify` → `document.validate` → `document.stamp`, změřit MUST sadu (nad 40 h přehodnotit III §7), pak druhý tok, pak penetrační test in-process izolace hostu (podmínka 1.0).

**Zbývá (Milan):** GitHub repo public/private + první push; kde bude první implementace žít (nové repo pod Anamax443, nebo faxx-dox F1); návrhový list v ai-agenti; EN parita norem.

## 2026-09-05 (večer) — 1. kolo oponentury zapracováno, vydání 1.0-rc

**Vstup:** čtyři posudky balíčku 1.0-draft (skóre 8,2 / 6,8 / 8,5 / 8,6; posudek D doručen zkrácený). Protokol se všemi 31 nálezy a rozhodnutími: `docs/review-pack/parts/13-oponentura-kolo1.md` (část XIII balíčku).

**Hotové:**
- Triáž: 22 přijato, 6 přijato s úpravou, 3 odmítnuty s důvodem (linter místo mutantů; `MULTI_TENANT` jako CANDIDATE, profil je už podmíněný; Core Admission pro testovací tooling, ten mu nepodléhá).
- `FOUNDATION-core.md` 1.0-rc: sedm runtime invariantů F1–F7 + procesní P1 (bývalý F8) a P2 v §9; §3.2 izolační třídy `LOGICAL`/`PRINCIPAL`/`PROCESS` s minimem z `riskClass`; §4.3 dispatch envelope, podpis vně nad JCS `{message, context}`, default `signed-envelope`, rotace klíče s grace period; §4.5 `reissuable` + tabulka kódů; §5.1 `reconciliationBudget`; §5.4 tolerance hodin; §5.7 `MIGRATE_INSTANCE`; §5.8 `escalateTo`; §6.6 provozní režimy (`READ_ONLY` při plném auditu); §8 odvozené profily, descriptor = claim, policy = autorita; §9 kontrakty a testovací podpora od prvního dne.
- `VERIFICATION-CONTRACT.md` 1.0-rc: rodina `INT` (FAIL-001..004, UPGRADE, E2E, REPLACE), `SEC-HOST-001` + `MUT-HOST-001`, `SEC-CRED-002`, `SEC-CTX-005`, `WF-UNK-002`, `RES-STOR-002`, `IDM-DEADLINE-002`, `EVD-005..006`; matice 48 řádků; conformance tiers; MUST/CONDITIONAL profil; mutanty MUST/CANDIDATE s výjimkou pro první komponentu; lint pro hodiny.
- `contracts/`: nové `dispatch-envelope.v1`; `trusted-context` bez `binding`, `+scheduler`; `result-envelope` `+reissuable`; `module-descriptor` odvozené profily (schéma je vynucuje), `isolationClass`, `isolationDecision`, `conformanceTier`, `reconciliationBudget`, `statusQuery`, `dependsOn`, `MODULE_DEPENDENCY`.
- `npm test`: 5 schémat, 5 příkladů, 27 negativních případů, `EVD-006` (5 tagovaných ukázek v části VI validních). Vše zelené.
- Balíček přestavěn: `docs/review-pack/OPONENTNI-BALICEK-v1.0-rc.md` (4 373 řádků, 37 tis. slov, 13 částí), kopie v `Downloads/`. Starý draft v Downloads zůstal; posílat rc.

**Zbývá:** viz záznam níže (GitHub, návrhový list, EN parita) + 2. kolo oponentury s částí XIII jako vstupem; úplný text posudku D; otázky IV-8, X-31, X-32.

## 2026-09-05 — založení repozitáře, jádro + verifikace + evidence

**Kontext:** Během dne vznikly v diskusi s ChatGPT tři drafty (`AGENT-PLATFORM-FOUNDATION-v0.1.md`, `v0.2.md`, `OPONENTURA-...-v0.2.md`) a čtyři AI hodnocení. Všechny doporučovaly totéž a nikdo to neudělal: zkrátit závaznou část, doplnit verifikaci, otevřít reálná repa. Tento repozitář je výsledek.

**Hotové:**
- Kostra repa podle `project-standard` (`.editorconfig`, `.gitattributes`, `.gitignore`, `LICENSE`), `git init`, větev `main`. **Nic necommitnuto, žádný remote.**
- `FOUNDATION-core.md`: 8 invariantů (F1–F8), role, executor model (capability ≠ principal ≠ deployable), envelope v1 s `notValidAfter` a `causationId`, `TrustedExecutionContext` s binding rule, result + error object, stavy s `UNKNOWN_OUTCOME`, tři třídy retry, idempotency retention, reverzibilita, workflow pinning, review s expiry policy, tenant povrchy, security defaults, evidence minimum, Core Admission, do-not-build, versioning tabulka.
- `VERIFICATION-CONTRACT.md`: profily → rodiny, 33 řádků threat → test → gate (pokrývá všech 12 hrozeb z v0.2 vč. dvou, které oponentura vynechala: log leakage, review abuse), conformance balíček capability, 8 povinných mutantů, testing tax (generované testy, izolace ve wrapperu), coding standardy (injektovatelné hodiny, adapter fakes, dva tenanti), flaky → `UNVERIFIED`, AI-EVAL s `criticalFields`, compatibility matrix, 10 oponentních scénářů, registr Test ID.
- `contracts/`: 4 JSON Schema 2020-12 (message-envelope, trusted-context, result-envelope, module-descriptor) s conditional required a příklady.
- `EVIDENCE-MATRIX.md`: read-only sken 5 repo na stavu GitHubu (`job-watch ad4245f`, `gmail-mcp c5f87f1`, `domlov b3a29e3`, `faxx-hr 77e4d83`, `faxx-dox d36dae3`), 16 dimenzí, odkazy soubor:řádek. Výsledek: Core Admission prochází jen `/version` tvar (2× EXISTS); princip „kód gateuje model" je implementován 3×; 10 mechanismů z Foundation neexistuje nikde; „retry" má 4 různé významy. 16 nálezů k vrácení do projektů (§5).
- `PLATFORM-NOTES.md`: CANDIDATE/DEFERRED s triggery, design principy, anti-pattern checklist mapovaný na Test ID, doplnění pro `ai-agenti` návrhový list, otevřené otázky.
- `README.md` (EN) + `README.cs.md` (CZ), `docs/ARCHITECTURE.md`, `docs/BUILD.md`, `package.json` + `scripts/validate-contracts.mjs` (kompilace schémat + příklady + negativní případy).
- Původní drafty archivovány v `docs/history/`.

**Oponentní balíček (odpoledne):** `docs/review-pack/OPONENTNI-BALICEK-v1.0-draft.md`, sestavuje `npm run build:pack` z `docs/review-pack/parts/*` + čtyř norem + čtyř schémat. 13 částí: průvodce pro oponenty, kontext a historie s referenční architekturou, jádro, verifikace, kontrakty s komentářem a úplným zněním schémat, evidence, provedené příklady (faktura end-to-end s obálkami, executor host se čtyřmi trace, injection, cross-tenant, restart, verze workflow), 12 ADR, threat model (18 hrozeb, 7 útočníků), notes, 30 otázek + hodnoticí list, glosář, přílohy (přiznané slabiny, mapování na návrhový list, registr Test ID, adopční plán M1–M6, akceptační kritéria, DoD, incident od detekce po uzavření). 3 265 řádků, 29 tis. slov, kopie v `Downloads/`. Při psaní příkladů vyšly tři nálezy proti vlastní normě (6.7): `retryable` vs `reissuable`, `ESCALATE` bez cíle, validace ukázek v docs.

**Ověřeno:**
- `npm test` (Node 24, Ajv 2020 + ajv-formats): 4 schémata kompilují, 4 příklady validní, 12 negativních případů správně odmítnuto. Ajv běží se `strictRequired: false`, protože podmíněné `required` v `then` odkazuje na vlastnosti rodiče (standardní 2020-12 vzor).

**Rozpracované:**
- nic; repozitář je lokálně kompletní, čeká na rozhodnutí níže.

**Rozhodnuto (Milan, 5. 9. 2026):** staré projekty se neřeší. Nálezy z `EVIDENCE-MATRIX.md §5` zůstávají jen jako záznam; do `job-watch`, `gmail-mcp`, `domlov`, `faxx-hr` ani `faxx-dox` se kvůli nim nezasahuje a kontrakty se do nich zpětně nezavádějí. První consumery kontraktů budou nové komponenty, které teprve vzniknou.

**Zbývá (rozhodnutí Milana):**
1. GitHub: založit `Anamax443/agent-platform-foundation`, public vs. private (viz `PLATFORM-NOTES.md §6.1`), první commit + push.
2. `ai-agenti`: doplnit řádky do `sablony/navrhovy-list.md` podle `PLATFORM-NOTES.md §5`.
3. Anglická parita norem (klasika CZ + EN); README už bilingvní.
4. Až vznikne první nová komponenta: napsat ji proti `contracts/` a profilům z `VERIFICATION-CONTRACT.md`; druhá nová komponenta pak naplní podmínku `EXISTS × 2`.

**Nestavět:** žádný runtime, žádný sdílený balíček, žádný registry service. Podmínka `EXISTS × 2` zatím splněna jen pro `/version`.
