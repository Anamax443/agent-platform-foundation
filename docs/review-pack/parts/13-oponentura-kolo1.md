# ČÁST XIII — Protokol 1. kola oponentury

| | |
|---|---|
| **Předmět** | balíček v1.0-draft (5. 9. 2026 dopoledne) |
| **Posudky** | čtyři nezávislé, doručené 5. 9. 2026 odpoledne, označené A až D |
| **Výsledek** | 31 nálezů: 22 přijato, 6 přijato s úpravou, 3 odmítnuty s důvodem; vydání 1.0-rc |
| **Metoda** | každý nález má sekci, rozhodnutí a odkaz na změnu; odmítnutí má důvod, který lze napadnout ve 2. kole |

## 13.1 Posudky

| Posudek | Skóre | Verdikt | Charakter | Poznámka autora |
|---|---|---|---|---|
| A | 8,2 | přijmout s výhradami | osm oblastí + pět strukturovaných nálezů ve formátu z 0.5 | jediný, kdo označil podpis uvnitř podepisovaného objektu jako BLOCKER; správně |
| B | 6,8 | PŘEPRACOVAT | „modulární testování fatálně poddimenzované", tři BLOCKER, osm MAJOR, návrh rodiny `INT` | dva ze tří BLOCKER se opírají o tvrzení, že kompatibilita a CDC nejsou BLOCK gate; v III §2 byly. Třetí (blast radius) je oprávněný. Struktura posudku opakuje předchozí kolo téhož recenzenta. Věcný přínos (rodina `INT`, golden master workflow, selhání per error class) je i tak přijat. |
| C | 8,5 | PŘEPRACOVAT, pak přijmout | zveřejněná rubrika s vahami, hodnoticí list se součty podle 0.5, osm nálezů | nejlépe splnil požadovaný formát; vážený součet 8,11 zaokrouhlil na 8,5 bez vysvětlení; nálezy o testing tax a catch-22 byly nejužitečnější v celém kole |
| D | 8,6 | přijmout | izolační třídy, odvozené profily, claim vs autorita, conformance tiers, kompatibilita ve více dimenzích | doručen zkrácený (text končí uprostřed §9); nálezy 1 až 8 zapracovány, zbytek se žádá do 2. kola |

Rozptyl skóre 6,8 až 8,6 pro stejný text potvrzuje, proč hodnoticí list v části X žádá součty nálezů místo čísla. Součty čtyř posudků: BLOCKER 4 (z toho 2 sporné), MAJOR 21, MINOR 9, NOTE 5.

## 13.2 Nálezy a rozhodnutí

Rozhodnutí: **P** přijato, **PÚ** přijato s úpravou, **O** odmítnuto, **Z** vzato na vědomí bez změny normy.

| # | Nález | Kdo | Závažnost | Rozh. | Změna |
|---|---|---|---|---|---|
| 1 | `binding.signature` uvnitř podepisovaného `TrustedExecutionContext`; paradox kanonizace | A (BLOCKER), otázka IV-2 | BLOCKER | **P** | nové `dispatch-envelope.v1` `{ message, context, binding }`; podpis nad JCS `{ message, context }`; `binding` odstraněn z contextu; II §4.3, IV 4.3b |
| 2 | Rotace podpisového klíče uprostřed asynchronního doručení zasekne frontu | A, B (MAJOR), C v T3 | MAJOR | **P** | `keyId` povinné; grace period ≥ maximální `deadlinePolicy` na transportu; `SEC-CRED-002`; II §4.3 |
| 3 | Mechanismus bindingu nevybraný = divergentní adaptery, ad-hoc de-facto standard | C (MAJOR) | MAJOR | **P** | default `signed-envelope` HMAC-SHA256 / Ed25519; alternativy jen s doloženou ekvivalencí; `SEC-CTX-005`; ADR-001 revize |
| 4 | Executor Host: logická izolace ≠ fyzická; blast radius bez testu | A (MINOR), B (BLOCKER), C (MAJOR), D (MAJOR) | MAJOR | **P** | `isolationClass` LOGICAL / PRINCIPAL / PROCESS; minimum z `riskClass` vynucené schématem; HIGH v hostu jen s `isolationDecision`; CRITICAL = PROCESS; `SEC-HOST-001` + `MUT-HOST-001`; explicitní věta „logicky a kryptograficky, ne procesově"; II §3.2, ADR-003 |
| 5 | Testing tax podhodnocená ~3×; catch-22 generátor vs `EXISTS × 2` | A (MAJOR), C (MAJOR) | MAJOR | **PÚ** | profil `WRITE_EXECUTOR` rozdělen na MUST (8 testů + 4 mutanty) a CONDITIONAL odvozené z descriptoru; testovací podpora (fixtures, generátor, runner) vyňata z Core Admission jako součást kontraktového balíčku; odhad revidován na ≈ 20 h pro MUST sadu; III §7, II §9 P2. **Neúplně přijato:** odhad ×3 platil pro plnou sadu; po rozdělení se ověří až první implementací (X-22 otevřená) |
| 6 | Mutanty nereálné bez toolingu; nahradit statickým linterem (A) / uvolnit na CANDIDATE (C) | A (MAJOR), C (MINOR) | MAJOR | **PÚ** | MUST sada zůstává (`MUT-PRIV-001`, `MUT-CTX-001`, `MUT-IDM-001..002`, `MUT-HOST-001`); ostatní CANDIDATE s triggerem třetí executor; výjimka pro první komponentu: manuální evidence. **Odmítnuta část:** linter jako náhrada mutantu; linter říká, že kód vypadá správně, mutant říká, že test pozná, když nevypadá. III §6 |
| 7 | Clock abstraction nevymahatelná code review u solo operátora; `IDM-DEADLINE-001` trvale flaky ve starých projektech | C (MAJOR) | MAJOR | **P** | lint pravidlo v CI pro soubory platformové logiky; existující projekty explicitně vyňaty (rozhodnutí vlastníka); `ClockFixture` od první komponenty; III §8.1, ADR-010 |
| 8 | F8 je meta-invariant o normě, ne o systému | C (MINOR), B (OK), otázka X-2 | MINOR | **P** | F8 → P1 v §9 se stejnou blokační silou; sedm runtime invariantů; ADR-012 přepsán |
| 9 | Rozpor `retryable: false` a nový command v trace C; chybí `reissuable` | C (MAJOR), vlastní 6.7.1 | MAJOR | **P** | `reissuable` v error objektu; tabulka platformových kódů s oběma vlastnostmi; II §4.5, §5.4, ADR-014 |
| 10 | `FINISH_ON_PINNED` bez nouzové migrace; zranitelný krok se musí dokončit | A (MAJOR) | MAJOR | **P** | `MIGRATE_INSTANCE(workflowId, toVersion)` s mapováním stavů, autorizací, auditem, důvodem `SECURITY_HOTFIX`; `WF-VER-002`; II §5.7, ADR-004 |
| 11 | Reconciliation bez fallbacku, když sama selhává (banka 500 po 24 h) | A (MAJOR), B (MAJOR), otázka X-16 | MAJOR | **P** | `reconciliationBudget` (default 3) → `WAITING(REVIEW)`; neznámý výsledek reconciliace se počítá jako pokus; `WF-UNK-002`; II §5.1 |
| 12 | Plný audit log: fail-closed zastaví farmu | B (MAJOR), otázka X-19 | MAJOR | **P** | provozní režimy `FULL` / `DEGRADED` / `READ_ONLY` / `DISABLED`; plný audit store → `READ_ONLY` (čtení ano, side effect ne); `RES-STOR-002`; II §6.6 |
| 13 | Tolerance hodin mezi komponentami | B (MINOR), otázka X-17 | MINOR | **P** | +30 s přijato, skew nad 5 s logován, nad 30 s `COMMAND_EXPIRED`; `IDM-DEADLINE-002`; II §5.4 |
| 14 | Únik untrusted obsahu přes `details` error objektu | B (MINOR), otázka X-18 | MINOR | **P** | `EVD-005` scan error objektů; III §4 |
| 15 | Descriptor si sám volí testovací profily; `sideEffects: external-write` s profilem jen `PROVIDER` nesmí být možné | D (MAJOR) | MAJOR | **P** | profily odvozené z vlastností a vynucené schématem (`sideEffects` → WRITE_EXECUTOR + EVIDENCE, `usesLlm` → AI_CAPABILITY, `MULTI_TENANT_ACTIVE` → MULTI_TENANT, `dependsOn` → MODULE_DEPENDENCY, vždy PROVIDER); 7 negativních testů; CI `derivedProfiles == executedProfiles`; III §1, ADR-013 |
| 16 | Descriptor míchá claim a autoritu; provider si sám uděluje oprávnění | D (MAJOR), otázka IV-6 | MAJOR | **P** | descriptor = claim, platform policy = autorita, samostatný artefakt; `requiredScopes` zůstává jako deklarace požadavku; formát policy CANDIDATE; II §8, ADR-013 |
| 17 | Golden fixtures zmrazí implementaci; potřeba exact / semantic / property / AI-eval | D | MAJOR | **P** | `conformanceTier` v descriptoru; `INT-REPLACE-001` porovnává podle tieru; III §5 |
| 18 | Chybí rodina integračních testů `INT` | B (BLOCKER) | BLOCKER dle B, MAJOR dle autora | **PÚ** | rodina `INT`: `INT-FAIL-001..004` (odvozeno z `dependsOn`), `INT-UPGRADE-001` (= `CDC-COMP-001`), `INT-E2E-001` (per workflow definice, `DURABLE_WORKFLOW`), `INT-REPLACE-001` (jen při náhradě). **Neprijato:** `INT-COMP-001` „dva reální provideři spolu" jako samostatný test (je to deployment smoke test, ne kontrakt; pokryto `CTR` + `INT-UPGRADE`); `INT-FAIL-005` pomalá odpověď sloučena do `INT-FAIL-001` se dvěma časováními. Závažnost snížena, protože `CDC` a kompatibilita už BLOCK byly; III §2, §4 |
| 19 | Chybí golden master end-to-end test workflow | B (BLOCKER) | BLOCKER dle B, MAJOR dle autora | **P** | `INT-E2E-001`: referenční vstup přes celý workflow s adapter fakes, porovnání stavů, auditu, review tasků a eventů podle `conformanceTier` workflow; III §4 řádek 47 |
| 20 | Compatibility matrix a CDC nejsou BLOCK gate | B (MAJOR ×2) | MAJOR | **PÚ** | byly BLOCK v III §2 (misread); doplněno explicitní „BLOCK CI job" v §12 a dvě dimenze navíc (conformance suite version, transport binding) podle D5; III §12 |
| 21 | Chybí varianty selhání závislosti per error class | B (MAJOR) | MAJOR | **P** | `INT-FAIL-001..004`: timeout, 5xx, business 4xx, schema-valid nesmysl; III §4 řádky 42–45 |
| 22 | Chybí test „handler A nemůže načíst credential B" a jeho mutant | B (BLOCKER), C (MAJOR), otázka X-9 | MAJOR | **P** | `SEC-HOST-001`, `MUT-HOST-001`; viz #4 |
| 23 | `MULTI_TENANT` profil bez kandidáta je předčasný; označit CANDIDATE | C (MINOR) | MINOR | **O** | profil se aktivuje jen deklarací `MULTI_TENANT_ACTIVE`; dokud taková komponenta neexistuje, žádný `TEN` test neběží, takže je efektivně podmíněný už teď. Snížit `TEN` z BLOCK na doporučený by znamenalo, že první multi-tenant komponenta smí být nasazena bez izolačních testů. Doplněna poznámka v III §1 a trigger na ověření seznamu povrchů v IX |
| 24 | `EXISTS × 2` brání zelené louce použít Core | A | MAJOR dle A | **PÚ** | vyjasněno, ne změněno: kontrakty a testovací podpora jsou k dispozici od prvního dne; `EXISTS × 2` platí jen pro sdílený runtime; II §9 P2 |
| 25 | Golden set labeluje autor promptu | A, C | NOTE | **Z** | přiznaná mez XII.A #6; mitigace (druhý labeler) mimo scope normy |
| 26 | Chybí standardní rozhraní pro dotaz stavu u systémů bez idempotency API | A | NOTE | **PÚ** | `statusQuery` povinné u `query-external-status` jako popis operace; standardní rozhraní CANDIDATE s triggerem druhý IRREVERSIBLE executor; IX |
| 27 | Generované testy testují jen strukturu, ne sémantiku | A | MAJOR dle A | **Z** | přijato jako explicitní limit generátoru (III §7.3); sémantické asserty a fixtures doplňuje vývojář; není to selhání generátoru, je to jeho definice |
| 28 | Evidence matrix neříká nic o integraci mezi projekty | B | NOTE | **Z** | správně; pět projektů, nula integrací; matice to nyní říká výslovně v XII.A #13; rodina `INT` je do první dvojice komponent specifikace |
| 29 | Core Admission ignoruje integrační tooling | B | MAJOR dle B | **O** | Core Admission se týká sdíleného runtime; integrační a testovací tooling je součást kontraktového balíčku a nepodléhá `EXISTS × 2` (P2). Námitka vznikla z původní formulace, která to neříkala; formulace opravena, pravidlo ne |
| 30 | `ESCALATE` bez cíle; `error: null` v ukázce | vlastní 6.7.2, 6.7.3 | MINOR | **P** | `escalateTo`, `maxEscalationDepth`; `EVD-006` validace tagovaných ukázek v `npm test` |
| 31 | `actorType` bez `scheduler` | vlastní IV-3 | MINOR | **P** | enum rozšířen |

## 13.3 Co se změnilo v souborech

| Soubor | Změna |
|---|---|
| `FOUNDATION-core.md` | 1.0-rc; §1 sedm invariantů; §3.2 izolační třídy; §3.3 krok 3 ověření bindingu; §4.3 dispatch envelope a default podpis; §4.5 `reissuable` a tabulka kódů; §5.1 reconciliation budget; §5.4 tolerance hodin; §5.7 migrace instance; §5.8 `escalateTo`; §6.6 provozní režimy; §8 odvozené profily, claim vs autorita; §9 P1, P2, co nepodléhá admission |
| `VERIFICATION-CONTRACT.md` | 1.0-rc; §1 odvozené profily + `MODULE_DEPENDENCY`; §2 `SEC-HOST`, `INT`; §4 řádky 34–48; §5 conformance tiers a minimum pro první capability; §6 MUST/CANDIDATE mutanty; §7 MUST/CONDITIONAL profil, tooling mimo admission; §8 lint; §11 CI; §12 BLOCK job a dvě dimenze; registr |
| `contracts/` | nové `dispatch-envelope.v1`; `trusted-context.v1` bez `binding`, `+scheduler`; `result-envelope.v1` `+reissuable`; `module-descriptor.v1` odvozené profily, `isolationClass`, `isolationDecision`, `conformanceTier`, `reconciliationBudget`, `statusQuery`, `dependsOn` |
| `scripts/validate-contracts.mjs` | 27 negativních případů; cross-file `$ref`; `EVD-006` validace tagovaných ukázek v docs |
| `PLATFORM-NOTES.md` | pět nových CANDIDATE položek s triggery |
| části balíčku | 0 (stav slabin), I (historie, tabulka změn), IV (4.0, 4.3b, odpovědi IV-2/3/6, nová IV-8), VI (dispatch obálka, tagované ukázky, descriptor s izolací, trace C, 6.7 vyřešeno), VII (revize ADR-001/002/003/004/010/012, nové ADR-013/014), X (stav otázek, nové X-31/32), XII (slabiny, registr, verze, změny) |

## 13.4 Co zůstává otevřené do 2. kola

1. Odhad práce pro MUST sadu (≈ 20 h) je nový odhad, ne měření. Ověří ho první implementace (X-8, X-22, X-31).
2. Rodina `INT` a `INT-E2E-001` nemají běžící případ; jsou specifikace (XII.A #13).
3. `SEC-HOST-001` je definován, ale neběžel na reálném runtime; izolace v Node.js / Workers je CANDIDATE (IX).
4. HMAC vs Ed25519 jako default (IV-8).
5. Posudek D byl doručen zkrácený; body o kompatibilitě ve více dimenzích jsou zapracovány jen z toho, co dorazilo (III §12). Žádáme úplný text.
6. Golden set labelovaný autorem promptu (XII.A #6) a separation of people (T9) zůstávají přiznané meze.

## 13.5 Poznámka k formě posudků

Požadavek 0.5 (sekce, nález, důsledek, návrh, závažnost; součty místo skóre) splnily posudky A a C. Posudek B použil vlastní strukturu se skóre po oblastech bez rubriky a s označením BLOCKER pro věci, které norma už měla jako BLOCK; věcné jádro bylo přesto cenné. Posudek D měl nejvíc strukturálně nových myšlenek a byl jediný, který výslovně ocenil, že sdílené kontrakty neznamenají sdílený runtime. Pro 2. kolo prosíme všechny čtyři o formát z 0.5 a o čtení části XIII před zbytkem.
