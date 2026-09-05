# ČÁST XI — Glosář

Termíny v pořadí, v jakém je čtenář potřebuje. Anglický termín je normativní (identifikátory v kódu), český je vysvětlení.

## Komponenty a role

| Termín | Význam |
|---|---|
| **AI Agent** | komponenta používající LLM; typed vstup, typed výstup s provenance; zpracovává untrusted obsah; nemá write credentials; smí vytvořit `ProposedCommand` |
| **Deterministic Module** | komponenta bez LLM: validace, lookup, hash, normalizace; nemusí být samostatná služba |
| **Executor** (single-purpose executor) | jediná komponenta s write právem k jedné capability; přijímá jen typed command po celém rozhodovacím řetězci |
| **Executor Host** | jeden deployable hostující více executor handlerů s oddělenými credential referencemi a policy per capability |
| **Orchestrator** | koordinátor: načte workflow definici, spouští kroky, čeká, přechází mezi stavy, řeší timeout, retry, cancel, kompenzaci, audit; vlastní stav workflow, ne domain data |
| **Capability Router** | mapuje capability na instanci, verzi, tenant povolení, health; doplňuje `targetComponent` |
| **Review Service** | uchovává review tasky, role, expiry, rozhodnutí; vynucuje reviewer autorizaci; bez business logiky |
| **Endpoint Agent** | služba na koncové stanici (CANDIDATE); one endpoint = one service = N modules |
| **Component** | obecné označení kterékoli z výše uvedených; má `module-descriptor` |

## Kontrakty

| Termín | Význam |
|---|---|
| **capability** | pojmenovaná, verzovaná schopnost ve tvaru `domain.action` (`invoice.extract`); stabilní business nebo technická schopnost, ne každé interní volání |
| **capabilityVersion** | major verze business sémantiky capability; provider může nabízet více souběžně |
| **schemaVersion** | verze datového tvaru `payload`; oddělená od capabilityVersion |
| **componentVersion** | release binárky nebo služby (SemVer); neříká nic o kontraktu |
| **workflowVersion** | verze grafu a přechodů workflow; instance ji pinuje |
| **promptVersion** | verze AI instrukčního artefaktu; změna vyžaduje `AI-EVAL` regresi |
| **conformanceSuiteVersion** | verze testovací sady capability, kterou provider deklaruje jako splněnou |
| **message envelope** | caller-supplied obálka pro `command`, `event`, `query`; nese routing a korelaci, ne důvěru |
| **command** | záměr změny stavu; vyžaduje `idempotencyKey` a `notValidAfter` |
| **event** | oznámení, co se stalo (`invoice.validated`); vydavatel neví, kdo ho konzumuje |
| **query** | dotaz bez side effectu |
| **result envelope** | výsledek jednoho pokusu: `SUCCEEDED`, `FAILED`, `WAITING`, `UNKNOWN_OUTCOME`, `CANCELLED` |
| **error object** | `code` (UPPER_SNAKE), `class`, `retryable`, `message`, `details`, `retryAfter`, `diagnosticRef` |
| **error class** | `TECHNICAL`, `QUALITY`, `BUSINESS`, `SECURITY`, `POLICY`, `VALIDATION`, `DEPENDENCY`, `UNKNOWN` |
| **module descriptor** | co komponenta nabízí a co o sobě tvrdí; řídí routing, policy a verifikační profily |
| **conformance package** | schema + spustitelná suite + fixtures + golden výstupy + tabulka chyb + kompatibilita, dodávané s capability |

## Identifikátory

| Termín | Význam |
|---|---|
| **messageId** | identita jednoho doručení |
| **correlationId** | identita jednoho end-to-end business toku |
| **causationId** | `messageId` zprávy, která tuto vyvolala |
| **workflowId** | jedna instance workflow |
| **stepId** | krok v definici workflow |
| **executionId** | jeden pokus o provedení kroku |
| **dispatchId** | jeden trusted dispatch |
| **idempotencyKey** | jedna logická write intent; doporučený tvar `workflowId:stepId:strategyId:n` |
| **ULID** | Universally Unique Lexicographically Sortable Identifier; doporučený formát id, řaditelný podle času |

## Důvěra a bezpečnost

| Termín | Význam |
|---|---|
| **TrustedExecutionContext** | identita, tenant, scopes, `authStrength`, `originatingActorId`, expirace; vzniká z ověřené identity mimo payload; neměnný po dobu dispatch |
| **binding** | mechanismus, kterým je trusted context vázán ke zprávě přes transport: `in-process`, `signed-envelope`, `broker-identity`, `token-bound`, `mtls` |
| **untrusted content** | e-mail, přílohy, PDF/OCR text, web, odpovědi třetích stran, dokumenty uživatelů, výstup jiného agenta, popisy a výstupy toolů; je to data, ne instrukce |
| **trustLevel** | u hodnoty: `untrusted-derived`, `validated`, `human-corrected` |
| **ProposedCommand** | strukturovaný návrh commandu od AI agenta; není autorizovaný, dokud neprojde routerem a executorem |
| **allowlist** | explicitní seznam capabilities, které agent smí navrhovat, a commandů, které executor přijímá |
| **confused deputy** | komponenta s vlastní autoritou provede akci na žádost méně oprávněného, protože se ztratila vazba na původní identitu |
| **scope** | capability, kterou actor smí žádat; součást trusted contextu |
| **riskClass** | `LOW` (vratná metadata), `MEDIUM` (business záznam), `HIGH` (platba, externí komunikace), `CRITICAL` (identita, bezpečnost, destruktivní) |
| **fail-closed / fail-open** | při výpadku kontroly odmítnout / propustit; default je fail-closed |
| **kill switch** | centrální vypnutí komponenty: `DISABLED`, `READ_ONLY`, `DEGRADED`, `FULL` |

## Stavy a spolehlivost

| Termín | Význam |
|---|---|
| **execution state** | `PENDING`, `RUNNING`, `WAITING(reason)`, `SUCCEEDED`, `FAILED`, `CANCELLED`, `UNKNOWN_OUTCOME` |
| **WAITING reason** | `EXTERNAL`, `REVIEW`, `SCHEDULE`, `DEPENDENCY`; vždy s deadline a expiry policy |
| **UNKNOWN_OUTCOME** | side effect možná proběhl; není terminal; řeší se reconciliací, nikdy blind resend |
| **no silent branch** | každý konec je známý úspěch, známé selhání, nebo zaznamenaný neznámý stav s dalším krokem |
| **technical retry** | stejná intent, stejná strategie; stejný idempotency key; bounded, backoff, jitter |
| **quality retry** | nový logický pokus se změněnou strategií; nový klíč; budget |
| **business re-evaluation** | data přečtena, ale nesedí s realitou; cross-check, reklasifikace, review |
| **at-least-once** | zpráva může být doručena vícekrát; příjemce dedupuje |
| **idempotency retention** | jak dlouho je dedup evidence držena; pro IRREVERSIBLE `business-identity` |
| **business transaction identity** | identifikátor unikátní v cílovém systému (`paymentId`), o který se opírá dedup po expiraci technického klíče |
| **reconciliation** | zjištění skutečného stavu externí operace dotazem nebo porovnáním; převod `UNKNOWN_OUTCOME` na známý stav |
| **reversibility** | `REVERSIBLE` (lze vrátit), `COMPENSATABLE` (opačná business akce), `IRREVERSIBLE` (nelze) |
| **compensation capability** | pojmenovaná capability, která ruší efekt COMPENSATABLE kroku |
| **notValidAfter** | čas, po kterém se command nesmí provést; kontroluje executor před side effectem |
| **deadline** | u WAITING: kdy vyprší čekání |
| **workflow pinning** | běžící instance drží verzi definice, se kterou začala; policy `FINISH_ON_PINNED` |
| **backpressure** | omezení příjmu při přetížení místo růstu paměti nebo tichého zahození |
| **dead-letter (DLQ)** | místo pro zprávy, které vyčerpaly retry budget; audit + alert + ruční šetření |
| **circuit breaker** | dočasné zastavení volání selhávající závislosti |

## Lidé a evidence

| Termín | Význam |
|---|---|
| **review task** | úkol pro člověka: důvod, role, povolená rozhodnutí, expirace, expiry policy |
| **expiry policy** | `EXPIRE_TO_FAILED`, `EXPIRE_TO_CANCELLED`, `ESCALATE`, `CREATE_NEW_REVIEW`; nikdy „nic" |
| **decision** | `APPROVE`, `CORRECT`, `REJECT`, `RECLASSIFY`; autorizovaný, auditovaný přechod stavu |
| **approvalId** | identita schválení vázaná na konkrétní review task a workflow; vyžaduje ji executor s `humanApproval: required` |
| **separation of duties** | oddělení přípravy (`payment.prepare`) od provedení (`payment.execute`) s lidským schválením mezi nimi |
| **original artifact** | originální vstup (e-mail, PDF); immutable, s hashem; nikdy se nepřepisuje |
| **derived artifact** | odvozenina s `derivedFrom`; OCR text, extrahovaný JSON, stamped PDF |
| **provenance** | odkud hodnota pochází: `source`, `confidence`, `trustLevel`, `validation`; u výsledku: producer, verze, `modelId`, `promptVersion`, `derivedFrom` |
| **Evidence by Design** | pro významný workflow lze dohledat originál, hash, kdo přijal, která verze zpracovala, jaký model, jaká validace, jaká policy, proč rozhodnutí, zda zasáhl člověk, který executor zapsal, výsledný stav |
| **audit trail** | kdo, co, kdy, za koho, s jakým výsledkem; append-only |
| **AI execution trace** | model, prompt/config verze, tool volání, confidence, metadata rozhodnutí; jen v rozsahu pro reprodukovatelnost; neduplikuje dokumenty |
| **retention class** | u každé datové třídy: owner, období, archivace, mazání, legal hold |

## Verifikace

| Termín | Význam |
|---|---|
| **verification profile** | `WRITE_EXECUTOR`, `MULTI_TENANT`, `PROVIDER`, `AI_CAPABILITY`, `DURABLE_WORKFLOW`, `EVIDENCE`; komponenta je deklaruje, profil aktivuje testovací rodiny |
| **test family** | `SEC`, `TEN`, `CTR`, `CTR-ERR`, `CDC`, `IDM`, `WF`, `RES`, `EVD`, `AI-EVAL`, `MUT`, `ARCH-DEP` |
| **Test ID** | stabilní identifikátor testu (`TEN-CACHE-001`); nový test = nové číslo |
| **gate** | `BLOCK` (blokuje release) nebo `POLICY` (podle tolerance) |
| **mutant** | záměrně rozbitá implementace, na které musí BLOCK test selhat; jinak test není ověřen |
| **UNVERIFIED** | stav invariantu, jehož BLOCK test je vypnutý nebo flaky; blokuje release stejně jako selhání |
| **contract test (CTR)** | provider splňuje conformance suite capability |
| **consumer-driven contract (CDC)** | test zachycující očekávání konkrétního consumera; ověřuje kompatibilitu provider v2 s consumer v1 |
| **golden set** | verzovaná sada vstupů s ručně ověřenými výstupy pro AI eval |
| **criticalFields** | pole, u kterých je jakákoli regrese BLOCK bez ohledu na agregát |
| **drift** | změna chování modelu bez změny kódu; detekce periodickým během golden setu |
| **injectable clock** | čas jako závislost, ne přímé `Date.now()`; nutné pro deterministické testy deadline |
| **adapter fake** | testovací implementace externího systému, která prochází stejným adapter contractem jako produkční |
| **testing tax** | práce na testech, kterou norma ukládá každé kostce; snižuje se generováním z descriptoru a vynucením ve wrapperu |

## Proces

| Termín | Význam |
|---|---|
| **INVARIANT / CANDIDATE / DEFERRED** | závazné a release-blocking / vzor čekající na druhé použití / legitimní, ale bez doložené potřeby |
| **trigger** | událost, po které se CANDIDATE nebo DEFERRED položka znovu otevře |
| **Core Admission** | proces, kterým mechanismus vstupuje do sdíleného Core: `EXISTS × 2` se stejnou sémantikou, testy, owner, breaking-change strategie |
| **evidence status** | `EXISTS`, `PARTIAL`, `ABSENT`, `DIFFERENT_SEMANTICS`, `DESIGNED`, `MENTIONED` |
| **DIFFERENT_SEMANTICS** | stejný název, jiný význam; varování před sjednocením názvu bez sjednocení významu |
| **ADR** | Architecture Decision Record: kontext, rozhodnutí, alternativy, důsledky |
| **deployment model** | `ON_PREM_SINGLE_TENANT`, `CLOUD_SINGLE_TENANT`, `CLOUD_MULTI_TENANT`, `HYBRID` |
| **tenant mode** | `N/A`, `SINGLE`, `MULTI_TENANT_READY`, `MULTI_TENANT_ACTIVE` |
| **bus factor** | počet lidí, jejichž výpadek zastaví projekt; zde jedna |

## Zkratky

| Zkratka | Rozepsání |
|---|---|
| ADR | Architecture Decision Record |
| AI Act | nařízení EU o umělé inteligenci |
| CRA | Cyber Resilience Act |
| DLQ | dead-letter queue |
| DMS | document management system |
| GDPR | General Data Protection Regulation |
| HMAC | hash-based message authentication code |
| IBAN | International Bank Account Number |
| IČO | identifikační číslo osoby (CZ) |
| LLM | large language model |
| MCP | Model Context Protocol |
| mTLS | mutual TLS |
| NIS2 | směrnice EU o kybernetické bezpečnosti, v ČR zákon o kybernetické bezpečnosti |
| OCR | optical character recognition |
| OIDC | OpenID Connect |
| RDAP | Registration Data Access Protocol |
| RLS | Row-Level Security |
| SBOM | software bill of materials |
| SemVer | semantic versioning |
| TTL | time to live |
| WORM | write once, read many |
