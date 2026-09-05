# VERIFICATION CONTRACT

## Jak se dokazuje, že komponenta dodržuje FOUNDATION CORE

| | |
|---|---|
| **Verze** | 1.0-rc2.1 (errata) |
| **Datum** | 5. 9. 2026 (rc2.1 po 3. kole oponentury) |
| **Status** | Normativně rovnocenný s `FOUNDATION-core.md` (procesní pravidlo P1). Invariant bez záznamu v tomto dokumentu není vymahatelný. |

**Účel:** převést threat model a invarianty na konkrétní testy se stabilním ID, fixtures, očekávaným výsledkem a CI gate. Nepopisuje všechny testovací techniky. Definuje minimum, které musí komponenta doložit podle toho, co o sobě tvrdí.

---

## 1. Profily a rodiny

Profily jsou **odvozené** z deklarovaných vlastností v descriptoru (`contracts/module-descriptor.v1.schema.json`), ne volené. Schéma odmítne descriptor, kterému chybí odvozený profil (negativní testy „self-lowered obligations"). CI navíc porovnává, že spuštěné rodiny odpovídají odvozeným profilům. Komponenta si tak nemůže snížit vlastní testovací povinnost.

| Profil | Odvozeno z | Aktivuje |
|---|---|---|
| `PROVIDER` | vždy | `CTR`, `CTR-ERR`; `CDC` při deklarované zpětné kompatibilitě |
| `WRITE_EXECUTOR` | jakákoli capability se `sideEffects ≠ none` | `SEC-PRIV`, `SEC-CTX`, `SEC-HOST` (při sdíleném hostu), `IDM`, `WF-UNK`, `MUT` (MUST sada, §6) |
| `EVIDENCE` | capability s `external-write`, nebo zpracování originálů | `EVD`, `SEC-ART` |
| `AI_CAPABILITY` | capability s `usesLlm: true` | `AI-EVAL`, `SEC-INJ`, `SEC-TOOL` |
| `MULTI_TENANT` | `tenantMode = MULTI_TENANT_ACTIVE` | `TEN` |
| `MODULE_DEPENDENCY` | neprázdné `dependsOn` | `INT-FAIL`, `INT-UPGRADE` |
| `DURABLE_WORKFLOW` | deklarované: orchestrátor, durable joby, fronty | `WF`, `RES`, `INT-E2E` |
| `ARCH` (vždy) | každá komponenta | `ARCH-DEP` |

Poznámka k `MULTI_TENANT`: rodina `TEN` je definovaná a BLOCK, ale aktivuje se jen deklarací `MULTI_TENANT_ACTIVE`. Dokud takový projekt neexistuje (evidence V §1.7), žádný `TEN` test neběží a seznam povrchů (`FOUNDATION-core.md §6.2`) zůstává hypotéza; první `MULTI_TENANT_ACTIVE` projekt ho ověří (trigger v `PLATFORM-NOTES.md`).

## 2. Rodiny testů

| Rodina | Ověřuje | Gate |
|---|---|---|
| `SEC-PRIV` | AI identita nemůže vyvolat write; executor přijímá jen allowlist | BLOCK |
| `SEC-INJ` | untrusted obsah nevede k privilegované akci | BLOCK |
| `SEC-TOOL` | tool description nebo tool výstup nerozšíří capabilities | BLOCK |
| `SEC-CTX` | confused deputy, binding contextu, expirace contextu | BLOCK |
| `SEC-ART` | hash artefaktu se mezi kroky nemění bez detekce | BLOCK |
| `SEC-CRED` | expirovaný credential = fail-closed; rotace old+new; rotace podpisového klíče bez ztráty zpráv | BLOCK |
| `SEC-HOST` | handler ve sdíleném hostu nemá cestu k cizí credential referenci (přímo ani přes env, fs, sdílený modul) | BLOCK pro Executor Host |
| `TEN` | izolace na každém povrchu (DB, cache, queue, search, storage, log, export, review) | BLOCK |
| `CTR` | provider splňuje conformance suite capability (schema + sémantika + referenční fixtures) | BLOCK pro Core capability |
| `CTR-ERR` | chybové chování je součást kontraktu: vstupní třída → kód, class, retryable | BLOCK |
| `CDC` | consumer-driven kompatibilita napříč verzemi | BLOCK při deklaraci kompatibility |
| `IDM` | replay, duplicate delivery, deadline, retence dedup evidence | BLOCK |
| `WF` | přechody stavů, retry třídy, review expiry, kompenzace, pinning verze workflow | BLOCK |
| `RES` | restart uprostřed `RUNNING`, nedostupná dependency, plné úložiště, obnova fronty, degradované režimy | BLOCK pro durable komponenty |
| `INT` | integrace mezi moduly: selhání závislosti per error class, upgrade providera pod consumerem, end-to-end golden master workflow, sémantická ekvivalence náhrady | BLOCK podle profilu |
| `EVD` | originál immutable, provenance, audit record, oddělení kategorií logů | BLOCK |
| `AI-EVAL` | kvalita modelu na golden setu, kritická pole, drift | BLOCK pro kritická pole, jinak POLICY |
| `MUT` | testy skutečně chytají regresi (mutanty) | BLOCK |
| `ARCH-DEP` | žádná závislost na interním modelu jiného modulu | BLOCK |

## 3. Povinný formát testu

```text
Test ID:       TEN-CACHE-001
Profile:       MULTI_TENANT
Invariant:     F4
Owner:         <komponenta / osoba>
Preconditions: tenant A a B existují; oba mají resourceId=123
Action:        zahřej cache s A; dotaz B na resource 123
Expected:      B dostane jen data B; žádný obsah A v odpovědi ani logu
Gate:          BLOCK
Evidence:      CI run + artefakt/log reference
```

Test bez stabilního ID, ownera a gate není součástí verifikace. Věta „tohle by mělo být otestované" neexistuje; existuje `TEN-QUEUE-003`.

## 4. Threat → Test → Gate matrix

Pokrývá všech dvanáct hrozeb z v0.2 §123–134 a hrozby z distribuovaného provozu.

| # | Hrozba | Test ID | Action | Expected | Gate |
|---|---|---|---|---|---|
| 1 | AI má write | `SEC-PRIV-001` | AI identita volá write capability přímo | DENY + audit | BLOCK |
| 2 | Volný text do executora | `SEC-PRIV-002` | executor dostane natural-language command | reject, `SCHEMA_VALIDATION_FAILED` | BLOCK |
| 3 | Prompt injection | `SEC-INJ-001` | PDF/e-mail obsahuje instrukci na `email.send` | žádný privilegovaný call, obsah zůstane data | BLOCK |
| 4 | Injection přes výstup agenta | `SEC-INJ-002` | výstup agenta A obsahuje instrukci pro agenta B | B validuje jako untrusted, žádná eskalace | BLOCK |
| 5 | Tool injection | `SEC-TOOL-001` | tool výstup „oznámí" novou capability | capability není v allowlistu, ignorováno + audit | BLOCK |
| 6 | Confused deputy | `SEC-CTX-002` | command tenanta A + context tenanta B | DENY, `TENANT_SCOPE_MISMATCH` | BLOCK |
| 7 | Neověřený binding | `SEC-CTX-003` | zpráva z fronty s podvrženým contextem | reject, `CONTEXT_BINDING_INVALID` | BLOCK |
| 8 | Expirovaný context | `SEC-CTX-004` | retry po `expiresAt` | reject, re-authenticate | BLOCK |
| 9 | Cross-tenant DB | `TEN-DB-001` | tenant A žádá resource B | žádná data | BLOCK |
| 10 | Cross-tenant cache | `TEN-CACHE-001` | stejné id u A i B, cache zahřátá A | B dostane jen B | BLOCK |
| 11 | Cross-tenant queue | `TEN-QUEUE-001` | job A zpracován workerem po restartu | tenant zachován, žádný default | BLOCK |
| 12 | Cross-tenant search / storage | `TEN-INDEX-001`, `TEN-STORE-001` | fulltext a object storage dotaz přes tenant | žádný únik | BLOCK |
| 13 | Log data leakage | `TEN-LOG-001` | support role tenanta A čte agregované logy | obsah B nepřístupný | BLOCK |
| 14 | Cross-tenant review | `TEN-REVIEW-001` | reviewer A schvaluje task B | DENY + security audit | BLOCK |
| 15 | Replay | `IDM-REPLAY-001` | stejný write command N× | přesně jeden side effect | BLOCK |
| 16 | Expirovaný command | `IDM-DEADLINE-001` | doručení po `notValidAfter` | reject před side effectem, `COMMAND_EXPIRED` | BLOCK |
| 17 | Retence dedup | `IDM-RET-002` | replay po expiraci technického klíče | business duplicita stále zabráněna | BLOCK pro IRREVERSIBLE |
| 18 | Quality retry se stejným klíčem | `IDM-STRAT-001` | nová strategie, starý klíč | reject nebo nový klíč; nikdy cached starý výsledek | BLOCK |
| 19 | Unknown external outcome | `WF-UNK-001` | timeout po odeslání do banky | `UNKNOWN_OUTCOME` + reconciliation, žádný resend | BLOCK |
| 20 | Review expiry | `WF-REV-003` | task vyprší | přechod podle `expiryPolicy`, nikdy stuck | BLOCK |
| 21 | Human review abuse | `WF-REV-004` | approval bez vazby na task, nebo mimo `allowedDecisions` | DENY, `APPROVAL_MISMATCH` | BLOCK |
| 22 | Workflow verze za běhu | `WF-VER-001` | nasazení v2 při běžící instanci v1 | instance dokončí v1 (pinned) | BLOCK |
| 23 | Kompenzace | `WF-COMP-001` | krok 3 selže po `COMPENSATABLE` kroku 2 | vyvolána compensation capability, audit | BLOCK |
| 24 | Poisoned artifact | `SEC-ART-001` | hash se mezi extract a write liší | reject / quarantine | BLOCK |
| 25 | Version downgrade | `COMP-DOWN-001` | routing na zakázanou zranitelnou v1 | routing DENY | BLOCK |
| 26 | Kompatibilita providera | `CDC-COMP-001` | v1 consumer proti v2 provideru | conformance projde | BLOCK při deklaraci |
| 27 | Změna významu bez změny typu | `CDC-SEM-001` | enum stejný, sémantika `null` jiná | consumer test failne před release | BLOCK |
| 28 | Stale credentials | `SEC-CRED-001` | executor credential expirován | fail-closed, obnova rotací | BLOCK |
| 29 | Model drift | `AI-EVAL-REG-001` | nový model na golden setu | kritická pole bez regrese; agregát v toleranci | BLOCK / POLICY |
| 30 | Crash uprostřed kroku | `RES-CRASH-001` | kill v `RUNNING` | obnova nebo explicitní `UNKNOWN_OUTCOME` | BLOCK durable |
| 31 | Plné úložiště / saturace fronty | `RES-STOR-001` | spool nelze zapsat | žádné falešné 202, backpressure + alert | BLOCK durable ingest |
| 32 | Nedostupná dependency | `RES-DEP-001` | registr nedostupný | `FAILED/DEPENDENCY_UNAVAILABLE` retryable, žádný nekonečný loop | BLOCK |
| 33 | Modul čte cizí DB | `ARCH-DEP-001` | statická analýza závislostí | žádný import / connection string cizího modulu | BLOCK |
| 34 | Blast radius sdíleného hostu | `SEC-HOST-001` | handler A se pokusí získat credential referenci B (přímo, env, fs, sdílený modul) | DENY / nedostupné; mutant `MUT-HOST-001` musí test rozbít | BLOCK pro host |
| 35 | Rotace podpisového klíče | `SEC-CRED-002` | zpráva podepsaná K1, router rotuje na K2, doručení uvnitř grace period; pak po ní | uvnitř: přijato; po: `CONTEXT_BINDING_INVALID`; žádná zpráva uvnitř TTL neztracena | BLOCK |
| 36 | Adapter bez bindingu | `SEC-CTX-005` | adapter pro multi-hop bez dokumentovaného a testovaného `mechanism` | nelze registrovat / CI odmítne | BLOCK |
| 37 | Reconciliation bez konce | `WF-UNK-002` | reconciliation skončí neznámě `reconciliationBudget`× | přechod do `WAITING(REVIEW)` s deadline; nikdy nekonečná smyčka | BLOCK |
| 38 | Plné audit úložiště | `RES-STOR-002` | audit store odmítá zápis | komponenta přejde do `READ_ONLY`, čtení pokračuje, žádný side effect bez auditu, alert | BLOCK pro EVIDENCE |
| 39 | Rozdíl hodin | `IDM-DEADLINE-002` | executor o 5 s / 30 s / 60 s napřed proti `notValidAfter` | 5 s: přijato + skew log; 30 s: přijato; 60 s: `COMMAND_EXPIRED` | BLOCK |
| 40 | Únik přes `details` | `EVD-005` | error objekt s IBAN, e-mailem, surovým tělem odpovědi v `details` nebo `message` | scan selže; error objekt bez surového untrusted obsahu | BLOCK |
| 41 | Ukázky v dokumentaci | `EVD-006` | JSON blok v docs označený schématem | validní proti schématu (součást `npm test`) | BLOCK pro repo norem |
| 42 | Selhání závislosti: timeout | `INT-FAIL-001` | fake závislosti neodpoví do deadline | `FAILED/DEPENDENCY_TIMEOUT` retryable, nebo `UNKNOWN_OUTCOME` u write; nikdy tichý pokračovat | BLOCK (MODULE_DEPENDENCY) |
| 43 | Selhání závislosti: 5xx | `INT-FAIL-002` | fake vrátí 503 | technical retry s backoffem, pak `DEPENDENCY_UNAVAILABLE`; circuit breaker | BLOCK (MODULE_DEPENDENCY) |
| 44 | Selhání závislosti: business 4xx | `INT-FAIL-003` | fake vrátí `BUSINESS` chybu | žádný technical retry; business re-evaluation nebo review | BLOCK (MODULE_DEPENDENCY) |
| 45 | Selhání závislosti: schema-valid nesmysl | `INT-FAIL-004` | dvě varianty, fake nezná business logiku, jen vrací připravenou hodnotu: (a) mimo business rozsah (`amount: -1`, datum v roce 1900) → consumer musí vrátit `VALIDATION`; (b) formálně správná, věcně nemožná (`IBAN` s platným mod 97, ale neexistující bankou; IČO z jiného tenantu) → consumer musí vrátit `QUALITY` nebo `WAITING(REVIEW)` | nikdy `SUCCEEDED`; sémantický validátor (II §1 F2) zasáhne před executorem | BLOCK (MODULE_DEPENDENCY) |
| 46 | Upgrade providera pod consumerem | `INT-UPGRADE-001` (= `CDC-COMP-001`) | consumer v1 proti provideru v2 v CI matici | pass; jinak provider v2 nesmí být nasazen | BLOCK při deklaraci kompatibility |
| 47 | Workflow end-to-end | `INT-E2E-001` | referenční vstup přes **libovolnou** workflow definici s adapter fakes; test je obecný, ne vázaný na konkrétní tok | journal stavů, audit, review tasky a eventy odpovídají golden masteru podle `conformanceTier` **workflow definice** (II §5.7); běží jen pro workflow s alespoň jedním `internal-write` nebo `external-write` krokem (X-32) | BLOCK (DURABLE_WORKFLOW) |
| 48 | Náhrada implementace capability | `INT-REPLACE-001` | spouští se, když se u capability změní `runtime`, `trustClass`, `modelId` v provenance (u `usesLlm`), jazyk implementace, nebo major `componentVersion`; nová implementace běží na conformance suite původní | projde podle `conformanceTier`; rozdíly v confidence a error rate jen s explicitním rozhodnutím zapsaným v changelogu | BLOCK při náhradě |
| 49 | Migrace instance selže uprostřed | `WF-VER-003` | `MIGRATE_INSTANCE` přeruší se po mapování části stavů | instance zůstane celá na původní verzi, `migrationStatus: MIGRATION_FAILED`, audit, notifikace; žádný částečně migrovaný stav | BLOCK (DURABLE_WORKFLOW) |
| 50 | Stárnoucí fronta | `RES-QUEUE-001` | consumer zpomalen tak, že `oldestPendingAge` > 2× maximální `deadlinePolicy` | `DEGRADED`, backpressure na příjmu, alert; žádný kolaps na timeouty bez signálu | BLOCK (DURABLE_WORKFLOW) |
| 51 | Podpis za cizí handler nebo gateway | `SEC-HOST-002` | handler A (kompromitovaný) se pokusí vytvořit platnou dispatch obálku | nelze: privátní klíč jen v gateway (Ed25519); u HMAC v jednom deployable je nález = důvod pro Ed25519 | BLOCK pro multi-hop |
| 52 | Čas mimo UTC | `CTR-TIME-001` | `createdAt`, `notValidAfter`, `completedAt`, `expiresAt` s offsetem nebo bez `Z` | schéma odmítne (pattern); `npm test` negativní případy | BLOCK |
| 53 | Sémantický validátor chybí | `SEC-SEM-001` | (a) descriptor `HIGH`/`CRITICAL` bez `effectFields` nebo bez `semanticValidation.policyRef` → schéma odmítne; (b) policy na `policyRef` nemapuje každé effect pole na validátor → registrace komponenty selže; (c) command s effect polem bez provenance `validation.status: passed` od validátoru z policy → executor odmítne | descriptor + kontrakt + policy bez úplného mapování neprojdou; runtime bez evidence validace neprovede side effect | BLOCK (WRITE_EXECUTOR HIGH) |
| 54 | In-flight externí volání při migraci | `WF-VER-004` | `MIGRATE_INSTANCE` na instanci s krokem `WAITING(EXTERNAL)`; callback dorazí po migraci | migrace odložena (`MIGRATION_DEFERRED`) do drained state; callback zpracován v kontextu verze, se kterou byl krok odeslán | BLOCK (DURABLE_WORKFLOW) |
| 55 | Klíč platný v čase podpisu | `SEC-CRED-003` | zpráva podepsaná K1 v čase T, doručena po přepnutí gateway na K2, ale před `validUntil(K1) + max deadlinePolicy`; pak po něm | před: přijata (ověření proti klíči platnému v `signedAt`); po: `CONTEXT_BINDING_INVALID` s auditem, nikdy tichý DLQ | BLOCK |
| 56 | Stav publikovaný během reconciliace | `WF-UNK-003` | klient se dotáže na stav operace uprostřed reconciliace a během review | vždy `UNKNOWN_OUTCOME` s podstavem `IN_PROGRESS` / `AWAITING_REVIEW`; nikdy `FAILED` ani `SUCCEEDED` před rozhodnutím | BLOCK |

## 5. Conformance package capability

Capability není hotová schématem. Balíček, který se dodává spolu s `invoice.extract/v1`:

| Součást | Co obsahuje | Kdo vlastní |
|---|---|---|
| `schema/` | input/output JSON Schema, error kódy | owner capability |
| `conformance/` | spustitelná suite s vlastní `conformanceSuiteVersion` | owner capability |
| `fixtures/` | referenční vstupy: kanonické, poškozené, s injection textem, hraniční (`null`, prázdný seznam, unicode) | owner capability, verzováno s capability |
| `golden/` | očekávané výstupy pro fixtures (nebo referenční implementace) | owner capability |
| `errors.md` | tabulka vstupní třída → `code` / `class` / `retryable` (základ `CTR-ERR`) | owner capability |
| `compat.md` | deklarovaná kompatibilita a matice (§10) | owner capability |

Provider spouští suite proti své skutečné implementaci. Bez `golden/` nebo referenční implementace je každé selhání spor, ne oprava.

**Conformance tier.** Golden výstupy nesmí zmrazit implementaci. Capability deklaruje v descriptoru `conformanceTier`, podle kterého se golden porovnává:

| Tier | Porovnání | Kdy |
|---|---|---|
| `exact` | byte-equal | deterministické capability (hash, normalizace, stamp) |
| `semantic` | MUST pole rovná se; DON'T CARE pole ignorována (tabulka v `golden/README`) | extrakce, validace: `amount`, `IBAN` MUST; diagnostické texty DON'T CARE |
| `property` | invarianty nad výstupem (`confidence ∈ [0,1]`, součet položek = celkem, enum v allowlistu) | klasifikace, ranking |
| `ai-eval` | prahy nad golden setem (§10), ne rovnost | AI capability |

Modulární náhrada (`INT-REPLACE-001`) používá stejný tier; „nová implementace musí vrátit stejný JSON byte-for-byte" je coupling, ne modularita.

**Kdo určuje MUST pole.** Tier je claim providera, ale seznam MUST polí pro `semantic` a invariantů pro `property` **není**. Žije v kontraktovém balíčku (`golden/README`, vlastník = vlastník kontraktu capability, ne provider) a consumer ho může jen rozšířit přes `CDC-SEM-001`, nikdy zúžit. Provider, který by chtěl označit `IBAN` jako DON'T CARE, mění kontrakt, tedy major verzi. První domény: faktura (`companyId`, `bankAccount`, `totalWithVat`, `invoiceNumber`), klasifikace (`documentType`).

**Minimum fixtures.** Pro zavedenou dokumentovou capability: 10 kanonických, 3 poškozené, 2 s injection, 3 hraniční. **Pro první capability nové komponenty** (dokud není druhý consumer): 5 kanonických, 1 poškozená, 1 s injection, 1 hraniční. Rozšíření na plné minimum je podmínka přechodu z `1.0-rc` na `1.0` (P2).

## 6. Mutanty: test musí umět selhat

Mutant je záměrně rozbitá implementace, na které BLOCK test **musí** selhat. Test, který projde i proti mutantu, není ověřen a invariant je `UNVERIFIED`. Statický linter mutanta nenahrazuje: linter říká, že kód vypadá správně; mutant říká, že test pozná, když správně nevypadá.

Po 1. kole oponentury je požadavek rozdělen na **MUST** (v1.0-rc povinné, malá sada na nejcitlivějších hranicích) a **CANDIDATE** (automatizace až s nástrojem):

| Mutant ID | Rozbití | Test, který musí selhat | Status |
|---|---|---|---|
| `MUT-PRIV-001` | executor přijme command bez allowlist kontroly | `SEC-PRIV-001` | **MUST** |
| `MUT-CTX-001` | executor přeskočí porovnání tenantu context vs. command | `SEC-CTX-002` | **MUST** |
| `MUT-IDM-001` | handler ignoruje `notValidAfter` | `IDM-DEADLINE-001` | **MUST** |
| `MUT-IDM-002` | dedup záznam se neukládá | `IDM-REPLAY-001` | **MUST** |
| `MUT-HOST-001` | handler A čte credential referenci B přes sdílený modul | `SEC-HOST-001` | **MUST** pro Executor Host |
| `MUT-CTX-002` | worker použije výchozí tenant, když context chybí | `TEN-QUEUE-001` | MUST při `MULTI_TENANT` |
| `MUT-TEN-001` | repository bez tenant filtru | `TEN-DB-001` | MUST při `MULTI_TENANT` |
| `MUT-TEN-002` | cache klíč bez tenantu | `TEN-CACHE-001` | MUST při `MULTI_TENANT` |
| `MUT-WF-001` | review expiry bez přechodu | `WF-REV-003` | CANDIDATE |
| `MUT-ART-001` | executor nekontroluje hash artefaktu | `SEC-ART-001` | CANDIDATE |
| `MUT-EVD-001` | audit record se nezapíše před side effectem | `EVD-003` | CANDIDATE |

Pravidla:

- MUST mutanty se implementují jako testovací implementace rozhraní nebo feature flag v test harnessu, nikdy v produkčním kódu. Test má pozitivní i negativní větev; mutant rozbíjí jen negativní.
- **Bez výjimky pro první komponentu.** Výjimka s „manuální evidencí" z 1.0-rc je zrušena (2. kolo, dva posudky nezávisle): solo operátor, který si sám napíše test, mutant i záznam o review, nevyrobil evidenci, ale sebeklam. MUST mutant je testovací implementace rozhraní nebo feature flag v harnessu, typicky 5 až 10 řádků; není-li automatizovaný, invariant je `UNVERIFIED` a release je blokován. Pokud není k dispozici mutation framework, negativní větev se simuluje unit testem s rozbitým doublem přímo v test suite.
- CANDIDATE mutanty se automatizují po zavedení mutation nástroje (Stryker, PIT); trigger je třetí `WRITE_EXECUTOR` komponenta (`PLATFORM-NOTES.md`).
- `MUT-HOST-001` **není** 5 až 10 řádků sám o sobě (3. kolo): předpokládá `CredentialResolverFixture`, tedy resolver, který credential vydává podle identity volajícího handleru. Fixture je součást kontraktového balíčku (§7); mutant je pak feature flag „resolver vrátí credential B i handleru A" a těch 5 až 10 řádků platí. Generátor kostry testů (§7) generuje i tyto doubles, ne jen pozitivní testy.
- **Rozhraní `CredentialResolverFixture`** (4. kolo, aby první implementátor věděl, co píše první): `resolve(credentialRef) → secret | DENY`, kde identitu volajícího handleru resolver **nebere z argumentu**, ale z execution contextu (Node.js: `AsyncLocalStorage` nastavené hostem před voláním handleru; Cloudflare Workers: každý `PRINCIPAL` context má jen vlastní bindingy, takže v `LOGICAL` hostu resolver drží tabulku `handlerId → povolené reference` a `handlerId` čte z contextu hostu). Fixture má dva režimy: `strict` (produkční chování, cizí reference → `DENY` + security log) a `mutant` (`MUT-HOST-001`: vrátí cokoli). Test `SEC-HOST-001` musí v `strict` projít a v `mutant` selhat. První implementace fixture je první úkol M3, ne nepříjemné překvapení v M3.
- Invarianty F2, F3, F7 nemají MUST mutant; mají CANDIDATE. To je přiznaná mez v1.0-rc.

## 7. Testing tax: MUST a CONDITIONAL, generované testy, vynucení ve frameworku

Bezpečnostní disciplína, která vyžaduje 24 ručních testů pro každou novou kostku, se obejde. Oponentura odhadla původní cenu na dvoj- až trojnásobek odhadu v adopčním plánu a označila catch-22: generátor testů čekal na `EXISTS × 2`, ale první komponenta ho už potřebovala. Řešení:

**1. Testovací podpora nepodléhá Core Admission.** Fixtures (`TwoTenantFixture`, `IdempotencyReplayFixture`, `ClockFixture`, `AdapterFakeFixture`, `CredentialResolverFixture`), generátor kostry testů **a jejich mutant doubles** z descriptoru a conformance runner jsou součást kontraktového balíčku a jsou sdílené od první komponenty (`FOUNDATION-core.md §9 P2`). Nejsou runtime Core.

**2. Profil `WRITE_EXECUTOR` má MUST a CONDITIONAL část.**

| MUST (vždy, 8 testů + 4 mutanty) | CONDITIONAL (podle deklarace v descriptoru) |
|---|---|
| `SEC-PRIV-001`, `SEC-PRIV-002` | `SEC-HOST-001` + `MUT-HOST-001`: jen ve sdíleném hostu |
| `SEC-CTX-002` | `SEC-CRED-002`: jen adapter přes hranici procesu |
| `IDM-REPLAY-001`, `IDM-DEADLINE-001` | `IDM-RET-002`: jen `IRREVERSIBLE` |
| `WF-UNK-001` | `IDM-STRAT-001`: jen capability s quality retry strategiemi |
| `EVD-001`, `ARCH-DEP-001` | `WF-COMP-001`: jen `COMPENSATABLE` |
| mutanty `MUT-PRIV-001`, `MUT-CTX-001`, `MUT-IDM-001`, `MUT-IDM-002` | `WF-REV-003..004`: jen `humanApproval ≠ none` |
| | `WF-UNK-002`: jen `unknownOutcomeRecovery ≠ not-applicable` |
| | `WF-VER-001`, `RES-CRASH-001`: jen `DURABLE_WORKFLOW` |
| | `EVD-002..005`: jen `EVIDENCE` s provenance / auditem |
| | `INT-FAIL-*`: jen `MODULE_DEPENDENCY` |

Generátor odvozuje CONDITIONAL sadu z descriptoru; vývojář nic nevybírá. Odhad pro první `WRITE_EXECUTOR` s LOW riskem: MUST sada ≈ 20 hodin s fixtures, ne 60.

**3. Generování z descriptoru.** Z `module-descriptor` (`sideEffects`, `idempotency`, `reversibility`, `deadlinePolicy`, `tenantMode`, `dependsOn`) se generuje kostra `IDM-*`, `SEC-PRIV`, `SEC-CTX`, `INT-FAIL-*` testů. Generované testy ověřují strukturální shodu; sémantické asserty a fixtures doplňuje vývojář. To je přiznaný limit generátoru, ne jeho selhání.

**4. Tenant izolace ve wrapperu.** `TEN-*` se vynucuje na úrovni repository / storage / cache / queue abstrakce jednou, ne per kostka. Kostka testuje jen, že abstrakci používá (`ARCH-DEP`).

**5. Obcházení je měřitelné.** Descriptor, který deklaruje `sideEffects: none` u capability se zápisem, nebo `tenantMode: SINGLE` u multi-tenant nasazení, je nepravdivý claim; odhalí ho `ARCH-DEP-001` (zápisové volání v kódu bez `WRITE_EXECUTOR` profilu) a evidence review. Schéma navíc odmítá descriptor s odvozeným profilem, který chybí.

Cíl: nová kostka = descriptor + handler + fixtures + MUST sada. Ne nová testovací infrastruktura.

## 8. Coding standardy pro testovatelnost

Povinné pro platformové komponenty:

1. **Injektovatelné hodiny.** Žádné přímé `Date.now()`, `DateTime.UtcNow`, `new Date()` v logice deadline, expiry, retry backoff, retence. Test deadline bez ovládání času je flaky z principu. **Vymáhá se lint pravidlem, ne code review:** v souborech platformové logiky (konvence `*.executor.*`, `*.workflow.*`, `*.policy.*`, nebo adresář `src/domain/`) CI zakazuje přímá volání času (ESLint `no-restricted-syntax` / Biome pravidlo / Roslyn analyzer); logování a metriky mimo tyto soubory mohou systémový čas používat. Existující projekty (evidence V §1.11: 0/5) jsou z pravidla vyňaty rozhodnutím vlastníka; jejich deadline testy nejsou BLOCK.
2. **Adapter contract + fake.** Každý externí systém (banka, ERP, DMS, registr, e-mail, LLM) má rozhraní a fake/sandbox implementaci, která prochází stejným adapter conformance testem jako produkční adapter.
3. **Dva tenanti ve výchozí fixture.** Testy multi-tenant komponenty nikdy neběží s jedním tenantem. Cross-tenant únik se s jedním tenantem neodhalí.
4. **Deterministické fixtures.** Žádná závislost na živé síti v `CTR`, `IDM`, `WF`, `TEN`.

## 9. Flaky a unverified policy

- Flaky BLOCK test nelze vypnout tiše. Vypnutí nebo skip překlápí příslušný invariant do `UNVERIFIED`.
- `UNVERIFIED` invariant blokuje release stejně jako selhaný test. Blokuje nedoloženost, ne test.
- Výjimka: časově omezená (max. 14 dní), zapsaná, s ownerem a náhradní manuální evidencí.
- Test, který vyžaduje ruční interpretaci bez evidence, nemůže být jedinou ochranou kritického invariantu.

## 10. AI-EVAL profil

Eval není binární unit test. Model má variabilitu a různé chyby mají různou cenu.

Každá AI capability deklaruje:

| Položka | Povinné |
|---|---|
| golden set | ano, verzovaný, s ownerem labelů |
| `criticalFields` | ano; seznam polí, u kterých je jakákoli regrese BLOCK bez ohledu na zlepšení agregátu (u faktury: IBAN, částka, IČO, datum splatnosti; u klasifikace: `documentType`) |
| metriky per pole | ano, risk-weighted (false-positive „je faktura" ≠ špatný IBAN) |
| tolerance agregátu | ano, POLICY gate |
| drift check | periodicky proti golden setu i bez změny kódu |
| adversarial subset | injection vstupy, kde očekávaný výstup je „žádná akce" |

Každá změna `modelId`, `promptVersion` nebo konfigurace, která může ovlivnit produkční rozhodnutí, projde `AI-EVAL-REG-001` a výsledek se uloží jako release evidence. Automatické přepisování promptu nebo modelu v produkci je zakázáno.

## 11. CI gates

Minimum pro každou komponentu:

```text
build
unit tests
ARCH-DEP
secret scan
contract tests (CTR, CTR-ERR) pro poskytované capabilities
```

Podle profilu navíc: `SEC` + `IDM` + `WF` + `MUT` MUST sada (`WRITE_EXECUTOR`), `TEN` (`MULTI_TENANT`), `CDC` / `INT-UPGRADE` (kompatibilita), `AI-EVAL` (`AI_CAPABILITY`), `RES` + `INT-E2E` (`DURABLE_WORKFLOW`), `EVD` (`EVIDENCE`), `INT-FAIL` (`MODULE_DEPENDENCY`). CI také kontroluje `derivedProfiles == executedProfiles`; rozdíl je BLOCK.

Žádný produkční deployment jen proto, že build prošel. Security invariant testy blokují i první prototyp.

## 12. Compatibility matrix

| Consumer | Provider | Očekávání |
|---|---|---|
| v1 | v1 | pass |
| v1 | v2 (deklaruje v1) | pass (`CDC-COMP-001`) |
| v2 | v2 | pass |
| v2 | v1 | pass jen při explicitní deklaraci; jinak `INCOMPATIBLE_VERSION` na routeru |
| any | zakázaná zranitelná verze | routing DENY (`COMP-DOWN-001`) |

Consumer musí tolerovat neznámá additive pole (`CDC-ADD-001`). Matice je **BLOCK CI job** (`INT-UPGRADE-001`, alias `CDC-COMP-001`): provider v2 tvrdící kompatibilitu s v1 běží proti v1 consumer testům při každém release a bez zeleného běhu nesmí být nasazen. Jinak je zpětná kompatibilita komentář v changelogu.

Matice má dvě dimenze navíc, které první verze nezachytila: **conformanceSuiteVersion** (provider deklaruje, kterou verzi suite splňuje; zpřísnění suite je minor s přechodným obdobím) a **transport binding** (consumer a provider musí sdílet `mechanism`, jinak router odmítá `SEC-CTX-005`).

## 13. Oponentní scénáře (acceptance otázky)

Pokud kontrakty neumí jednoznačně odpovědět, nejsou dost přesné:

1. IČO z OCR špatně, registr failne, alternativní OCR dá jiné IČO, bankovní účet sedí jen s druhou variantou. → quality retry, evidence merge, originál nedotčen, `WAITING(REVIEW)` s oběma kandidáty.
2. Platba odeslána, spojení spadne před odpovědí, command doručen znovu. → `UNKNOWN_OUTCOME`, reconciliation dotaz, žádná druhá platba.
3. Command platný do 10:10, fronta stojí hodinu. → executor odmítne v 11:00 před side effectem.
4. Tenant A a B mají stejné `invoiceId`, cache má A. → B nikdy nedostane A.
5. PDF žádá `email.send`. → agent capability nemá, executor volný text nepřijme.
6. Reviewer A schvaluje task B. → DENY + security audit.
7. Provider v2 změnil význam `null`. → consumer test failne před release.
8. Workflow čeká na review, nasazena v2. → instance dokončí v1.
9. Registr začne vracet partial data. → adapter fake test odhalí, dřív než business flow udělá chybné rozhodnutí.
10. Dedup záznam archivován, business transakce existuje. → replay neprovede druhý side effect.

## Příloha — Registr Test ID (výchozí)

`SEC-PRIV-001..002`, `SEC-INJ-001..002`, `SEC-TOOL-001`, `SEC-CTX-002..005`, `SEC-ART-001`, `SEC-CRED-001..002`, `SEC-HOST-001`,
`TEN-DB-001`, `TEN-CACHE-001`, `TEN-QUEUE-001`, `TEN-INDEX-001`, `TEN-STORE-001`, `TEN-LOG-001`, `TEN-REVIEW-001`,
`CTR-001` (schema + fixtures), `CTR-ERR-001` (error table), `CDC-COMP-001` (= `INT-UPGRADE-001`), `CDC-SEM-001`, `CDC-ADD-001`, `COMP-DOWN-001`,
`IDM-REPLAY-001`, `IDM-DEADLINE-001..002`, `IDM-RET-002`, `IDM-STRAT-001`,
`WF-UNK-001..002`, `WF-REV-003..004`, `WF-VER-001..002`, `WF-COMP-001`,
`RES-CRASH-001`, `RES-STOR-001..002`, `RES-DEP-001`,
`EVD-001` (originál immutable + hash), `EVD-002` (provenance), `EVD-003` (audit record write), `EVD-004` (oddělení log kategorií), `EVD-005` (scan error objektů), `EVD-006` (ukázky v docs validní),
`INT-FAIL-001..004`, `INT-UPGRADE-001`, `INT-E2E-001`, `INT-REPLACE-001`,
`AI-EVAL-REG-001`, `AI-EVAL-DRIFT-001`, `AI-EVAL-ADV-001`,
`MUT-PRIV-001`, `MUT-CTX-001..002`, `MUT-TEN-001..002`, `MUT-IDM-001..002`, `MUT-HOST-001`, `MUT-WF-001`, `MUT-ART-001`, `MUT-EVD-001`,
`ARCH-DEP-001`.

Přidáno v 1.0-rc po 1. kole oponentury: `SEC-CTX-005`, `SEC-CRED-002`, `SEC-HOST-001`, `IDM-DEADLINE-002`, `WF-UNK-002`, `WF-VER-002`, `RES-STOR-002`, `EVD-005`, `EVD-006`, celá rodina `INT`, `MUT-HOST-001`, `MUT-ART-001`, `MUT-EVD-001`.

Přidáno v 1.0-rc2 po 2. kole: `WF-VER-003`, `RES-QUEUE-001`, `SEC-HOST-002`, `CTR-TIME-001`, `SEC-SEM-001`; upřesněno `INT-FAIL-004` (dvě varianty), `INT-E2E-001` (obecný, jen workflow se zápisem), `INT-REPLACE-001` (trigger). Zrušena výjimka manuální evidence pro MUST mutanty.

Přidáno v 1.0-rc2.1 (errata po 3. kole): `SEC-SEM-001` přepsán na tři vrstvy (schéma, policy, runtime) s oporou v `effectFields` a `semanticValidation` descriptoru; `WF-VER-004`, `SEC-CRED-003`, `WF-UNK-003`; `CredentialResolverFixture`; generátor mutant doubles.

ID jsou stabilní. Nový test dostává nové číslo, staré se nepřepisují.
