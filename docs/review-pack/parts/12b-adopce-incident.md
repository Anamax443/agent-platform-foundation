## XII.G Adopční plán pro první dvě komponenty

Cíl: za tři měsíce dvě komponenty napsané proti kontraktům, aby podmínka `EXISTS × 2` mohla poprvé projít u něčeho jiného než `/version`. Plán počítá s jedním člověkem a s tím, že existující projekty se neupravují.

| Milník | Co vznikne | Brána pro pokračování | Co se NEdělá |
|---|---|---|---|
| M1 (týden 1–2) | první komponenta zvolena (doporučení: `document.classify` jako `AI_CAPABILITY` + `document.stamp` jako `WRITE_EXECUTOR` s LOW riskem); `module-descriptor` napsán a validován `npm test`; workflow definice o třech krocích | descriptor prochází schématem; profily deklarovány | žádný runtime, žádná sdílená knihovna |
| M2 (týden 3–4) | conformance balíček pro obě capabilities: schema, fixtures (10 kanonických, 3 poškozené, 2 injection, 3 hraniční), golden výstupy, `errors.md`; `ClockFixture` a `AdapterFakeFixture` lokálně v projektu | `CTR-001`, `CTR-ERR-001` zelené proti implementaci | generalizace fixtures do balíčku |
| M3 (týden 5–7) | testy podle profilů: `SEC-PRIV-001..002`, `SEC-INJ-001`, `IDM-REPLAY-001`, `IDM-DEADLINE-001`, `WF-UNK-001`, `EVD-001`, `ARCH-DEP-001`; mutanty `MUT-PRIV-001`, `MUT-IDM-001..002` | všechny BLOCK testy zelené, všechny mutanty červené; žádný invariant `UNVERIFIED` | `TEN` (single-tenant), `CDC` (žádný druhý consumer) |
| M4 (týden 8–10) | druhá komponenta z jiné domény (doporučení: `mail.received` ingest + `email.send` executor s allowlistem příjemců); stejné kroky M1–M3 | obě komponenty si vyměňují zprávy přes stejnou obálku; `SEC-CTX-002` mezi nimi zelený | orchestrátor jako samostatná služba, pokud stačí in-process |
| M5 (týden 11–12) | obnova `EVIDENCE-MATRIX.md` se dvěma novými řádky; Core Admission review: co je `EXISTS × 2` se stejnou sémantikou (očekávání: result envelope, error object, `/version` tvar, `ClockFixture`) | seznam kandidátů s odkazy soubor:řádek | extrakce implementace; jen kontrakt + conformance test |
| M6 | první sdílený balíček **kontraktů** (schémata + conformance suite + fixtures), verze 1.0; norma přechází z `1.0-draft` na `1.0` | obě komponenty závisí na balíčku a CI je zelené | druhý balíček |

Odhad práce po 1. kole: MUST sada první komponenty ≈ 20 hodin, M1–M3 celkem ≈ 40 hodin, M4 ≈ 30 hodin, M5–M6 ≈ 20 hodin. **Pravidlo měření (2. kolo, X-31):** čas na MUST sadu se zapisuje do HANDOFF po každém milníku; překročí-li 40 hodin, III §7 se přehodnotí dřív, než se začne obcházet. Překročí-li M3 jako celek 100 hodin, je to signál pro otázky X-8 a X-22: norma je pro jednoho člověka příliš drahá a musí se zjednodušit, ne obejít.

Doporučený první řez podle shody 2. kola: `document.classify` (AI) → `document.validate` (deterministický) → `document.stamp` (write executor, LOW, `LOGICAL`), proti němu `CTR`, `SEC-INJ`, `SEC-PRIV`, `IDM`, `EVD`, `INT-FAIL`, `INT-E2E`, `INT-REPLACE`, `RES-CRASH`. Pak druhý tok (`mail.received` → `email.send`, `PRINCIPAL` přes vlastní deployable). Teprve pak vzniká první sdílený kontraktový balíček.

## XII.H Akceptační kritéria a Definition of Done

### Akceptační kritéria prvního prototypu

Redukce patnácti bodů z v0.1 §64 na osm, které se dají ověřit testem.

| # | Kritérium | Test |
|---|---|---|
| 1 | dvě komponenty registrované přes `module-descriptor`; router vybírá podle capability, ne podle názvu služby | `CTR-001` + routing test |
| 2 | typed command doručen; při nepodporované verzi schématu odmítnut | `INCOMPATIBLE_VERSION`, `CDC-COMP-001` |
| 3 | duplicitní doručení write commandu vede k jednomu side effectu | `IDM-REPLAY-001` |
| 4 | restart orchestrátoru uprostřed kroku nevede ke ztrátě ani k duplicitě | `RES-CRASH-001` |
| 5 | review task vytvořen, rozhodnut ověřenou rolí, workflow pokračuje z checkpointu; expirace má definovaný přechod | `WF-REV-003`, `WF-REV-004` |
| 6 | prompt-injected pokus o write neprojde | `SEC-INJ-001`, `SEC-PRIV-001` |
| 7 | celý tok dohledatelný podle `correlationId` v journalu a auditu | `EVD-003` |
| 8 | `/health`, `/version`, `/capabilities` odpovídají; `/version` nese commit | contract test descriptoru |

### Definition of Done pro reusable kostku

Kostka je reusable, když:

- má `module-descriptor` validní proti schématu a deklarované profily,
- machine contract je English-only s verzovanými input/output schématy,
- nemá přímý přístup do DB jiného modulu (`ARCH-DEP-001`),
- má `/health`, `/version`, `/capabilities`,
- má conformance balíček (schema, fixtures, golden, `errors.md`, `compat.md`),
- má definované failure states, retry třídy, idempotenci a reverzibilitu per write capability,
- má tenant mode (`N/A`, `SINGLE`, `MULTI_TENANT_*`) a odpovídající testy,
- má retention class pro každou datovou třídu, kterou vlastní,
- má audit a evidence chování podle profilu `EVIDENCE`,
- má postup nasazení a rollbacku v `docs/BUILD.md`,
- jde spustit izolovaně v test harnessu s adapter fakes,
- druhá komponenta ji umí použít bez znalosti jejího kódu nebo DB,
- všechny BLOCK testy profilu jsou zelené a mutanty červené.

## XII.I Příklad incidentu od detekce po uzavření

Ukázka, jak norma vypadá v provozu, a co by bez ní chybělo. Scénář je smyšlený, ale každý krok odpovídá pravidlu z částí II a III. Odpovídá na otázku X-24 (předatelnost).

**Situace.** Pondělí 08:14. Banka po údržbě vrací na `payment.execute` HTTP 200 s prázdným tělem. Executor nedokáže potvrdit přijetí.

| Čas | Co se stalo | Pravidlo | Evidence, která vznikla |
|---|---|---|---|
| 08:14:02 | executor odeslal platbu `pay-4411`, odpověď 200 bez `bankRef` | II §3.3 krok 10 | audit record `aud-901`: command, actor, tenant, `notValidAfter`, čas odeslání |
| 08:14:02 | executor vrátí `UNKNOWN_OUTCOME`, `reconciliationRef: rec-pay-4411`; **neposílá znovu** | F5, F6, `WF-UNK-001` | result envelope v journalu |
| 08:14:05 | orchestrátor spustí `unknownOutcomeRecovery: query-external-status` | descriptor capability | execution `exe-9` RUNNING |
| 08:14:07 | dotaz na stav vrátí 503; technical retry 3× s backoffem; všechny 503 | II §5.2, `RES-DEP-001` | `FAILED / DEPENDENCY_UNAVAILABLE`, `retryable: true`, 3 pokusy v journalu |
| 08:15:30 | reconciliation budget vyčerpán → `WAITING(REVIEW)`, task `rev-777` pro roli `payment.operator`, `expiresAt` +4 h, `expiryPolicy: ESCALATE` | návrh z X-16 (`reconciliationBudget: 3`), II §5.8 | review task, notifikace |
| 08:15:31 | fronta mezitím doručila **duplicitní** command `pay-4411` (at-least-once); executor našel klíč → vrátil původní `UNKNOWN_OUTCOME`, žádný druhý pokus | `IDM-REPLAY-001` | audit: duplicate seen |
| 08:40 | operátor otevře review; podle `correlationId` vidí celý tok: faktura, validace, schválení `apr-902` uživatelem 23, odeslání, prázdná odpověď, tři neúspěšné dotazy | F7 Evidence by Design, `EVD-003` | jeden dotaz do journalu + auditu |
| 08:45 | operátor ověří v bankovním portálu: platba přijata, `bankRef: B-5519`; zadá decision `CORRECT` s `bankRef` | II §5.8 reviewer authz: role, tenant, task binding | audit `aud-902`: kdo, co, původní hodnota (žádná), nová hodnota, důvod |
| 08:45:10 | workflow pokračuje: `execute` → `SUCCEEDED` s `bankRef`; event `invoice.paid` | F5 | result envelope, event |
| 09:30 | banka obnoví API; regresní test adapteru doplněn o „200 s prázdným tělem = UNKNOWN, ne SUCCESS" | III §4 řádek 32, anti-pattern „HTTP 200 = business success" | nový Test ID `CTR-ERR-002` pro bank adapter |

**Postmortem v jednom odstavci.** Příčina byla externí (údržba banky). Systém neudělal druhou platbu, protože `UNKNOWN_OUTCOME` zakázal resend a idempotency klíč zachytil duplicitu. Člověk zasáhl po 26 minutách s úplným kontextem díky `correlationId`. Chyběl `reconciliationBudget` jako explicitní pole (otázka X-16) a adapter test pro prázdné 200.

**Co by bez normy chybělo:**

- bez `UNKNOWN_OUTCOME` by executor buď zapsal SUCCESS (platba bez reference, účetní chaos), nebo FAILED a retry (druhá platba),
- bez idempotency klíče by duplicitní doručení z fronty provedlo platbu znovu,
- bez `correlationId` by operátor skládal tok ze tří logů a dvou tabulek,
- bez review tasku s rolí by „opravu" mohl zadat kdokoli s přístupem k DB,
- bez audit recordu by postmortem stál na paměti jednoho člověka.

Evidence z části V ukazuje, že v žádném z pěti existujících projektů by tento incident neproběhl takto: `UNKNOWN_OUTCOME` neexistuje nikde, `correlationId` nikde, server-side review nikde.
