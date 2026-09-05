# ČÁST VII — Architektonická rozhodnutí (ADR)

Každé rozhodnutí má kontext, rozhodnutí, zvažované alternativy a důsledky. Alternativy jsou uvedeny proto, aby je oponent mohl obhajovat proti autorovi.

Status: všechny `ACCEPTED-DRAFT`. Stanou se `ACCEPTED` po první implementaci ve dvou komponentách.

---

## ADR-001 Message transport není rozhodnut; obálka ano

**Kontext.** Portfolio běží na Cloudflare (Queues, Durable Objects, D1 job tabulky). Budoucí zákazník může vyžadovat on-prem (RabbitMQ, SQL tabulka, souborová fronta). Volba brokeru dnes by zafixovala něco, co se za dva roky změní.

**Rozhodnutí.** Obálka zprávy (`message-envelope.v1`), result envelope, trusted context a dispatch envelope jsou závazné. Transport je adapter, který musí dokumentovat binding contextu (II §4.3) a splnit `SEC-CTX-003`. Delivery semantics jsou at-least-once bez globálního pořadí (ADR-005).

**Revize po 1. kole (1.0-rc).** Mechanismus bindingu už není otevřený: default je `signed-envelope` (HMAC-SHA256 nebo Ed25519 nad JCS kanonizací `{ message, context }`) pro každý hop přes hranici procesu; ostatní mechanismy jen s doloženou ekvivalencí (`SEC-CTX-005`). Broker zůstává nevybraný, podpis ne.

**Alternativy.** (a) Vybrat CF Queues jako standard: nejlevnější dnes, nulová přenositelnost. (b) Vlastní broker abstrakce s pluginy: framework před evidencí, porušuje IX „nestavět". (c) Jen HTTP synchronně: neřeší durable execution a restart.

**Důsledky.** Každý projekt implementuje adapter sám (dnes: jw D1 predikát, gm DO alarm). Sdílený adapter vznikne až po `EXISTS × 2`. Riziko: divergentní sémantika bindingu; mitigace: `SEC-CTX-003` je povinný test každého adapteru.

---

## ADR-002 Trusted context žije mimo payload a je vázán per transport

**Kontext.** v0.1 nesla `tenantId` v obálce. Backend, který věří `tenantId` z payloadu, je klasická multi-tenant díra. Zároveň in-process volání nepotřebuje podpisy.

**Rozhodnutí.** `TrustedExecutionContext` vytváří gateway/router z ověřené identity, je neměnný po dobu dispatch, má `expiresAt` a `originatingActorId`. Přes hranici procesu musí být vázán ke zprávě mechanismem, který adapter pojmenuje (`signed-envelope`, `broker-identity`, `token-bound`, `mtls`). Payload nesmí obsahovat `tenantId` (schéma to odmítá).

**Alternativy.** (a) Vždy podepisovat, i in-process: zbytečná cena, žádný přínos. (b) Tenant jako součást URL/route: řeší HTTP, ne frontu. (c) Vybrat jeden binding mechanismus: viz ADR-001, stejný důvod.

**Důsledky.** Tři objekty v každém dispatch (message, context, binding). Adapter bez dokumentovaného bindingu neprojde `ARCH`.

**Revize po 1. kole (1.0-rc).** `binding` byl uvnitř contextu, tedy podepisovaný objekt obsahoval svůj podpis (oponent A: BLOCKER; otázka IV-2). Přesunut do `dispatch-envelope.v1` jako vnější obal; podpis pokrývá message i context. Rotace klíče: `keyId` povinné, grace period ≥ maximální `deadlinePolicy` na transportu (`SEC-CRED-002`).

---

## ADR-003 Executor Host: capability boundary ≠ security principal ≠ deployment unit

**Kontext.** „Single-purpose executor" čtený doslova = jeden proces na každou write operaci. Při 30 agendách 30 služeb, 30 certifikátů, 30 dashboardů. Tlak na „univerzální executor jen dočasně".

**Rozhodnutí.** Tři vrstvy (II §3.1). Capability boundary je 1:1 s write operací. Security principal je preferovaně 1:1, sdílení jen s explicitním risk rozhodnutím. Deployment unit může hostovat N handlerů, pokud credential resolvuje per capability a per tenant a žádný super-secret neexistuje. Pro `riskClass: CRITICAL` samostatný proces.

**Alternativy.** (a) Proces per capability: bezpečnostně nejčistší, provozně neudržitelné pro jednoho člověka. (b) Jeden executor se všemi právy a policy uvnitř: porušuje F1, blast radius = vše. (c) Sidecar per riskClass: dobrý kompromis, zatím nepotřebný.

**Důsledky.** Blast radius je omezen logicky (allowlist, policy) a kryptograficky (oddělené credential reference), ne procesově.

**Revize po 1. kole (1.0-rc).** Všechny čtyři posudky: logická izolace není fyzická; cizí kód v procesu má přístup ke všem referencím. Norma proto zavádí `isolationClass` (`LOGICAL` / `PRINCIPAL` / `PROCESS`) s minimem odvozeným z `riskClass` a vynuceným schématem: `LOW → LOGICAL`, `MEDIUM → PRINCIPAL`, `HIGH → PRINCIPAL` jen se zapsaným `isolationDecision` a evidencí `SEC-HOST-001` + `MUT-HOST-001`, jinak `PROCESS`; `CRITICAL → PROCESS`. Executor Host hostuje jen `LOGICAL` a `PRINCIPAL`. Empirické ověření na reálném runtime (Node, Workers) zůstává CANDIDATE.

**Revize po 2. kole (1.0-rc2).** `PRINCIPAL` musí být vynucen mimo paměť handleru: broker, OS principal, sidecar, vlastní deployable.

**Revize po 3. kole (1.0-rc2.1).** Broker v témže procesu `PRINCIPAL` nevytváří: RCE v procesu volá broker pod identitou procesu. `PRINCIPAL` = vlastní execution context (isolate / Worker / OS proces) s bindingy scoped na něj; `PROCESS` = navíc vlastní security principal end-to-end (síť, deploy, OS práva). Hranice `PRINCIPAL` je credential doména, ne handler, takže počet contextů roste s počtem externích identit; cena na Workers v IX §7. Návrh „MEDIUM jako LOGICAL s rozhodnutím" odmítnut.

---

## ADR-015 Sémantická validace: pole deklaruje descriptor, validátor určuje policy, evidenci nese payload

**Kontext.** Schéma chrání tvar, ne význam. F2 v rc2 vyžadovalo deterministický validátor pro pole vybírající cíl side effectu u HIGH capability a `SEC-SEM-001` tvrdil, že descriptor bez validátoru neprojde `CTR-001`. Descriptor ale neměl kde validátor deklarovat. Dva posudky 3. kola to nezávisle označily jako MAJOR a jako rozpor mezi II, III a IV.

**Rozhodnutí.** Tři vrstvy: (1) descriptor deklaruje `effectFields` (pole + role `target` / `scope` / `amount` / `resource`), claim providera, schéma vyžaduje pro `HIGH` a `CRITICAL`; (2) `semanticValidation.policyRef` odkazuje na platform policy, která každé effect pole mapuje na validátor, autorita platformy; (3) každé effect pole nese v payloadu provenance `validation { status, provider, at }` a executor odmítne command bez `passed` od validátoru z policy. `SEC-SEM-001` testuje všechny tři vrstvy.

**Alternativy.** (a) Validátory přímo v descriptoru: provider by si sám určoval, jak přísně se validuje; porušuje claim vs. autorita (ADR-013). (b) `x-semantic-validator` v input schématu capability: flexibilní, ale executor by musel parsovat cizí schéma a JSON Schema extenze nejsou v normě. (c) Konvence podle názvu pole (`iban`, `bankAccount`): křehké.

**Důsledky.** Tři nové negativní testy; ukázka v části VI přepsána (a `EVD-006` původní verzi odmítlo, což je první doložený úlovek tohoto testu); formát policy je rozhodnut v ADR-016, `policyRef` má v kontraktu místo.

---

## ADR-016 Platform policy je JSON soubor per capability a verze; schéma vzniká s prvním consumerem

**Kontext.** Od rc2.1 descriptor odkazuje na policy přes `semanticValidation.policyRef`, ale formát policy byl CANDIDATE. Posudek 4. kola: první `WRITE_EXECUTOR` s HIGH riskem by policy psal ad-hoc a ad-hoc by se stal standardem; `SEC-SEM-001` by první měsíc běžel proti imaginárnímu formátu.

**Rozhodnutí.** Policy je JSON soubor `contracts/policy/<capability>.v<N>.policy.json`, jeden per capability a major verzi, vlastněný platformou (mimo repo providera). Obsahuje: `grants` (actor, scopes, tenants, rate limit), `approval` (role, `minAuthStrength`, vazba na task a workflow), `effectFieldValidators` (pole → validátor, `mustPass`, parametry), `isolation` (přijatá třída a odkaz na rozhodnutí), `failClosed`. Vzor je `payment.execute.v1.policy.example.json`. JSON Schema policy se **nepíše předem**: napíše ho první komponenta, která policy čte (M1), podle vzoru, a stane se součástí kontraktového balíčku (P2: testovací a kontraktová podpora od prvního dne).

**Alternativy.** (a) YAML: čitelnější pro člověka, ale JSON už používáme pro všechny kontrakty a `npm test` ho validuje bez další závislosti. (b) Policy uvnitř descriptoru: provider = autorita, zamítnuto v ADR-013. (c) Policy jako služba (OPA a podobně): runtime před evidencí, DEFERRED.

**Důsledky.** `policyRef` má konkrétní tvar cíle. Registrace komponenty (`SEC-SEM-001` vrstva b) čte tento soubor. Divergence mezi `effectFields[].validator` (nápověda v descriptoru) a `effectFieldValidators` (autorita v policy) se hlásí jako warning; policy vítězí.

---

## ADR-017 Scope penetračního testu in-process izolace

**Kontext.** Pentest `LOGICAL` hostu je podmínka přechodu na 1.0 (IX). Bez definovaného scope bude buď mělký (nic nenajde), nebo neomezený (najde vše a `PRINCIPAL` se stane vždy `PROCESS`). Posudek 4. kola žádá scope jako ADR **před** spuštěním.

**Rozhodnutí.** Scope, ve kterém se test provede a vyhodnotí:

| Položka | Hodnota |
|---|---|
| Runtime | Cloudflare Workers runtime aktuální k datu testu (uvést `compatibility_date`) a Node.js 20 LTS pro server-side variantu |
| Výchozí pozice útočníka | RCE v jednom handleru `LOGICAL` hostu přes zranitelnou závislost (simulováno záměrně zranitelným modulem v test harnessu) |
| Cíl útoku | (1) přečíst credential referenci jiného handleru téhož hostu, (2) vyvolat cizí handler s jeho oprávněním, (3) získat podpisový klíč (nemá být v hostu vůbec) |
| Vektory | prototype pollution, path traversal v `require` / dynamickém importu, `process.env` a `globalThis`, sdílené moduly a cache modulů, `AsyncLocalStorage` podvržení |
| Mitigace, které se zároveň testují | zmrazené prototypy, readonly env, oddělený `globalThis` per handler, absence podpisového klíče v hostu |
| Vyhodnocení | cíl (1) nebo (2) dosažen bez mitigací a **s** mitigacemi → `LOGICAL` host je povolen jen pro `LOW` a `PRINCIPAL` je vždy vlastní context (dnešní stav normy potvrzen); dosažen bez mitigací, ale ne s nimi → mitigace se stanou povinnou součástí `isolationDecision`; nedosažen ani bez mitigací → zapsat jako evidence, normu neměnit (jeden test není důkaz bezpečí) |
| Výstup | ADR s výsledkem, odkaz z `isolationDecision` každé HIGH capability, řádek v evidence matrix |

**Alternativy.** (a) Pentest bez scope: viz kontext. (b) Externí pentest: žádoucí, ale mimo rozpočet solo provozu do prvního zákazníka; scope je napsán tak, aby ho mohl převzít externí tester beze změny.

**Důsledky.** Test se spustí v M3 nad prvním `LOGICAL` hostem se dvěma handlery. Do té doby je `LOGICAL` host povolen jen pro `LOW`, což už norma říká.

---

## ADR-004 Workflow v1 je statická verzovaná definice; LLM neplánuje

**Kontext.** v0.1 měla orchestrátor „sestavit workflow" a v diagramu „planning". Plán vytvořený modelem, který se spustí, je výstup modelu řídící exekuci, což F2 zakazuje.

**Rozhodnutí.** Workflow je immutable versioned artefakt. Instance pinuje verzi. Přechody jsou deterministické s guards. LLM smí klasifikovat vstup a navrhnout další akci; nesmí vytvořit ani měnit graf. LLM planning je DEFERRED capability s vlastní trust boundary.

**Alternativy.** (a) LLM planner s validací každého kroku proti allowlistu: technicky možné, ale audit a testy se stanou nedeterministickými; odloženo. (b) Žádné workflow, jen event choreografie: ztrácí durable state a viditelnost toku.

**Důsledky.** Každý nový tok = nová definice (YAML), ne prompt. Změna toku = nová verze + `WF-VER-001`. Dynamické toky (support, plánování) v v1 nejsou možné; přiznaná mez.

**Revize po 1. kole (1.0-rc).** `FINISH_ON_PINNED` bez nouzové cesty by při bezpečnostní chybě donutil dokončit zranitelný krok (oponent A: MAJOR). Doplněna explicitní operace `MIGRATE_INSTANCE` s mapováním stavů v nové definici, autorizací role `workflow.operator`, auditem a důvodem (`SECURITY_HOTFIX` jako důvod, ne jiný mechanismus). Instance bez mapování se migrovat nedá; lze ji jen zrušit s auditem. Metrika `WF-VER-002` měří, kolik instancí drží starou verzi.

---

## ADR-005 At-least-once delivery, bez globálního pořadí

**Kontext.** Exactly-once je slib, který transporty v praxi nedrží; systém, který se na něj spoléhá, selže tiše.

**Rozhodnutí.** Default je at-least-once. Příjemce dedupuje (`idempotencyKey`, `messageId`). Pořadí přes explicitní aggregate/sequence key, jen kde je potřeba.

**Alternativy.** (a) Exactly-once přes transakční outbox + broker s dedup: drahé, transport-specific. (b) At-most-once: ztráta zpráv je horší než duplicita u write s idempotencí.

**Důsledky.** Idempotence je povinná pro každý write (F6). `IDM-REPLAY-001` je BLOCK. Consumer, který předpokládá pořadí, je chyba (nález v code review).

---

## ADR-006 Idempotence s retencí; IRREVERSIBLE opřít o business identitu

**Kontext.** Dedup cache s TTL 24 h; stejný command doručen po 25 hodinách; platba proběhne dvakrát. Technická idempotence bez retence není idempotence.

**Rozhodnutí.** Capability deklaruje `idempotencyRetention`. Pro `IRREVERSIBLE` je hodnota `business-identity`: dedup se opírá o identifikátor unikátní v cílovém systému (`paymentId`) nebo o trvalý reconciliation záznam. Test `IDM-RET-002` replayuje po expiraci technického klíče.

**Alternativy.** (a) Nekonečná retence všech klíčů: roste bez omezení, ale je to nejjednodušší; pro malé objemy přijatelné. (b) Retence = `notValidAfter` + rezerva: elegantní, ale `notValidAfter` je krátké (minuty) a replay může přijít po dnech.

**Důsledky.** Executor IRREVERSIBLE capability musí umět dotaz do cílového systému podle business identity. Bez toho nelze splnit `IDM-RET-002` ani `WF-UNK-001`.

---

## ADR-007 Pět kategorií záznamů s vlastní retencí a ACL

**Kontext.** Jeden log pro všechno = debug log jako úložiště business dokumentů, tajemství v logu, GDPR problém při mazání, support vidí obsah všech tenantů.

**Rozhodnutí.** Operational log, security log, audit trail, AI execution trace, business evidence. Každá kategorie má ownera, retenci a ACL. Audit je append-only. AI trace neduplikuje celé dokumenty a prompty. Originál je immutable s hashem; odvozeniny nesou `derivedFrom`.

**Alternativy.** (a) Jeden strukturovaný log s tagy: levnější, ale ACL a retence per tag jsou v praxi vždy nastavené špatně. (b) Tři kategorie (log, audit, evidence): AI trace by skončila v logu s dokumenty.

**Důsledky.** Pět úložišť nebo pět jasně oddělených streamů. `EVD-004` testuje oddělení. Náklad na disciplínu při logování je reálný; evidence (V §1.12) ukazuje, že dnes jde surové tělo API odpovědi do provozního logu.

---

## ADR-008 Core Admission: EXISTS × 2 se stejnou sémantikou

**Kontext.** Předčasná abstrakce je hlavní riziko celé platformy. Retry v jednom projektu retryuje HTTP, v druhém mění OCR strategii; sdílený helper by sjednotil název a rozbil oba.

**Rozhodnutí.** Mechanismus smí do sdíleného Core, když evidence matrix ukazuje `EXISTS` se stejnou sémantikou ve dvou nezávislých projektech, existují contract testy, owner a breaking-change strategie. Kontrakt se extrahuje první, implementace až při třetím použití nebo divergentní chybě.

**Alternativy.** (a) `EXISTS × 1` + záměr: to je v0.1, ta cesta vede k frameworku. (b) `EXISTS × 3`: příliš přísné pro portfolio pěti projektů; nic by nikdy neprošlo. (c) Bez pravidla, na úsudek autora: bus factor jedna.

**Důsledky.** Dnes prochází jediný mechanismus (`/version` tvar). To je správný výsledek, ne selhání. Otázka X-6: je práh správně, když pět projektů dává tak málo shod?

---

## ADR-009 Žádný pracovní kód v Core; vzory se implementují znovu

**Kontext.** Nejsilnější provozní precedent (endpoint agent, deployment, rollback) je pracovní projekt. Extrakce jeho kódu do osobního repozitáře je vlastnická a právní otázka.

**Rozhodnutí.** Pracovní projekt je pattern source. Core nesmí obsahovat jeho kód, názvy, credentials ani pravidla. Obecný vzor (heartbeat, verzované balíčky, rollback) se implementuje znovu podle vlastního kontraktu, až bude druhý endpoint use-case v osobním portfoliu.

**Alternativy.** (a) Vyjednat licenci: možné, mimo scope normy. (b) Ignorovat: riziko pro obě strany.

**Důsledky.** Endpoint Agent Core je CANDIDATE bez kódu (IX). Dokumenty o něm mluví jen jako o vzoru.

---

## ADR-010 Injektovatelné hodiny jako coding standard, ne runtime invariant

**Kontext.** Deadline, expiry, backoff, retence: všechno závisí na čase. Přímé `Date.now()` dělá testy `IDM-DEADLINE-001`, `WF-REV-003`, `SEC-CTX-004` flaky z principu. Evidence: 0/5 projektů má clock abstrakci.

**Rozhodnutí.** Injektovatelné hodiny jsou povinný coding standard (III §8.1) pro platformové komponenty. Nejsou devátý invariant, protože invariant popisuje vlastnost systému, ne způsob psaní kódu. Vymáhá se nepřímo: test s BLOCK gate, který bez ovládání času nejde napsat deterministicky, se stane flaky a invariant `UNVERIFIED` (III §9).

**Alternativy.** (a) F9 „No implicit time" jako invariant: navrhlo jedno z hodnocení; autor odmítá, protože by to byl jediný invariant o stylu kódu. (b) Nechat na projektech: evidence ukazuje, že to nikdo neudělá sám od sebe.

**Důsledky.** Každá nová komponenta dostane `ClockFixture`. Existující projekty se nepřepisují (rozhodnutí vlastníka).

**Revize po 1. kole (1.0-rc).** Oponent C: coding standard vymáhaný code review je u solo operátora nevymahatelný (autor reviewuje sám sebe) a `IDM-DEADLINE-001` by byl trvale flaky. Proto: (1) lint pravidlo v CI zakazuje přímá volání času v souborech platformové logiky (III §8.1); (2) existující projekty jsou z pravidla explicitně vyňaty a jejich deadline testy nejsou BLOCK; (3) `ClockFixture` je součást kontraktového balíčku od první komponenty, ne CANDIDATE čekající na `EXISTS × 2` (testovací podpora nepodléhá Core Admission, P2).

---

## ADR-011 Fail-closed jako default; fail-open jen explicitně per capability

**Kontext.** Při výpadku policy služby nebo registru je lákavé „pustit to, ať provoz nestojí". U bezpečnostních rozhodnutí je to cesta k incidentu.

**Rozhodnutí.** Security defaults (II §6.5): neznámé → deny, nevalidní → žádný write, výpadek policy → fail-closed. Fail-open je explicitní, zapsané rozhodnutí per capability s risk classem.

**Alternativy.** (a) Fail-open pro LOW risk automaticky: rozumné, ale „automaticky" je přesně to, co se za rok zapomene; proto explicitně.

**Důsledky.** Výpadek registru zastaví validaci faktur (`WAITING(DEPENDENCY)` s deadline), ne propustí neověřené. Provozní cena je vědomá.

---

## ADR-012 Sedm runtime invariantů a dvě procesní pravidla

**Kontext.** v0.2 mělo dvanáct. Některé byly dvojice (AI nemá write / write jen executor), jeden byl procesní (nic není Core jen proto…). v1.0-draft mělo osm, z nichž F8 (verifiable architecture) popisoval vlastnost normy, ne běžícího systému.

**Rozhodnutí.** F1–F7 jako runtime invarianty, každý s vlastní rodinou testů; P1 (verifiable architecture) a P2 (nothing becomes Core because it looks reusable) jako procesní pravidla v §9 se stejnou blokační silou. Oddělení je kategoriální: invariant se testuje na systému, procesní pravidlo na normě a CI.

**Alternativy.** (a) Dvanáct: duplicity, delší čtení. (b) Osm s F8 mezi runtime: kategorie error, dva posudky ho označily (C: MINOR, B: přijatelné). (c) Čtyři: trusted context a safe state change by se ztratily uvnitř jiných a přišly o vlastní testy.

**Důsledky.** Každý invariant má v III rodinu a v VIII threat. P1 se vymáhá CI kontrolou `derivedProfiles == executedProfiles` a stavem `UNVERIFIED`. Otázky X-1 a X-3 zůstávají otevřené.

---

## ADR-013 Descriptor je claim, policy je autorita; profily jsou odvozené

**Kontext.** `module-descriptor` v 1.0-draft plnil čtyři role: co komponenta umí, jak se routuje, kdo ji smí volat, jak se testuje. Provider tak byl autoritou, která si sama udělovala oprávnění a sama si volila testovací povinnost (oponent D: MAJOR ×2).

**Rozhodnutí.** Descriptor deklaruje vlastnosti (capabilities, side effects, izolace, `usesLlm`, `tenantMode`, `dependsOn`, vyžadované scopes). Grant scopes, tenant limity a approval pravidla jsou v platform policy, samostatném artefaktu vlastněném platformou. `verificationProfiles` jsou odvozené z vlastností a schéma odmítne descriptor, kterému odvozený profil chybí; CI porovnává odvozené a spuštěné profily.

**Alternativy.** (a) Jeden soubor pro vše: jednodušší, ale provider = autorita. (b) Šest souborů: přehnané pro solo portfolio. (c) Profily generované úplně (bez pole v descriptoru): čitelnost trpí; explicitní pole s validací je kompromis.

**Důsledky.** Sedm nových negativních testů descriptoru. Formát policy je CANDIDATE do první komponenty s více volajícími.

---

## ADR-014 `retryable` a `reissuable` jsou dvě vlastnosti

**Kontext.** Trace C příkladu 6.2 ukázal rozpor: `COMMAND_EXPIRED` s `retryable: false`, a přesto orchestrátor vydává nový command. Definice `retryable` to zakazovala (oponent C: MAJOR; vlastní nález 6.7.1).

**Rozhodnutí.** `retryable` = executor smí zkusit stejný command znovu (technical retry). `reissuable` = orchestrátor smí po opětovném ověření intent vydat nový command se stejným `idempotencyKey`. Každý platformový kód má obě hodnoty v tabulce (II §4.5).

**Alternativy.** (a) `retryable: true` u `COMMAND_EXPIRED`: sémanticky špatně, executor by opakoval prošlý command. (b) Nechat na orchestrátoru bez pole: první implementátor by porušil kontrakt.

**Důsledky.** Jedno volitelné pole v error objektu; `CTR-ERR` tabulka capability uvádí obě vlastnosti.
