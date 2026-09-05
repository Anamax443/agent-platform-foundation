# ČÁST IV — Kontrakty v1 s komentářem

Pět strojových kontraktů je v úplném znění vloženo níže (IV.7). Tento komentář vysvětluje **proč** jsou navržené takto a kde čekáme námitky.

## 4.0 Změny po 1. kole oponentury (1.0-rc)

| Změna | Důvod | Kde |
|---|---|---|
| Nové schéma `dispatch-envelope.v1`: `{ message, context, binding }`; podpis pokrývá JCS kanonizaci `{ message, context }` | podpis uvnitř podepisovaného objektu byl paradox (oponent A BLOCKER, otázka IV-2); podpis jen nad `messageId + context` by nechránil payload | 4.3b |
| `binding` odstraněn z `trusted-context.v1` | totéž | 4.3 |
| Default mechanismus `signed-envelope` (HMAC-SHA256 / Ed25519), `keyId` povinné, grace period pro rotaci | oponent C MAJOR (mechanismus nevybraný), A + B MAJOR (rotace klíče) | II §4.3, `SEC-CRED-002`, `SEC-CTX-005` |
| `actorType` rozšířen o `scheduler` | otázka IV-3 | 4.3 |
| `reissuable` v error objektu | rozpor `retryable` v trace C (oponent C MAJOR, otázka X-14) | 4.4 |
| Odvozené `verificationProfiles`: schéma odmítne descriptor bez profilu, který z deklarace plyne | oponent D MAJOR: komponenta si nesmí snížit vlastní testovací povinnost | 4.5 |
| `isolationClass` + `isolationDecision`, minimum z `riskClass` | všichni čtyři: logická izolace ≠ fyzická | 4.5 |
| `reconciliationBudget`, `statusQuery` (povinné u `query-external-status`), `conformanceTier`, `dependsOn` | reconciliation bez konce (A, B), chybějící rozhraní pro dotaz stavu (A), golden nesmí zmrazit implementaci (D), integrace (B) | 4.5 |
| Negativní testy: 12 → 27; validace tagovaných ukázek v docs (`EVD-006`) | vlastní nález 6.7.2 | 4.6 |
| Descriptor = claim; policy = autorita (samostatný artefakt) | oponent D MAJOR, otázka IV-6 | 4.5 |

## 4.1 Společná rozhodnutí napříč schématy

| Rozhodnutí | Důvod | Očekávaná námitka |
|---|---|---|
| `additionalProperties: false` všude | neznámé pole v obálce je buď chyba, nebo pokus o propašování trusted metadat (`tenantId`); u business `payload` naopak platí tolerance additive změn, ale tu řeší schéma capability, ne obálka | „brání evoluci obálky" → evoluce obálky = nová `v2`, obálka se mění zřídka |
| Identifikátory jako řetězce s omezeným patternem, doporučen ULID | ULID je lexikograficky řaditelný podle času, což pomáhá při čtení journalu; pattern zakazuje mezery a unicode v id | „proč ne UUID" → UUID je povolený, pattern ho přijme |
| Verze jako řetězec `"1"` nebo `"1.2"`, ne číslo | vyhnout se implicitním konverzím a `1.10 < 1.9` | — |
| Capability name `domain.action` malými písmeny s tečkou | English-only, bez diakritiky, čitelné v logu, jednoznačně parsovatelné; test odmítá `Invoice.Extract` i `invoice` | „co víceúrovňové domény" → `payment.sepa.execute` projde |
| Časy jako `date-time` (RFC 3339, UTC) | jediný formát, který se dá porovnat bez lokálních pravidel | — |
| Conditional `required` přes `if/then` | povinná pole závisí na `type` nebo `status`; validátor běží se `strictRequired: false`, protože podmíněné `required` odkazuje na vlastnosti rodiče (standardní vzor JSON Schema 2020-12) | „Ajv strict to odmítá" → přesně proto je volba zdokumentována v BUILD |
| `examples` uvnitř schématu | příklad je součást kontraktu a je testován | — |

## 4.2 Message envelope v1

**Účel:** caller-supplied obálka pro `command`, `event`, `query`. Nese routing a korelaci, **nenese důvěru**.

| Pole | Proč je tam | Proč je takové |
|---|---|---|
| `messageId` | identita jednoho doručení; dedup na transportu | jiné než `idempotencyKey`: opakované doručení téže logické intent má nový `messageId`, stejný `idempotencyKey` |
| `correlationId` | jeden end-to-end business tok | povinné vždy, i pro event; bez něj nejde rekonstruovat řetězec |
| `causationId` | která zpráva tuto vyvolala | volitelné; u první zprávy toku chybí |
| `workflowId`, `stepId` | vazba na durable workflow | volitelné, protože ne každá zpráva je krok workflow (např. `query` na health) |
| `type` | `command` \| `event` \| `query` | tři a jen tři; `result` je samostatná obálka |
| `capability`, `capabilityVersion` | co se žádá a v jaké verzi kontraktu | oprava rozporu z v0.1, kde obálka měla `target` místo capability |
| `schemaVersion` | verze tvaru `payload` | oddělené od `capabilityVersion` (příloha A jádra) |
| `idempotencyKey` | jedna logická write intent | povinné u `command`; doporučený tvar `workflowId:stepId:strategyId:n`, aby quality retry dostal nový klíč |
| `createdAt` | vznik zprávy | ne čas doručení |
| `notValidAfter` | po tomto čase se command nesmí provést | povinné u `command`; executor kontroluje těsně před side effectem |
| `payload` | domain obsah | validuje se schématem capability, ne obálkou |

**Co v obálce záměrně není:** `tenantId`, `actorId`, `scopes`, `targetComponent`, `sourceComponent`. To jsou trusted metadata (4.3). Test „tenantId in envelope" musí selhat a selhává.

**Otázka pro oponenty (IV-1):** je správné vyžadovat `idempotencyKey` a `notValidAfter` u **každého** commandu, i u capability se `sideEffects: none` (např. `document.classify`)? Argument pro: command je záměr změny stavu workflow, i klasifikace vytváří odvozeninu; cena je dvě pole. Argument proti: šum u čistě výpočetních kroků. Alternativa: `query` pro čistě výpočetní volání, což ale ohýbá význam slova query.

## 4.3 TrustedExecutionContext v1

**Účel:** identita, tenant a scopes vzniklé z ověřené identity, nikdy z payloadu. Vytváří gateway nebo router. Neměnný po dobu dispatch.

| Pole | Proč |
|---|---|
| `dispatchId` | identita jednoho trusted dispatch; jiná než `messageId`, protože stejná zpráva může být dispatchnuta vícekrát (retry) s novým contextem |
| `tenantId` | povinné vždy; single-tenant nasazení použije konstantu; „chybějící tenant" nesmí existovat jako stav |
| `actorId`, `actorType` | kdo dispatch provádí; `actorType` má šest hodnot včetně `ai-agent`, aby policy mohla říct „ai-agent nikdy nemá write scope" |
| `originatingActorId` | původní lidská nebo systémová identita na začátku řetězce; brání confused deputy přes více hopů |
| `authStrength` | jak silně byla identita ověřena; policy může vyžadovat `oidc-user` pro approval a odmítnout `session` |
| `scopes` | capabilities, které actor smí žádat; pattern připouští `invoice.*` |
| `sourceComponent`, `targetComponent` | routing metadata; `targetComponent` doplňuje router, caller ho nikdy nezadává |
| `authenticatedAt`, `expiresAt` | po `expiresAt` se context musí znovu odvodit; retry po expiraci je odmítnut (`SEC-CTX-004`); UTC se `Z` (`CTR-TIME-001`) |

Context **neobsahuje** `binding`; ten je ve vnější dispatch obálce (4.3b). Řádek, který ho tu v 1.0-rc ještě popisoval, byl pozůstatek draftu a je odstraněn.

**Otázka IV-2 (vyřešeno v 1.0-rc):** `binding` byl uvnitř contextu, tedy podepisovaný objekt obsahoval svůj vlastní podpis. Oponent A to označil jako BLOCKER a měl pravdu; „nechat na v2" nebyla obhajitelná úspora. Binding je nyní ve vnější obálce (4.3b).

**Otázka IV-3 (vyřešeno):** `actorType` má sedm hodnot včetně `scheduler`; cron jako `service` maskoval, že plánovač nemá lidského iniciátora a `originatingActorId` je tedy on sám.

### 4.3b Dispatch envelope v1

**Účel:** transportní obálka, která váže jednu zprávu k jednomu contextu a chrání obojí na drátě.

| Pole | Proč |
|---|---|
| `message` | obálka z 4.2, beze změny |
| `context` | context z 4.3, beze změny |
| `binding.mechanism` | `in-process` \| `signed-envelope` (default přes hranici procesu) \| `broker-identity` \| `token-bound` \| `mtls`; jiný než signed-envelope jen s doloženou ekvivalencí (`SEC-CTX-005`) |
| `binding.algorithm` | **default `Ed25519`**: privátní klíč jen v gateway, příjemci mají veřejný; kompromitovaný příjemce nebo handler nemůže podepisovat (T19, `SEC-HOST-002`). `HMAC-SHA256` jen když gateway a jediný příjemce jsou jeden deployable |
| `binding.keyId` | identita klíče, v obálce jediná; přechodné období řeší key registry příjemce, který drží aktuální i předchozí klíč (n verzí) po dobu grace period ≥ maximální `deadlinePolicy` na transportu; žádné vyjednávání po drátě (`SEC-CRED-002`) |
| `binding.signature` | base64url podpis nad JCS (RFC 8785) kanonizací `{ "message": message, "context": context }` |
| `binding.canonicalization` | `JCS`; jediná povolená, aby dva jazyky podepsaly stejné bajty |

Schéma vynucuje: `signed-envelope` → `algorithm`, `keyId`, `signature`, `signedAt`, `canonicalization` povinné; `in-process` → `signature` zakázán. Podpis pokrývá i payload: útočník na frontě nemůže vyměnit `paymentId` a nechat platný context.

**Otázka IV-8 (vyřešeno v 1.0-rc2):** HMAC předpokládal sdílený klíč mezi gateway a všemi příjemci. Posudek 2. kola: to je časovaná bomba, kompromitace handleru `document.stamp` s LOW riskem by dala schopnost podepisovat za `payment.execute`. Default je Ed25519 od prvního hopu přes hranici procesu; HMAC jen uvnitř jednoho deployable.

**Otázka IV-1 (vyřešeno v 1.0-rc2):** `idempotencyKey` a `notValidAfter` zůstávají povinné u každého `command`, protože command je záměr změny stavu (i klasifikace ukládající výsledek). Čistý výpočet bez odvozeného artefaktu je `query` a obě pole nenese. Dummy hodnoty u výpočtu jsou porušení, ne splnění (II §4.1).

## 4.0b Změny po 2. kole (1.0-rc2)

| Změna | Důvod | Kde |
|---|---|---|
| Všechna `date-time` pole musí končit `Z` (pattern), negativní testy s offsetem | posudek 3 MINOR: `IDM-DEADLINE-002` testoval rozdíl hodin, ne pásmo | všechna schémata, `CTR-TIME-001` |
| `algorithm` default Ed25519 v popisu schématu | posudek 2 MAJOR | `dispatch-envelope.v1` |
| Definice `PRINCIPAL` zpřísněna: broker mimo paměť handleru; N handlerů v jednom Workeru se společnými bindingy = `LOGICAL` | posudek 1 MAJOR | II §3.2 (bez změny schématu) |
| `conformanceTier` také na workflow definici | posudek 3 | II §5.7, `INT-E2E-001` |
| Negativní testy 27 → 29 | | 4.6 |

## 4.0c Errata po 3. kole (1.0-rc2.1)

| Změna | Důvod | Kde |
|---|---|---|
| `effectFields` + `semanticValidation` v capability; schéma je vyžaduje pro `HIGH` a `CRITICAL` | rozpor II/III/IV: jádro a verifikace vyžadovaly validátory, descriptor je neuměl deklarovat (posudky 1 a 4, MAJOR); řešení podle posudku 1: descriptor = claim polí, policy = autorita validátorů, provenance = evidence | 4.5, II §1 F2, III §4 řádek 53 |
| Negativní testy 29 → 32 (HIGH bez `effectFields`, HIGH bez `policyRef`, neznámá role) | | 4.6 |
| Ukázka `bank-executor` v části VI přepsána; `EVD-006` původní ukázku odmítlo | test splnil účel | VI 6.2 |
| Bez změny schématu: `PRINCIPAL` = vlastní execution context (isolate / proces), broker v témže procesu nestačí; hranice = credential doména | posudek 3 MAJOR, posudek 4 MAJOR (ekonomika) | II §3.2, IX §7 |

## 4.4 Result envelope v1

**Účel:** výsledek jednoho pokusu o provedení. Každý konec je explicitní.

| Status | Povinná pole navíc | Význam |
|---|---|---|
| `SUCCEEDED` | `payload` | hotovo, výsledek v payloadu |
| `FAILED` | `error` | selhání s klasifikací; `retryable` je vlastnost chyby |
| `WAITING` | `waitReason`, `deadline` | krok čeká (externí systém, review, plán, závislost); `reviewTaskId` u REVIEW |
| `UNKNOWN_OUTCOME` | `reconciliationRef` | side effect možná proběhl; **není terminal**; nikdy se z něj neretryuje naslepo |
| `CANCELLED` | — | zrušeno orchestrátorem nebo člověkem |

**Error object:** `code` v `UPPER_SNAKE_CASE` (test odmítá `bad-code`), `class` z osmi hodnot, `retryable` boolean, `message` lidsky čitelné bez tajemství a bez surového untrusted obsahu, `details` strukturované, `retryAfter`, `diagnosticRef`.

**Provenance blok:** `producerComponent`, `producerVersion`, `modelId`, `promptVersion`, `derivedFrom[]`. U AI capability povinný podle profilu, schéma ho zatím nechává volitelný.

**Otázka pro oponenty (IV-4):** má být `provenance` povinný, když descriptor capability říká `usesLlm: true`? Schéma obálky to neumí vyjádřit (nezná descriptor). Možnosti: (a) nechat na conformance testu capability, (b) zavést `resultClass` v obálce. Autor volí (a).

**Otázka pro oponenty (IV-5):** `WAITING` jako status výsledku vs. jako stav workflow. Capability vrací `WAITING(REVIEW)` a orchestrátor přejde do `WAITING`. Je to čisté, nebo má capability vracet `SUCCEEDED` s payloadem „needs review" a rozhodnutí o čekání nechat orchestrátoru? Autor volí první variantu, protože druhá vytváří tichou větev: SUCCEEDED, který ve skutečnosti není hotový.

## 4.5 Module descriptor v1

**Účel:** co komponenta nabízí a co o sobě tvrdí. Řídí routing, policy a **které verifikační profily platí**.

Klíčová vlastnost: conditional required. Capability se `sideEffects: external-write` **musí** deklarovat `idempotency`, `idempotencyRetention`, `deadlinePolicy`, `reversibility`, `unknownOutcomeRecovery`, `humanApproval`, `riskClass`. Capability s `reversibility: COMPENSATABLE` musí pojmenovat `compensationCapability`. Oba případy jsou pokryty negativními testy.

| Pole | Proč |
|---|---|
| `verificationProfiles` | komponenta si sama říká, co o sobě tvrdí; profil aktivuje povinné testovací rodiny (III §1); nepravdivá deklarace je nález `ARCH`/`CTR` |
| `tenantMode` | `N/A` \| `SINGLE` \| `MULTI_TENANT_READY` \| `MULTI_TENANT_ACTIVE`; jen ACTIVE aktivuje `TEN` |
| `buildCommit` | vazba na `/version` endpoint; první mechanismus, který prošel Core Admission (V §2) |
| `capabilities[].trustClass` | `untrusted-processing` (AI, zpracovává untrusted obsah) \| `deterministic` \| `executor` |
| `capabilities[].usesLlm` | zapíná profil `AI_CAPABILITY` a povinnost provenance |
| `capabilities[].errorCodes` | seznam kódů, které capability vrací; základ `CTR-ERR` tabulky |
| `capabilities[].effectFields` | (rc2.1) která pole payloadu vybírají cíl, rozsah, částku nebo prostředek side effectu; claim providera; povinné pro `HIGH` a `CRITICAL`; `validator` je jen nápověda |
| `capabilities[].semanticValidation.policyRef` | (rc2.1) odkaz na platform policy, která ke každému effect poli přiřazuje deterministický validátor; autorita platformy; bez úplného mapování komponenta neprojde registrací (`SEC-SEM-001`) |
| `capabilities[].conformanceSuiteVersion` | kterou verzi conformance suite provider splňuje (příloha A jádra) |
| `endpoints` | `/health`, `/version`, `/capabilities` |

**Otázka IV-6 (vyřešeno v 1.0-rc):** descriptor byl zároveň routing tabulka, security policy a test plán. Oponent D: provider nesmí být autoritou, která si sama uděluje oprávnění. Rozhodnutí: descriptor = **claim** (co jsem, co umím, jaké mám side effects, jakou izolaci, jaké scopes vyžaduji), platform policy = **autorita** (kdo scope má, za jaký tenant, s jakým limitem a approval), samostatný artefakt vlastněný platformou. `requiredScopes` v descriptoru zůstává jako deklarace požadavku; grant je v policy. Formát policy je CANDIDATE (IX). A protože si komponenta nesmí snížit testovací povinnost, `verificationProfiles` jsou odvozené a schéma je vynucuje; test „external-write but WRITE_EXECUTOR omitted (self-lowered obligations)" musí selhat a selhává.

## 4.6 Testy kontraktů

`npm test` (`scripts/validate-contracts.mjs`) provádí pro každé schéma: kompilaci Ajv 2020 + formats, validaci všech `examples`, a dvanáct negativních případů, které **musí selhat**:

| # | Schéma | Případ | Co chrání |
|---|---|---|---|
| 1 | envelope | `tenantId` v obálce | F4 |
| 2 | envelope | `targetComponent` v obálce | F3, router doplňuje cíl |
| 3 | envelope | command bez `idempotencyKey` / `notValidAfter` | F6 |
| 4 | envelope | capability s velkým písmenem | naming |
| 5 | envelope | capability bez tečky | naming |
| 6 | result | `FAILED` bez `error` | F5 |
| 7 | result | `UNKNOWN_OUTCOME` bez `reconciliationRef` | F5, F6 |
| 8 | result | `WAITING` bez `deadline` | F5 |
| 9 | result | error code mimo `UPPER_SNAKE` | governance kódů |
| 10 | context | chybějící `tenantId` | F4 |
| 11 | descriptor | `external-write` bez reverzibility a idempotence | F6 |
| 12 | descriptor | `COMPENSATABLE` bez `compensationCapability` | F6 |

Stav 1.0-draft: 4 schémata, 4 příklady, 12 negativních. **Stav 1.0-rc:** 5 schémat kompiluje, 5 příkladů validních, 27 negativních odmítnuto. Přibyly: `reissuable` ne-boolean; `binding` uvnitř contextu; dispatch `signed-envelope` bez podpisu; `in-process` s podpisem; `tenantId` v message uvnitř dispatch; descriptor s `external-write` bez `WRITE_EXECUTOR` (self-lowered), bez `EVIDENCE`; `usesLlm` bez `AI_CAPABILITY`; `MULTI_TENANT_ACTIVE` bez `MULTI_TENANT`; `dependsOn` bez `MODULE_DEPENDENCY`; chybějící `PROVIDER`; `CRITICAL` s `LOGICAL`; `HIGH` s `PRINCIPAL` bez `isolationDecision`; `MEDIUM` s `LOGICAL`; `query-external-status` bez `statusQuery`. Navíc `EVD-006`: JSON ukázky v částech balíčku označené názvem schématu se validují (aktuálně pět ukázek v části VI).

**Otázka pro oponenty (IV-7):** které negativní případy chybí? Kandidáti autora: `SUCCEEDED` s `error`; `event` s `idempotencyKey` (nemá smysl, ale škodí?); `expiresAt < authenticatedAt` v contextu; capability s `humanApproval: required` a `riskClass: LOW`.

## 4.7 Úplné znění schémat

Následuje pět schémat přesně tak, jak jsou v repozitáři (`contracts/`), včetně nového `dispatch-envelope.v1`.
