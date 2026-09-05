# AGENT PLATFORM FOUNDATION
## Filozofie, architektonický baseline a zakládací pravidla pro modulární AI agentní farmu

**Verze:** 0.1 — Foundation Draft  
**Datum:** 5. 9. 2026  
**Status:** Zakládací dokument pro první implementaci agentní platformy  
**Jazyk dokumentu:** čeština  
**Technické kontrakty, názvy API, eventů, commandů a machine-readable identifikátory:** angličtina  

---

## 0. Účel dokumentu

Tento dokument definuje základní filozofii a architektonická pravidla pro budoucí ekosystém AI agentů, deterministických robotů, orchestrátorů a opakovaně použitelných modulů.

Cílem není navrhnout jednu konkrétní aplikaci. Naopak: předpokládá se, že dnes není možné předvídat, jaké agendy budou v budoucnu vznikat. Může jít o vytěžování dokumentů, screening e-mailů, zpracování faktur, přípravu plateb, ERP integrace, endpoint management, monitoring, dokumentové workflow, plánování, interní podporu, cloudové služby nebo úplně nové scénáře.

Platforma proto musí být navržena jako **obecná LEGO stavebnice**, ve které lze jednotlivé části kombinovat bez toho, aby jeden modul znal interní implementaci druhého.

Dokument navazuje zejména na:

- projekt **`ai-agenti`** a jeho princip **„AI rozpoznává. Kód vykonává.“**,
- zkušenosti z projektu **USB Guardian**, zejména vzdálený deployment, heartbeat, verzování, rollback, oddělení identit, durable processing, audit a provozní dohled,
- dosavadní zkušenosti s interními nástroji, integracemi, ETL, monitoringem a bezpečnostními audity,
- požadavek na dlouhodobou udržitelnost v horizontu minimálně několika let a potenciálně více zákazníků.

Tento dokument má být použit jako **první architektonická brána před zahájením implementace agentní farmy**.

---

# 1. Základní filozofie

## 1.1 AI rozpoznává. Kód vykonává.

Základní princip z projektu `ai-agenti` zůstává beze změny:

> **AI recognizes. Code executes.**

Model je vhodný pro:

- intent recognition,
- classification,
- extraction of structure from unstructured input,
- synthesis,
- reasoning nad neúplnými nebo nejednoznačnými daty,
- návrh dalšího kroku.

Model není autoritou pro provedení změny v externím systému.

Jakákoli state-changing operace musí být provedena deterministickým kódem přes předem definovaný kontrakt.

---

## 1.2 AI agent nemá přímá write práva

Toto je **hard security invariant**:

> **AI components MUST NOT possess direct write credentials to business systems.**

AI agent smí:

- číst data v rámci svého scope,
- klasifikovat,
- extrahovat,
- porovnávat,
- vyhodnocovat,
- navrhovat akci,
- vytvářet strukturovaný command request.

AI agent nesmí přímo:

- zapisovat do ERP,
- provádět platbu,
- odesílat e-mail,
- mazat data,
- měnit uživatele,
- měnit firewall,
- instalovat software,
- stampovat nebo přepisovat dokumenty,
- měnit konfiguraci cílového systému.

---

## 1.3 Write privilege patří pouze jednoúčelovému stroji

Druhý tvrdý invariant:

> **Write privilege belongs only to a single-purpose deterministic executor.**

Příklady:

- `PaymentExecuteRobot`
- `PaymentPrepareRobot`
- `EmailSendRobot`
- `DocumentStampRobot`
- `DocumentArchiveRobot`
- `ERPVendorUpdateRobot`
- `DeploymentRobot`
- `ServiceRestartRobot`

Každý executor má:

- vlastní identitu,
- vlastní credentials,
- minimální scope,
- explicitní seznam povolených commandů,
- tenant boundary,
- rate limits,
- audit trail,
- idempotency pravidla.

Executor nepřijímá volný text. Přijímá pouze strukturovaný, validovaný command.

---

# 2. Cílový mentální model: LEGO, nikoli síť závislostí

Každá část systému má být použitelná jako samostatná kostka.

Správný modul vystavuje **capabilities**, ne svoje interní tabulky, třídy nebo implementační detaily.

> **Agents expose capabilities, not their internals.**

Orchestrátor zná:

- capability,
- contract version,
- input schema,
- output schema,
- security requirements,
- execution state.

Orchestrátor nezná:

- názvy SQL tabulek modulu,
- interní sloupce,
- ORM modely,
- lokální filesystem strukturu,
- implementaci konkrétního OCR,
- konkrétní knihovnu použitou uvnitř modulu.

Druhý klíčový princip:

> **The orchestrator knows contracts, not databases.**

---

# 3. Referenční architektura

```text
                         USERS / SYSTEMS
                               |
                  chat / email / API / event
                               |
                               v
                     +-------------------+
                     |   ORCHESTRATOR    |
                     | planning / state  |
                     +---------+---------+
                               |
                     capability routing
                               |
           +-------------------+-------------------+
           |                   |                   |
           v                   v                   v
    +-------------+     +-------------+     +-------------+
    | AI AGENT    |     | AI AGENT    |     | HYBRID      |
    | Email       |     | Invoice     |     | Document    |
    +------+------+     +------+------+     +------+------+ 
           |                   |                   |
           +-------------------+-------------------+
                               |
                        validated commands
                               |
                     +---------v---------+
                     | POLICY / SECURITY |
                     |    BOUNDARY       |
                     +---------+---------+
                               |
           +-------------------+-------------------+
           |                   |                   |
           v                   v                   v
  +----------------+  +----------------+  +----------------+
  | SINGLE-PURPOSE |  | SINGLE-PURPOSE |  | SINGLE-PURPOSE |
  | Payment Robot  |  | Email Robot    |  | ERP Robot      |
  +----------------+  +----------------+  +----------------+

             Common Platform Services
  identity | tenancy | contracts | audit | queues
  versioning | deployment | health | observability
  retention | secrets | evidence | human review
```

---

# 4. Tři typy komponent

## 4.1 AI Agent

Používá model tam, kde je nutná interpretace nejasného vstupu.

Například:

- email classification,
- document classification,
- extracting invoice fields,
- reasoning over inconsistent evidence.

Nemá write credentials.

## 4.2 Deterministic Agent / Module

Neobsahuje LLM nebo ho nepotřebuje pro hlavní funkci.

Například:

- inventory collector,
- health monitor,
- deployment client,
- registry validator,
- checksum verifier.

## 4.3 Single-purpose Executor / Robot

Má úzké write oprávnění a provádí jednu změnovou agendu.

Například:

- `payment.execute`,
- `email.send`,
- `document.stamp`,
- `erp.vendor.update`.

---

# 5. Orchestrátor

Orchestrátor není monolit obsahující business logiku všech agend.

Jeho odpovědnost je:

1. přijmout goal nebo trigger,
2. identifikovat požadované capabilities,
3. sestavit nebo načíst workflow,
4. spouštět jednotlivé kroky,
5. čekat na výsledky/eventy,
6. řešit retry a timeouty,
7. vyvolat human review,
8. uchovat stav workflow,
9. pokračovat po restartu,
10. ukončit workflow v pozorovatelném stavu.

Orchestrátor nesmí mít univerzální write credentials.

---

# 6. Capability model

Každý agent nebo modul deklaruje, co umí.

Příklad:

```json
{
  "componentId": "invoice-agent",
  "componentVersion": "3.4.1",
  "runtime": "container",
  "capabilities": [
    {
      "name": "invoice.extract",
      "versions": ["1", "2"],
      "preferredVersion": "2"
    },
    {
      "name": "invoice.validate",
      "versions": ["2"]
    }
  ]
}
```

Orchestrátor vybírá podle capability, nikoli podle pevného názvu služby.

---

# 7. Univerzální message envelope

Každá komunikace mezi samostatnými částmi platformy musí používat standardizovanou obálku.

```json
{
  "messageId": "uuid",
  "correlationId": "uuid",
  "causationId": "uuid",
  "tenantId": "tenant-001",
  "source": "email-agent",
  "target": "invoice-agent",
  "messageType": "command",
  "name": "invoice.extract",
  "schemaVersion": "2.0",
  "createdAt": "2026-09-05T10:00:00Z",
  "idempotencyKey": "...",
  "payload": {}
}
```

Obálka řeší univerzálně:

- routing,
- tenancy,
- correlation,
- causation,
- audit,
- retry,
- idempotency,
- versioning,
- observability.

`payload` je domain-specific.

---

# 8. Versioning a backward compatibility

Dlouhodobá udržitelnost stojí na kompatibilitě.

## 8.1 Tři vrstvy verze

Každá komponenta musí rozlišovat:

1. **Component version** — například `invoice-agent 3.4.1`
2. **Capability version** — například `invoice.extract/v2`
3. **Schema version** — například `2.1`

Tyto verze nejsou totéž.

## 8.2 Podpora více verzí současně

Novější modul nesmí automaticky odříznout starší kontrakt.

Příklad:

```text
invoice.extract/v1   SUPPORTED
invoice.extract/v2   SUPPORTED + PREFERRED
invoice.extract/v3   BETA
```

Lifecycle:

```text
ACTIVE -> DEPRECATED -> SUNSET -> REMOVED
```

Doporučený baseline:

- Core: N a N-1 major
- Capability contracts: minimálně dvě major verze po přechodné období
- odstranění veřejného kontraktu pouze po měřeném ověření, že jej žádný aktivní consumer nepoužívá

## 8.3 Contract negotiation

Consumer a provider se musí dohodnout na nejvyšší společné verzi.

Pokud společná verze neexistuje, execution musí skončit stavem `INCOMPATIBLE`, nikoli pokusem „nějak to přeložit“.

---

# 9. Data ownership

Každý modul vlastní svoje domain data.

Příklad:

```text
Invoice Module
  invoices
  suppliers
  extraction_results

Email Module
  messages
  classifications

USB Module
  devices
  incidents
  policy
```

**Zakázaný pattern:**

```text
Module A -> SELECT * FROM ModuleB.Database
```

**Povolený pattern:**

```text
Module A -> REST / event / contract -> Module B
```

Tím se zachová testovatelnost, izolace a možnost modul vyměnit.

---

# 10. Platform data vs. domain data

Společná platforma může uchovávat například:

```text
Tenants
Components
ComponentVersions
Capabilities
Executions
Commands
Events
Deployments
HealthStates
AuditRecords
ReviewTasks
RetentionPolicies
```

Konkrétní domain obsah zůstává v modulech.

Execution log nesmí být náhradou za domain databázi.

---

# 11. Stavový model workflow

Každý krok musí končit explicitním stavem.

Minimální společný stavový slovník:

```text
PENDING
RUNNING
COMPLETED
FAILED
RETRYABLE
WAITING_EXTERNAL
NEEDS_REVIEW
REJECTED
CANCELLED
UNKNOWN_RESULT
INCOMPATIBLE
```

Princip z `ai-agenti` zůstává zásadní:

> **No silent branch.**

Každý konec musí být:

- známý úspěch,
- známé selhání,
- nebo zaznamenaný neznámý stav s definovaným dalším krokem.

---

# 12. Retry není „zkus totéž znovu“

Rozlišujeme minimálně tři retry třídy.

## 12.1 Technical retry

Například:

- HTTP 503,
- timeout,
- dočasně nedostupný registry service.

Strategie:

- exponential backoff,
- jitter,
- bounded attempts,
- circuit breaker.

## 12.2 Quality retry

Například:

- nekvalitní scan,
- OCR confidence 0.62,
- nejednoznačné IČO.

Strategie:

- alternate OCR,
- re-render at higher DPI,
- crop / deskew / contrast enhancement,
- independent second extraction,
- contextual cross-check.

## 12.3 Business re-evaluation

Například:

- IČO přečteno, ale registry validation failed,
- bank account nesouhlasí,
- dokument byl pravděpodobně chybně klasifikován.

Strategie:

- cross-validation,
- reclassification,
- human review.

---

# 13. Human-in-the-loop je core capability

Human review nesmí být dodatečný hack konkrétní aplikace.

Platforma má mít obecný `Review Queue`.

Review task obsahuje minimálně:

```text
reviewId
workflowId
executionId
tenantId
reason
resourceRef
currentValue
alternatives
confidence
validationEvidence
requestedAction
expiresAt
```

Člověk může například:

- potvrdit,
- opravit hodnotu,
- odmítnout,
- změnit klasifikaci,
- vrátit workflow do předchozí fáze.

Workflow po zásahu pokračuje ze známého checkpointu; nezačíná zbytečně celé znovu.

---

# 14. Příklad: faktura jako stavový graf

```text
Email / PDF
   |
   v
Classify document
   |
   +-- uncertain ------> Reclassify / Human Review
   |
   v
Extract fields
   |
   v
Validate
   |
   +-- quality issue --> Alternate extraction loop
   |
   +-- business issue -> Cross-check / Human Review
   |
   v
Policy evaluation
   |
   +-- PASS -----------> next workflow
   |
   +-- NEEDS_REVIEW ---> Review Queue
   |
   +-- WRONG_TYPE -----> Classification
```

Toto není specifický mechanismus faktur. Stejný engine lze použít pro smlouvy, email routing, support, onboarding nebo data import.

---

# 15. Confidence, provenance a validation

Výstup modelu nesmí být jen hodnota.

Příklad:

```json
{
  "field": "companyId",
  "value": "12345678",
  "confidence": 0.71,
  "source": "ocr",
  "trustLevel": "untrusted-derived",
  "validation": {
    "status": "failed",
    "provider": "business-registry"
  }
}
```

Další modul musí znát:

- odkud data pocházejí,
- jaká je confidence,
- zda byla validována,
- jakým zdrojem,
- z jakého originálu byla odvozena.

---

# 16. Injection resistance a trust boundaries

Prompt injection, tool injection a data injection jsou platformový problém.

## 16.1 Všechna externí data jsou untrusted

Například:

- email body,
- PDF,
- OCR text,
- web page,
- registry result,
- attachment,
- user supplied document.

Musí být explicitně považována za `UNTRUSTED_CONTENT`.

## 16.2 Untrusted text není instrukce

Klíčový invariant:

> **No untrusted text may become privileged instruction without passing a deterministic validation boundary.**

## 16.3 Model output není executable code

Zakázáno:

```text
powershell.exe + modelOutput
SQL + modelOutput
shell command generated by model
```

Správně:

```text
command = "service.restart"
serviceId = "approved-service-17"
```

A executor má allowlist.

## 16.4 Inter-agent output není automaticky trusted

Výstup jednoho agenta je vstupem druhého a musí projít:

1. schema validation,
2. tenant validation,
3. provenance check,
4. policy check,
5. authorization.

Interní síť nebo interní modul neznamená automatickou důvěru.

---

# 17. Identity a authorization

Musí být odděleno:

- **authentication** — kdo jsi,
- **authorization** — co smíš,
- **tenant context** — za koho jednáš,
- **capability scope** — kterou činnost smíš provést.

Identity categories:

```text
Human User
AI Agent
Deterministic Module
Single-purpose Executor
Endpoint Agent
Server Agent
Service Principal
Tenant
```

Každá má vlastní lifecycle.

---

# 18. Multi-tenancy jako posuzovaná možnost

Multi-tenancy není povinnost pro každý projekt.

Deployment model musí být explicitně klasifikován:

```text
ON_PREM_SINGLE_TENANT
CLOUD_SINGLE_TENANT
CLOUD_MULTI_TENANT
HYBRID
```

USB Guardian je typickým příkladem `ON_PREM_SINGLE_TENANT`: každá firma má vlastní instalaci a není důvod uměle přidávat tenant logiku dovnitř instance.

Cloudová služba pro více zákazníků na jedné codebase je naopak `CLOUD_MULTI_TENANT` a tenant isolation je tam primární bezpečnostní invariant.

---

# 19. Tenant isolation

Tenant isolation nesmí být filtr v UI ani instrukce v promptu.

Trusted tenant context musí vzniknout z ověřené identity.

Backend nesmí věřit `tenantId` zaslanému libovolně v business payloadu.

Správný princip:

```text
authenticated identity
       |
       v
trusted tenant context
       |
       v
repository / data policy
       |
       v
TenantId enforced
```

Datový dotaz:

```text
WHERE TenantId = authenticatedTenantId
  AND ResourceId = requestedResourceId
```

Ideálně defense-in-depth:

1. identity provider,
2. authorization middleware,
3. tenant context middleware,
4. repository filter,
5. database Row-Level Security tam, kde to dává smysl.

---

# 20. Tokeny, certifikáty a secrets

Token a certifikát nejsou totéž.

```text
TLS certificate  -> transport encryption + server identity
OAuth/OIDC token -> short-lived authorization
Client certificate -> machine/service identity
Signing key -> artifact/document/config integrity
```

Pro cloud:

- users: OIDC/OAuth2, případně Microsoft Entra ID,
- service-to-service: OAuth2 client credentials,
- citlivější machine identity: certificate-based authentication,
- short-lived access tokens,
- explicit expiry,
- revocation,
- rotation.

Žádné univerzální statické API key na roky.

Secrets musí mít lifecycle:

```text
owner
version
createdAt
expiresAt
rotatedAt
revokedAt
```

Při rotaci musí být možné krátkodobě podporovat old + new credential.

---

# 21. English-only machine contracts

Veškerá interní technická komunikace je v angličtině.

Platí pro:

- class names,
- methods,
- REST endpoints,
- JSON properties,
- events,
- commands,
- capabilities,
- enums,
- statuses,
- DB technical names,
- config keys,
- error codes,
- module identifiers.

Příklad:

```text
invoice.validation.failed
agent.health.degraded
deployment.completed
document.review.requested
```

Human-facing obsah je lokalizovaný.

Systém jako celek musí používat UTF-8 a korektně zvládat Unicode, ale identifikátory kontraktů nesmí být závislé na české diakritice.

---

# 22. Endpoint / Server / Cloud runtime

Platforma nesmí předpokládat, kde komponenta běží.

Runtime classification:

```text
endpoint
server
container
cloud-function
managed-service
```

Orchestrátor řeší capability, ne fyzické umístění.

---

# 23. Reusable Endpoint Agent Core

USB Guardian vytvořil důležitý precedent: automatické nasazení služby na vzdálené stanice, enrollment, heartbeat, version reporting, update a rollback.

Z tohoto patternu má vzniknout obecné `Endpoint Agent Core`.

Jedna služba na endpointu:

```text
Endpoint Agent Core
  identity
  secure communication
  heartbeat
  configuration
  durable local queue
  version reporting
  update / rollback
  logging
  health
  module manager

  Modules:
    USB control
    Inventory
    Diagnostics
    Certificate Watch
    EventLog
    Service Watch
```

Default:

> **One endpoint = one agent service = N modules.**

Samostatný proces vzniká pouze v případě, že je potřebná silnější bezpečnostní nebo procesní izolace.

---

# 24. Co přebíráme z USB Guardianu

USB Guardian není jen USB feature. Z pohledu budoucí platformy je referenční implementací několika obecných principů:

- fleet discovery,
- auto-enrollment,
- remote deployment,
- dedicated deployment identities,
- heartbeat,
- centrally distributed policy,
- offline operation,
- durable local processing,
- explicit version reporting,
- staged packages,
- rollback,
- health monitoring,
- audit trail,
- break-glass,
- least privilege,
- CI/testing hardening.

Tyto mechanismy je vhodné vytahovat do reusable core pouze tehdy, když jsou skutečně obecné. USB-specific enforcement musí zůstat feature modulem.

---

# 25. Versioning deploymentu

Každý runtime musí reportovat minimálně:

```text
coreVersion
componentVersion
contractVersions
buildCommit
configurationVersion
policyVersion
```

Deployment musí podporovat:

```text
DEV -> TEST -> CANARY -> PILOT -> 10% -> 50% -> 100%
```

Rollout musí být možné zastavit a rollbacknout podle health signálů.

Příklady rollback triggers:

- startup failure,
- heartbeat loss,
- error rate above threshold,
- queue growth,
- schema incompatibility.

---

# 26. Durable execution

Orchestrace nesmí být závislá na tom, že proces zůstane běžet od začátku do konce.

Workflow musí přežít restart.

```text
Workflow
  -> durable command
  -> queue
  -> component
  -> durable result/event
  -> workflow resumes
```

Každý execution step má:

```text
executionId
workflowId
correlationId
idempotencyKey
attempt
status
startedAt
finishedAt
```

---

# 27. Idempotence

Každý command, který může být doručen opakovaně, musí být idempotentní nebo mít explicitní reconciliation mechanismus.

Příklad:

```text
IdempotencyKey = workflowId + stepId
```

`payment.execute` nesmí při třech retry vytvořit tři platby.

Pokud výsledek vzdálené operace není znám, stav je `UNKNOWN_RESULT`, ne `FAILED` a ne `COMPLETED`.

---

# 28. Queue, backpressure a dead-letter

Platforma musí počítat s přetížením.

Při růstu workloadu nesmí default chování být:

```text
RAM growth -> OOM -> crash
```

Musí existovat:

- bounded queues,
- backpressure,
- retry policy,
- circuit breaker,
- dead-letter queue,
- alerting.

Po definovaném počtu neúspěchů:

```text
-> DLQ
-> audit
-> alert
-> manual investigation
```

Nikdy nekonečný retry loop.

---

# 29. Observability jako contract

Každá komponenta musí standardně poskytovat:

```text
health
version
uptime
lastHeartbeat
lastSuccessfulOperation
queueDepth
oldestQueuedItemAge
errorRate
latency
storageUsage
configurationVersion
```

Provozní cíl:

> Pro zjištění stavu farmy nesmí být nutné ručně přihlašovat se na jednotlivé servery nebo stanice.

---

# 30. Audit vs log vs evidence

Tyto pojmy se nesmí smíchat.

## Operational log

Diagnostika běhu aplikace.

## Security log

Autentizace, authorization failure, suspicious behavior, security relevant changes.

## Audit trail

Kdo, co, kdy, za koho a s jakým výsledkem provedl.

## AI execution trace

Model, prompt/config version, tool calls, confidence, decision metadata — pouze v rozsahu potřebném pro reprodukovatelnost a bezpečnost.

## Business evidence

Originální dokumenty, zprávy, schválení, výsledné business artefakty.

Každá kategorie má jinou retention a ACL.

---

# 31. Evidence by Design

Platforma má od počátku umět obhájit, proč něco udělala.

Vedle Security by Design a Privacy by Design zavádíme:

> **Evidence by Design.**

Pro významný workflow musí být možné dohledat:

- originální vstup,
- hash originálu,
- kdo/odkud jej přijal,
- která verze agenta jej zpracovala,
- která capability a schema version,
- jaký model/version/config byl použit,
- jaká validation evidence existovala,
- jaká policy byla aktivní,
- proč padlo rozhodnutí,
- zda zasáhl člověk,
- který executor provedl write operation,
- výsledný stav.

---

# 32. Dokumenty a immutable original

Originální dokument se nikdy nepřepisuje.

```text
Original Artifact
  |
  +-> derived OCR
  +-> extracted JSON
  +-> validated business object
  +-> stamped PDF
  +-> archive representation
```

Každý derived artifact má `derivedFrom` vazbu.

Originál má hash a pokud je to vhodné, immutable/WORM storage.

---

# 33. Stamp / watermark / signature

Pokud dokument prošel workflow, systém může vytvořit odvozenou verzi se stampem nebo watermarkem.

Nikdy nepřepisovat originál.

Příklad machine command:

```json
{
  "command": "document.stamp",
  "schemaVersion": "1.0",
  "documentId": "doc-123",
  "stampType": "validated",
  "workflowId": "wf-456"
}
```

Stamp provádí `DocumentStampRobot`, nikoli AI.

Možné stavy:

```text
RECEIVED
EXTRACTED
VALIDATED
HUMAN_APPROVED
PAID
ARCHIVED
```

Evidence obsahuje original hash i derived hash.

---

# 34. Compliance by Design

Platforma musí být navržená tak, aby se dala rozumně provozovat v prostředí s požadavky typu:

- NIS2 / český zákon o kybernetické bezpečnosti,
- ISO/IEC 27001 family,
- GDPR,
- účetní a daňové retention povinnosti,
- případné sektorové regulace,
- smluvní požadavky zákazníka.

Platforma nemá hardcodovat konkrétní legislativní lhůty do business logiky.

Má poskytovat mechanismy:

- identity,
- least privilege,
- audit,
- evidence,
- retention,
- deletion,
- encryption,
- incident traceability,
- backup/restore,
- access review.

Konkrétní zákazník dostane `Compliance Profile`.

---

# 35. Retention a růst dat

Systém musí od začátku počítat s tím, že za 5 let bude množství dat řádově větší než na začátku.

Každá datová kategorie má deklarovat:

```text
retentionPeriod
archiveAfter
deleteAfter
legalHoldAllowed
immutable
encryptionClass
accessClass
```

Možný lifecycle:

```text
HOT -> WARM -> ARCHIVE -> DELETE
```

Příklad kategorií:

- raw telemetry,
- detailed audit,
- aggregates,
- security incidents,
- debug logs,
- original documents,
- derived artifacts,
- AI traces.

Retence musí být policy-driven a případně tenant-specific.

---

# 36. GDPR a privacy

Multi-tenant agentní platforma bude pravděpodobně zpracovávat osobní údaje.

Minimálně musí podporovat:

- purpose limitation,
- data minimisation,
- access control,
- encryption,
- retention,
- deletion,
- export,
- audit,
- data classification.

AI trace nesmí bezmyšlenkovitě duplikovat celý email, PDF a prompt do běžného aplikačního logu.

---

# 37. Model governance

Model je produkční dependency.

Proto se eviduje:

```text
provider
modelId
modelVersion
configurationVersion
promptVersion
```

Změna modelu není automaticky bezpečný upgrade.

Před nasazením změny modelu:

1. eval,
2. regression suite,
3. comparison,
4. approval,
5. staged rollout.

Automatické samovolné přepisování promptů do produkce je zakázáno.

---

# 38. Cross-checking

Pro kritická pole je vhodné nezávislé ověření.

Například faktura:

```text
OCR A -> companyId candidate
OCR B -> companyId candidate
Registry -> external validation
Vendor master -> internal validation
```

Shoda zvyšuje confidence.

Neshoda vede na další strategii nebo human review.

Křížová kontrola není „hlasování modelů“ bez pravidel. Má explicitní policy.

---

# 39. Security classification akce

Každá state-changing capability má deklarovat risk class.

Příklad:

```text
LOW       reversible metadata update
MEDIUM    business record change
HIGH      payment / external communication
CRITICAL  identity / security / destructive operation
```

Policy podle class určuje:

- required approvals,
- second channel,
- executor identity,
- rate limits,
- audit detail,
- rollback/reconciliation strategy.

---

# 40. Separation of duties

U citlivých workflow může být vhodné rozdělit proces:

```text
AI Invoice Agent
  -> PaymentPrepareRobot
  -> Human Approval
  -> PaymentExecuteRobot
```

Jeden executor tedy nemusí mít pravomoc vytvořit i provést kritickou operaci.

---

# 41. Module Contract v1 — minimální obsah

Každý reusable modul musí deklarovat:

```text
name
componentVersion
runtime
capabilities
supportedCapabilityVersions
inputSchemas
outputSchemas
commandsAccepted
eventsEmitted
authScopes
tenantMode
dataOwner
trustBoundary
sideEffects
dependencies
healthContract
failureModes
retryPolicy
idempotencyBehavior
retentionClass
securityClassification
compatibility
```

Bez tohoto kontraktu modul není připravený ke skládání.

---

# 42. Standardní technické endpointy

Pokud je modul samostatná služba, preferovaný baseline:

```text
GET /health
GET /version
GET /capabilities
```

Business commands a events jsou verzované.

Endpoint naming a JSON jsou English-only.

---

# 43. REST vs events

REST je vhodný pro:

- query,
- explicit command,
- health,
- synchronous validation.

Events jsou vhodné pro:

- oznámení změny stavu,
- loose coupling,
- workflow continuation,
- fan-out.

Příklad:

```text
invoice.validated
payment.prepared
document.review.requested
agent.health.degraded
```

Modul nesmí vědět, kdo všechno event konzumuje.

---

# 44. API a schema compatibility

Každý veřejný contract musí mít automatický contract test.

CI musí zachytit například:

- odstranění povinného field,
- změnu typu,
- změnu enumu bez compatibility strategy,
- změnu error semantics,
- nekompatibilní event.

Breaking change vyžaduje novou major contract version.

---

# 45. Database migrations

Každý modul s vlastní persistentní databází eviduje applied migrations.

Minimálně:

```text
MigrationId
SchemaVersion
Checksum
AppliedAt
ApplicationVersion
```

Při rolling upgrade používat expand-and-contract pattern:

```text
add new structure
-> dual write/read compatibility
-> migrate old data
-> switch consumers
-> stop old writes
-> remove old structure later
```

Vyhýbat se destruktivní změně DB v témže release, kdy ji nový kód poprvé potřebuje.

---

# 46. Backup a restore

Backup bez restore testu není ověřený backup.

Pro každý persistentní modul musí být známo:

```text
RPO
RTO
backup frequency
restore procedure
restore test frequency
```

Multi-tenant systém musí řešit i obnovu bez porušení tenant isolation.

---

# 47. Resource governance

Každý modul musí mít limity:

- CPU,
- memory,
- disk,
- DB connections,
- concurrency,
- requests,
- LLM tokens/cost,
- queue size.

Cíl: chyba jednoho modulu nesmí zničit celý ekosystém.

---

# 48. Kill switch a degraded mode

Každý významný agent musí mít možnost centrálního vypnutí.

Podle typu může existovat:

```text
DISABLED
READ_ONLY
DEGRADED
FULL
```

Při výpadku externí služby se systém nesmí automaticky přepnout do nebezpečně benevolentního režimu.

Fail-open vs fail-closed musí být explicitní architektonické rozhodnutí.

---

# 49. Security defaults

Default musí být bezpečný:

- unknown identity -> deny,
- unknown command -> reject,
- unsupported schema -> reject,
- missing tenant -> reject v multi-tenant režimu,
- failed validation -> no write,
- ambiguous sensitive result -> `NEEDS_REVIEW`,
- expired credential -> deny,
- unknown execution outcome -> reconcile, ne blind retry.

---

# 50. Testing strategy

Každá kostka má testovací pyramidu podle svého rizika.

Minimálně:

1. unit tests,
2. contract tests,
3. integration tests,
4. negative/security tests,
5. failure injection,
6. compatibility tests,
7. end-to-end vertical slice.

U AI navíc:

- eval set,
- adversarial inputs,
- injection tests,
- regression against prior model/prompt version.

---

# 51. Security test invariants

Příklady release blockers:

```text
cross-tenant read succeeds
AI can invoke unauthorized write
unknown command reaches executor
prompt injection escalates capability
old contract breaks without new major version
idempotency duplicate causes duplicate side effect
audit record missing for critical write
secret leaks into ordinary log
```

Jediný potvrzený cross-tenant data leak je release blocker.

---

# 52. CI/CD baseline

Doporučený tok:

```text
commit
-> lint/static checks
-> unit tests
-> contract tests
-> security tests
-> AI eval regression where relevant
-> build
-> package/sign
-> staging
-> canary
-> approval
-> production
```

Žádný přímý production deployment pouze proto, že build prošel.

---

# 53. Supply-chain security

Každý deployable artifact má ideálně:

```text
version
commit
SHA-256
signature
build metadata
SBOM
```

Deployment robot přijímá pouze schválené artifacty.

USB Guardian ukázal význam verzovaných balíčků, oddělených deploy identit a rollbacku; tento princip se má zobecnit.

---

# 54. Long-term operability

Za pět let nesmí být systém závislý na tom, že autor „ví, jak to funguje“.

Každý modul musí být předatelný.

Požadujeme:

- runbook,
- health signals,
- standard errors,
- deployment instructions,
- rollback instructions,
- data ownership,
- contract documentation,
- known failure modes,
- support ownership.

Bus factor je provozní riziko.

---

# 55. Data growth a cost observability

Farmu je nutné měřit nejen funkčně, ale ekonomicky.

Per tenant / component sledovat:

- storage growth,
- model cost,
- API usage,
- processing volume,
- queue time,
- retention footprint.

Bez toho se může levný pilot za několik let změnit v drahou infrastrukturu bez jasného důvodu.

---

# 56. Tenant lifecycle

Cloud multi-tenant platforma musí umět:

```text
create tenant
configure tenant
activate
suspend
disable credentials
rotate secrets
export data
apply legal hold
delete/anonymize according to policy
terminate tenant
```

Tenant deletion musí zahrnovat i:

- derived data,
- caches,
- indexes,
- archived data,
- AI memory,
- secrets,
- scheduled workflows.

---

# 57. Policy-driven customization

Rozdíly mezi zákazníky mají být primárně v policy/config, ne ve forku codebase.

Například invoice validation:

```text
Tenant A:
  companyId must validate
  bank account mismatch -> manual review
  confidence >= 0.90

Tenant B:
  companyId must validate
  bank mismatch -> warning
  confidence >= 0.80
```

Stejný workflow engine, jiná policy.

---

# 58. Ne všechno musí být microservice

Pouzdření není totéž co samostatný proces.

Na endpointu preferujeme jeden `Endpoint Agent Core` a in-process moduly.

Na serveru nebo cloudu mohou být některé moduly samostatné služby, pokud je k tomu důvod:

- independent scaling,
- security isolation,
- technology boundary,
- deployment independence,
- failure isolation.

Microservice není defaultní odměna za modularitu.

---

# 59. Model farmy

Budoucí ekosystém může vypadat například takto:

```text
Orchestrator
  |
  +-- Email Screening Agent
  +-- Document Classification Agent
  +-- Invoice Extraction Agent
  +-- Validation Agent
  +-- Support Agent
  +-- Planning Agent
  |
  +-- Executors
        +-- EmailSendRobot
        +-- PaymentPrepareRobot
        +-- PaymentExecuteRobot
        +-- ERPWriteRobot
        +-- DocumentStampRobot
        +-- DeploymentRobot

Infrastructure
  +-- Identity
  +-- Tenant Context
  +-- Contract Registry
  +-- Workflow Store
  +-- Event Bus
  +-- Audit/Evidence
  +-- Review Queue
  +-- Deployment
  +-- Observability
```

---

# 60. Co nemá být součástí Core

Core se musí držet malý a konzervativní.

Do Core nepatří:

- invoice business rules,
- email classification prompts,
- USB-specific policy,
- konkrétní ERP schema,
- konkrétní registry provider.

Core obsahuje pouze mechanismy potřebné napříč projekty.

Čím více domain logiky se dostane do Core, tím dražší bude každý budoucí upgrade.

---

# 61. Co má být součástí Core

Kandidáti:

- identity abstraction,
- tenant context,
- contract/version handling,
- execution state,
- correlation/idempotency,
- durable messaging,
- audit hooks,
- health/version reporting,
- configuration,
- secrets interface,
- review task interface,
- deployment metadata,
- observability conventions.

---

# 62. První praktické ověření platformy

Platforma není prokázaná tím, že na ní funguje jeden projekt.

USB Guardian je první významný precedent pro runtime/deployment/operations.

Další test musí být z úplně jiné domény.

Doporučený kandidát:

> **Endpoint Inventory + Diagnostics**

Důvod:

- využije deployment, heartbeat, versioning a module model,
- nepotřebuje AI pro základní funkci,
- není USB-specific,
- rychle odhalí, zda je Core skutečně obecný.

Pro cloudovou agentní platformu pak jako první referenční vertical slice dává smysl:

> **Email -> Document -> Invoice extraction -> Validation -> Human Review -> deterministic action**

---

# 63. První vertical slice fakturačního workflow

Doporučený první end-to-end řez:

```text
Receive email
-> archive original message
-> identify attachments
-> classify document
-> archive original PDF + hash
-> extract invoice fields
-> validate company/VAT/account
-> confidence policy
-> human review if needed
-> produce validated invoice object
-> STOP before real payment
```

V první fázi žádná reálná payment write operace.

Teprve po stabilizaci lze přidat:

```text
PaymentPrepareRobot
-> human approval
-> PaymentExecuteRobot
```

---

# 64. Acceptance criteria pro první platform prototype

Platform prototype není hotový, dokud neumí:

- [ ] registrovat dva různé moduly přes capabilities,
- [ ] vyjednat contract version,
- [ ] doručit typed command,
- [ ] uložit durable execution state,
- [ ] přežít restart orchestrátoru,
- [ ] idempotentně zpracovat duplicate message,
- [ ] vytvořit human review task,
- [ ] po review pokračovat v workflow,
- [ ] odmítnout unsupported schema,
- [ ] auditovat celý correlation chain,
- [ ] zabránit cross-tenant access v multi-tenant testu,
- [ ] odmítnout prompt-injected write attempt,
- [ ] spustit single-purpose executor pouze přes validovaný command,
- [ ] reportovat health/version/capabilities,
- [ ] ukázat deployment/version history.

---

# 65. Architecture Decision Record povinnost

Klíčová rozhodnutí se nesmí ztratit v chatu nebo v hlavě autora.

Používat ADR například pro:

```text
ADR-001 Message transport
ADR-002 Tenant isolation model
ADR-003 Identity provider
ADR-004 Contract versioning policy
ADR-005 Workflow persistence
ADR-006 Executor security model
ADR-007 Evidence storage
ADR-008 Retention architecture
```

ADR vysvětluje:

- context,
- decision,
- alternatives,
- consequences.

---

# 66. Architecture Baseline checklist pro každý nový projekt

Před prvním kódem musí být zodpovězeno:

```text
Purpose
Deployment model
Tenant model
Data classification
Identity model
Authorization model
Capabilities
Module boundaries
AI responsibilities
Deterministic responsibilities
Write executors
Human gates
Trust boundaries
Injection exposure
Data ownership
Persistence
Retention
Evidence requirements
Compliance profile
Versioning
Compatibility
Failure modes
Retry model
Observability
Deployment / rollback
RPO / RTO
```

Pokud některý bod není relevantní, označí se explicitně `N/A`.

---

# 67. Antivzory zakázané baseline

1. AI s přímými write credentials.
2. Universal executor s širokými právy.
3. Modul čte databázi jiného modulu.
4. Orchestrátor zná interní SQL schema agentů.
5. Tenant isolation pouze v promptu nebo UI.
6. Raw shell/SQL vytvořený modelem.
7. Neomezené retry.
8. Unknown outcome zapsaný jako success.
9. Jeden API key pro všechny tenanty nebo agenty.
10. Originální dokument přepsaný během workflow.
11. Audit smí běžná aplikace libovolně editovat a mazat.
12. Breaking contract change bez nové major version.
13. Automatická změna promptu/modelu přímo v production.
14. Debug log jako úložiště business dokumentů.
15. Nasazení všem zákazníkům bez canary/pilot fáze.
16. Data bez retention policy.
17. Secret bez ownera/expirace/rotace.
18. Module Core naplněný domain-specific logikou.

---

# 68. Devět základních principů platformy

## I. Determinism at the edge of action
AI může rozhodovat a navrhovat, ale reálný side effect provádí deterministický executor.

## II. Least privilege by construction
Každá identita má pouze minimum potřebné pro jednu agendu.

## III. Contracts before code
Kontrakty vznikají dříve než implementace a jsou verzované.

## IV. Durable state, no silent branches
Workflow přežije restart a každý konec je pozorovatelný.

## V. Tenant isolation outside the model
Tenant boundary vynucuje platforma a datová vrstva, nikoli prompt.

## VI. Evidence by Design
Každé významné rozhodnutí je zpětně vysvětlitelné a dohledatelné.

## VII. Security / Privacy / Compliance by Design
Bezpečnost a retence nejsou poslední kapitola před produkcí.

## VIII. Upgradeability is a feature
Kompatibilita, migration strategy, rollout a rollback jsou součást designu.

## IX. Modules are replaceable
Modul lze nahradit, aniž by se musel přepisovat zbytek ekosystému.

---

# 69. Doporučené názvy vznikajících standardů

Pro další práci lze rozdělit dokumentaci na:

```text
PLATFORM-FOUNDATION.md
ARCHITECTURE-BASELINE.md
MODULE-CONTRACT-v1.md
MESSAGE-ENVELOPE-v1.schema.json
EXECUTOR-SECURITY-STANDARD.md
TENANT-ISOLATION-STANDARD.md
EVIDENCE-AND-RETENTION-STANDARD.md
DEPLOYMENT-AND-VERSIONING-STANDARD.md
AI-SECURITY-STANDARD.md
```

Tento dokument je předchůdcem těchto přesnějších norem.

---

# 70. Vztah k projektu `ai-agenti`

`ai-agenti` již správně definuje:

- AI rozpoznává, kód vykonává,
- žádnou tichou větev,
- unknown outcome jako regulérní stav,
- identitu a oprávnění,
- human gates,
- cross-checking,
- paměť,
- idempotenci,
- modulární kontrakty,
- zákaz přímého sahání do databáze jiného modulu,
- build gates a evaly.

Tento Foundation dokument nemá tyto principy nahrazovat.

Rozšiřuje je na úroveň celé platformy zejména o:

- orchestraci více agentů,
- capability discovery,
- message envelope,
- contract negotiation,
- backward compatibility,
- endpoint/server/cloud runtime,
- single-purpose executors,
- tenant lifecycle,
- injection trust boundaries,
- evidence chain,
- retention/data growth,
- deployment waves,
- long-term operability.

Doporučení: po stabilizaci tohoto Foundation dokumentu promítnout relevantní části do `ai-agenti` jako další verzi metodiky, nikoli jako paralelní konkurenční dokument.

---

# 71. Vztah k USB Guardianu

USB Guardian je důkaz, že některé platformové koncepty již nejsou pouze teorie.

Projekt prakticky ověřuje zejména:

- Windows Service agent,
- vzdálené nasazení bez ručně sdílených hesel,
- oddělené deploy identity,
- heartbeat,
- server-to-agent policy,
- version reporting přes git commit,
- update workflow,
- rollback přes verzované balíčky,
- offline behavior,
- durable incident processing,
- audit/activity history,
- health checks,
- CI testování.

Poučení pro farmu:

> Reusable mechanismus má vzniknout extrakcí ověřeného patternu, ne předčasným zobecněním neověřené myšlenky.

---

# 72. Co ještě nevíme — a je správné to nevědět

Dnes není nutné rozhodnout:

- konkrétní message broker,
- konkrétní workflow engine,
- konkrétní cloud,
- konkrétní identity provider pro všechny scénáře,
- jeden univerzální database model,
- jeden LLM provider,
- zda každý server module bude process nebo container.

Je však nutné definovat **kontrakty a invariants**, které musí přežít výměnu těchto technologií.

To je hlavní účel tohoto dokumentu.

---

# 73. Doporučený další postup

## Fáze A — formalizace kontraktů

Vytvořit:

1. `MODULE-CONTRACT-v1.md`
2. `MESSAGE-ENVELOPE-v1.schema.json`
3. `EXECUTION-STATE-v1.md`
4. `CAPABILITY-DISCOVERY-v1.md`
5. `EXECUTOR-SECURITY-STANDARD.md`

## Fáze B — minimální Platform Core

Implementovat pouze:

- registry komponent,
- capabilities,
- contract version negotiation,
- durable workflow state,
- command/event envelope,
- audit correlation,
- review queue.

## Fáze C — dva odlišné referenční moduly

- deterministic: Inventory/Diagnostics,
- AI/hybrid: Document/Invoice extraction.

## Fáze D — první single-purpose write executor

Nejprve bezpečný a vratný side effect, například `DocumentStampRobot`.

Teprve poté citlivější executory.

## Fáze E — multi-tenant hardening

- tenant context,
- identity,
- data isolation tests,
- per-tenant policy,
- secret lifecycle.

---

# 74. Konečný zakládací manifest

Budoucí agentní farma nemá být „mnoho AI skriptů“.

Má být provozovatelný software ecosystem.

Proto:

> **AI understands. Deterministic code acts.**

> **Write privileges belong only to single-purpose executors.**

> **Agents expose capabilities, not internals.**

> **The orchestrator knows contracts, not databases.**

> **Every workflow is durable and every ending is observable.**

> **Tenant isolation is enforced outside the model.**

> **Untrusted content can never directly become privileged instruction.**

> **Original evidence is immutable; derived artifacts are traceable.**

> **Compatibility, migration, retention and rollback are product features.**

> **Security, Privacy, Evidence and Compliance are designed in from the beginning.**

A nejdůležitější dlouhodobý cíl:

> **Nový agent nebo modul má být přidání nové LEGO kostky, ne nový ostrov, který bude dalších pět let vyžadovat vlastní ruční údržbu.**

---

# Appendix A — Minimal example of inter-module command

```json
{
  "messageId": "df6ad94b-7d89-4f9e-a257-44e6257f0b01",
  "correlationId": "c10a58cd-1485-4bf0-a06f-957666710f0e",
  "causationId": "aa8d1803-dfd7-4f35-b16e-ea4ef2f246cc",
  "tenantId": "tenant-001",
  "source": "invoice-agent",
  "target": "document-stamp-robot",
  "messageType": "command",
  "name": "document.stamp",
  "schemaVersion": "1.0",
  "createdAt": "2026-09-05T10:00:00Z",
  "idempotencyKey": "wf-456:stamp-final",
  "payload": {
    "documentId": "doc-123",
    "stampType": "validated",
    "workflowId": "wf-456"
  }
}
```

# Appendix B — Minimal result envelope

```json
{
  "messageId": "4b578ccb-4810-468e-8538-dc3262f3d8b3",
  "correlationId": "c10a58cd-1485-4bf0-a06f-957666710f0e",
  "causationId": "df6ad94b-7d89-4f9e-a257-44e6257f0b01",
  "tenantId": "tenant-001",
  "source": "document-stamp-robot",
  "messageType": "result",
  "name": "document.stamp.completed",
  "schemaVersion": "1.0",
  "createdAt": "2026-09-05T10:00:02Z",
  "payload": {
    "status": "COMPLETED",
    "originalArtifactId": "doc-123",
    "derivedArtifactId": "doc-123-stamped-01",
    "originalHash": "sha256:...",
    "derivedHash": "sha256:..."
  }
}
```

# Appendix C — Definition of Done for reusable LEGO module

Modul lze označit za reusable pouze pokud:

- [ ] má jednoznačný účel,
- [ ] má explicitní ownership,
- [ ] má Module Contract,
- [ ] machine contract je English-only,
- [ ] má versioned input/output schemas,
- [ ] nemá přímý přístup do DB jiného modulu,
- [ ] má health/version/capabilities,
- [ ] má testy contract compatibility,
- [ ] má definované failure states,
- [ ] má retry/idempotency strategy,
- [ ] má security/trust boundary,
- [ ] má tenant model (`N/A`, single, multi),
- [ ] má retention classification,
- [ ] má audit/evidence behavior,
- [ ] má deployment/rollback postup,
- [ ] lze jej lokálně nebo v test harnessu spustit izolovaně,
- [ ] druhý modul jej umí použít bez znalosti jeho interní DB nebo kódu.

---

**END OF FOUNDATION DRAFT v0.1**
