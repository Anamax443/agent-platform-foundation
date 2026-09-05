# FOUNDATION CORE

## Závazné jádro pro modulární farmu AI agentů, deterministických modulů a jednoúčelových executorů

| | |
|---|---|
| **Verze** | 1.0-rc2.1 (errata) |
| **Datum** | 5. 9. 2026 (rc2.1 = errata po 3. kole: rozpor II/III/IV u sémantických validátorů, zpřesnění `PRINCIPAL`, migrace s in-flight voláními; protokoly v `docs/review-pack/parts/13`, `14`, `15`). Další verze vznikne až z první implementace, ne z dalšího kola na papíře. |
| **Status** | Release candidate. Stane se normou v okamžiku, kdy ho použijí dva reálné projekty (viz §9). |
| **Nahrazuje** | `docs/history/AGENT-PLATFORM-FOUNDATION-v0.2.md` jako závaznou část. v0.2 zůstává zdrojem poznámek v `PLATFORM-NOTES.md`. |
| **Jazyk** | Čeština. Machine contracts, identifikátory, stavy, kódy chyb: angličtina. |
| **Rovnocenný dokument** | `VERIFICATION-CONTRACT.md`. Invariant bez verifikace neplatí. |

**Jak číst:** všechno v tomto dokumentu je INVARIANT nebo přímý kontrakt, jehož porušení blokuje release. Kandidátní a odložená témata tady nejsou; jsou v `PLATFORM-NOTES.md`. Dokument má být čitelný do třiceti minut a použitelný jako checklist při code review.

---

## 0. Scope a non-goals

**Řeší:** pravidla a kontrakty, které musí přežít výměnu technologií (message broker, workflow engine, cloud, LLM provider, jazyk implementace).

**Neřeší:**

- nevybírá technologie (broker, DB, cloud, identity provider),
- nepředepisuje topologii procesů (microservice vs. in-process),
- není runtime knihovna ani framework,
- neobsahuje business pravidla žádné domény (faktury, e-maily, USB, HR).

**Platí pro každou komponentu, která:**

1. volá LLM nebo zpracovává jeho výstup,
2. provádí zápis do externího nebo business systému,
3. komunikuje s jinou komponentou přes kontrakt.

Neplatí pro jednorázové skripty bez side effectů a bez LLM.

---

## 1. Sedm runtime invariantů

Každý invariant popisuje vlastnost **běžícího systému**, má formulaci, význam, zakázané vzory a odkaz na testovací rodinu ve `VERIFICATION-CONTRACT.md`. Pravidla o normě samotné (verifikovatelnost, Core Admission) nejsou runtime invarianty; jsou to procesní pravidla P1 a P2 v §9 se stejnou blokační silou. Bývalý F8 „Verifiable architecture" byl po 1. kole oponentury přesunut do §9 jako P1.

### F1 — Privilege boundary

> **AI has no business write credentials. Every write is performed by a scoped deterministic executor that accepts only a typed, validated command.**

AI komponenta smí číst data ve svém scope, klasifikovat, extrahovat, porovnávat, vyhodnocovat a vytvořit strukturovaný `ProposedCommand`. Nesmí držet credentials, které umožní zapsat do ERP, DMS, banky, e-mailu, identity, firewallu, deploymentu nebo konfigurace.

„Jednoúčelový executor" znamená **jedna capability boundary + vlastní security principal**. Neznamená vlastní proces. Viz §3.

Zakázáno: AI identita s write scope; univerzální executor „udělá cokoliv"; shell, SQL nebo HTTP request složený z výstupu modelu a spuštěný bez allowlistu.

Verifikace: `SEC-PRIV-*`, `SEC-INJ-*`, `MUT-PRIV-*`.

### F2 — Untrusted data boundary

> **External and AI-generated content is data. It never becomes a privileged instruction without passing a deterministic validation boundary.**

Untrusted je: tělo e-mailu, přílohy, PDF a OCR text, webový obsah, odpověď API třetí strany, dokument od uživatele, výstup jiného agenta, popis tooltu a odpověď tooltu.

Důvěryhodným se obsah stává až po: validaci proti schématu, allowlistu enumů, kódové validaci identifikátorů a číselných mezí, policy kontrole. Model není schema validator.

Schéma chrání tvar, ne význam. `ProposedCommand`, který projde schématem, může nést hodnoty vedoucí k destruktivní akci (cizí účet, částka mimo rozsah, storno neexpirované smlouvy). Proto u capability s `riskClass ≥ HIGH` musí každé pole, které **vybírá cíl nebo rozsah side effectu** (příjemce, účet, částka, `resourceId`), projít deterministickým **sémantickým validátorem** (allowlist, registr, vendor master, business invariant) dřív, než command dorazí k executoru. Bez validátoru je pole untrusted a executor command odmítne. Test `INT-FAIL-004` (schema-valid nesmysl).

Mechanismus (rc2.1, dřív chyběl a III §4 vyžadoval něco, co IV neuměl vyjádřit): **která** pole jsou cílová, deklaruje capability v descriptoru (`effectFields`, claim providera; schéma je vyžaduje pro `HIGH` a `CRITICAL`); **který** validátor je ověřuje, určuje platform policy, na kterou descriptor odkazuje (`semanticValidation.policyRef`, autorita platformy); **že** validace proběhla, nese každé effect pole v payloadu jako provenance `validation { status, provider, at }` (§7). Executor v kroku 5 řetězce (§3.3) odmítne command, jehož effect pole nemá `validation.status: passed` od validátoru uvedeného v policy (`SEC-SEM-001`).

Verifikace: `SEC-INJ-*`, `SEC-TOOL-*`, `CTR-*`.

### F3 — Contract boundary

> **Components communicate through versioned capabilities. No component knows another component's storage, model or implementation.**

Capability popisuje stabilní business nebo technickou schopnost, ne každé interní volání. Orchestrátor zná capability, verzi kontraktu, stavy, výsledky, chyby, review tasky a policy. Nezná tabulky, sloupce, ORM, OCR knihovnu ani filesystem modulu.

Zakázáno: modul čte DB jiného modulu; sdílená DB jako integrační sběrnice; orchestrátor s odkazem na interní schéma agenta.

Verifikace: `CTR-*`, `CDC-*`, `ARCH-DEP-*`.

### F4 — Trusted security context

> **Identity, tenant and scopes come from authenticated context outside the business payload and are enforced deterministically at every hop.**

`TrustedExecutionContext` (§4.2) vytváří gateway nebo router z ověřené identity. Business payload nesmí nést `tenantId`; schéma to nepovoluje a výskyt se ignoruje a audituje jako podezřelý vstup.

Přes hranici procesu nebo transportu musí být context ke zprávě prokazatelně vázán (§4.3). Tenant filtr je v datové vrstvě, ne v UI ani v promptu.

Verifikace: `TEN-*`, `SEC-CTX-*`.

### F5 — Observable execution

> **Every unit of work ends in an explicit state with a defined next step. No silent branch.**

Stavový model v §5.1. `UNKNOWN_OUTCOME` je legitimní stav s povinnou recovery cestou. Každé `WAITING` má důvod, deadline a expiry policy.

Verifikace: `WF-*`.

### F6 — Safe state change

> **Every write command declares idempotency, deadline, unknown-outcome recovery and reversibility. Delivery is at-least-once.**

`idempotencyKey` identifikuje jednu logickou write intent. Quality retry je nový logický pokus s novým klíčem. `notValidAfter` kontroluje executor těsně před side effectem. Retence idempotency evidence je deklarovaná per capability; u ireverzibilních operací ji zajišťuje business transaction identity, ne jen dedup cache.

Verifikace: `IDM-*`, `WF-UNK-*`.

### F7 — Evidence integrity

> **Originals are immutable; derived artifacts carry provenance; human decisions are authenticated, authorized and audited state transitions.**

Originál má hash a nikdy se nepřepisuje. Odvozenina má `derivedFrom`. Hodnota z nejistého zdroje nese provenance. Rozhodnutí reviewera je autorizovaný přechod stavu vázaný na konkrétní task, tenant a roli.

Verifikace: `EVD-*`, `WF-REV-*`, `SEC-ART-*`.

**Procesní pravidla (§9), která nejsou runtime invarianty, ale blokují release stejně:**

- **P1 — Verifiable architecture.** Každý invariant má automatizovanou verifikaci nebo explicitní, vlastněný požadavek na manuální evidenci. Nedoložený invariant blokuje release.
- **P2 — Nothing becomes Core because it looks reusable.** Sdílený runtime vzniká až po doloženém opakovaném použití.

---

## 2. Role komponent

| Role | Dělá | Nedělá | Write | LLM |
|---|---|---|---|---|
| **Orchestrator** | načte versioned statickou workflow definici, spouští kroky, čeká na result/event/review, aplikuje deterministické přechody, timeouty, retry, cancel, compensation request, audit | neplánuje workflow pomocí LLM (v1), nevlastní domain entity, nemá univerzální write credentials | ne | ne |
| **AI Agent** | typed input → typed output s provenance; zpracovává untrusted content; vytváří `ProposedCommand` | není finální policy enforcement point | ne | ano |
| **Deterministic Module** | validace, lookup do registru, hash, normalizace, konverze formátu, rule evaluation | nemusí být samostatná služba | ne | ne |
| **Executor** | jedna write capability; přijímá jen typed command po celém rozhodovacím řetězci (§3.3) | neinterpretuje volný text, neumí „cokoliv" | ano, scoped | ne |
| **Capability Router** | mapuje capability → instance, verzi, tenant povolení, health; doplňuje `targetComponent` jako trusted routing metadata | odesílatel nikdy nevybírá cíl | ne | ne |
| **Review Service** | uchovává review task, role, expiry, decision; vynucuje reviewer authz | neobsahuje business rozhodnutí | přechod stavu | ne |

**Orchestrátor vlastní stav workflow, ne domain data.** Ví, že krok `invoice.validate` vrátil `SUCCEEDED` s `resultRef`, ale nezná sloupce faktury. Podmínka nad business hodnotou je buď generický výraz nad kontraktem výsledku, nebo samostatná policy capability.

**LLM planning** je odložená capability s vlastní trust boundary. Plán vytvořený modelem není autorizovaný execution plan.

---

## 3. Executor model

### 3.1 Tři oddělené vrstvy

| Vrstva | Význam | Musí být 1:1 s capability? |
|---|---|---|
| Capability boundary | jedna přesně definovaná write operace | ano (kontrakt) |
| Security principal | identita a credential s minimálním scope | preferovaně ano; sdílení jen s explicitním a zapsaným risk rozhodnutím |
| Deployment unit | proces, container, worker, služba | ne; může hostovat více handlerů |
| Scaling unit | co se škáluje nezávisle | podle workloadu |

### 3.2 Izolační třídy a Executor Host

Norma rozlišuje **logickou** a **fyzickou** izolaci a nepředstírá, že jsou totéž. Handler v jednom procesu s jiným handlerem je oddělen policy a allowlistem, ne paměťovou hranicí. Proti chybně napsanému handleru to stačí. Proti spuštění cizího kódu uvnitř procesu (zranitelná knihovna pro PDF, prototype pollution, path traversal v `require`) to nestačí: proces má technický přístup ke všem credential referencím, které resolvuje.

Každá write capability proto deklaruje `isolationClass`:

| Třída | Co garantuje | Typické použití |
|---|---|---|
| `LOGICAL` | policy a allowlist uvnitř sdíleného execution contextu; společný proces, společná paměť; proti chybě handleru ano, proti cizímu kódu v procesu ne | stamp, vratná metadata |
| `PRINCIPAL` | **vlastní execution context** (V8 isolate / Worker, OS proces, container) s credential bindingy scoped jen na něj; cizí kód v jiném contextu se k credentialu nedostane, protože nesdílí paměť ani binding; kontexty se seskupují podle **credential domény** (jedna identita vůči jednomu externímu systému), ne podle handleru | ERP zápis, e-mail, příprava platby |
| `PROCESS` | `PRINCIPAL` **plus** vlastní security principal end-to-end: vlastní service identity nebo mTLS certifikát, vlastní síťová policy, sandbox nebo OS hranice s minimálními právy, vlastní deploy identita | platba, identita, destruktivní zásah |

Rozdíl `PRINCIPAL` vs. `PROCESS` není proces vs. isolate, ale rozsah identity: `PRINCIPAL` odděluje paměť a credential, `PROCESS` navíc odděluje síť, deploy a OS práva. Token broker uvnitř téhož procesu `PRINCIPAL` **nevytváří** (3. kolo): kód spuštěný v procesu volá broker pod identitou procesu.

Minimum odvozené z `riskClass` (vynucuje schéma descriptoru):

| `riskClass` | Minimální `isolationClass` |
|---|---|
| `LOW` | `LOGICAL` |
| `MEDIUM` | `PRINCIPAL` |
| `HIGH` | `PRINCIPAL` **s** zapsaným `isolationDecision` (odkaz na ADR a evidence `SEC-HOST-001`), jinak `PROCESS` |
| `CRITICAL` | `PROCESS` |

**Co `PRINCIPAL` není.** Handler ve sdíleném procesu má izolaci `LOGICAL`, i když má „vlastní" credential referenci nebo volá externí broker: po spuštění cizího kódu v procesu už útočník není handler A, je to kód uvnitř procesu, a proces referenci B získat umí a broker zavolá pod identitou procesu. Terminologie nesmí slibovat víc, než runtime garantuje. Prakticky: N handlerů v jednom Cloudflare Workeru se společnými secret bindingy = `LOGICAL` pro všechny.

**Hranice `PRINCIPAL` je credential doména, ne handler.** Handlery, které používají tutéž externí identitu (`payment.prepare` a `payment.release` vůči ERP), sdílejí jeden `PRINCIPAL` context bez ztráty izolace, protože chrání totéž. Počet execution contextů proto roste s počtem externích identit, ne s počtem capabilities. Cena na Cloudflare Workers je rozebraná v `PLATFORM-NOTES.md §7`.

**Executor Host** = jeden execution context obsluhující N handlerů. Podmínky:

- každý command prochází vlastní authorization policy (§3.3),
- host smí obsahovat jen handlery třídy `LOGICAL` (`LOW`), nebo `PRINCIPAL` handlery **jedné** credential domény,
- handler nemá cestu k cizí credential referenci ani nepřímo (env, filesystem, sdílený modul, `globalThis`); dokládá `SEC-HOST-001` s mutantem `MUT-HOST-001` nad `CredentialResolverFixture`,
- žádný handler nemůže podepsat zprávu za jiný handler ani za gateway: podpisový privátní klíč žije jen v gateway (`SEC-HOST-002`, §4.3),
- host neobsahuje žádný handler třídy `PROCESS`.

Blast radius `LOGICAL` hostu je omezen logicky, **ne procesově**. `HIGH` capability zůstává v `PRINCIPAL` contextu jen se zapsaným `isolationDecision` s pojmenovanými mitigacemi (zmrazené prototypy, readonly env, oddělený `globalThis`, výsledek penetračního testu in-process izolace) a evidencí `SEC-HOST-001`. Bez toho je default `PROCESS`. Empirický penetrační test po prvním `LOGICAL` hostu se dvěma handlery je podmínka přechodu na 1.0 (`PLATFORM-NOTES.md`).

### 3.3 Co executor kontroluje před side effectem

V tomto pořadí. Jakýkoli `DENY` končí před side effectem a je auditován.

1. schema validation commandu,
2. authenticated actor (kdo command autorizoval),
3. binding dispatch obálky ověřen (podpis nad `{message, context}`, `keyId` aktuální nebo v grace period, §4.3) a `TrustedExecutionContext` odpovídá commandu (tenant, scope, intended resource),
4. capability a verze jsou v allowlistu executora,
5. business policy (risk class, limity),
6. human approval, pokud capability vyžaduje (`approvalId` vázaný na konkrétní review task a workflow),
7. `notValidAfter` ještě nevypršel,
8. idempotency check (klíč již viděn → vrátit původní outcome, žádný druhý side effect),
9. side effect,
10. result + audit record + reconciliation hook (u `UNKNOWN_OUTCOME`).

### 3.4 Executor nepřijímá

```text
"Pay this invoice please"
```

Přijímá pouze:

```json
{ "paymentId": "pay-1001", "approvalId": "apr-551" }
```

### 3.5 Ekonomické pravidlo

Výchozí cesta musí být zároveň nejlevnější. Nový write handler = kód handleru + scoped credential + záznam v policy + conformance testy. **Ne** nový repozitář, container, certifikát, dashboard a pager. Bezpečnostní pravidlo, jehož dodržení je dražší než obejití, se obejde.

---

## 4. Message model v1

Strojově čitelné definice: `contracts/message-envelope.v1.schema.json`, `contracts/trusted-context.v1.schema.json`, `contracts/dispatch-envelope.v1.schema.json`, `contracts/result-envelope.v1.schema.json`.

### 4.1 Command / event envelope (caller-supplied)

```json
{
  "messageId": "01J8K2M3N4P5Q6R7S8T9V0W1X2",
  "correlationId": "01J8K2M3N4P5Q6R7S8T9V0W1AA",
  "causationId": "01J8K2M3N4P5Q6R7S8T9V0W1BB",
  "workflowId": "wf-123",
  "stepId": "extract",
  "type": "command",
  "capability": "invoice.extract",
  "capabilityVersion": "1",
  "schemaVersion": "1",
  "idempotencyKey": "wf-123:extract:standard-ocr:1",
  "createdAt": "2026-09-05T12:00:00Z",
  "notValidAfter": "2026-09-05T12:10:00Z",
  "payload": {}
}
```

| Pole | Povinné | Význam |
|---|---|---|
| `messageId` | ano | identita doručení (jedna zpráva) |
| `correlationId` | ano | identita end-to-end business toku |
| `causationId` | ne | `messageId` zprávy, která tuto zprávu vyvolala |
| `workflowId`, `stepId` | u workflow kroků | vazba na durable workflow |
| `type` | ano | `command` \| `event` \| `query` |
| `capability`, `capabilityVersion` | ano | co se žádá a v jaké verzi kontraktu |
| `schemaVersion` | ano | verze tvaru `payload` |
| `idempotencyKey` | u `command` se side effects | jedna logická write intent (§5.5) |
| `createdAt` | ano | vznik zprávy |
| `notValidAfter` | u write commandů | po tomto čase se command nesmí provést (§5.4) |
| `payload` | ano | domain-specific obsah podle `schemaVersion` |

**Command vs. query.** `command` je záměr změnit stav: vytvořit odvozený artefakt, zapsat, poslat. Proto nese `idempotencyKey` a `notValidAfter` vždy, i u `sideEffects: internal-write` (klasifikace ukládající výsledek je command). Čistý výpočet bez odvozeného artefaktu a bez zápisu (kontrola IBAN, hash existujícího objektu, dotaz na health) je `query` a obě pole nenese. Vyplňovat u výpočtu dummy klíč je porušení kontraktu, ne splnění; správná odpověď je `query`. Časy jsou v UTC a končí `Z`; offset schéma odmítá (`CTR-TIME-001`).

**Envelope neobsahuje** `tenantId`, `actorId`, `targetComponent` ani `scopes`. To jsou trusted metadata.

### 4.2 TrustedExecutionContext

```json
{
  "dispatchId": "dsp-101",
  "tenantId": "tenant-42",
  "actorId": "svc-mail-01",
  "actorType": "service",
  "originatingActorId": "user-17",
  "authStrength": "client-credentials",
  "scopes": ["invoice.extract"],
  "sourceComponent": "mail-agent",
  "targetComponent": "invoice-agent-02",
  "authenticatedAt": "2026-09-05T11:59:58Z",
  "expiresAt": "2026-09-05T12:59:58Z"
}
```

Životní cyklus:

- **Vzniká** v gateway nebo routeru z ověřené identity (OIDC claim, client credential, certifikát, server-side session). Nikdy z payloadu.
- **Je neměnný** po dobu jednoho dispatch. Žádná komponenta ho nepřepisuje.
- **Přes async hop** (queue, job tabulka, cron) se buď přenáší vázaný (§4.3), nebo se na příjemci znovu odvozuje z identity. Worker nikdy nepoužije výchozí tenant.
- **Při retry** se znovu validuje: tenant je stále aktivní, actor stále autorizovaný, `expiresAt` nevypršel.
- **`originatingActorId`** drží původní lidskou nebo systémovou identitu přes celý řetězec, aby nevznikl confused deputy.

### 4.3 Dispatch envelope a binding rule

Context **nenese podpis sebe sama**. Vazba context ↔ zpráva žije v samostatné transportní obálce (`contracts/dispatch-envelope.v1.schema.json`):

```json
{
  "message": { "...": "message envelope §4.1" },
  "context": { "...": "TrustedExecutionContext §4.2" },
  "binding": {
    "mechanism": "signed-envelope",
    "algorithm": "Ed25519",
    "keyId": "dispatch-2026-09",
    "signature": "base64url…",
    "signedAt": "2026-09-05T12:00:00Z",
    "canonicalization": "JCS"
  }
}
```

**Default pro každý hop přes hranici procesu nebo transportu je `signed-envelope` s Ed25519** nad kanonickou serializací JCS (RFC 8785) objektu `{ "message": message, "context": context }`. Podpis tak pokrývá payload i context; na drátě nelze vyměnit ani jedno. Privátní klíč žije **jen v gateway/routeru**; příjemci drží veřejný klíč. Kompromitace kteréhokoli příjemce nebo handleru tedy nedává schopnost podepisovat (T19, `SEC-HOST-002`). HMAC-SHA256 je povolen jen tam, kde gateway a jediný příjemce tvoří jednu trust domain (jeden deployable); sdílený HMAC klíč mezi více příjemci je stejný anti-pattern jako jeden API key pro všechny.

| Transport | Přijatelný `mechanism` | Podmínka |
|---|---|---|
| in-process | `in-process` | zpráva ani context neopustí proces; bez podpisu |
| queue, job tabulka, cron | `signed-envelope` | default |
| HTTP mezi službami | `signed-envelope`, `token-bound`, `mtls` | jiný než signed-envelope jen s doloženou ekvivalencí |
| broker s per-tenant identitou | `broker-identity` | jen s doloženou ekvivalencí a tenant-scoped frontou |

Pravidla:

- Zpráva, jejíž binding nelze ověřit, se odmítá s `CONTEXT_BINDING_INVALID` (`SEC-CTX-003`).
- Adapter bez dokumentovaného a otestovaného mechanismu nesmí být použit v multi-hop toku (`SEC-CTX-005`).
- **Rotace klíče:** `keyId` je povinné a v obálce je jediné; přechodné období neřeší obálka, ale **key registry na straně příjemce**. Registry drží ke každému klíči **okno platnosti** (`validFrom`, `validUntil`) a podpis se ověřuje proti klíči, který byl platný v čase `binding.signedAt`, ne v čase doručení. Zpráva zpožděná ve frontě (obnova po výpadku) je tedy platná, dokud její `notValidAfter` nevypršel, i když gateway už podepisuje novým klíčem. Starý klíč se z registry odstraňuje až po `max(notValidAfter)` všech zpráv, které jím mohly být podepsány, tedy `validUntil + maximální deadlinePolicy` na transportu. Žádné vyjednávání klíče po drátě. Rotace = přidat nový klíč do registry příjemců, přepnout gateway, po uplynutí okna odebrat starý. Testy `SEC-CRED-002` (zpráva uvnitř okna) a `SEC-CRED-003` (zpráva po odebrání klíče → `CONTEXT_BINDING_INVALID`, nikdy tichý DLQ bez auditu).
- Ověření bindingu je krok 3 rozhodovacího řetězce (§3.3) a předchází jakémukoli side effectu.

### 4.4 Result envelope

```json
{
  "messageId": "res-001",
  "inReplyTo": "cmd-001",
  "correlationId": "01J8K2M3N4P5Q6R7S8T9V0W1AA",
  "workflowId": "wf-123",
  "stepId": "extract",
  "status": "FAILED",
  "capability": "invoice.extract",
  "capabilityVersion": "1",
  "schemaVersion": "1",
  "completedAt": "2026-09-05T12:00:03Z",
  "error": {
    "code": "DOCUMENT_QUALITY_TOO_LOW",
    "class": "QUALITY",
    "retryable": true,
    "message": "Document quality is insufficient for reliable extraction",
    "details": { "ocrConfidence": 0.41 }
  }
}
```

`status` ∈ `SUCCEEDED` | `FAILED` | `WAITING` | `UNKNOWN_OUTCOME` | `CANCELLED`. `SUCCEEDED` nese `payload`. `FAILED` nese `error`. `WAITING` nese `waitReason` a `deadline`. `UNKNOWN_OUTCOME` nese `reconciliationRef`.

### 4.5 Error object

| Pole | Význam |
|---|---|
| `code` | stabilní machine identifier, `UPPER_SNAKE_CASE`, anglicky, součást kontraktu capability |
| `class` | `TECHNICAL` \| `QUALITY` \| `BUSINESS` \| `SECURITY` \| `POLICY` \| `VALIDATION` \| `DEPENDENCY` \| `UNKNOWN` |
| `retryable` | **úroveň executora:** stejný command smí executor zkusit znovu (technical retry); `true` u `QUALITY` znamená „jinou strategií, novým klíčem" |
| `reissuable` | **úroveň orchestrátoru:** orchestrátor smí po opětovném ověření intent vydat **nový** command se stejným `idempotencyKey`; chybí = `false` |
| `message` | lidsky čitelné, lokalizovatelné, bez tajemství |
| `details` | strukturovaný kontext, bez untrusted obsahu v surové podobě |
| `retryAfter` | volitelně, ISO duration nebo timestamp |
| `diagnosticRef` | volitelně, odkaz na trace mimo výsledek |

Governance kódů: přidání kódu je minor změna kontraktu, odstranění nebo změna významu je major. Chybové chování se testuje (`CTR-ERR-*`).

Základní kódy platformy s jejich vlastnostmi:

| Kód | `class` | `retryable` | `reissuable` |
|---|---|---|---|
| `SCHEMA_VALIDATION_FAILED` | VALIDATION | false | false |
| `CAPABILITY_NOT_ALLOWED` | SECURITY | false | false |
| `TENANT_SCOPE_MISMATCH` | SECURITY | false | false |
| `CONTEXT_BINDING_INVALID` | SECURITY | false | true (po re-dispatch s platným bindingem) |
| `APPROVAL_REQUIRED` | POLICY | false | true (po získání approval) |
| `APPROVAL_MISMATCH` | SECURITY | false | false |
| `COMMAND_EXPIRED` | POLICY | false | true (po opětovném ověření intent) |
| `DUPLICATE_COMMAND` | VALIDATION | false | false |
| `DEPENDENCY_TIMEOUT` | DEPENDENCY | true | false |
| `DEPENDENCY_UNAVAILABLE` | DEPENDENCY | true | false |
| `UNKNOWN_EXTERNAL_OUTCOME` | UNKNOWN | false | false (řeší reconciliation) |
| `INCOMPATIBLE_VERSION` | VALIDATION | false | false |
| `REVIEW_EXPIRED` | POLICY | false | podle `expiryPolicy` |

### 4.6 Identifikátory

| Id | Význam |
|---|---|
| `messageId` | jedno doručení |
| `correlationId` | jeden end-to-end business tok |
| `workflowId` | jedna instance workflow |
| `stepId` | krok v definici workflow |
| `executionId` | jeden pokus o provedení kroku |
| `dispatchId` | jeden trusted dispatch |

Jedno UUID pro všechny významy je zakázáno. Doporučený formát: ULID.

---

## 5. Stavy, retry, unknown outcome

### 5.1 Execution state model

```text
PENDING
RUNNING
WAITING        reason: EXTERNAL | REVIEW | SCHEDULE | DEPENDENCY
               + deadline + expiryPolicy
SUCCEEDED      terminal
FAILED         terminal, nese error
CANCELLED      terminal
UNKNOWN_OUTCOME   NENÍ terminal; nese reconciliationRef
```

`RETRYABLE` není stav, je to vlastnost `FAILED.error`. `UNKNOWN_OUTCOME` se musí rozřešit reconciliací na `SUCCEEDED` nebo `FAILED`. Reconciliation má budget (`reconciliationBudget` v descriptoru, default 3 pokusy s backoffem); po vyčerpání přechází krok do `WAITING(REVIEW)` s review taskem pro roli operátora (`WF-UNK-002`). Přechod provádí **orchestrátor**: založí task v Review Service a zapíše do journalu result `status: WAITING`, `waitReason: REVIEW`, `reviewTaskId`. Executor sám review task nezakládá a orchestrátor se neptá do jeho vnitřního stavu (F3); vše, co orchestrátor potřebuje, je `reconciliationRef` z původního `UNKNOWN_OUTCOME`.

Po celou dobu reconciliace i následného review je **stav publikovaný klientům** (`query` na stav operace, eventy) `UNKNOWN_OUTCOME` s podstavem `reconciliation: IN_PROGRESS` nebo `AWAITING_REVIEW`. Nikdy `FAILED` a nikdy `SUCCEEDED` dřív, než reconciliace nebo člověk rozhodne; předčasný `FAILED` by vyvolal duplicitní požadavek zvenčí (`WF-UNK-003`). Reconciliation, která sama skončí neznámě, se počítá jako pokus. Nikdy se z `UNKNOWN_OUTCOME` neretryuje naslepo a nikdy nevisí bez deadline.

### 5.2 Tři třídy retry

| Třída | Co je | Klíč | Strategie |
|---|---|---|---|
| **Technical** | stejná intent, stejná strategie (HTTP 503, timeout) | stejný `idempotencyKey` | bounded attempts, exponential backoff, jitter, circuit breaker |
| **Quality** | nový logický pokus se změněnou strategií (jiný OCR, vyšší DPI, jiný model prompt) | nový klíč `workflowId:stepId:strategyId:n` | budget pokusů, pořadí strategií v workflow definici |
| **Business re-evaluation** | data přečtena, ale nesedí s realitou (registr, vendor master) | nový krok | cross-check capability, reklasifikace, review |

### 5.3 Delivery semantics

At-least-once, bez globální garance pořadí. Příjemce deduplikuje. Pořadí, pokud je potřeba, přes explicitní aggregate/sequence key. Exactly-once platforma neslibuje.

### 5.4 Deadline

Write command nese `notValidAfter`. Executor ho kontroluje **bezprostředně před side effectem**, ne jen router. Prošlý command → `FAILED` / `COMMAND_EXPIRED`, `retryable=false`, `reissuable=true`, audit. Orchestrátor smí vydat nový command se stejným `idempotencyKey` až po opětovném ověření, že intent i approval stále platí.

Tolerance hodin: executor přijme command s `notValidAfter` do **+30 s** za svým časem (rozdíl hodin mezi komponentami), rozdíl nad 5 s zaloguje jako skew. Nad 30 s odmítá (`IDM-DEADLINE-002`). Zdroj času je UTC; kontrola jde přes injektovatelné hodiny (viz `VERIFICATION-CONTRACT.md §8`).

### 5.5 Idempotence a její retence

- `idempotencyKey` = jedna logická write intent. Opakované doručení vrací původní outcome.
- Capability deklaruje `idempotencyRetention` (jak dlouho je dedup evidence držena).
- U `IRREVERSIBLE` capability nestačí cache TTL. Dedup se opírá o **business transaction identity** v cílovém systému (např. unikátní `paymentId`) nebo o trvalý reconciliation záznam. Test `IDM-RET-002` ověřuje replay po expiraci technického klíče.

### 5.6 Reverzibilita a kompenzace

Každá state-changing capability deklaruje `reversibility` ∈ `REVERSIBLE` | `COMPENSATABLE` | `IRREVERSIBLE`.

- `COMPENSATABLE` krok má v workflow definici pojmenovanou compensation capability (např. `reserve.amount` ↔ `release.reservation`). Kompenzace je explicitní capability, ne implicitní „opak kroku".
- `IRREVERSIBLE` krok vyžaduje: evidence před provedením, human gate podle risk class, idempotenci s business identitou, reconciliation po `UNKNOWN_OUTCOME`.
- Univerzální Saga engine se v v1 nestaví.

### 5.7 Workflow definice

- Workflow je versioned, immutable artefakt (`workflowVersion`). Definice deklaruje `conformanceTier` (`exact` | `semantic` | `property` | `ai-eval`), který řídí porovnání golden masteru celého toku v `INT-E2E-001`: `exact` = journal stavů, audit záznamů, review tasků a eventů byte-ekvivalentní; `semantic` = MUST položky journalu (stavy kroků, side effecty, review rozhodnutí) rovné, časy a diagnostika ignorovány; `property` = invarianty (každý krok skončil terminálně, každý write má audit); `ai-eval` = statisticky nad sadou vstupů.
- Běžící instance má `workflowVersion` pinovanou. Nasazení nové verze nikdy implicitně nemění graf běžící instance. Výchozí policy `FINISH_ON_PINNED`.
- **Migrace instance** je explicitní operace `MIGRATE_INSTANCE(workflowId, toVersion)`: nová definice musí obsahovat mapování stavů ze staré (`migrations: { from: "3", stepMap: {...} }`), operaci autorizuje role `workflow.operator`, zapisuje se audit record (kdo, z jaké verze, na jakou, důvod) a instance po migraci pokračuje z mapovaného checkpointu. Nouzová varianta pro bezpečnostní chybu nebo změnu API třetí strany (`reason: SECURITY_HOTFIX`) nevyžaduje jiný mechanismus, jen jiný důvod v auditu a povinnou notifikaci vlastníka. Instance, pro kterou mapování neexistuje, se migrovat nedá; zůstává pinovaná a lze ji jen `CANCELLED` s auditem. Migrace je **atomická**: buď se instance celá přepne na novou verzi s mapovaným checkpointem, nebo zůstane celá na původní verzi s příznakem `migrationStatus: MIGRATION_FAILED`, auditem a notifikací vlastníka; stav „částečně migrováno" neexistuje (`WF-VER-003`). Migrace navíc vyžaduje **drained state**: žádný krok instance není v `RUNNING` ani `WAITING(EXTERNAL)` s rozpracovaným externím voláním. Není-li instance drained, migrace se odloží (`MIGRATION_DEFERRED`, znovu po dokončení in-flight kroků), ne provede napůl. Callback z externího systému nese `executionId`, a router callbacků ho zpracuje v kontextu `workflowVersion`, se kterou byl krok odeslán, i kdyby instance mezitím byla migrována (`WF-VER-004`).
- Stará verze definice zůstává dostupná, dokud existuje instance, která ji pinuje; provozní cena je vědomá a měří se (`WF-VER-002`: počet instancí per verze).
- Přechody stavů mají guards: `WAITING(REVIEW)` přejde dál jen na základě rozhodnutí s ověřenou rolí, tenantem a vazbou na task.

### 5.8 Human review

```json
{
  "reviewTaskId": "rev-501",
  "workflowId": "wf-123",
  "stepId": "validate",
  "reasonCode": "BANK_ACCOUNT_MISMATCH",
  "requiredRole": "invoice.reviewer",
  "allowedDecisions": ["APPROVE", "CORRECT", "REJECT", "RECLASSIFY"],
  "createdAt": "2026-09-05T12:10:00Z",
  "expiresAt": "2026-09-08T12:10:00Z",
  "expiryPolicy": "ESCALATE",
  "escalateTo": "invoice.supervisor",
  "escalationDepth": 0
}
```

Tenant review tasku pochází z trusted contextu, ne z payloadu. Před přijetím rozhodnutí: identita ověřena, role ověřena, tenant ověřen, decision v `allowedDecisions`, vazba na konkrétní `reviewTaskId`. `expiryPolicy` ∈ `EXPIRE_TO_FAILED` | `EXPIRE_TO_CANCELLED` | `ESCALATE` | `CREATE_NEW_REVIEW` je povinná. Při `ESCALATE` je povinné `escalateTo` (role) a eskalační řetěz má maximální hloubku (`maxEscalationDepth`, default 2); po jejím dosažení platí `EXPIRE_TO_FAILED` s alertem. Nekonečný řetěz eskalací je tichá větev. Rozhodnutí je auditovaný přechod stavu (actor, role, původní data, korekce, důvod, čas, výsledný přechod). Reviewer nemá tím pádem admin práva nad platformou.

---

## 6. Tenant a security context

### 6.1 Klasifikace

Deployment model projektu: `ON_PREM_SINGLE_TENANT` | `CLOUD_SINGLE_TENANT` | `CLOUD_MULTI_TENANT` | `HYBRID`.

Tenant mode komponenty: `N/A` | `SINGLE` | `MULTI_TENANT_READY` | `MULTI_TENANT_ACTIVE`. Komponenta, která tvrdí `MULTI_TENANT_ACTIVE`, aktivuje profil `TEN` ve verifikaci.

### 6.2 Vynucované povrchy

Tenant izolace nekončí u SQL. Každý z těchto povrchů má negativní izolační test:

DB dotazy, cache klíče, fronty a background joby, search indexy, object storage cesty, logy a log agregace, exporty, AI trace, review tasky, support dashboard.

### 6.3 Async propagace

Záznam jobu nese vázaný tenant context (§4.3). Worker, který context nenajde nebo neověří, job odmítne. Výchozí tenant neexistuje.

### 6.4 Identity a secrets minimum

- Každý executor má vlastní identitu; AI komponenta má vlastní identitu bez write scope.
- Secret nikdy není součástí prompt contextu ani logu.
- Credentials jsou rotovatelné bez reinstalace farmy; při rotaci krátkodobě platí staré i nové.
- Secret má ownera a expiraci.

### 6.5 Security defaults

| Situace | Default |
|---|---|
| neznámá identita | deny |
| neznámý command nebo capability | reject |
| nepodporovaná verze schématu | reject, `INCOMPATIBLE_VERSION` |
| chybí tenant v multi-tenant režimu | reject |
| validace selhala | žádný write |
| nejednoznačný citlivý výsledek | `WAITING(REVIEW)` |
| expirovaný credential nebo context | deny |
| neznámý výsledek | reconcile, ne blind retry |
| výpadek policy nebo security služby | fail-closed |

Fail-open musí být explicitní, zapsané architektonické rozhodnutí per capability.

### 6.6 Provozní režimy a kill switch

Každá významná komponenta má centrálně přepínatelný režim: `FULL` | `DEGRADED` | `READ_ONLY` | `DISABLED`. Přechod do nižšího režimu je auditovaný a alertovaný. Pravidla:

- výpadek policy nebo security služby → `DISABLED` pro write (fail-closed),
- plné nebo nedostupné **audit** úložiště → `READ_ONLY`: čtení a výpočty pokračují, žádný side effect bez auditu (`RES-STOR-002`); farma se nezastaví celá, zastaví se jen zápisy,
- plné **provozní** úložiště (fronta, journal) → backpressure a odmítání příjmu bez falešného 202 (`RES-STOR-001`),
- **stárnoucí fronta** (pomalý consumer, úložiště není plné): `oldestPendingAge` nad `maxQueueAgeFactor × maximální deadlinePolicy` na transportu → `DEGRADED`, backpressure na příjmu, alert; systém nesmí zkolabovat na timeouty dřív, než ho někdo uvidí (`RES-QUEUE-001`). `maxQueueAgeFactor` je konfigurovatelný per transport, default 2: při 1× je nejstarší zpráva už expirovaná a alert přichází pozdě; při 3× fronta obsahuje dvě generace expirovaných zpráv. Default je odhad, ne měření; první provoz ho kalibruje,
- návrat do `FULL` je explicitní operace, ne automatický po uvolnění místa.

---

## 7. Evidence a provenance minimum

**Originál** (e-mail, PDF, příloha, obraz, externí payload): `artifactId`, `sha256`, `receivedAt`, `receivedFrom`, immutable úložiště. Nikdy se nepřepisuje. Stamp, watermark nebo anotace vytváří novou odvozeninu.

**Odvozenina:** `derivedFrom`, producer (`component` + `componentVersion`), `capability` + `capabilityVersion`, u AI výstupu `modelId` + `promptVersion`.

**Provenance hodnoty** z nejistého zdroje:

```json
{
  "value": "12345678",
  "source": "ocr",
  "confidence": 0.71,
  "trustLevel": "untrusted-derived",
  "validation": { "status": "failed", "provider": "business-registry", "at": "2026-09-05T12:01:00Z" }
}
```

**Audit record** pro každý write command a každé review rozhodnutí: kdo (actor, role), za koho (tenant, originating actor), co (capability, verze, resource), kdy, `correlationId`, výsledek. Audit je append-only; běžná aplikace ho needituje ani nemaže.

**Pět kategorií záznamů** s vlastní retencí a ACL: operational log, security log, audit trail, AI execution trace, business evidence. AI trace nesmí duplikovat celé dokumenty a prompty do běžného logu.

**Retence:** každá datová třída má ownera a deklarované období (i „do smazání tenanta" je deklarace). Datová třída bez retence neexistuje.

---

## 8. Verification Contract (odkaz)

**Descriptor je claim, ne autorita.** `module-descriptor` říká, co komponenta je a co umí (capabilities, verze, side effects, izolace). Kdo ji smí volat, za jaký tenant, s jakým limitem a approval, a kterým validátorem se ověřuje každé effect pole, říká **platform policy**, samostatný artefakt vlastněný platformou, nikdy providerem. Provider si nemůže sám udělit scope. Formát policy je JSON podle vzoru `contracts/policy/payment.execute.v1.policy.example.json` (ADR-016); schéma policy vznikne s první komponentou, která ho použije.

**Profily jsou odvozené, ne volené.** Komponenta nemůže editací YAML snížit vlastní testovací povinnost. Schéma descriptoru vynucuje, že `verificationProfiles` obsahuje každý profil odvozený z deklarovaných vlastností; CI navíc kontroluje `derivedProfiles == executedProfiles`. Detail a Test ID registr je ve `VERIFICATION-CONTRACT.md`.

| Profil | Odvozeno z | Rodiny |
|---|---|---|
| `PROVIDER` | vždy | `CTR` + `CTR-ERR`; při deklarované kompatibilitě `CDC` |
| `WRITE_EXECUTOR` | jakákoli capability se `sideEffects ≠ none` | `SEC` + `IDM` + `WF` + `MUT` (MUST/CONDITIONAL, viz VC §7) |
| `EVIDENCE` | capability s `external-write`, nebo zpracování originálů | `EVD` |
| `AI_CAPABILITY` | capability s `usesLlm: true` | `AI-EVAL` + `SEC-INJ` + `SEC-TOOL` |
| `MULTI_TENANT` | `tenantMode: MULTI_TENANT_ACTIVE` | `TEN` |
| `MODULE_DEPENDENCY` | neprázdné `dependsOn` | `INT-FAIL` + `INT-UPGRADE` |
| `DURABLE_WORKFLOW` | deklarované (orchestrátor, durable joby) | `WF` + `RES` + `INT-E2E` |

---

## 9. Procesní pravidla a Core Admission

### P1 — Verifiable architecture

> **Every invariant has an automated verification or an explicit, owned manual evidence requirement. An unverified invariant blocks release.**

`VERIFICATION-CONTRACT.md` je normativně rovnocenný tomuto dokumentu. Flaky nebo vypnutý BLOCK test překlápí invariant do stavu `UNVERIFIED`, a ten blokuje release. Nedoloženost blokuje, ne test. P1 je pravidlo o normě, ne o běžícím systému, proto není mezi F1–F7; blokační síla je stejná.

### P2 — Nothing becomes Core because it looks reusable

Pravidlo: **standardizuj význam dřív než implementaci.** Dva projekty mohou sdílet error kontrakt bez jediné sdílené knihovny.

Co je k dispozici **od prvního dne** a nepodléhá `EXISTS × 2`:

- kontrakty v `contracts/` (schémata, kódy chyb, stavy): první projekt je použije, druhý je potvrdí,
- conformance a testovací nástroje dodávané s kontraktem (fixtures, `ClockFixture`, `AdapterFakeFixture`, generátor kostry testů z descriptoru): nejsou runtime Core, jsou součást kontraktového balíčku.

`EXISTS × 2` se vztahuje na **sdílený runtime** (knihovny, služby, helpery), ne na kontrakty a testovací podporu. Tím padá námitka, že zelená louka nemůže použít Core, protože je sama.

Mechanismus smí do sdíleného Core, když:

1. `EVIDENCE-MATRIX.md` ukazuje `EXISTS` se **stejnou sémantikou** v nejméně dvou nezávislých projektech (ne stejný název, stejný význam),
2. kontrakt není převlečená business logika prvního projektu,
3. existují contract testy a conformance suite,
4. je určen owner, verzování a breaking-change strategie,
5. jsou popsané failure semantics (timeout, duplicate, restart, špatná konfigurace).

Kategorie evidence: `EXISTS` | `PARTIAL` | `ABSENT` | `DIFFERENT_SEMANTICS` | `DESIGNED` (projekt bez kódu). Kvalifikuje pouze `EXISTS × 2`.

Pořadí extrakce: nejdřív kontrakt + conformance test, implementace může zůstat duplikovaná. Implementace se extrahuje až při třetím použití nebo když duplicita způsobí divergentní chybu.

Ownership: Core nesmí obsahovat kód, názvy, credentials ani pravidla, jejichž vlastnictví náleží zaměstnavateli nebo zákazníkovi. Vzor z pracovního projektu se implementuje znovu podle vlastního kontraktu.

Do Core nepatří: business pravidla, prompty, ERP schémata, konkrétní registry provider, konkrétní OCR.

---

## 10. Co se nestaví

Dokud `EVIDENCE-MATRIX.md` nedoloží potřebu ve dvou projektech:

univerzální plugin marketplace, vlastní message broker, vlastní secrets vault, vlastní identity provider, generický distribuovaný scheduler, univerzální Saga framework, workflow designer GUI, schema registry služba, component registry služba, centrální data lake agentů, generický billing, deployment waves 10/50/100 %, povinný SBOM pro každý prototyp, WORM audit, plný tenant lifecycle, multi-region.

Použít existující technologii, pokud vyhovuje.

---

## Příloha A — Kdo inkrementuje kterou verzi

| Verze | Popisuje | Inkrement | Kompatibilita |
|---|---|---|---|
| `componentVersion` | release binárky nebo služby | každý release (SemVer) | neříká nic o kontraktu |
| `capabilityVersion` | business sémantiku capability | major při breaking změně významu nebo chování | provider může nabízet více major verzí souběžně |
| `schemaVersion` | datový tvar `payload` | major při breaking změně struktury; additive změny minor | consumer musí tolerovat neznámá pole (policy `ignore`) |
| `workflowVersion` | graf a přechody workflow | jakákoli změna grafu nebo významné policy | běžící instance pinovaná |
| `promptVersion` | AI instrukční artefakt | změna, která může ovlivnit sémantiku výstupu | vyžaduje `AI-EVAL` regresi |
| `conformanceSuiteVersion` | testovací sada capability | zpřísnění = minor s přechodným obdobím; nová povinnost = major | provider deklaruje, kterou verzi suite splňuje |

Lifecycle kontraktu: `ACTIVE → DEPRECATED → SUNSET → REMOVED`. Odstranění pouze po měřeném ověření, že žádný aktivní consumer verzi nepoužívá. Bezpečnostně slabá stará verze se dá zakázat bez ohledu na kompatibilitu.

## Příloha B — Machine naming

- Všechny identifikátory anglicky, bez diakritiky, UTF-8 obsah.
- Capability: `domain.action` (`invoice.extract`, `payment.execute`, `document.stamp`).
- Event: `domain.entity.pastTense` (`invoice.validated`, `document.review.requested`).
- Error code: `UPPER_SNAKE_CASE`.
- Stavy a enumy: `UPPER_SNAKE_CASE`.
- JSON properties: `camelCase`.
- Technické endpointy služby: `GET /health`, `GET /version`, `GET /capabilities`.

## Příloha C — Vztah k ostatním dokumentům a projektům

| Dokument / projekt | Role |
|---|---|
| `VERIFICATION-CONTRACT.md` | rovnocenná norma: testy, gates, fixtures |
| `PLATFORM-NOTES.md` | CANDIDATE / DEFERRED backlog z v0.2 s triggery |
| `EVIDENCE-MATRIX.md` | reálný stav mechanismů v existujících projektech |
| `contracts/*.schema.json` | strojové kontrakty v1: message envelope, trusted context, dispatch envelope (binding), result envelope, module descriptor |
| `ai-agenti` | metodika stavby agentů; `sablony/navrhovy-list.md` se vyplňuje před prvním kódem |
| `faxx-dox` | první vertical slice (email → dokument → extrakce → validace → review) |
| `job-watch`, `gmail-mcp`, `domlov`, `faxx-hr` | reálné implementace pro evidence matrix |
| USB Guardian | pattern source pro endpoint runtime; kód se neextrahuje |
