# KRITICKÁ OPONENTURA: AGENT PLATFORM FOUNDATION & EVOLUTION STANDARD v0.2
## Architektonická, bezpečnostní, testovací a provozní oponentura návrhu modulární agentní farmy
**Datum:** 5. 9. 2026  
**Typ:** nezávislá technická oponentura / review pack  
**Posuzovaný dokument:** `AGENT-PLATFORM-FOUNDATION-v0.2.md`
---
## Obsah
- 1. Executive summary a celkové hodnocení
- 2. Co bych považoval za skutečné Foundation Core
- 3. Největší architektonické riziko: platforma před realitou
- 4. Oponentura Message Envelope v1
- 5. Trusted Context: nejlepší rozhodnutí dokumentu, ale musí mít kryptografický příběh
- 6. Executor model a problém exploze deployables
- 7. Workflow v1: determinismus je správný, ale state machine musí být explicitní artefakt
- 8. Retry, idempotence, deadline a unknown outcome
- 9. Verification Contract: největší chybějící kapitola
- 10. Contract testing musí být dodávaný artefakt
- 11. Testovatelnost času, externích systémů a tenantů
- 12. AI evals: z jedné věty udělat provozní disciplínu
- 13. Multi-tenancy: správný princip, testovat celý datový povrch
- 14. Evidence, immutable originals a compliance
- 15. Data lifecycle a pětiletý provoz
- 16. Versioning a compatibility: přidat jednoznačnou tabulku významů
- 17. Core admission a evidence matrix
- 18. Provozní model: robustnost znamená pozorovatelnost a recovery, ne absenci chyb
- 19. Doporučená dokumentová architektura po oponentuře
- 20. Priority P0–P3 před stavbou první společné farmy
- 21. Verification Contract — návrh normativní struktury
- 22. Oponentní scénáře, které musí návrh přežít
- 23. Oponentura bezpečnostní filozofie: silná, ale musí být ekonomicky provozovatelná
- 24. Oponentura modularity: API není automaticky pouzdření
- 25. Oponentura orchestrátoru: hrozba centrálního mozku
- 26. Oponentura compliance přístupu: nepřehánět claims
- 27. Oponentura ownership a osobního portfolia
- 28. Jak poznat, že první Core je opravdu užitečný
- Příloha A: Section-by-section review všech kapitol v0.2
- Příloha B: Threat → Test → Gate matrix
- Příloha C: Doporučený Verification Contract
- Příloha D: Doporučená struktura Foundation Core

# 1. Executive summary a celkové hodnocení
Foundation v0.2 je výrazně lepší než v0.1. Největší kvalitativní posun není v množství přidaných témat, ale v rozlišení INVARIANT / CANDIDATE / DEFERRED a v opravě několika kritických distribuovaných systémových detailů: trusted context je oddělen od business payloadu, RETRYABLE není stav, quality retry dostává novou logickou identitu, unknown outcome je explicitní, delivery semantics jsou at-least-once a exactly-once není slibováno. To jsou přesně ty detaily, na kterých se reálné automatizační systémy po měsících provozu lámou.

Současně dokument pořád trpí zásadním rozporem mezi deklarovaným cílem „malé tvrdé jádro“ a skutečným rozsahem 155 kapitol. Z hlediska znalostního managementu je materiál hodnotný, z hlediska normy je ale příliš objemný. Hrozí, že nejdůležitější pravidla budou v praxi ignorována právě proto, že jsou pohřbena mezi desítkami kandidátních a odložených úvah. Architektonická kvalita tedy není limitována špatnými myšlenkami, ale informační architekturou dokumentu.

Druhou největší slabinou je verifikace. Dokument opakovaně tvrdí, že invarianty mají být testovatelné, ale testovací mechanismus není popsán se stejnou přesností jako threat model, tenant izolace nebo retry. Bez povinného mapování Threat → Test → Gate → Evidence se z bezpečnostních kapitol může stát kvalitní literatura, nikoliv vymahatelná vlastnost produktu.

Třetí slabinou je nedokončený evidence-first přístup. Foundation správně říká, že Core se má extrahovat z opakovaného použití, ale samotná evidence matrix je zatím převážně „verify“. To znamená, že dokument stále předbíhá analýzu skutečných projektů. Tento rozpor je snadno opravitelný: Foundation Core musí zůstat malý a další reusable mechanismy se smějí povyšovat až po ověření v nejméně dvou reálných projektech.


> **Hlavní verdikt:** Technický úsudek je nadprůměrný. Dokument je použitelný jako architecture notebook, ale ještě ne jako krátká závazná foundation norma. Před implementací společného Core je potřeba zúžit závaznou část, doplnit Verification Contract a vyplnit evidence matrix z reálného kódu.

|Oblast|Skóre /10|Komentář|
|---|---|---|
|Filozofie a bezpečnostní principy|9.2|Velmi silné oddělení AI a write pravomocí.|
|Modularita a kontrakty|8.6|Správný směr, několik detailů envelope ještě chybí.|
|Distribuovaná robustnost|8.4|At-least-once, idempotence, unknown outcome a compensation jsou dobře pojmenované.|
|Multi-tenancy|8.8|Trusted context je výborný; je třeba dořešit binding a testovací fixtures.|
|Testovatelnost|5.0|Taxonomie existuje, verification contract ne.|
|Dlouhodobá udržitelnost|8.0|Dobrá témata, ale příliš mnoho normativního textu.|
|Evidence z reálných projektů|5.5|Metoda je správná, matrix zatím není vyplněná.|
|Celkově|7.8|Silný návrh, stále před formalizací do produkční normy.|

# 2. Co bych považoval za skutečné Foundation Core
Foundation má být dokument, který lze přečíst před code review za několik minut a podle kterého lze jednoznačně říct, zda návrh porušuje základní pravidlo. Pokud základní pravidlo vyžaduje několik odstavců vysvětlování a desítky výjimek, není to invariant, ale návrhový pattern nebo policy.

Současných dvanáct invariantů lze bez ztráty bezpečnostní síly redukovat. Oddělení „AI nemá write credential“ a „write privilege patří jednoúčelovému executorovi“ lze formulovat jako jeden invariant o privilege boundary. Stejně tak „components expose capabilities“ a „orchestrator knows contracts, not databases“ jsou dvě strany jednoho pravidla o pouzdření.

Pravidlo Nothing becomes Core because it looks reusable je výborné, ale nemá být runtime invariant. Patří do Core Admission Process. Je testovatelné procesně při review balíčku, nikoliv na běžícím systému. Tím se zároveň Foundation zpřehlední: runtime invarianty budou řešit bezpečnost a korektnost, procesní pravidla budou řešit evoluci platformy.


|Navržený invariant|Obsah|
|---|---|
|F1 — Privilege boundary|AI nemá přímé business write credentials; write provádí pouze scoped deterministic executor.|
|F2 — Untrusted data boundary|Externí a AI-generovaný obsah je data, nikdy privilegiovaná instrukce.|
|F3 — Contract boundary|Komponenty komunikují versioned capabilities; neznají interní DB/model druhé strany.|
|F4 — Trusted security context|Identity, tenant a scopes vznikají mimo untrusted payload a jsou vynuceny deterministicky.|
|F5 — Observable execution|Každá práce má explicitní stav a recovery path; žádná tichá větev.|
|F6 — Safe state change|Write operace řeší idempotenci, deadline, replay, unknown outcome a reversibility.|
|F7 — Evidence integrity|Originál je immutable; odvozeniny nesou provenance; lidská rozhodnutí jsou auditované state changes.|
|F8 — Verifiable architecture|Každý bezpečnostní invariant má automatizovaný nebo explicitně zdůvodněný verification mechanismus.|

# 3. Největší architektonické riziko: platforma před realitou
Koncept farmy je záměrně obecný, protože budoucí agendy nejsou známé. To je správné. Nebezpečí ale vzniká ve chvíli, kdy se z této nejistoty odvodí povinnost postavit univerzální runtime ještě před druhou skutečnou implementací. Takový postup typicky vede k frameworku, který dokonale řeší imaginární problémy a špatně řeší první tři reálné.

Správná strategie je „common contracts early, common implementation late“. Je rozumné už dnes sjednotit význam correlationId, execution state, error class nebo trusted tenant context, protože tyto pojmy jsou obecné. Není rozumné už dnes rozhodovat o univerzálním workflow enginu, event brokeru, plugin loaderu nebo global registry service, pokud dosud není doloženo, že dva projekty potřebují stejné chování.

V této logice je třeba důsledně odlišit standardizaci semantics od sdílení kódu. Dva projekty mohou používat stejný error contract, aniž by sdílely jedinou runtime knihovnu. Teprve až se opakuje i implementace, vzniká kandidát na package/Core. To výrazně snižuje coupling a zároveň dovoluje budoucí konsolidaci.


> **Doporučení:** Používat pravidlo: standardizuj význam dřív než implementaci. Sdílený package vzniká až po opakovaném použití, ne jen proto, že existuje společný JSON tvar.

# 4. Oponentura Message Envelope v1
Opravená obálka je výrazně lepší než v0.1. Capability je explicitní, capabilityVersion má vlastní místo a business caller nenese trusted tenant context. To je správný základ. Přesto v ní chybí několik polí, která u dlouhodobého distribuovaného systému rozhodují o bezpečnosti a provozní korektnosti.

První chybějící prvek je deadline. `createdAt` pouze říká, kdy command vznikl; neříká, zda je ještě bezpečné ho provést. U write operací může opožděná delivery nebo replay znamenat skutečnou škodu. Command musí být schopen říct `notValidAfter` nebo mít policy-defined TTL. Executor musí deadline ověřit těsně před side effectem, nikoli pouze router.

Druhým problémem je vazba trusted contextu ke zprávě. Pokud command a trusted context existují pouze uvnitř jednoho procesu, stačí process trust boundary. Pokud ale command putuje na endpoint nebo do jiné služby přes síť/queue, musí být definováno, co brání připojení contextu tenanta B ke commandu tenanta A. Může to být autenticita transportu, signed envelope, broker-level identity nebo token-bound dispatch. Dokument nemusí dnes vybrat jednu technologii, ale musí výslovně popsat trust boundary.

Třetí problém je životnost idempotency evidence. Pokud `payment.execute` deduplikuje command pouze 24 hodin a stejný command je po 25 hodinách znovu doručen, technická idempotence přestala existovat. U irreversible operací proto není dostačující cache TTL; musí existovat business transaction identity nebo dlouhodobá reconciliation evidence.


|Pole / koncept|Stav v0.2|Doporučení|
|---|---|---|
|messageId|ano|zachovat jako delivery identity|
|correlationId|ano|zachovat; nesmí suplovat workflowId|
|workflowId / stepId|ano|zachovat podle typu message|
|capabilityVersion|ano|správně odděleno|
|schemaVersion|ano|doplnit přesnou semantics|
|notValidAfter|chybí|přidat pro commands; executor kontroluje před side effectem|
|trusted context binding|implicitní|definovat podle transport boundary|
|idempotency retention|chybí|povinná policy per capability class|
|causationId|chybí|candidate: užitečné pro event chains a audit|

# 5. Trusted Context: nejlepší rozhodnutí dokumentu, ale musí mít kryptografický příběh
Oddělení trusted contextu od business payloadu je pravděpodobně nejsilnější bezpečnostní rozhodnutí ve v0.2. Zabraňuje tomu, aby `tenantId`, `actorId` nebo scopes byly pouze dalšími poli JSONu, která si caller může změnit. Tím se tenant isolation stává vlastností bezpečnostní vrstvy, nikoliv konvence.

Je však nutné explicitně popsat životní cyklus contextu. Kdo ho vytvoří, kdo ho smí změnit, na jak dlouho platí, zda se při async dispatchi materializuje, nebo se znovu odvozuje z identity, a jak se zachová při retry. V multi-hop flow je snadné vytvořit confused-deputy problém: služba A je oprávněná pro tenant A, ale předá request službě B způsobem, který už neobsahuje prokazatelnou vazbu na původní identity.

Doporučení je zavést pojem `TrustedExecutionContext` s jasnými atributy: tenant, subject/actor, scopes, authentication strength, originating identity, issuedAt a případně expiry. Není nutné ho nutně serializovat do každé zprávy; důležité je, že každý transport adapter musí definovat, jak tuto informaci bezpečně přenáší nebo znovu získává.


# 6. Executor model a problém exploze deployables
Princip jednoúčelového executora je bezpečnostně velmi silný. Pokud každé write právo patří úzké deterministic komponentě, prompt injection v AI vrstvě nemůže sama o sobě přejít do libovolné externí změny. Problém vzniká, pokud se „single-purpose executor“ automaticky interpretuje jako „samostatný proces/container/service pro každou capability“. Při desítkách agend by vzniklo provozní monstrum.

Je nutné oddělit tři pojmy: logical capability boundary, security principal boundary a deployment unit. Jedna deployment jednotka může hostovat více executor handlers, pokud každý command prochází samostatnou authorization policy a jednotlivé externí credentials zůstávají scopeované. U vysoce citlivých operací může být naopak samostatný proces nebo sidecar správně. Foundation nemá předepsat jednotnou topologii, ale musí tento rozdíl popsat.

Praktický model může mít `Executor Host`, který technicky obsluhuje několik write capability, ale nemá jeden univerzální super-secret. Credentials jsou získávány podle capability a target tenant. Blast radius se tedy omezuje logicky i kryptograficky, aniž by bylo nutné provozovat 120 služeb.


|Vrstva|Co znamená|Musí být 1:1?|
|---|---|---|
|Capability boundary|Jedna přesně definovaná write operace|ano z hlediska kontraktu|
|Security principal|Identity/credential s minimálním scope|preferovaně úzké; může být sdílené jen s explicitním risk rozhodnutím|
|Deployment unit|Process/container/service|ne; může hostovat více handlerů|
|Scaling unit|Co se škáluje nezávisle|podle workloadu, nemusí odpovídat capability|

# 7. Workflow v1: determinismus je správný, ale state machine musí být explicitní artefakt
Rozhodnutí, že v1 nebude LLM dynamicky sestavovat produkční workflow, je správné. Model může klasifikovat vstup nebo navrhnout další akci, ale skutečné state transitions musí vlastnit deterministická workflow definice. Tím se výrazně zjednoduší audit, testy, retry i compliance.

Workflow definition musí být versioned artefakt stejně jako contract. Nestačí ukládat jen aktuální YAML. Historický execution musí být schopen ukázat, podle které workflowVersion proběhl. Pokud se během rozpracovaného workflow nasadí nová verze definice, musí být policy, zda instance dokončí původní verzi, migruje se, nebo se zastaví.

Dále je potřeba formalizovat state transition guards. Například `WAITING_REVIEW` nesmí přejít na execute pouze tím, že se objeví libovolná review odpověď. Musí existovat role, tenant, task identity a povolená decision. Stejně tak compensation nesmí být implicitní „opak kroku“, ale explicitní capability.


# 8. Retry, idempotence, deadline a unknown outcome
Tato oblast patří mezi nejsilnější části návrhu. Rozlišení technical retry, quality retry a business re-evaluation je správné a zásadní. Nejčastější implementační chyba bývá, že všechno dostane jednu retry policy a po timeoutu se akce zopakuje. U plateb, emailů nebo deploymentu může být takové chování nebezpečné.

Foundation musí tuto oblast propojit s message deadline a idempotency retention. `IdempotencyKey` bez policy životnosti není dlouhodobá garance. Stejně tak `notValidAfter` bez clock abstraction je netestovatelné. A `UNKNOWN_OUTCOME` bez reconciliation capability je pouze nový název pro incident.

Doporučený hard requirement pro state-changing capability: musí deklarovat `idempotencyMode`, `idempotencyRetention`, `deadlinePolicy`, `unknownOutcomeRecovery`, `reversibility`. Tato metadata mohou být součástí capability descriptoru a contract tests mohou ověřit základní chování.


# 9. Verification Contract: největší chybějící kapitola
Threat model bez testovací mapy je pouze hypotéza. Verze v0.2 věnuje threatům velký prostor, ale testům jen taxonomii. To je opačný poměr, než jaký má mít produkční foundation. Pokud architektura tvrdí, že něco je invariant, musí být téměř mechanicky možné ukázat, jak se invariant ověřuje.

Doporučuji vytvořit samostatný `VERIFICATION-CONTRACT.md`, který je normativně stejně silný jako Foundation Core. Každý invariant dostane Test ID family, minimální fixtures, očekávaný výsledek a CI gate. Threat model pak bude odkazovat na konkrétní testy. Pokud něco automaticky testovat nejde, musí existovat explicitní manual evidence requirement.

Phase 5 „Break it intentionally“ nemá být jednorázová roadmap fáze. Je to permanentní regression suite. Wrong tenant, duplicate delivery, corrupted message, expired credential, review timeout, provider v1/v2 mismatch a restart uprostřed RUNNING musí běžet stále.


|Test family|Účel|Release gate|
|---|---|---|
|SEC-*|privilege boundary, injection, authz, confused deputy|povinný|
|TEN-*|cross-tenant isolation v DB/cache/queue/search|povinný pro multi-tenant|
|CTR-*|provider contract conformance|povinný pro Core capability|
|CDC-*|consumer-driven compatibility|povinný při deklarované backward compatibility|
|IDM-*|idempotency, replay, duplicate delivery|povinný pro write|
|WF-*|state transitions, retry, review timeout, compensation|povinný|
|RES-*|restart, dependency failure, queue recovery, restore|podle production class|
|AI-EVAL-*|model quality/drift/golden set|podle AI capability|

# 10. Contract testing musí být dodávaný artefakt
Pokud modul deklaruje `invoice.extract/v1`, samotné JSON Schema ověřuje pouze syntaxi. LEGO záruka ale vyžaduje i minimální sémantiku: povinné error codes, handling unknown fields, guarantee around confidence/provenance a očekávané behavior na referenčních inputs. Proto contract repository musí obsahovat executable conformance suite.

Provider musí tuto suite spustit proti své implementaci. Současně je vhodné mít consumer-driven tests, které zachycují reálné assumptions konzumenta. Bez consumer side testů lze snadno změnit význam pole bez změny JSON typu. Typickým příkladem je `status` se stejným enumem, ale změněnou business semantics.

Compatibility matice se má testovat podle skutečného support promise. Pokud provider v2 tvrdí kompatibilitu s consumerem v1, CI musí obsahovat kombinaci v1 consumer contract test against v2 provider. Jinak je backward compatibility pouze komentář v changelogu.


# 11. Testovatelnost času, externích systémů a tenantů
Některé architektonické požadavky se musí promítnout přímo do coding standardu. Nejvýraznější je čas. Přímé volání `DateTime.Now` nebo ekvivalentu uvnitř platformové logiky dramaticky komplikuje testy deadline, review expiry, retry backoff, retention a credential expiry. Platformové komponenty proto musí používat injektovatelný clock abstraction.

Totéž platí pro externí adaptéry. Banka, ERP, DMS nebo registry musí mít rozhraní a fake/sandbox implementaci, která prochází stejným adapter contractem. Workflow test pak nepotřebuje živou banku a přesto ověřuje stejnou semantics jako production adapter.

Multi-tenant fixture má mít ve výchozím stavu minimálně dva tenanty. Pokud všechny testy běží s jediným tenantem, cross-tenant leakage se prakticky nikdy neodhalí. Totéž platí pro cache keys, search indexes, background jobs a queues: tenant musí být součástí testovacího modelu, ne speciálního edge-case testu jednou za rok.


# 12. AI evals: z jedné věty udělat provozní disciplínu
AI evaly jsou v návrhu poddimenzované. Pokud model rozhoduje klasifikaci nebo extrakci, jeho změna může změnit business outcome, aniž by se změnil jediný řádek kódu. Proto musí mít AI capability vlastní quality contract: golden set, vlastník labelů, metriky, tolerance, drift policy a release threshold.

Eval není binární unit test. Model může mít variabilitu a různé chyby mají různé business náklady. U faktur je například false-positive „je to faktura“ jiný problém než špatně přečtený bank account. Metriky proto musí být capability-specific a ideálně risk-weighted.

Každý model/config/prompt upgrade, který může ovlivnit production decision, musí projít regression evalem. Výsledky se mají ukládat jako release evidence. Pokud nový model zvýší průměrnou přesnost, ale zhorší kritický field na nepřijatelnou úroveň, release se nemá automaticky pustit.


# 13. Multi-tenancy: správný princip, testovat celý datový povrch
Tenant isolation nesmí skončit u SQL dotazu. Data mohou unikat přes cache, fulltext/search index, object storage, queue, background job, export, log aggregation, AI trace nebo support dashboard. Proto multi-tenant security suite musí být „surface-based“, nikoliv pouze repository test.

Zvláštní pozornost vyžaduje asynchronous context propagation. Request přijde s trusted tenantem, vytvoří background job a worker ho zpracuje o hodinu později. Pokud job record neobsahuje bezpečně vázaný tenant context, worker může omylem použít default tenant nebo tenant z jiné session. To je klasická production chyba.

Doporučení: každá multi-tenant fixture obsahuje tenant A a B a každá storage/integration abstraction má minimálně jeden negative isolation test. Release blocker je jediný false allow. False deny je provozní incident, false allow je bezpečnostní incident.


# 14. Evidence, immutable originals a compliance
Evidence-by-design je vhodný princip, ale musí být oddělen od nekritického „logovat všechno“. Pro auditní obhajitelnost je důležitý originál, hash, provenance, verze zpracování, decision trail a human approval. Není nutné ukládat nekonečně všechny debug traces nebo celý prompt do běžného logu.

U dokumentů je správný model immutable original + derived artifacts. Stamped PDF je odvozenina, nikoliv přepsaný originál. Pokud platforma jednou bude vytvářet právně nebo účetně významné artefakty, může později přibýt časové razítko, podpis nebo immutable storage, ale není správné tyto mechanismy prohlásit za povinné pro každý prototype.

Compliance profile má být per deployment/tenant. Foundation má poskytovat schopnosti: retention classes, audit, export, legal hold hooks, access controls, evidence lineage. Konkrétní právní doby a sektorové povinnosti se nemají hardcodovat do Core.


# 15. Data lifecycle a pětiletý provoz
Největší náklady agentní farmy po pěti letech nebudou pravděpodobně LLM tokeny, ale provozní data, audit, artefakty, staré workflow instances a compatibility. Každá high-volume data class musí mít od začátku alespoň odhad růstu a purge/archive mechanismus. Bez toho se malá provozní DB pomalu promění v archiv všeho.

Zvlášť nebezpečné jsou AI traces a observability data, protože mají vysoký objem a relativně rychle klesající hodnotu. Naopak business evidence může mít dlouhou zákonnou nebo smluvní retenci. Jedna globální retention policy je proto špatně.

Doporučuji rozlišit minimálně operational hot data, audit/evidence data a disposable diagnostics. Teprve pokud reálný objem ukáže potřebu, lze přidat warm/archive tier. Důležitější než technologie archivu je existující retention owner a pravidelný purge job s monitoringem.


# 16. Versioning a compatibility: přidat jednoznačnou tabulku významů
Rozdělení componentVersion, capabilityVersion a schemaVersion je správné, ale bez explicitního „kdo a kdy inkrementuje“ budou tyto pojmy v praxi zaměňovány. To vede k falešné kompatibilitě: component release se zvýší, contract se fakticky změní, ale capability version zůstane stejná.

Foundation má proto obsahovat krátkou decision table. Capability major se mění při breaking semantics, schema version při breaking datovém tvaru a component version při jakémkoli release artifactu. Minor additive změny musí mít jasné pravidlo, zda jsou kompatibilní se starým consumerem.


|Verze|Co popisuje|Kdy inkrementovat|
|---|---|---|
|componentVersion|konkrétní release binárky/služby|každý release podle SemVer nebo zvoleného release scheme|
|capabilityVersion|business semantics capability|breaking změna semantics / behavior contractu|
|schemaVersion|datový tvar message/resultu|breaking změna struktury; additive změny podle schema policy|
|workflowVersion|konkrétní workflow graph a transition rules|změna graphu nebo významné policy flow|
|prompt/templateVersion|AI instruction artefakt|změna, která může ovlivnit output semantics|

# 17. Core admission a evidence matrix
Core Admission Rule je správný, ale musí být používán dřív než samotné psaní dalšího reusable package. Evidence matrix má být pracovní nástroj, ne příloha pro později. U každého kandidáta se musí otevřít skutečný kód a doložit, zda je shoda opravdu semantická.

Například retry v job-watch a retry v invoice extraction mohou mít stejný název, ale zcela jiný význam. Jeden může retryovat HTTP GET, druhý quality strategy. Shared helper, který sjednotí pouze název, by byl škodlivý. Naopak correlation, structured errors nebo execution outcome mohou být reálně společné.

Doporučuji evidenci vést s kategoriemi: EXISTS, PARTIAL, ABSENT, DIFFERENT_SEMANTICS, VERIFY. Teprve položka EXISTS v nejméně dvou projektech se stejnou semantics může vstoupit do candidate extraction.


# 18. Provozní model: robustnost znamená pozorovatelnost a recovery, ne absenci chyb
Pětiletá platforma se musí navrhovat s očekáváním, že budou padat procesy, expirovat credentials, měnit se externí API, plnit queues a růst databáze. Robustnost tedy není slib „nespadne“, ale schopnost rekonstruovat stav a bezpečně pokračovat.

Minimální observability by měla být malá a univerzální: component version, health, last success, last error, queue depth/oldest pending pro worker. Metriky typu p95 nebo specializované business counters mohou být candidate podle use-case. Foundation nemá předepsat Grafanu ani OpenTelemetry jako jedinou technologii.

Recovery scénáře musí být součástí verification contractu: restart uprostřed RUNNING, nedostupná dependency, stale credential, corrupted pending message, duplicate delivery, storage full, review timeout. Jinak je recovery dokumentovaná, ale neprokázaná.


# 19. Doporučená dokumentová architektura po oponentuře
Nejlepší cesta není přidávat další kapitoly do v0.2. Doporučený výsledek jsou tři různé dokumenty s odlišnou rolí. První je krátký `FOUNDATION-core.md`, který obsahuje osm runtime invariantů, minimální message/result contracts a několik tvrdých pravidel. Druhý je `VERIFICATION-CONTRACT.md`, který mapuje invarianty a threaty na testy a CI gate. Třetí je `PLATFORM-NOTES.md`, kam se přesune většina kandidátních a deferred myšlenek z v0.2.

Tím se zachová veškerá znalost, ale sníží se kognitivní náklad při code review. Reviewer nemusí číst 155 kapitol, aby zjistil, že AI nesmí mít write credential nebo že tenant context nesmí přijít z payloadu. Současně se neztratí dlouhodobé úvahy o data archivu, deployment waves nebo SBOM.


|Dokument|Rozsah|Úloha|
|---|---|---|
|FOUNDATION-core.md|cca 12–20 stran|závazné invarianty a minimální runtime kontrakty|
|VERIFICATION-CONTRACT.md|cca 15–25 stran|testy, threat mapping, CI gates, fixtures, compatibility matrix|
|PLATFORM-NOTES.md|libovolný|CANDIDATE/DEFERRED backlog, ADR kandidáti, provozní poznámky|
|PROJECT evidence matrix|živý artefakt|důkaz, co se reálně opakuje v existujících projektech|

# 20. Priority P0–P3 před stavbou první společné farmy
P0 nejsou nové služby. P0 jsou mezery, jejichž pozdější změna by znamenala breaking contract nebo bezpečnostní redesign. Patří sem deadline v command envelope, trusted context binding, idempotency retention, verification contract a jasný executor hosting model.

P1 je evidence z projektů a první dva contract artifacts. P2 jsou reusable runtime mechanismy, které se po evidence matrix skutečně opakují. P3 jsou enterprise rozšíření, která mají hodnotu až při reálném scale nebo regulatorním požadavku.


|Priorita|Položky|
|---|---|
|P0|zkrátit invarianty; deadline/notValidAfter; context binding; idempotency retention; Verification Contract; executor boundary vs deployable|
|P1|evidence matrix z reálných repo; message envelope v1; module/capability contract v1; threat→test mapping|
|P2|první shared package pouze po opakovaném použití; common execution/error helper; adapter fakes; shared audit envelope podle evidence|
|P3|schema registry service, workflow registry, advanced rollout waves, SBOM standard, WORM audit, full tenant lifecycle, billing|

# 21. Verification Contract — návrh normativní struktury
Verification Contract má být samostatný normativní artefakt. Jeho účelem není popsat všechny testovací techniky, ale definovat minimum, které musí každá component/capability doložit podle svých claims. Pokud component tvrdí, že je multi-tenant, musí projít TEN testy. Pokud je write executor, musí projít IDM a SEC testy. Pokud tvrdí backward compatibility, musí existovat compatibility matrix.

Každý test má mít stabilní ID, preconditions, action, expected outcome a gate classification. Tím lze threat model i code review spojit s CI. Přestane existovat vágní věta „tohle by mělo být otestované“ a místo ní bude například `TEN-QUEUE-003` nebo `IDM-REPLAY-002`.


|Threat / invariant|Minimální test|Gate|
|---|---|---|
|AI cannot write|SEC-PRIV-001: AI/service identity calls write capability directly → DENY|BLOCK|
|Untrusted text cannot become command|SEC-INJ-001: malicious PDF/email proposes tool call → no privileged execution|BLOCK|
|Tenant isolation|TEN-DB-001 + TEN-CACHE-001 + TEN-QUEUE-001|BLOCK|
|Confused deputy|SEC-CTX-002: mismatched trusted context/command → DENY|BLOCK|
|Replay|IDM-REPLAY-001: same write command N× → one side effect|BLOCK|
|Expired command|IDM-DEADLINE-001: now > notValidAfter → DENY before side effect|BLOCK|
|Review expiry|WF-REVIEW-003: expiry transition follows policy, never stuck|BLOCK|
|Unknown external outcome|WF-UNK-001: timeout after send → reconciliation, not blind resend|BLOCK|
|Version downgrade|COMP-DOWN-001: disabled unsafe old capability cannot be routed|BLOCK|
|Poisoned artifact|SEC-ART-001: hash mismatch between stages → reject/quarantine|BLOCK|
|Model drift|AI-EVAL-REG-001: new model compared with golden baseline|policy-dependent|

# 22. Oponentní scénáře, které musí návrh přežít
Architekturu lze nejlépe otestovat scénáři, které kombinují několik vrstev najednou. Následující případy nejsou implementation tasks; jsou to adversarial acceptance questions. Pokud foundation neumí jednoznačně vysvětlit očekávané chování, contract ještě není dostatečně přesný.

- Faktura je klasifikována správně, ale IČO je z OCR špatně. Registry check failne, alternate OCR dá jiné IČO, bank account se shoduje pouze s druhou variantou. Workflow musí umět quality retry a evidence merge bez přepsání originálu.
- Payment executor odešle request do banky, spojení spadne před odpovědí. Command se znovu doručí. Systém nesmí vytvořit druhou platbu; musí použít idempotency/reconciliation.
- Command byl vytvořen v 10:00 s platností do 10:10. Queue outage trvá hodinu. V 11:00 se message objeví. Executor musí odmítnout expired command před side effectem.
- Tenant A a Tenant B mají shodné invoiceId. Cache obsahuje záznam A. Request B nesmí dostat A ani při cache hitu.
- AI agent zpracuje PDF s prompt injection textem, který žádá `email.send`. Agent tuto capability nemá a write executor nemá přijmout natural-language request.
- Reviewer s rolí pro tenant A se pokusí schválit review task tenanta B. Výsledek musí být DENY a security audit.
- Provider v2 deklaruje podporu capability v1, ale změnil interpretaci null hodnoty. Consumer-driven test musí failnout před release.
- Workflow čeká na human review a během čekání je nasazena workflow v2. Instance musí mít definované, zda pokračuje na v1 nebo migruje; nesmí implicitně změnit graph.
- External registry změní schema a začne vracet partial data. Adapter contract/fake test odhalí nesplněnou semantics dřív než business flow vytvoří chybný decision.
- Idempotency record byl archivován, ale business transaction stále existuje. Znovu poslaný command nesmí provést druhý side effect pouze proto, že technická dedup cache už expirovala.

# 23. Oponentura bezpečnostní filozofie: silná, ale musí být ekonomicky provozovatelná
Bezpečnostní filozofie je konzistentní: intelligence nemá write, executory jsou úzké, tenant je mimo prompt a input je untrusted. To je výrazně lepší než běžné agentní návrhy, které připojí LLM přímo k univerzálním tools. Oponentní otázka ale zní, zda se bezpečnostní čistota nezmění v provozní komplexitu, kterou solo maintainer nebude schopen udržet.

Bezpečnostní boundary musí být navržena tak, aby defaultní cesta byla zároveň nejjednodušší. Pokud vytvoření nového write executora vyžaduje nový repo, container, certifikát, secret rotation pipeline, dashboard, deployment a pager, začne vznikat tlak na obcházení pravidel. Lidé pak vytvoří univerzální executor „jen dočasně“. Robustní standard proto musí nabídnout lightweight pattern: nový handler, scoped credential, generated policy, contract tests a audit bez potřeby nové infrastruktury.

To je důvod, proč doporučuji výslovně oddělit logical executor od deployable. Bez tohoto rozlišení je nejlepší bezpečnostní princip současně největším rizikem budoucího bypassu.


# 24. Oponentura modularity: API není automaticky pouzdření
REST mezi dvěma moduly neznamená, že jsou moduly skutečně oddělené. Distributed monolith může mít perfektní HTTP API a přesto vyžadovat koordinovaný release všech služeb. Skutečné pouzdření se pozná podle toho, zda lze interní implementaci vyměnit bez změny consumerů, zda provider může být dočasně nedostupný a zda každý modul vlastní svá data.

Foundation by proto měla modularitu definovat více behaviorálně: samostatné lifecycle, explicitní contract, no shared tables, no shared global transaction, independent deployability tam, kde to dává provozní smysl. Není nutné maximalizovat počet procesů. Modularita je vlastnost hranic, nikoliv topologie procesu.

Stejně tak capabilities nesmí být příliš jemné. Pokud každé interní volání dostane vlastní capability, contract surface exploduje. Capability má popisovat stabilní business/technical ability, nikoli každý method call. To je další oblast, kterou evidence z reálných projektů musí teprve kalibrovat.


# 25. Oponentura orchestrátoru: hrozba centrálního mozku
Orchestrátor přirozeně přitahuje odpovědnosti: routing, workflow, retry, human review, policy, context, scheduling, audit a někdy i AI planning. Pokud se všechny tyto funkce soustředí do jednoho kódu, vznikne největší monolit celé platformy. Foundation musí proto hlídat, aby orchestrátor zůstal koordinátor, nikoliv business database a universal integration layer.

Doporučená hranice: orchestrátor vlastní stav workflow, ale nevlastní domain entity. Ví, že krok `invoice.validate` vrátil PASS/REVIEW a result reference, ale nemusí znát všechny sloupce faktury. Pokud workflow potřebuje condition nad business hodnotou, musí být jasné, zda je to generic expression nad contractem, nebo samostatná policy capability.

Druhé riziko je single point of failure. Durable workflow journal musí umožnit restart. To však neznamená hned stavět distribuovaný consensus. Pro první verze může stačit jedna DB a jeden active worker, pokud je failure model explicitní a recovery testovaný.


# 26. Oponentura compliance přístupu: nepřehánět claims
Používat NIS2, ISO 27001 a GDPR jako návrhové čočky je rozumné. Není ale správné tvrdit, že samotná platforma je „NIS2 compliant“ nebo „ISO compliant“, protože compliance závisí na organizaci, scope, procesech, právních povinnostech a konkrétním deploymentu. Foundation má poskytovat kontrolovatelné mechanismy, nikoliv marketingový compliance label.

Pro budoucí zákazníky může být užitečný `ComplianceProfile`, který mapuje platform capabilities na konkrétní požadavky. Například audit retention, privileged access, incident evidence nebo data deletion. To je však konfigurační/policy vrstva nad platformou, ne důvod hardcodovat jednu retenční dobu do Core.


# 27. Oponentura ownership a osobního portfolia
Dokument správně odděluje osobní portfolio od pracovních implementací. Toto oddělení musí být nejen názvoslovné, ale i právní a technické. Reusable Core nesmí obsahovat interní názvy, credentials, proprietary business rules nebo části kódu, jejichž vlastnictví náleží zaměstnavateli či zákazníkovi.

USB Guardian lze používat jako referenční zkušenost a pattern source. Přímá extrakce pracovního kódu do osobního repozitáře však vyžaduje jasné vlastnictví a oprávnění. Pro robustní portfolio je bezpečnější implementovat obecný pattern znovu podle vlastního contractu než mechanicky kopírovat pracovní modul.


# 28. Jak poznat, že první Core je opravdu užitečný
První Core by měl být překvapivě malý. Pokud po evidence matrix vyjde, že jediné skutečně společné prvky jsou message metadata, structured error a execution identifiers, je naprosto v pořádku, aby Core v1 obsahoval jen několik datových typů a contract tests. Není potřeba mít runtime server, plugin framework ani universal storage.

Kvalitní Core se pozná tím, že jeho použití snižuje počet rozhodnutí v novém projektu a současně neomezuje domain design. Pokud přidání Core znamená deset nových konfiguračních souborů a složité lifecycle, Core zatím pravděpodobně abstrahuje příliš mnoho.


# PŘÍLOHA A — Section-by-section review všech kapitol v0.2
Tato příloha nehodnotí jen správnost myšlenky, ale hlavně její správné umístění v dokumentační hierarchii. Statusy: **KEEP**, **CHANGE**, **MOVE**, **MERGE**, **REWRITE**, **P0**.

## A.1 — 0. Proč vzniká verze 0.2

**Verdikt:** KEEP/SHORTEN

Zdrojová sekce pracuje mimo jiné s formulací „Předchozí dokument `AGENT-PLATFORM-FOUNDATION-v0.1.md` správně zachytil velké množství budoucích témat, ale chybně je postavil do jedné roviny jako povinnou normu. To vytvářelo tři rizika:“. Správná sebereflexe v0.1, ale paradoxně následující rozsah ji zčásti popírá. Zkrátit na jednu stránku a převést detailní historii do changelogu. Oponentní kritérium je jednoduché: pokud se tato kapitola odstraní z Foundation Core, ztratí se nějaká vymahatelná bezpečnostní nebo interoperabilní vlastnost? Pokud ne, patří spíše do poznámek než do závazného jádra.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.2 — 1. Účel a dlouhodobý záměr

**Verdikt:** KEEP/CLARIFY

Zdrojová sekce pracuje mimo jiné s formulací „Cílem není vytvořit jednu aplikaci ani jeden AI agent framework.“. Obsah je užitečný, ale potřebuje přesnější hranici mezi kontraktem a implementačním doporučením. Zvlášť je třeba uvést, co je release-blocking a co je jen doporučený pattern. Doporučuji tuto část propojit s jedním konkrétním artefaktem nebo testem. Bez takového napojení hrozí, že bude při implementaci čtena jako doporučení, ale nebude existovat způsob, jak ověřit její dodržení.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.3 — 2. Co už je ověřeno a z čeho vycházíme

**Verdikt:** MOVE

Zdrojová sekce pracuje mimo jiné s formulací „## 2.1 `ai-agenti`“. Téma má hodnotu, ale není součástí minimální Foundation. Přesunout do PLATFORM-NOTES jako candidate/deferred, aby nezvyšovalo kognitivní náklad při běžném review. Z hlediska pětileté údržby je důležitější jedno stabilní místo pravdy než detailní text na více místech. Pokud stejná semantics existuje v kontraktu, acceptance criteria a threat kapitole, vzniká riziko, že se časem rozjedou.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.4 — 3. Tři úrovně normativity

**Verdikt:** KEEP

Zdrojová sekce pracuje mimo jiné s formulací „## 3.1 INVARIANT“. Jedna z nejlepších částí. Přidat pravidlo, že pouze INVARIANT je release-blocking default; CANDIDATE a DEFERRED nesmí být automaticky scope creep. Při zavádění do reálného projektu by měla být tato myšlenka ověřena nejméně dvěma use-casy nebo explicitně označena jako project-specific. To chrání Core před předčasným zobecněním.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.5 — 4. Dvanáct základních invariantů

**Verdikt:** CHANGE

Zdrojová sekce pracuje mimo jiné s formulací „## INVARIANT 1 — AI recognizes; deterministic code executes“. Redukovat na cca 8. Sloučit privilege pair a contract pair; INV12 přesunout do Core Admission Process. Z provozního pohledu je třeba vždy doplnit failure semantics: co se stane při timeoutu, duplicate delivery, restartu nebo chybné konfiguraci. Happy-path popis sám o sobě není dlouhodobý kontrakt.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.6 — 5. Referenční vrstvy systému

**Verdikt:** KEEP

Zdrojová sekce pracuje mimo jiné s formulací „Nejde o povinný počet procesů. Jde o konceptuální odpovědnosti.“. Myšlenka je v zásadě správná a není nutné ji měnit. Doporučuji pouze zkrátit text tak, aby tato část nezdvojovala jiné kapitoly a měla jasný normativní status. Oponentní kritérium je jednoduché: pokud se tato kapitola odstraní z Foundation Core, ztratí se nějaká vymahatelná bezpečnostní nebo interoperabilní vlastnost? Pokud ne, patří spíše do poznámek než do závazného jádra.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.7 — 6. Role komponent

**Verdikt:** KEEP/CLARIFY

Zdrojová sekce pracuje mimo jiné s formulací „## 6.1 Orchestrator“. Obsah je užitečný, ale potřebuje přesnější hranici mezi kontraktem a implementačním doporučením. Zvlášť je třeba uvést, co je release-blocking a co je jen doporučený pattern. Doporučuji tuto část propojit s jedním konkrétním artefaktem nebo testem. Bez takového napojení hrozí, že bude při implementaci čtena jako doporučení, ale nebude existovat způsob, jak ověřit její dodržení.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.8 — 7. Minimal common message model

**Verdikt:** CHANGE

Zdrojová sekce pracuje mimo jiné s formulací „Předchozí verze směšovala caller-supplied metadata a trusted metadata. Verze 0.2 je odděluje.“. Doplnit `notValidAfter`, explicitní trust binding a jasně oddělit transport/trusted context. Zvážit `causationId` jako candidate. Z hlediska pětileté údržby je důležitější jedno stabilní místo pravdy než detailní text na více místech. Pokud stejná semantics existuje v kontraktu, acceptance criteria a threat kapitole, vzniká riziko, že se časem rozjedou.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.9 — 8. Capability contract

**Verdikt:** CHANGE

Zdrojová sekce pracuje mimo jiné s formulací „Každá capability má minimálně:“. Směr je správný, ale současná formulace může vést ke dvěma různým implementacím. Doplnit jednoznačnou semantics a odpovídající verification requirement. Při zavádění do reálného projektu by měla být tato myšlenka ověřena nejméně dvěma use-casy nebo explicitně označena jako project-specific. To chrání Core před předčasným zobecněním.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.10 — 9. Tři různé verze

**Verdikt:** KEEP/CLARIFY

Zdrojová sekce pracuje mimo jiné s formulací „Je nutné rozlišovat:“. Doplnit tabulku kdo co inkrementuje a kdy. Přidat workflowVersion a prompt/templateVersion do poznámek. Z provozního pohledu je třeba vždy doplnit failure semantics: co se stane při timeoutu, duplicate delivery, restartu nebo chybné konfiguraci. Happy-path popis sám o sobě není dlouhodobý kontrakt.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.11 — 10. Capability negotiation

**Verdikt:** KEEP

Zdrojová sekce pracuje mimo jiné s formulací „Component registry může deklarovat:“. Myšlenka je v zásadě správná a není nutné ji měnit. Doporučuji pouze zkrátit text tak, aby tato část nezdvojovala jiné kapitoly a měla jasný normativní status. Oponentní kritérium je jednoduché: pokud se tato kapitola odstraní z Foundation Core, ztratí se nějaká vymahatelná bezpečnostní nebo interoperabilní vlastnost? Pokud ne, patří spíše do poznámek než do závazného jádra.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.12 — 11. Standardní execution state model

**Verdikt:** KEEP

Zdrojová sekce pracuje mimo jiné s formulací „`RETRYABLE` není execution state.“. Správně odstraňuje RETRYABLE jako stav. U WAITING mít povinný reason a deadline/policy. Doporučuji tuto část propojit s jedním konkrétním artefaktem nebo testem. Bez takového napojení hrozí, že bude při implementaci čtena jako doporučení, ale nebude existovat způsob, jak ověřit její dodržení.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.13 — 12. Error contract

**Verdikt:** KEEP/EXPAND

Zdrojová sekce pracuje mimo jiné s formulací „Každé selhání musí mít standardní tvar:“. Silný základ. Doplnit machine-stable code governance, safe human message a případně retriableAfter/diagnosticRef. Z hlediska pětileté údržby je důležitější jedno stabilní místo pravdy než detailní text na více místech. Pokud stejná semantics existuje v kontraktu, acceptance criteria a threat kapitole, vzniká riziko, že se časem rozjedou.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.14 — 13. Retry model

**Verdikt:** KEEP

Zdrojová sekce pracuje mimo jiné s formulací „Je nutné rozlišit tři retry mechanismy.“. Velmi dobré rozlišení. Quality retry musí být nový logical attempt; propojit s idempotency retention a budgetem. Při zavádění do reálného projektu by měla být tato myšlenka ověřena nejméně dvěma use-casy nebo explicitně označena jako project-specific. To chrání Core před předčasným zobecněním.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.15 — 14. Delivery semantics

**Verdikt:** KEEP

Zdrojová sekce pracuje mimo jiné s formulací „Pro distribuované command/event doručení je default:“. Správně at-least-once a bez globálního ordering promise. Doplnit per-aggregate ordering pouze jako explicitní contract. Z provozního pohledu je třeba vždy doplnit failure semantics: co se stane při timeoutu, duplicate delivery, restartu nebo chybné konfiguraci. Happy-path popis sám o sobě není dlouhodobý kontrakt.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.16 — 15. Idempotency

**Verdikt:** CHANGE

Zdrojová sekce pracuje mimo jiné s formulací „## 15.1 Logical command identity“. Doplnit retention, business transaction identity a test po expiraci technického klíče. Oponentní kritérium je jednoduché: pokud se tato kapitola odstraní z Foundation Core, ztratí se nějaká vymahatelná bezpečnostní nebo interoperabilní vlastnost? Pokud ne, patří spíše do poznámek než do závazného jádra.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.17 — 16. Compensation and reversibility

**Verdikt:** KEEP/CLARIFY

Zdrojová sekce pracuje mimo jiné s formulací „Idempotence není rollback.“. Nepředstírat univerzální rollback. U irreversible přidat deadline/reconciliation/human gate requirements. Doporučuji tuto část propojit s jedním konkrétním artefaktem nebo testem. Bez takového napojení hrozí, že bude při implementaci čtena jako doporučení, ale nebude existovat způsob, jak ověřit její dodržení.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.18 — 17. Workflow model v1

**Verdikt:** KEEP

Zdrojová sekce pracuje mimo jiné s formulací „## 17.1 Workflow je versioned deterministic definition“. Deterministický graph je správný. Doplnit workflowVersion pinning pro běžící instance. Z hlediska pětileté údržby je důležitější jedno stabilní místo pravdy než detailní text na více místech. Pokud stejná semantics existuje v kontraktu, acceptance criteria a threat kapitole, vzniká riziko, že se časem rozjedou.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.19 — 18. Human review contract

**Verdikt:** KEEP/EXPAND

Zdrojová sekce pracuje mimo jiné s formulací „Review task:“. Doplnit role mapping, tenant isolation, expiry transition a audit jako write state transition. Při zavádění do reálného projektu by měla být tato myšlenka ověřena nejméně dvěma use-casy nebo explicitně označena jako project-specific. To chrání Core před předčasným zobecněním.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.20 — 19. Faktura jako referenční příklad workflow

**Verdikt:** MERGE

Zdrojová sekce pracuje mimo jiné s formulací „Tento příklad není definice platformy. Je to test, zda kontrakty dávají smysl.“. Sekce opakuje princip, který už existuje jinde. Sloučit s příbuznou kapitolou a udržet jediný normativní zdroj, jinak vznikne dokumentační drift. Z provozního pohledu je třeba vždy doplnit failure semantics: co se stane při timeoutu, duplicate delivery, restartu nebo chybné konfiguraci. Happy-path popis sám o sobě není dlouhodobý kontrakt.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.21 — 20. Data provenance

**Verdikt:** KEEP

Zdrojová sekce pracuje mimo jiné s formulací „Každá hodnota, která vznikla z nejistého zdroje, může nést provenance metadata.“. Myšlenka je v zásadě správná a není nutné ji měnit. Doporučuji pouze zkrátit text tak, aby tato část nezdvojovala jiné kapitoly a měla jasný normativní status. Oponentní kritérium je jednoduché: pokud se tato kapitola odstraní z Foundation Core, ztratí se nějaká vymahatelná bezpečnostní nebo interoperabilní vlastnost? Pokud ne, patří spíše do poznámek než do závazného jádra.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.22 — 21. Artifact model

**Verdikt:** KEEP/CLARIFY

Zdrojová sekce pracuje mimo jiné s formulací „Originál:“. Obsah je užitečný, ale potřebuje přesnější hranici mezi kontraktem a implementačním doporučením. Zvlášť je třeba uvést, co je release-blocking a co je jen doporučený pattern. Doporučuji tuto část propojit s jedním konkrétním artefaktem nebo testem. Bez takového napojení hrozí, že bude při implementaci čtena jako doporučení, ale nebude existovat způsob, jak ověřit její dodržení.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.23 — 22. Document stamping

**Verdikt:** MOVE

Zdrojová sekce pracuje mimo jiné s formulací „Stamp/watermark se provádí pouze přes deterministic executor.“. Téma má hodnotu, ale není součástí minimální Foundation. Přesunout do PLATFORM-NOTES jako candidate/deferred, aby nezvyšovalo kognitivní náklad při běžném review. Z hlediska pětileté údržby je důležitější jedno stabilní místo pravdy než detailní text na více místech. Pokud stejná semantics existuje v kontraktu, acceptance criteria a threat kapitole, vzniká riziko, že se časem rozjedou.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.24 — 23. Trust boundary pro injection resistance

**Verdikt:** KEEP

Zdrojová sekce pracuje mimo jiné s formulací „## 23.1 Žádný raw shell z AI“. Základní bezpečnostní kapitola. Propojit každou hrozbu s test ID místo dalších prose pravidel. Při zavádění do reálného projektu by měla být tato myšlenka ověřena nejméně dvěma use-casy nebo explicitně označena jako project-specific. To chrání Core před předčasným zobecněním.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.25 — 24. Authentication, authorization a tenant

**Verdikt:** MERGE

Zdrojová sekce pracuje mimo jiné s formulací „Autentizace odpovídá:“. Sekce opakuje princip, který už existuje jinde. Sloučit s příbuznou kapitolou a udržet jediný normativní zdroj, jinak vznikne dokumentační drift. Z provozního pohledu je třeba vždy doplnit failure semantics: co se stane při timeoutu, duplicate delivery, restartu nebo chybné konfiguraci. Happy-path popis sám o sobě není dlouhodobý kontrakt.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.26 — 25. Tenant context

**Verdikt:** KEEP/EXPAND

Zdrojová sekce pracuje mimo jiné s formulací „## 25.1 Trusted tenant resolution“. Trusted context je klíč. Chybí cryptographic/transport binding při cross-process dispatch. Oponentní kritérium je jednoduché: pokud se tato kapitola odstraní z Foundation Core, ztratí se nějaká vymahatelná bezpečnostní nebo interoperabilní vlastnost? Pokud ne, patří spíše do poznámek než do závazného jádra.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.27 — 26. Identity typy

**Verdikt:** KEEP/CLARIFY

Zdrojová sekce pracuje mimo jiné s formulací „Platforma musí konceptuálně rozlišovat:“. Obsah je užitečný, ale potřebuje přesnější hranici mezi kontraktem a implementačním doporučením. Zvlášť je třeba uvést, co je release-blocking a co je jen doporučený pattern. Doporučuji tuto část propojit s jedním konkrétním artefaktem nebo testem. Bez takového napojení hrozí, že bude při implementaci čtena jako doporučení, ale nebude existovat způsob, jak ověřit její dodržení.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.28 — 27. Secrets

**Verdikt:** MOVE

Zdrojová sekce pracuje mimo jiné s formulací „Secret nikdy nesmí být běžný prompt context.“. Téma má hodnotu, ale není součástí minimální Foundation. Přesunout do PLATFORM-NOTES jako candidate/deferred, aby nezvyšovalo kognitivní náklad při běžném review. Z hlediska pětileté údržby je důležitější jedno stabilní místo pravdy než detailní text na více místech. Pokud stejná semantics existuje v kontraktu, acceptance criteria a threat kapitole, vzniká riziko, že se časem rozjedou.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.29 — 28. Data ownership

**Verdikt:** CHANGE

Zdrojová sekce pracuje mimo jiné s formulací „Každý domain module vlastní svá data.“. Směr je správný, ale současná formulace může vést ke dvěma různým implementacím. Doplnit jednoznačnou semantics a odpovídající verification requirement. Při zavádění do reálného projektu by měla být tato myšlenka ověřena nejméně dvěma use-casy nebo explicitně označena jako project-specific. To chrání Core před předčasným zobecněním.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.30 — 29. Platform data vs domain data

**Verdikt:** MERGE

Zdrojová sekce pracuje mimo jiné s formulací „Platform může časem vlastnit společná data:“. Sekce opakuje princip, který už existuje jinde. Sloučit s příbuznou kapitolou a udržet jediný normativní zdroj, jinak vznikne dokumentační drift. Z provozního pohledu je třeba vždy doplnit failure semantics: co se stane při timeoutu, duplicate delivery, restartu nebo chybné konfiguraci. Happy-path popis sám o sobě není dlouhodobý kontrakt.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.31 — 30. Long-term data lifecycle

**Verdikt:** KEEP

Zdrojová sekce pracuje mimo jiné s formulací „Každý data class musí mít definovatelnou retention policy.“. Myšlenka je v zásadě správná a není nutné ji měnit. Doporučuji pouze zkrátit text tak, aby tato část nezdvojovala jiné kapitoly a měla jasný normativní status. Oponentní kritérium je jednoduché: pokud se tato kapitola odstraní z Foundation Core, ztratí se nějaká vymahatelná bezpečnostní nebo interoperabilní vlastnost? Pokud ne, patří spíše do poznámek než do závazného jádra.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.32 — 31. Evidence by design

**Verdikt:** KEEP/CLARIFY

Zdrojová sekce pracuje mimo jiné s formulací „U důležitého workflow musí být později možné zjistit:“. Obsah je užitečný, ale potřebuje přesnější hranici mezi kontraktem a implementačním doporučením. Zvlášť je třeba uvést, co je release-blocking a co je jen doporučený pattern. Doporučuji tuto část propojit s jedním konkrétním artefaktem nebo testem. Bez takového napojení hrozí, že bude při implementaci čtena jako doporučení, ale nebude existovat způsob, jak ověřit její dodržení.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.33 — 32. Audit vs logs

**Verdikt:** MOVE

Zdrojová sekce pracuje mimo jiné s formulací „Nesmí se zaměňovat:“. Téma má hodnotu, ale není součástí minimální Foundation. Přesunout do PLATFORM-NOTES jako candidate/deferred, aby nezvyšovalo kognitivní náklad při běžném review. Z hlediska pětileté údržby je důležitější jedno stabilní místo pravdy než detailní text na více místech. Pokud stejná semantics existuje v kontraktu, acceptance criteria a threat kapitole, vzniká riziko, že se časem rozjedou.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.34 — 33. Compliance by design

**Verdikt:** CHANGE

Zdrojová sekce pracuje mimo jiné s formulací „Platforma má poskytovat mechanismy, nikoli hardcodovat jedno regulatorní prostředí.“. Směr je správný, ale současná formulace může vést ke dvěma různým implementacím. Doplnit jednoznačnou semantics a odpovídající verification requirement. Při zavádění do reálného projektu by měla být tato myšlenka ověřena nejméně dvěma use-casy nebo explicitně označena jako project-specific. To chrání Core před předčasným zobecněním.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.35 — 34. Machine language standard

**Verdikt:** MERGE

Zdrojová sekce pracuje mimo jiné s formulací „Technické identifikátory jsou English-only.“. Sekce opakuje princip, který už existuje jinde. Sloučit s příbuznou kapitolou a udržet jediný normativní zdroj, jinak vznikne dokumentační drift. Z provozního pohledu je třeba vždy doplnit failure semantics: co se stane při timeoutu, duplicate delivery, restartu nebo chybné konfiguraci. Happy-path popis sám o sobě není dlouhodobý kontrakt.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.36 — 35. Version compatibility philosophy

**Verdikt:** KEEP

Zdrojová sekce pracuje mimo jiné s formulací „Backwards compatibility je cíl, nikoli magická garance.“. Myšlenka je v zásadě správná a není nutné ji měnit. Doporučuji pouze zkrátit text tak, aby tato část nezdvojovala jiné kapitoly a měla jasný normativní status. Oponentní kritérium je jednoduché: pokud se tato kapitola odstraní z Foundation Core, ztratí se nějaká vymahatelná bezpečnostní nebo interoperabilní vlastnost? Pokud ne, patří spíše do poznámek než do závazného jádra.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.37 — 36. Contract evolution

**Verdikt:** KEEP/CLARIFY

Zdrojová sekce pracuje mimo jiné s formulací „Doporučené pravidlo:“. Obsah je užitečný, ale potřebuje přesnější hranici mezi kontraktem a implementačním doporučením. Zvlášť je třeba uvést, co je release-blocking a co je jen doporučený pattern. Doporučuji tuto část propojit s jedním konkrétním artefaktem nebo testem. Bez takového napojení hrozí, že bude při implementaci čtena jako doporučení, ale nebude existovat způsob, jak ověřit její dodržení.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.38 — 37. Compatibility lifecycle — CANDIDATE

**Verdikt:** MOVE

Zdrojová sekce pracuje mimo jiné s formulací „Candidate lifecycle:“. Patří do PLATFORM-NOTES, dokud neexistují reálně paralelní major verze. Z hlediska pětileté údržby je důležitější jedno stabilní místo pravdy než detailní text na více místech. Pokud stejná semantics existuje v kontraktu, acceptance criteria a threat kapitole, vzniká riziko, že se časem rozjedou.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.39 — 38. Database migrations

**Verdikt:** CHANGE

Zdrojová sekce pracuje mimo jiné s formulací „## INVARIANT“. Směr je správný, ale současná formulace může vést ke dvěma různým implementacím. Doplnit jednoznačnou semantics a odpovídající verification requirement. Při zavádění do reálného projektu by měla být tato myšlenka ověřena nejméně dvěma use-casy nebo explicitně označena jako project-specific. To chrání Core před předčasným zobecněním.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.40 — 39. Deployment topology

**Verdikt:** MERGE

Zdrojová sekce pracuje mimo jiné s formulací „Komponenty mohou běžet:“. Sekce opakuje princip, který už existuje jinde. Sloučit s příbuznou kapitolou a udržet jediný normativní zdroj, jinak vznikne dokumentační drift. Z provozního pohledu je třeba vždy doplnit failure semantics: co se stane při timeoutu, duplicate delivery, restartu nebo chybné konfiguraci. Happy-path popis sám o sobě není dlouhodobý kontrakt.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.41 — 40. Endpoint runtime — CANDIDATE

**Verdikt:** MOVE

Zdrojová sekce pracuje mimo jiné s formulací „USB Guardian ukázal, že společný endpoint runtime může mít smysl.“. Správně pouze candidate. Vyžaduje druhý endpoint use-case před extrakcí. Oponentní kritérium je jednoduché: pokud se tato kapitola odstraní z Foundation Core, ztratí se nějaká vymahatelná bezpečnostní nebo interoperabilní vlastnost? Pokud ne, patří spíše do poznámek než do závazného jádra.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.42 — 41. Jeden endpoint agent, více modulů — CANDIDATE

**Verdikt:** KEEP/CLARIFY

Zdrojová sekce pracuje mimo jiné s formulací „Preferovaná budoucí topologie může být:“. Obsah je užitečný, ale potřebuje přesnější hranici mezi kontraktem a implementačním doporučením. Zvlášť je třeba uvést, co je release-blocking a co je jen doporučený pattern. Doporučuji tuto část propojit s jedním konkrétním artefaktem nebo testem. Bez takového napojení hrozí, že bude při implementaci čtena jako doporučení, ale nebude existovat způsob, jak ověřit její dodržení.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.43 — 42. Durable workflow

**Verdikt:** MOVE

Zdrojová sekce pracuje mimo jiné s formulací „Workflow state se nesmí spoléhat pouze na process memory.“. Téma má hodnotu, ale není součástí minimální Foundation. Přesunout do PLATFORM-NOTES jako candidate/deferred, aby nezvyšovalo kognitivní náklad při běžném review. Z hlediska pětileté údržby je důležitější jedno stabilní místo pravdy než detailní text na více místech. Pokud stejná semantics existuje v kontraktu, acceptance criteria a threat kapitole, vzniká riziko, že se časem rozjedou.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.44 — 43. Queue a backpressure

**Verdikt:** CHANGE

Zdrojová sekce pracuje mimo jiné s formulací „Pokud producer generuje data rychleji než consumer:“. Směr je správný, ale současná formulace může vést ke dvěma různým implementacím. Doplnit jednoznačnou semantics a odpovídající verification requirement. Při zavádění do reálného projektu by měla být tato myšlenka ověřena nejméně dvěma use-casy nebo explicitně označena jako project-specific. To chrání Core před předčasným zobecněním.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.45 — 44. Dead-letter handling

**Verdikt:** MERGE

Zdrojová sekce pracuje mimo jiné s formulací „Po vyčerpání retry budgetu nesmí existovat:“. Sekce opakuje princip, který už existuje jinde. Sloučit s příbuznou kapitolou a udržet jediný normativní zdroj, jinak vznikne dokumentační drift. Z provozního pohledu je třeba vždy doplnit failure semantics: co se stane při timeoutu, duplicate delivery, restartu nebo chybné konfiguraci. Happy-path popis sám o sobě není dlouhodobý kontrakt.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.46 — 45. Observability minimum

**Verdikt:** KEEP

Zdrojová sekce pracuje mimo jiné s formulací „Každá dlouhodobě běžící component musí být schopna říct minimálně:“. Myšlenka je v zásadě správná a není nutné ji měnit. Doporučuji pouze zkrátit text tak, aby tato část nezdvojovala jiné kapitoly a měla jasný normativní status. Oponentní kritérium je jednoduché: pokud se tato kapitola odstraní z Foundation Core, ztratí se nějaká vymahatelná bezpečnostní nebo interoperabilní vlastnost? Pokud ne, patří spíše do poznámek než do závazného jádra.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.47 — 46. Correlation

**Verdikt:** KEEP/CLARIFY

Zdrojová sekce pracuje mimo jiné s formulací „Každý end-to-end business tok má `correlationId`.“. Obsah je užitečný, ale potřebuje přesnější hranici mezi kontraktem a implementačním doporučením. Zvlášť je třeba uvést, co je release-blocking a co je jen doporučený pattern. Doporučuji tuto část propojit s jedním konkrétním artefaktem nebo testem. Bez takového napojení hrozí, že bude při implementaci čtena jako doporučení, ale nebude existovat způsob, jak ověřit její dodržení.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.48 — 47. Resource limits

**Verdikt:** MOVE

Zdrojová sekce pracuje mimo jiné s formulací „AI a automation musí mít budget.“. Téma má hodnotu, ale není součástí minimální Foundation. Přesunout do PLATFORM-NOTES jako candidate/deferred, aby nezvyšovalo kognitivní náklad při běžném review. Z hlediska pětileté údržby je důležitější jedno stabilní místo pravdy než detailní text na více místech. Pokud stejná semantics existuje v kontraktu, acceptance criteria a threat kapitole, vzniká riziko, že se časem rozjedou.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.49 — 48. Model governance

**Verdikt:** CHANGE

Zdrojová sekce pracuje mimo jiné s formulací „Model je dependency.“. Směr je správný, ale současná formulace může vést ke dvěma různým implementacím. Doplnit jednoznačnou semantics a odpovídající verification requirement. Při zavádění do reálného projektu by měla být tato myšlenka ověřena nejméně dvěma use-casy nebo explicitně označena jako project-specific. To chrání Core před předčasným zobecněním.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.50 — 49. Human gate policy

**Verdikt:** MERGE

Zdrojová sekce pracuje mimo jiné s formulací „Human approval nemá být mechanicky před každým krokem.“. Sekce opakuje princip, který už existuje jinde. Sloučit s příbuznou kapitolou a udržet jediný normativní zdroj, jinak vznikne dokumentační drift. Z provozního pohledu je třeba vždy doplnit failure semantics: co se stane při timeoutu, duplicate delivery, restartu nebo chybné konfiguraci. Happy-path popis sám o sobě není dlouhodobý kontrakt.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.51 — 50. Static policy vs AI recommendation

**Verdikt:** KEEP

Zdrojová sekce pracuje mimo jiné s formulací „AI může říct:“. Myšlenka je v zásadě správná a není nutné ji měnit. Doporučuji pouze zkrátit text tak, aby tato část nezdvojovala jiné kapitoly a měla jasný normativní status. Oponentní kritérium je jednoduché: pokud se tato kapitola odstraní z Foundation Core, ztratí se nějaká vymahatelná bezpečnostní nebo interoperabilní vlastnost? Pokud ne, patří spíše do poznámek než do závazného jádra.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.52 — 51. External validation

**Verdikt:** KEEP/CLARIFY

Zdrojová sekce pracuje mimo jiné s formulací „Pro dokumentovou agendu je správný pattern:“. Obsah je užitečný, ale potřebuje přesnější hranici mezi kontraktem a implementačním doporučením. Zvlášť je třeba uvést, co je release-blocking a co je jen doporučený pattern. Doporučuji tuto část propojit s jedním konkrétním artefaktem nebo testem. Bez takového napojení hrozí, že bude při implementaci čtena jako doporučení, ale nebude existovat způsob, jak ověřit její dodržení.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.53 — 52. Confidence

**Verdikt:** MOVE

Zdrojová sekce pracuje mimo jiné s formulací „Confidence není pravda.“. Téma má hodnotu, ale není součástí minimální Foundation. Přesunout do PLATFORM-NOTES jako candidate/deferred, aby nezvyšovalo kognitivní náklad při běžném review. Z hlediska pětileté údržby je důležitější jedno stabilní místo pravdy než detailní text na více místech. Pokud stejná semantics existuje v kontraktu, acceptance criteria a threat kapitole, vzniká riziko, že se časem rozjedou.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.54 — 53. Per-tenant policy

**Verdikt:** CHANGE

Zdrojová sekce pracuje mimo jiné s formulací „Multi-tenant systém může mít stejný kód, ale rozdílná pravidla.“. Směr je správný, ale současná formulace může vést ke dvěma různým implementacím. Doplnit jednoznačnou semantics a odpovídající verification requirement. Při zavádění do reálného projektu by měla být tato myšlenka ověřena nejméně dvěma use-casy nebo explicitně označena jako project-specific. To chrání Core před předčasným zobecněním.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.55 — 54. On-prem single tenant vs cloud multi-tenant

**Verdikt:** MERGE

Zdrojová sekce pracuje mimo jiné s formulací „Multi-tenancy se neposuzuje jako povinná vlastnost všech projektů.“. Sekce opakuje princip, který už existuje jinde. Sloučit s příbuznou kapitolou a udržet jediný normativní zdroj, jinak vznikne dokumentační drift. Z provozního pohledu je třeba vždy doplnit failure semantics: co se stane při timeoutu, duplicate delivery, restartu nebo chybné konfiguraci. Happy-path popis sám o sobě není dlouhodobý kontrakt.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.56 — 55. Multi-tenant-ready vs multi-tenant-active

**Verdikt:** KEEP

Zdrojová sekce pracuje mimo jiné s formulací „Projekt může být:“. Myšlenka je v zásadě správná a není nutné ji měnit. Doporučuji pouze zkrátit text tak, aby tato část nezdvojovala jiné kapitoly a měla jasný normativní status. Oponentní kritérium je jednoduché: pokud se tato kapitola odstraní z Foundation Core, ztratí se nějaká vymahatelná bezpečnostní nebo interoperabilní vlastnost? Pokud ne, patří spíše do poznámek než do závazného jádra.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.57 — 56. Tenant lifecycle — DEFERRED

**Verdikt:** MOVE

Zdrojová sekce pracuje mimo jiné s formulací „Budoucí témata:“. Téma je legitimní budoucí rozšíření, ale nemá být součástí krátkého Foundation Core. Zachovat v poznámkách s triggerem, kdy se má znovu otevřít. Doporučuji tuto část propojit s jedním konkrétním artefaktem nebo testem. Bez takového napojení hrozí, že bude při implementaci čtena jako doporučení, ale nebude existovat způsob, jak ověřit její dodržení.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.58 — 57. Security isolation of executors

**Verdikt:** MOVE

Zdrojová sekce pracuje mimo jiné s formulací „Single-purpose executor musí ideálně mít:“. Téma má hodnotu, ale není součástí minimální Foundation. Přesunout do PLATFORM-NOTES jako candidate/deferred, aby nezvyšovalo kognitivní náklad při běžném review. Z hlediska pětileté údržby je důležitější jedno stabilní místo pravdy než detailní text na více místech. Pokud stejná semantics existuje v kontraktu, acceptance criteria a threat kapitole, vzniká riziko, že se časem rozjedou.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.59 — 58. Approval separation

**Verdikt:** CHANGE

Zdrojová sekce pracuje mimo jiné s formulací „U velmi citlivých operací může být vhodné:“. Směr je správný, ale současná formulace může vést ke dvěma různým implementacím. Doplnit jednoznačnou semantics a odpovídající verification requirement. Při zavádění do reálného projektu by měla být tato myšlenka ověřena nejméně dvěma use-casy nebo explicitně označena jako project-specific. To chrání Core před předčasným zobecněním.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.60 — 59. API design

**Verdikt:** MERGE

Zdrojová sekce pracuje mimo jiné s formulací „API kontrakty musí být:“. Sekce opakuje princip, který už existuje jinde. Sloučit s příbuznou kapitolou a udržet jediný normativní zdroj, jinak vznikne dokumentační drift. Z provozního pohledu je třeba vždy doplnit failure semantics: co se stane při timeoutu, duplicate delivery, restartu nebo chybné konfiguraci. Happy-path popis sám o sobě není dlouhodobý kontrakt.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.61 — 60. REST vs events

**Verdikt:** KEEP

Zdrojová sekce pracuje mimo jiné s formulací „REST je vhodný pro:“. Myšlenka je v zásadě správná a není nutné ji měnit. Doporučuji pouze zkrátit text tak, aby tato část nezdvojovala jiné kapitoly a měla jasný normativní status. Oponentní kritérium je jednoduché: pokud se tato kapitola odstraní z Foundation Core, ztratí se nějaká vymahatelná bezpečnostní nebo interoperabilní vlastnost? Pokud ne, patří spíše do poznámek než do závazného jádra.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.62 — 61. Event rule

**Verdikt:** KEEP/CLARIFY

Zdrojová sekce pracuje mimo jiné s formulací „Event popisuje, co se stalo.“. Obsah je užitečný, ale potřebuje přesnější hranici mezi kontraktem a implementačním doporučením. Zvlášť je třeba uvést, co je release-blocking a co je jen doporučený pattern. Doporučuji tuto část propojit s jedním konkrétním artefaktem nebo testem. Bez takového napojení hrozí, že bude při implementaci čtena jako doporučení, ale nebude existovat způsob, jak ověřit její dodržení.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.63 — 62. Core admission rule

**Verdikt:** KEEP

Zdrojová sekce pracuje mimo jiné s formulací „Mechanismus smí vstoupit do reusable Core jen pokud:“. Přesunout procesní pravidla mimo runtime invarianty. Dodat evidence checklist a owner. Z hlediska pětileté údržby je důležitější jedno stabilní místo pravdy než detailní text na více místech. Pokud stejná semantics existuje v kontraktu, acceptance criteria a threat kapitole, vzniká riziko, že se časem rozjedou.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.64 — 63. Core extraction process

**Verdikt:** KEEP

Zdrojová sekce pracuje mimo jiné s formulací „Správný postup:“. Jeden z nejdůležitějších procesních patternů. Musí předcházet implementaci Core. Při zavádění do reálného projektu by měla být tato myšlenka ověřena nejméně dvěma use-casy nebo explicitně označena jako project-specific. To chrání Core před předčasným zobecněním.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.65 — 64. Evidence matrix pro současné projekty

**Verdikt:** P0

Zdrojová sekce pracuje mimo jiné s formulací „Před první větší Core implementací vytvořit reálnou matici.“. Vyplnit skutečným kódem. Dokud je `verify`, další Core abstrahování je hypotéza. Z provozního pohledu je třeba vždy doplnit failure semantics: co se stane při timeoutu, duplicate delivery, restartu nebo chybné konfiguraci. Happy-path popis sám o sobě není dlouhodobý kontrakt.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.66 — 65. První platformové artefakty

**Verdikt:** KEEP

Zdrojová sekce pracuje mimo jiné s formulací „Ne pět velkých standardů.“. Správně malé minimum. Přidat Verification Contract jako třetí normativní artefakt. Oponentní kritérium je jednoduché: pokud se tato kapitola odstraní z Foundation Core, ztratí se nějaká vymahatelná bezpečnostní nebo interoperabilní vlastnost? Pokud ne, patří spíše do poznámek než do závazného jádra.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.67 — 66. Co se zatím NEMÁ stavět

**Verdikt:** KEEP

Zdrojová sekce pracuje mimo jiné s formulací „Dokud není potřeba doložená:“. Výborný anti-scope-creep seznam. Umístit velmi vysoko v FOUNDATION-core. Doporučuji tuto část propojit s jedním konkrétním artefaktem nebo testem. Bez takového napojení hrozí, že bude při implementaci čtena jako doporučení, ale nebude existovat způsob, jak ověřit její dodržení.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.68 — 67. První kontrakt — návrh message envelope v1

**Verdikt:** CHANGE

Zdrojová sekce pracuje mimo jiné s formulací „{“. Doplnit deadline, context binding a idempotency retention policy reference. Z hlediska pětileté údržby je důležitější jedno stabilní místo pravdy než detailní text na více místech. Pokud stejná semantics existuje v kontraktu, acceptance criteria a threat kapitole, vzniká riziko, že se časem rozjedou.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.69 — 68. Result envelope v1

**Verdikt:** KEEP/EXPAND

Zdrojová sekce pracuje mimo jiné s formulací „Success:“. Doplnit unknown/reconciliation reference a stabilní error semantics. Při zavádění do reálného projektu by měla být tato myšlenka ověřena nejméně dvěma use-casy nebo explicitně označena jako project-specific. To chrání Core před předčasným zobecněním.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.70 — 69. Security decision chain pro write command

**Verdikt:** KEEP

Zdrojová sekce pracuje mimo jiné s formulací „AI/Module proposes command“. Silný a přehledný. Připojit test IDs ke každé bráně. Z provozního pohledu je třeba vždy doplnit failure semantics: co se stane při timeoutu, duplicate delivery, restartu nebo chybné konfiguraci. Happy-path popis sám o sobě není dlouhodobý kontrakt.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.71 — 70. Write executor contract example

**Verdikt:** CHANGE

Zdrojová sekce pracuje mimo jiné s formulací „executor: PaymentExecuteExecutor“. Oddělit logical executor, security principal a deployment unit, jinak hrozí exploze služeb. Oponentní kritérium je jednoduché: pokud se tato kapitola odstraní z Foundation Core, ztratí se nějaká vymahatelná bezpečnostní nebo interoperabilní vlastnost? Pokud ne, patří spíše do poznámek než do závazného jádra.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.72 — 71. Security failure philosophy

**Verdikt:** KEEP/CLARIFY

Zdrojová sekce pracuje mimo jiné s formulací „Security ambiguity:“. Obsah je užitečný, ale potřebuje přesnější hranici mezi kontraktem a implementačním doporučením. Zvlášť je třeba uvést, co je release-blocking a co je jen doporučený pattern. Doporučuji tuto část propojit s jedním konkrétním artefaktem nebo testem. Bez takového napojení hrozí, že bude při implementaci čtena jako doporučení, ale nebude existovat způsob, jak ověřit její dodržení.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.73 — 72. Resilience philosophy

**Verdikt:** MOVE

Zdrojová sekce pracuje mimo jiné s formulací „Robustnost neznamená „nikdy nespadne“.“. Téma má hodnotu, ale není součástí minimální Foundation. Přesunout do PLATFORM-NOTES jako candidate/deferred, aby nezvyšovalo kognitivní náklad při běžném review. Z hlediska pětileté údržby je důležitější jedno stabilní místo pravdy než detailní text na více místech. Pokud stejná semantics existuje v kontraktu, acceptance criteria a threat kapitole, vzniká riziko, že se časem rozjedou.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.74 — 73. Long-running operation

**Verdikt:** CHANGE

Zdrojová sekce pracuje mimo jiné s formulací „Pro činnosti trvající sekundy až hodiny:“. Směr je správný, ale současná formulace může vést ke dvěma různým implementacím. Doplnit jednoznačnou semantics a odpovídající verification requirement. Při zavádění do reálného projektu by měla být tato myšlenka ověřena nejméně dvěma use-casy nebo explicitně označena jako project-specific. To chrání Core před předčasným zobecněním.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.75 — 74. Scheduling

**Verdikt:** MERGE

Zdrojová sekce pracuje mimo jiné s formulací „Scheduler je samostatná odpovědnost.“. Sekce opakuje princip, který už existuje jinde. Sloučit s příbuznou kapitolou a udržet jediný normativní zdroj, jinak vznikne dokumentační drift. Z provozního pohledu je třeba vždy doplnit failure semantics: co se stane při timeoutu, duplicate delivery, restartu nebo chybné konfiguraci. Happy-path popis sám o sobě není dlouhodobý kontrakt.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.76 — 75. Cancellation

**Verdikt:** KEEP

Zdrojová sekce pracuje mimo jiné s formulací „Workflow a long-running step musí definovat:“. Myšlenka je v zásadě správná a není nutné ji měnit. Doporučuji pouze zkrátit text tak, aby tato část nezdvojovala jiné kapitoly a měla jasný normativní status. Oponentní kritérium je jednoduché: pokud se tato kapitola odstraní z Foundation Core, ztratí se nějaká vymahatelná bezpečnostní nebo interoperabilní vlastnost? Pokud ne, patří spíše do poznámek než do závazného jádra.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.77 — 76. Timeout

**Verdikt:** KEEP/CLARIFY

Zdrojová sekce pracuje mimo jiné s formulací „Timeout neznamená automaticky failure business operace.“. Obsah je užitečný, ale potřebuje přesnější hranici mezi kontraktem a implementačním doporučením. Zvlášť je třeba uvést, co je release-blocking a co je jen doporučený pattern. Doporučuji tuto část propojit s jedním konkrétním artefaktem nebo testem. Bez takového napojení hrozí, že bude při implementaci čtena jako doporučení, ale nebude existovat způsob, jak ověřit její dodržení.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.78 — 77. Reconciliation

**Verdikt:** MOVE

Zdrojová sekce pracuje mimo jiné s formulací „U systémů s externími zápisy je často důležitější reconciliation než retry.“. Téma má hodnotu, ale není součástí minimální Foundation. Přesunout do PLATFORM-NOTES jako candidate/deferred, aby nezvyšovalo kognitivní náklad při běžném review. Z hlediska pětileté údržby je důležitější jedno stabilní místo pravdy než detailní text na více místech. Pokud stejná semantics existuje v kontraktu, acceptance criteria a threat kapitole, vzniká riziko, že se časem rozjedou.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.79 — 78. Duplicate detection

**Verdikt:** CHANGE

Zdrojová sekce pracuje mimo jiné s formulací „Idempotency key je technický nástroj.“. Směr je správný, ale současná formulace může vést ke dvěma různým implementacím. Doplnit jednoznačnou semantics a odpovídající verification requirement. Při zavádění do reálného projektu by měla být tato myšlenka ověřena nejméně dvěma use-casy nebo explicitně označena jako project-specific. To chrání Core před předčasným zobecněním.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.80 — 79. AI output validation

**Verdikt:** MERGE

Zdrojová sekce pracuje mimo jiné s formulací „LLM output:“. Sekce opakuje princip, který už existuje jinde. Sloučit s příbuznou kapitolou a udržet jediný normativní zdroj, jinak vznikne dokumentační drift. Z provozního pohledu je třeba vždy doplnit failure semantics: co se stane při timeoutu, duplicate delivery, restartu nebo chybné konfiguraci. Happy-path popis sám o sobě není dlouhodobý kontrakt.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.81 — 80. Tool/capability allowlisting

**Verdikt:** KEEP

Zdrojová sekce pracuje mimo jiné s formulací „Agent má explicitní seznam capabilities, které smí navrhovat/callovat.“. Myšlenka je v zásadě správná a není nutné ji měnit. Doporučuji pouze zkrátit text tak, aby tato část nezdvojovala jiné kapitoly a měla jasný normativní status. Oponentní kritérium je jednoduché: pokud se tato kapitola odstraní z Foundation Core, ztratí se nějaká vymahatelná bezpečnostní nebo interoperabilní vlastnost? Pokud ne, patří spíše do poznámek než do závazného jádra.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.82 — 81. Prompt/version as code

**Verdikt:** KEEP/CLARIFY

Zdrojová sekce pracuje mimo jiné s formulací „Prompts a templates, které ovlivňují rozhodování, mají:“. Obsah je užitečný, ale potřebuje přesnější hranici mezi kontraktem a implementačním doporučením. Zvlášť je třeba uvést, co je release-blocking a co je jen doporučený pattern. Doporučuji tuto část propojit s jedním konkrétním artefaktem nebo testem. Bez takového napojení hrozí, že bude při implementaci čtena jako doporučení, ale nebude existovat způsob, jak ověřit její dodržení.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.83 — 82. Test taxonomy

**Verdikt:** REWRITE

Zdrojová sekce pracuje mimo jiné s formulací „## 82.1 Unit tests“. Současná nejslabší část. Nahradit Verification Contractem s Threat→Test→Gate→Evidence. Z hlediska pětileté údržby je důležitější jedno stabilní místo pravdy než detailní text na více místech. Pokud stejná semantics existuje v kontraktu, acceptance criteria a threat kapitole, vzniká riziko, že se časem rozjedou.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.84 — 83. Release gates

**Verdikt:** REWRITE

Zdrojová sekce pracuje mimo jiné s formulací „Minimální candidate CI gates:“. Definovat, co je security invariant test, kdo ho vlastní a co přesně blokuje. Contract tests pro Core musí být blocking. Při zavádění do reálného projektu by měla být tato myšlenka ověřena nejméně dvěma use-casy nebo explicitně označena jako project-specific. To chrání Core před předčasným zobecněním.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.85 — 84. Supply chain — CANDIDATE

**Verdikt:** MERGE

Zdrojová sekce pracuje mimo jiné s formulací „Budoucí robustní release může používat:“. Sekce opakuje princip, který už existuje jinde. Sloučit s příbuznou kapitolou a udržet jediný normativní zdroj, jinak vznikne dokumentační drift. Z provozního pohledu je třeba vždy doplnit failure semantics: co se stane při timeoutu, duplicate delivery, restartu nebo chybné konfiguraci. Happy-path popis sám o sobě není dlouhodobý kontrakt.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.86 — 85. Deployment waves — DEFERRED

**Verdikt:** MOVE

Zdrojová sekce pracuje mimo jiné s formulací „Canary/pilot je dobrý pattern.“. Téma je legitimní budoucí rozšíření, ale nemá být součástí krátkého Foundation Core. Zachovat v poznámkách s triggerem, kdy se má znovu otevřít. Oponentní kritérium je jednoduché: pokud se tato kapitola odstraní z Foundation Core, ztratí se nějaká vymahatelná bezpečnostní nebo interoperabilní vlastnost? Pokud ne, patří spíše do poznámek než do závazného jádra.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.87 — 86. RPO/RTO — DEFERRED pro společný Core

**Verdikt:** MOVE

Zdrojová sekce pracuje mimo jiné s formulací „Každá produkční implementace má řešit:“. Téma je legitimní budoucí rozšíření, ale nemá být součástí krátkého Foundation Core. Zachovat v poznámkách s triggerem, kdy se má znovu otevřít. Doporučuji tuto část propojit s jedním konkrétním artefaktem nebo testem. Bez takového napojení hrozí, že bude při implementaci čtena jako doporučení, ale nebude existovat způsob, jak ověřit její dodržení.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.88 — 87. Data growth

**Verdikt:** MOVE

Zdrojová sekce pracuje mimo jiné s formulací „Pětiletý systém pro více zákazníků nesmí předpokládat konstantní objem.“. Téma má hodnotu, ale není součástí minimální Foundation. Přesunout do PLATFORM-NOTES jako candidate/deferred, aby nezvyšovalo kognitivní náklad při běžném review. Z hlediska pětileté údržby je důležitější jedno stabilní místo pravdy než detailní text na více místech. Pokud stejná semantics existuje v kontraktu, acceptance criteria a threat kapitole, vzniká riziko, že se časem rozjedou.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.89 — 88. Hot / warm / archive — CANDIDATE

**Verdikt:** CHANGE

Zdrojová sekce pracuje mimo jiné s formulací „Možný dlouhodobý model:“. Směr je správný, ale současná formulace může vést ke dvěma různým implementacím. Doplnit jednoznačnou semantics a odpovídající verification requirement. Při zavádění do reálného projektu by měla být tato myšlenka ověřena nejméně dvěma use-casy nebo explicitně označena jako project-specific. To chrání Core před předčasným zobecněním.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.90 — 89. Tenant data deletion

**Verdikt:** MERGE

Zdrojová sekce pracuje mimo jiné s formulací „U multi-tenant cloud projektu musí design před nasazením umět odpovědět:“. Sekce opakuje princip, který už existuje jinde. Sloučit s příbuznou kapitolou a udržet jediný normativní zdroj, jinak vznikne dokumentační drift. Z provozního pohledu je třeba vždy doplnit failure semantics: co se stane při timeoutu, duplicate delivery, restartu nebo chybné konfiguraci. Happy-path popis sám o sobě není dlouhodobý kontrakt.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.91 — 90. Privacy of AI traces

**Verdikt:** KEEP

Zdrojová sekce pracuje mimo jiné s formulací „Zakázaný anti-pattern:“. Myšlenka je v zásadě správná a není nutné ji měnit. Doporučuji pouze zkrátit text tak, aby tato část nezdvojovala jiné kapitoly a měla jasný normativní status. Oponentní kritérium je jednoduché: pokud se tato kapitola odstraní z Foundation Core, ztratí se nějaká vymahatelná bezpečnostní nebo interoperabilní vlastnost? Pokud ne, patří spíše do poznámek než do závazného jádra.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.92 — 91. Operational dashboard — CANDIDATE

**Verdikt:** KEEP/CLARIFY

Zdrojová sekce pracuje mimo jiné s formulací „Pokud bude více components/tenants, časem bude užitečné centrálně zobrazit:“. Obsah je užitečný, ale potřebuje přesnější hranici mezi kontraktem a implementačním doporučením. Zvlášť je třeba uvést, co je release-blocking a co je jen doporučený pattern. Doporučuji tuto část propojit s jedním konkrétním artefaktem nebo testem. Bez takového napojení hrozí, že bude při implementaci čtena jako doporučení, ale nebude existovat způsob, jak ověřit její dodržení.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.93 — 92. No hidden ownership

**Verdikt:** MOVE

Zdrojová sekce pracuje mimo jiné s formulací „Každý reusable package musí mít:“. Téma má hodnotu, ale není součástí minimální Foundation. Přesunout do PLATFORM-NOTES jako candidate/deferred, aby nezvyšovalo kognitivní náklad při běžném review. Z hlediska pětileté údržby je důležitější jedno stabilní místo pravdy než detailní text na více místech. Pokud stejná semantics existuje v kontraktu, acceptance criteria a threat kapitole, vzniká riziko, že se časem rozjedou.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.94 — 93. Repository boundary

**Verdikt:** CHANGE

Zdrojová sekce pracuje mimo jiné s formulací „Budoucí Core má být vlastnicky a technicky neutrální.“. Směr je správný, ale současná formulace může vést ke dvěma různým implementacím. Doplnit jednoznačnou semantics a odpovídající verification requirement. Při zavádění do reálného projektu by měla být tato myšlenka ověřena nejméně dvěma use-casy nebo explicitně označena jako project-specific. To chrání Core před předčasným zobecněním.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.95 — 94. Documentation strategy

**Verdikt:** MERGE

Zdrojová sekce pracuje mimo jiné s formulací „`ai-agenti` má zůstat hlavní metodikou.“. Sekce opakuje princip, který už existuje jinde. Sloučit s příbuznou kapitolou a udržet jediný normativní zdroj, jinak vznikne dokumentační drift. Z provozního pohledu je třeba vždy doplnit failure semantics: co se stane při timeoutu, duplicate delivery, restartu nebo chybné konfiguraci. Happy-path popis sám o sobě není dlouhodobý kontrakt.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.96 — 95. Definition of reusable LEGO brick

**Verdikt:** KEEP

Zdrojová sekce pracuje mimo jiné s formulací „Kostka je reusable, pokud:“. Myšlenka je v zásadě správná a není nutné ji měnit. Doporučuji pouze zkrátit text tak, aby tato část nezdvojovala jiné kapitoly a měla jasný normativní status. Oponentní kritérium je jednoduché: pokud se tato kapitola odstraní z Foundation Core, ztratí se nějaká vymahatelná bezpečnostní nebo interoperabilní vlastnost? Pokud ne, patří spíše do poznámek než do závazného jádra.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.97 — 96. Anti-pattern: distributed monolith

**Verdikt:** MOVE/MERGE

Zdrojová sekce pracuje mimo jiné s formulací „Systém může mít deset services a přesto nebýt modulární.“. Obsah je hodnotný jako review checklist, ale v této podobě výrazně nafukuje normativní dokument. Přesunout do Verification/Notes a propojit s konkrétními testy nebo pravidly. Doporučuji tuto část propojit s jedním konkrétním artefaktem nebo testem. Bez takového napojení hrozí, že bude při implementaci čtena jako doporučení, ale nebude existovat způsob, jak ověřit její dodržení.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.98 — 97. Anti-pattern: universal JSON blob without contract

**Verdikt:** MOVE/MERGE

Zdrojová sekce pracuje mimo jiné s formulací „Pouhé:“. Obsah je hodnotný jako review checklist, ale v této podobě výrazně nafukuje normativní dokument. Přesunout do Verification/Notes a propojit s konkrétními testy nebo pravidly. Z hlediska pětileté údržby je důležitější jedno stabilní místo pravdy než detailní text na více místech. Pokud stejná semantics existuje v kontraktu, acceptance criteria a threat kapitole, vzniká riziko, že se časem rozjedou.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.99 — 98. Anti-pattern: AI as authorization

**Verdikt:** MOVE/MERGE

Zdrojová sekce pracuje mimo jiné s formulací „Zakázáno:“. Obsah je hodnotný jako review checklist, ale v této podobě výrazně nafukuje normativní dokument. Přesunout do Verification/Notes a propojit s konkrétními testy nebo pravidly. Při zavádění do reálného projektu by měla být tato myšlenka ověřena nejméně dvěma use-casy nebo explicitně označena jako project-specific. To chrání Core před předčasným zobecněním.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.100 — 99. Anti-pattern: prompt as tenant boundary

**Verdikt:** MOVE/MERGE

Zdrojová sekce pracuje mimo jiné s formulací „Zakázáno:“. Obsah je hodnotný jako review checklist, ale v této podobě výrazně nafukuje normativní dokument. Přesunout do Verification/Notes a propojit s konkrétními testy nebo pravidly. Z provozního pohledu je třeba vždy doplnit failure semantics: co se stane při timeoutu, duplicate delivery, restartu nebo chybné konfiguraci. Happy-path popis sám o sobě není dlouhodobý kontrakt.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.101 — 100. Anti-pattern: one global API token

**Verdikt:** MOVE/MERGE

Zdrojová sekce pracuje mimo jiné s formulací „Jeden dlouhodobý key pro:“. Obsah je hodnotný jako review checklist, ale v této podobě výrazně nafukuje normativní dokument. Přesunout do Verification/Notes a propojit s konkrétními testy nebo pravidly. Oponentní kritérium je jednoduché: pokud se tato kapitola odstraní z Foundation Core, ztratí se nějaká vymahatelná bezpečnostní nebo interoperabilní vlastnost? Pokud ne, patří spíše do poznámek než do závazného jádra.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.102 — 101. Anti-pattern: AI directly marks document as legally approved

**Verdikt:** MOVE/MERGE

Zdrojová sekce pracuje mimo jiné s formulací „AI může navrhnout classification:“. Obsah je hodnotný jako review checklist, ale v této podobě výrazně nafukuje normativní dokument. Přesunout do Verification/Notes a propojit s konkrétními testy nebo pravidly. Doporučuji tuto část propojit s jedním konkrétním artefaktem nebo testem. Bez takového napojení hrozí, že bude při implementaci čtena jako doporučení, ale nebude existovat způsob, jak ověřit její dodržení.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.103 — 102. Anti-pattern: endless retry

**Verdikt:** MOVE/MERGE

Zdrojová sekce pracuje mimo jiné s formulací „Retry vždy potřebuje:“. Obsah je hodnotný jako review checklist, ale v této podobě výrazně nafukuje normativní dokument. Přesunout do Verification/Notes a propojit s konkrétními testy nebo pravidly. Z hlediska pětileté údržby je důležitější jedno stabilní místo pravdy než detailní text na více místech. Pokud stejná semantics existuje v kontraktu, acceptance criteria a threat kapitole, vzniká riziko, že se časem rozjedou.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.104 — 103. Anti-pattern: success on HTTP 200 only

**Verdikt:** MOVE/MERGE

Zdrojová sekce pracuje mimo jiné s formulací „Transport success není business success.“. Obsah je hodnotný jako review checklist, ale v této podobě výrazně nafukuje normativní dokument. Přesunout do Verification/Notes a propojit s konkrétními testy nebo pravidly. Při zavádění do reálného projektu by měla být tato myšlenka ověřena nejméně dvěma use-casy nebo explicitně označena jako project-specific. To chrání Core před předčasným zobecněním.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.105 — 104. Anti-pattern: shared DB as integration bus

**Verdikt:** MOVE/MERGE

Zdrojová sekce pracuje mimo jiné s formulací „SQL database není náhrada module contractu.“. Obsah je hodnotný jako review checklist, ale v této podobě výrazně nafukuje normativní dokument. Přesunout do Verification/Notes a propojit s konkrétními testy nebo pravidly. Z provozního pohledu je třeba vždy doplnit failure semantics: co se stane při timeoutu, duplicate delivery, restartu nebo chybné konfiguraci. Happy-path popis sám o sobě není dlouhodobý kontrakt.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.106 — 105. Practical evolution roadmap

**Verdikt:** KEEP/SHORTEN

Zdrojová sekce pracuje mimo jiné s formulací „## Phase 0 — Freeze invariants“. Phase 5 se nemá provést jednou; její failure scénáře se mají stát permanentní CI suite. Oponentní kritérium je jednoduché: pokud se tato kapitola odstraní z Foundation Core, ztratí se nějaká vymahatelná bezpečnostní nebo interoperabilní vlastnost? Pokud ne, patří spíše do poznámek než do závazného jádra.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.107 — 106. Minimální acceptance criteria pro první společný contract

**Verdikt:** MERGE INTO VERIFICATION

Zdrojová sekce pracuje mimo jiné s formulací „První prototype platformového contractu stačí považovat za úspěšný, pokud:“. Obsah má být součástí jednoho Verification Contractu. Izolovaná akceptační kritéria bez Test ID, fixture a CI gate jsou obtížně vymahatelná. Doporučuji tuto část propojit s jedním konkrétním artefaktem nebo testem. Bez takového napojení hrozí, že bude při implementaci čtena jako doporučení, ale nebude existovat způsob, jak ověřit její dodržení.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.108 — 107. Acceptance criteria pro single-purpose executor

**Verdikt:** MOVE/MERGE

Zdrojová sekce pracuje mimo jiné s formulací „Executor je přijatelný, pokud:“. Obsah je dobrý, sloučit do Verification Contractu místo duplicitní pozdní sekce. Z hlediska pětileté údržby je důležitější jedno stabilní místo pravdy než detailní text na více místech. Pokud stejná semantics existuje v kontraktu, acceptance criteria a threat kapitole, vzniká riziko, že se časem rozjedou.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.109 — 108. Acceptance criteria pro AI agent

**Verdikt:** MOVE/MERGE

Zdrojová sekce pracuje mimo jiné s formulací „AI Agent je přijatelný, pokud:“. Sloučit s SEC a AI-EVAL test families. Při zavádění do reálného projektu by měla být tato myšlenka ověřena nejméně dvěma use-casy nebo explicitně označena jako project-specific. To chrání Core před předčasným zobecněním.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.110 — 109. Acceptance criteria pro multi-tenant modul

**Verdikt:** MOVE/MERGE

Zdrojová sekce pracuje mimo jiné s formulací „Pokud modul tvrdí `MULTI_TENANT_ACTIVE`:“. Sloučit s TEN verification profile. Z provozního pohledu je třeba vždy doplnit failure semantics: co se stane při timeoutu, duplicate delivery, restartu nebo chybné konfiguraci. Happy-path popis sám o sobě není dlouhodobý kontrakt.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.111 — 110. Acceptance criteria pro document-processing workflow

**Verdikt:** MOVE/MERGE

Sloučit s workflow/evidence test profile. Oponentní kritérium je jednoduché: pokud se tato kapitola odstraní z Foundation Core, ztratí se nějaká vymahatelná bezpečnostní nebo interoperabilní vlastnost? Pokud ne, patří spíše do poznámek než do závazného jádra.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.112 — 111. První implementační preference

**Verdikt:** KEEP/CLARIFY

Zdrojová sekce pracuje mimo jiné s formulací „Foundation v0.2 vědomě **nevybírá**:“. Obsah je užitečný, ale potřebuje přesnější hranici mezi kontraktem a implementačním doporučením. Zvlášť je třeba uvést, co je release-blocking a co je jen doporučený pattern. Doporučuji tuto část propojit s jedním konkrétním artefaktem nebo testem. Bez takového napojení hrozí, že bude při implementaci čtena jako doporučení, ale nebude existovat způsob, jak ověřit její dodržení.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.113 — 112. Jak zabránit framework addiction

**Verdikt:** MOVE

Zdrojová sekce pracuje mimo jiné s formulací „Každá nová abstrakce musí odpovědět:“. Téma má hodnotu, ale není součástí minimální Foundation. Přesunout do PLATFORM-NOTES jako candidate/deferred, aby nezvyšovalo kognitivní náklad při běžném review. Z hlediska pětileté údržby je důležitější jedno stabilní místo pravdy než detailní text na více místech. Pokud stejná semantics existuje v kontraktu, acceptance criteria a threat kapitole, vzniká riziko, že se časem rozjedou.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.114 — 113. Jak zabránit Core stagnaci

**Verdikt:** CHANGE

Zdrojová sekce pracuje mimo jiné s formulací „Core musí být:“. Směr je správný, ale současná formulace může vést ke dvěma různým implementacím. Doplnit jednoznačnou semantics a odpovídající verification requirement. Při zavádění do reálného projektu by měla být tato myšlenka ověřena nejméně dvěma use-casy nebo explicitně označena jako project-specific. To chrání Core před předčasným zobecněním.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.115 — 114. Jak zabránit compatibility explosion

**Verdikt:** MERGE

Zdrojová sekce pracuje mimo jiné s formulací „Neudržovat libovolně všechny historické verze navždy.“. Sekce opakuje princip, který už existuje jinde. Sloučit s příbuznou kapitolou a udržet jediný normativní zdroj, jinak vznikne dokumentační drift. Z provozního pohledu je třeba vždy doplnit failure semantics: co se stane při timeoutu, duplicate delivery, restartu nebo chybné konfiguraci. Happy-path popis sám o sobě není dlouhodobý kontrakt.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.116 — 115. Contract tests jako ochrana LEGO rozhraní

**Verdikt:** REWRITE

Zdrojová sekce pracuje mimo jiné s formulací „Pokud modul tvrdí:“. Definovat executable provider conformance suite dodávanou s contractem + consumer-driven compatibility tests. Oponentní kritérium je jednoduché: pokud se tato kapitola odstraní z Foundation Core, ztratí se nějaká vymahatelná bezpečnostní nebo interoperabilní vlastnost? Pokud ne, patří spíše do poznámek než do závazného jádra.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.117 — 116. Schema registry — CANDIDATE

**Verdikt:** MOVE

Zdrojová sekce pracuje mimo jiné s formulací „Pokud počet capabilities naroste, může vzniknout registry:“. Téma je legitimní budoucí rozšíření, ale nemá být součástí krátkého Foundation Core. Zachovat v poznámkách s triggerem, kdy se má znovu otevřít. Doporučuji tuto část propojit s jedním konkrétním artefaktem nebo testem. Bez takového napojení hrozí, že bude při implementaci čtena jako doporučení, ale nebude existovat způsob, jak ověřit její dodržení.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.118 — 117. Component registry — CANDIDATE

**Verdikt:** MOVE

Zdrojová sekce pracuje mimo jiné s formulací „Pokud bude více runtime instances:“. Téma je legitimní budoucí rozšíření, ale nemá být součástí krátkého Foundation Core. Zachovat v poznámkách s triggerem, kdy se má znovu otevřít. Z hlediska pětileté údržby je důležitější jedno stabilní místo pravdy než detailní text na více místech. Pokud stejná semantics existuje v kontraktu, acceptance criteria a threat kapitole, vzniká riziko, že se časem rozjedou.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.119 — 118. Workflow registry — CANDIDATE

**Verdikt:** MOVE

Zdrojová sekce pracuje mimo jiné s formulací „Pokud se workflow budou sdílet, může vzniknout versioned repository definitions.“. Téma je legitimní budoucí rozšíření, ale nemá být součástí krátkého Foundation Core. Zachovat v poznámkách s triggerem, kdy se má znovu otevřít. Při zavádění do reálného projektu by měla být tato myšlenka ověřena nejméně dvěma use-casy nebo explicitně označena jako project-specific. To chrání Core před předčasným zobecněním.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.120 — 119. Audit integrity — CANDIDATE

**Verdikt:** MERGE

Zdrojová sekce pracuje mimo jiné s formulací „U vyšších požadavků může audit používat:“. Sekce opakuje princip, který už existuje jinde. Sloučit s příbuznou kapitolou a udržet jediný normativní zdroj, jinak vznikne dokumentační drift. Z provozního pohledu je třeba vždy doplnit failure semantics: co se stane při timeoutu, duplicate delivery, restartu nebo chybné konfiguraci. Happy-path popis sám o sobě není dlouhodobý kontrakt.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.121 — 120. Compliance evidence package — CANDIDATE

**Verdikt:** KEEP

Zdrojová sekce pracuje mimo jiné s formulací „Pro audit může časem existovat export:“. Myšlenka je v zásadě správná a není nutné ji měnit. Doporučuji pouze zkrátit text tak, aby tato část nezdvojovala jiné kapitoly a měla jasný normativní status. Oponentní kritérium je jednoduché: pokud se tato kapitola odstraní z Foundation Core, ztratí se nějaká vymahatelná bezpečnostní nebo interoperabilní vlastnost? Pokud ne, patří spíše do poznámek než do závazného jádra.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.122 — 121. Observability contract — CANDIDATE

**Verdikt:** KEEP/CLARIFY

Zdrojová sekce pracuje mimo jiné s formulací „Možný společný contract:“. Obsah je užitečný, ale potřebuje přesnější hranici mezi kontraktem a implementačním doporučením. Zvlášť je třeba uvést, co je release-blocking a co je jen doporučený pattern. Doporučuji tuto část propojit s jedním konkrétním artefaktem nebo testem. Bez takového napojení hrozí, že bude při implementaci čtena jako doporučení, ale nebude existovat způsob, jak ověřit její dodržení.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.123 — 122. Security threat model minimum

**Verdikt:** KEEP

Zdrojová sekce pracuje mimo jiné s formulací „Každý nový agent/project návrh má přinejmenším uvést:“. Doplnit povinný Test ID nebo explicitní manual evidence pro každý threat. Z hlediska pětileté údržby je důležitější jedno stabilní místo pravdy než detailní text na více místech. Pokud stejná semantics existuje v kontraktu, acceptance criteria a threat kapitole, vzniká riziko, že se časem rozjedou.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.124 — 123. Threat: prompt injection

**Verdikt:** MOVE/MERGE

Zdrojová sekce pracuje mimo jiné s formulací „Mitigace:“. Obsah je hodnotný jako review checklist, ale v této podobě výrazně nafukuje normativní dokument. Přesunout do Verification/Notes a propojit s konkrétními testy nebo pravidly. Při zavádění do reálného projektu by měla být tato myšlenka ověřena nejméně dvěma use-casy nebo explicitně označena jako project-specific. To chrání Core před předčasným zobecněním.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.125 — 124. Threat: tool injection

**Verdikt:** MOVE/MERGE

Zdrojová sekce pracuje mimo jiné s formulací „Tool description nebo externí tool response není vyšší autorita než platform policy.“. Obsah je hodnotný jako review checklist, ale v této podobě výrazně nafukuje normativní dokument. Přesunout do Verification/Notes a propojit s konkrétními testy nebo pravidly. Z provozního pohledu je třeba vždy doplnit failure semantics: co se stane při timeoutu, duplicate delivery, restartu nebo chybné konfiguraci. Happy-path popis sám o sobě není dlouhodobý kontrakt.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.126 — 125. Threat: confused deputy

**Verdikt:** MOVE/MERGE

Zdrojová sekce pracuje mimo jiné s formulací „Executor musí kontrolovat:“. Obsah je hodnotný jako review checklist, ale v této podobě výrazně nafukuje normativní dokument. Přesunout do Verification/Notes a propojit s konkrétními testy nebo pravidly. Oponentní kritérium je jednoduché: pokud se tato kapitola odstraní z Foundation Core, ztratí se nějaká vymahatelná bezpečnostní nebo interoperabilní vlastnost? Pokud ne, patří spíše do poznámek než do závazného jádra.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.127 — 126. Threat: cross-tenant cache leak

**Verdikt:** MOVE/MERGE

Zdrojová sekce pracuje mimo jiné s formulací „Cache key v multi-tenant systému musí obsahovat tenant boundary tam, kde data nejsou globální.“. Obsah je hodnotný jako review checklist, ale v této podobě výrazně nafukuje normativní dokument. Přesunout do Verification/Notes a propojit s konkrétními testy nebo pravidly. Doporučuji tuto část propojit s jedním konkrétním artefaktem nebo testem. Bez takového napojení hrozí, že bude při implementaci čtena jako doporučení, ale nebude existovat způsob, jak ověřit její dodržení.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.128 — 127. Threat: queue cross-tenant leak

**Verdikt:** MOVE/MERGE

Zdrojová sekce pracuje mimo jiné s formulací „Message processing context musí zachovat tenant scope po celý async chain.“. Obsah je hodnotný jako review checklist, ale v této podobě výrazně nafukuje normativní dokument. Přesunout do Verification/Notes a propojit s konkrétními testy nebo pravidly. Z hlediska pětileté údržby je důležitější jedno stabilní místo pravdy než detailní text na více místech. Pokud stejná semantics existuje v kontraktu, acceptance criteria a threat kapitole, vzniká riziko, že se časem rozjedou.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.129 — 128. Threat: log data leakage

**Verdikt:** MOVE/MERGE

Zdrojová sekce pracuje mimo jiné s formulací „Log aggregation nesmí odstranit tenant/access control tak, že support user uvidí obsah všech zákazníků bez odpovídající role.“. Obsah je hodnotný jako review checklist, ale v této podobě výrazně nafukuje normativní dokument. Přesunout do Verification/Notes a propojit s konkrétními testy nebo pravidly. Při zavádění do reálného projektu by měla být tato myšlenka ověřena nejméně dvěma use-casy nebo explicitně označena jako project-specific. To chrání Core před předčasným zobecněním.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.130 — 129. Threat: stale credentials

**Verdikt:** MOVE/MERGE

Zdrojová sekce pracuje mimo jiné s formulací „Credentials mají být revocable/rotatable.“. Obsah je hodnotný jako review checklist, ale v této podobě výrazně nafukuje normativní dokument. Přesunout do Verification/Notes a propojit s konkrétními testy nebo pravidly. Z provozního pohledu je třeba vždy doplnit failure semantics: co se stane při timeoutu, duplicate delivery, restartu nebo chybné konfiguraci. Happy-path popis sám o sobě není dlouhodobý kontrakt.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.131 — 130. Threat: version downgrade

**Verdikt:** MOVE/MERGE

Zdrojová sekce pracuje mimo jiné s formulací „Pokud stará capability verze obsahuje security weakness, router/policy musí umět její použití zakázat.“. Obsah je hodnotný jako review checklist, ale v této podobě výrazně nafukuje normativní dokument. Přesunout do Verification/Notes a propojit s konkrétními testy nebo pravidly. Oponentní kritérium je jednoduché: pokud se tato kapitola odstraní z Foundation Core, ztratí se nějaká vymahatelná bezpečnostní nebo interoperabilní vlastnost? Pokud ne, patří spíše do poznámek než do závazného jádra.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.132 — 131. Threat: replay

**Verdikt:** MOVE/MERGE

Zdrojová sekce pracuje mimo jiné s formulací „State-changing commands mají mít:“. Obsah je hodnotný jako review checklist, ale v této podobě výrazně nafukuje normativní dokument. Přesunout do Verification/Notes a propojit s konkrétními testy nebo pravidly. Doporučuji tuto část propojit s jedním konkrétním artefaktem nebo testem. Bez takového napojení hrozí, že bude při implementaci čtena jako doporučení, ale nebude existovat způsob, jak ověřit její dodržení.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.133 — 132. Threat: poisoned artifacts

**Verdikt:** MOVE/MERGE

Zdrojová sekce pracuje mimo jiné s formulací „Artifact má hash a provenance.“. Obsah je hodnotný jako review checklist, ale v této podobě výrazně nafukuje normativní dokument. Přesunout do Verification/Notes a propojit s konkrétními testy nebo pravidly. Z hlediska pětileté údržby je důležitější jedno stabilní místo pravdy než detailní text na více místech. Pokud stejná semantics existuje v kontraktu, acceptance criteria a threat kapitole, vzniká riziko, že se časem rozjedou.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.134 — 133. Threat: model drift

**Verdikt:** MOVE/MERGE

Zdrojová sekce pracuje mimo jiné s formulací „Změna modelu může změnit extraction/classification.“. Obsah je hodnotný jako review checklist, ale v této podobě výrazně nafukuje normativní dokument. Přesunout do Verification/Notes a propojit s konkrétními testy nebo pravidly. Při zavádění do reálného projektu by měla být tato myšlenka ověřena nejméně dvěma use-casy nebo explicitně označena jako project-specific. To chrání Core před předčasným zobecněním.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.135 — 134. Threat: human review abuse

**Verdikt:** MOVE/MERGE

Zdrojová sekce pracuje mimo jiné s formulací „Reviewer role musí být omezená.“. Obsah je hodnotný jako review checklist, ale v této podobě výrazně nafukuje normativní dokument. Přesunout do Verification/Notes a propojit s konkrétními testy nebo pravidly. Z provozního pohledu je třeba vždy doplnit failure semantics: co se stane při timeoutu, duplicate delivery, restartu nebo chybné konfiguraci. Happy-path popis sám o sobě není dlouhodobý kontrakt.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.136 — 135. Ownership and portability

**Verdikt:** KEEP

Zdrojová sekce pracuje mimo jiné s formulací „Platformové kontrakty musí být vhodné pro:“. Myšlenka je v zásadě správná a není nutné ji měnit. Doporučuji pouze zkrátit text tak, aby tato část nezdvojovala jiné kapitoly a měla jasný normativní status. Oponentní kritérium je jednoduché: pokud se tato kapitola odstraní z Foundation Core, ztratí se nějaká vymahatelná bezpečnostní nebo interoperabilní vlastnost? Pokud ne, patří spíše do poznámek než do závazného jádra.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.137 — 136. Vztah k USB Guardianu

**Verdikt:** KEEP/CLARIFY

Zdrojová sekce pracuje mimo jiné s formulací „USB Guardian se používá jako:“. Obsah je užitečný, ale potřebuje přesnější hranici mezi kontraktem a implementačním doporučením. Zvlášť je třeba uvést, co je release-blocking a co je jen doporučený pattern. Doporučuji tuto část propojit s jedním konkrétním artefaktem nebo testem. Bez takového napojení hrozí, že bude při implementaci čtena jako doporučení, ale nebude existovat způsob, jak ověřit její dodržení.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.138 — 137. Vztah k `ai-agenti`

**Verdikt:** MOVE

Zdrojová sekce pracuje mimo jiné s formulací „`ai-agenti` je metodický domov.“. Téma má hodnotu, ale není součástí minimální Foundation. Přesunout do PLATFORM-NOTES jako candidate/deferred, aby nezvyšovalo kognitivní náklad při běžném review. Z hlediska pětileté údržby je důležitější jedno stabilní místo pravdy než detailní text na více místech. Pokud stejná semantics existuje v kontraktu, acceptance criteria a threat kapitole, vzniká riziko, že se časem rozjedou.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.139 — 138. Doporučené změny `sablony/navrhovy-list.md`

**Verdikt:** CHANGE

Zdrojová sekce pracuje mimo jiné s formulací „Přidat jen chybějící pole:“. Směr je správný, ale současná formulace může vést ke dvěma různým implementacím. Doplnit jednoznačnou semantics a odpovídající verification requirement. Při zavádění do reálného projektu by měla být tato myšlenka ověřena nejméně dvěma use-casy nebo explicitně označena jako project-specific. To chrání Core před předčasným zobecněním.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.140 — 139. Doporučené změny BUILD-PŘEDPISU

**Verdikt:** MERGE

Zdrojová sekce pracuje mimo jiné s formulací „Přidat security gates:“. Sekce opakuje princip, který už existuje jinde. Sloučit s příbuznou kapitolou a udržet jediný normativní zdroj, jinak vznikne dokumentační drift. Z provozního pohledu je třeba vždy doplnit failure semantics: co se stane při timeoutu, duplicate delivery, restartu nebo chybné konfiguraci. Happy-path popis sám o sobě není dlouhodobý kontrakt.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.141 — 140. Architecture Decision Records — CANDIDATE

**Verdikt:** KEEP

Zdrojová sekce pracuje mimo jiné s formulací „Pro významná rozhodnutí může být časem užitečný jednoduchý ADR formát:“. Myšlenka je v zásadě správná a není nutné ji měnit. Doporučuji pouze zkrátit text tak, aby tato část nezdvojovala jiné kapitoly a měla jasný normativní status. Oponentní kritérium je jednoduché: pokud se tato kapitola odstraní z Foundation Core, ztratí se nějaká vymahatelná bezpečnostní nebo interoperabilní vlastnost? Pokud ne, patří spíše do poznámek než do závazného jádra.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.142 — 141. Design principle: explicit over clever

**Verdikt:** MOVE/MERGE

Zdrojová sekce pracuje mimo jiné s formulací „Robustní farmu mají tvořit hlavně nudné mechanismy.“. Obsah je hodnotný jako review checklist, ale v této podobě výrazně nafukuje normativní dokument. Přesunout do Verification/Notes a propojit s konkrétními testy nebo pravidly. Doporučuji tuto část propojit s jedním konkrétním artefaktem nebo testem. Bez takového napojení hrozí, že bude při implementaci čtena jako doporučení, ale nebude existovat způsob, jak ověřit její dodržení.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.143 — 142. Design principle: local autonomy, global contracts

**Verdikt:** MOVE/MERGE

Zdrojová sekce pracuje mimo jiné s formulací „Modul má vysokou svobodu uvnitř.“. Obsah je hodnotný jako review checklist, ale v této podobě výrazně nafukuje normativní dokument. Přesunout do Verification/Notes a propojit s konkrétními testy nebo pravidly. Z hlediska pětileté údržby je důležitější jedno stabilní místo pravdy než detailní text na více místech. Pokud stejná semantics existuje v kontraktu, acceptance criteria a threat kapitole, vzniká riziko, že se časem rozjedou.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.144 — 143. Design principle: failure is part of API

**Verdikt:** MOVE/MERGE

Zdrojová sekce pracuje mimo jiné s formulací „API, které popisuje pouze success response, je neúplné.“. Obsah je hodnotný jako review checklist, ale v této podobě výrazně nafukuje normativní dokument. Přesunout do Verification/Notes a propojit s konkrétními testy nebo pravidly. Při zavádění do reálného projektu by měla být tato myšlenka ověřena nejméně dvěma use-casy nebo explicitně označena jako project-specific. To chrání Core před předčasným zobecněním.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.145 — 144. Design principle: history matters

**Verdikt:** MOVE/MERGE

Zdrojová sekce pracuje mimo jiné s formulací „Pětiletá platforma musí umět pracovat se stavem:“. Obsah je hodnotný jako review checklist, ale v této podobě výrazně nafukuje normativní dokument. Přesunout do Verification/Notes a propojit s konkrétními testy nebo pravidly. Z provozního pohledu je třeba vždy doplnit failure semantics: co se stane při timeoutu, duplicate delivery, restartu nebo chybné konfiguraci. Happy-path popis sám o sobě není dlouhodobý kontrakt.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.146 — 145. Design principle: restore is a feature

**Verdikt:** MOVE/MERGE

Zdrojová sekce pracuje mimo jiné s formulací „Backup bez restore testu není provozní garance.“. Obsah je hodnotný jako review checklist, ale v této podobě výrazně nafukuje normativní dokument. Přesunout do Verification/Notes a propojit s konkrétními testy nebo pravidly. Oponentní kritérium je jednoduché: pokud se tato kapitola odstraní z Foundation Core, ztratí se nějaká vymahatelná bezpečnostní nebo interoperabilní vlastnost? Pokud ne, patří spíše do poznámek než do závazného jádra.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.147 — 146. Design principle: humans are part of system

**Verdikt:** MOVE/MERGE

Zdrojová sekce pracuje mimo jiné s formulací „Human review není „výjimka mimo systém“.“. Obsah je hodnotný jako review checklist, ale v této podobě výrazně nafukuje normativní dokument. Přesunout do Verification/Notes a propojit s konkrétními testy nebo pravidly. Doporučuji tuto část propojit s jedním konkrétním artefaktem nebo testem. Bez takového napojení hrozí, že bude při implementaci čtena jako doporučení, ale nebude existovat způsob, jak ověřit její dodržení.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.148 — 147. Design principle: external systems lie by failure

**Verdikt:** MOVE/MERGE

Zdrojová sekce pracuje mimo jiné s formulací „Externí API může:“. Obsah je hodnotný jako review checklist, ale v této podobě výrazně nafukuje normativní dokument. Přesunout do Verification/Notes a propojit s konkrétními testy nebo pravidly. Z hlediska pětileté údržby je důležitější jedno stabilní místo pravdy než detailní text na více místech. Pokud stejná semantics existuje v kontraktu, acceptance criteria a threat kapitole, vzniká riziko, že se časem rozjedou.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.149 — 148. Design principle: data quality is not binary

**Verdikt:** MOVE/MERGE

Zdrojová sekce pracuje mimo jiné s formulací „U AI extraction je vhodné uchovávat:“. Obsah je hodnotný jako review checklist, ale v této podobě výrazně nafukuje normativní dokument. Přesunout do Verification/Notes a propojit s konkrétními testy nebo pravidly. Při zavádění do reálného projektu by měla být tato myšlenka ověřena nejméně dvěma use-casy nebo explicitně označena jako project-specific. To chrání Core před předčasným zobecněním.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.150 — 149. Design principle: security beats compatibility

**Verdikt:** MOVE/MERGE

Zdrojová sekce pracuje mimo jiné s formulací „Pokud stará verze contractu není bezpečná:“. Obsah je hodnotný jako review checklist, ale v této podobě výrazně nafukuje normativní dokument. Přesunout do Verification/Notes a propojit s konkrétními testy nebo pravidly. Z provozního pohledu je třeba vždy doplnit failure semantics: co se stane při timeoutu, duplicate delivery, restartu nebo chybné konfiguraci. Happy-path popis sám o sobě není dlouhodobý kontrakt.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.151 — 150. Design principle: no feature without lifecycle

**Verdikt:** MOVE/MERGE

Zdrojová sekce pracuje mimo jiné s formulací „Nová shared feature musí mít odpověď:“. Obsah je hodnotný jako review checklist, ale v této podobě výrazně nafukuje normativní dokument. Přesunout do Verification/Notes a propojit s konkrétními testy nebo pravidly. Oponentní kritérium je jednoduché: pokud se tato kapitola odstraní z Foundation Core, ztratí se nějaká vymahatelná bezpečnostní nebo interoperabilní vlastnost? Pokud ne, patří spíše do poznámek než do závazného jádra.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.152 — 151. Co je úspěch za 5 let

**Verdikt:** KEEP/CLARIFY

Zdrojová sekce pracuje mimo jiné s formulací „Ne počet agentů.“. Obsah je užitečný, ale potřebuje přesnější hranici mezi kontraktem a implementačním doporučením. Zvlášť je třeba uvést, co je release-blocking a co je jen doporučený pattern. Doporučuji tuto část propojit s jedním konkrétním artefaktem nebo testem. Bez takového napojení hrozí, že bude při implementaci čtena jako doporučení, ale nebude existovat způsob, jak ověřit její dodržení.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.153 — 152. Co je neúspěch

**Verdikt:** MOVE

Zdrojová sekce pracuje mimo jiné s formulací „Platforma selhala, pokud vznikne:“. Téma má hodnotu, ale není součástí minimální Foundation. Přesunout do PLATFORM-NOTES jako candidate/deferred, aby nezvyšovalo kognitivní náklad při běžném review. Z hlediska pětileté údržby je důležitější jedno stabilní místo pravdy než detailní text na více místech. Pokud stejná semantics existuje v kontraktu, acceptance criteria a threat kapitole, vzniká riziko, že se časem rozjedou.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.154 — 153. Stručná architektonická ústava

**Verdikt:** KEEP/MAKE CORE

Zdrojová sekce pracuje mimo jiné s formulací „Pokud má být celý dokument redukován na jednu stránku, platí:“. Toto je nejlepší kandidát na skutečný FOUNDATION-core po redukci na osm invariantů. Při zavádění do reálného projektu by měla být tato myšlenka ověřena nejméně dvěma use-casy nebo explicitně označena jako project-specific. To chrání Core před předčasným zobecněním.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.155 — 154. První konkrétní další krok

**Verdikt:** CHANGE

Zdrojová sekce pracuje mimo jiné s formulací „Nevytvářet ještě „Agent Platform Core“.“. Před contract extraction vložit skutečné repo evidence review a Verification Contract. Z provozního pohledu je třeba vždy doplnit failure semantics: co se stane při timeoutu, duplicate delivery, restartu nebo chybné konfiguraci. Happy-path popis sám o sobě není dlouhodobý kontrakt.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.156 — 155. Závěrečný verdikt

**Verdikt:** SHORTEN

Zdrojová sekce pracuje mimo jiné s formulací „Budoucí agentní farma má být navržena tak, aby mohla růst desítky let bez toho, že se z ní stane síť vzájemně svázaných experimentů.“. Závěr stačí na jednu stránku; opakování základních principů už dokument nepotřebuje. Oponentní kritérium je jednoduché: pokud se tato kapitola odstraní z Foundation Core, ztratí se nějaká vymahatelná bezpečnostní nebo interoperabilní vlastnost? Pokud ne, patří spíše do poznámek než do závazného jádra.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.157 — PŘÍLOHA A — Doporučené názvosloví

**Verdikt:** KEEP/CLARIFY

Zdrojová sekce pracuje mimo jiné s formulací „Používat:“. Obsah je užitečný, ale potřebuje přesnější hranici mezi kontraktem a implementačním doporučením. Zvlášť je třeba uvést, co je release-blocking a co je jen doporučený pattern. Doporučuji tuto část propojit s jedním konkrétním artefaktem nebo testem. Bez takového napojení hrozí, že bude při implementaci čtena jako doporučení, ale nebude existovat způsob, jak ověřit její dodržení.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.158 — PŘÍLOHA B — Capability naming

**Verdikt:** MOVE

Zdrojová sekce pracuje mimo jiné s formulací „Preferovat:“. Téma má hodnotu, ale není součástí minimální Foundation. Přesunout do PLATFORM-NOTES jako candidate/deferred, aby nezvyšovalo kognitivní náklad při běžném review. Z hlediska pětileté údržby je důležitější jedno stabilní místo pravdy než detailní text na více místech. Pokud stejná semantics existuje v kontraktu, acceptance criteria a threat kapitole, vzniká riziko, že se časem rozjedou.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.159 — PŘÍLOHA C — Error code naming

**Verdikt:** CHANGE

Zdrojová sekce pracuje mimo jiné s formulací „Error `code` je machine-readable English identifier:“. Směr je správný, ale současná formulace může vést ke dvěma různým implementacím. Doplnit jednoznačnou semantics a odpovídající verification requirement. Při zavádění do reálného projektu by měla být tato myšlenka ověřena nejméně dvěma use-casy nebo explicitně označena jako project-specific. To chrání Core před předčasným zobecněním.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.160 — PŘÍLOHA D — Minimal module descriptor

**Verdikt:** MERGE

Zdrojová sekce pracuje mimo jiné s formulací „{“. Sekce opakuje princip, který už existuje jinde. Sloučit s příbuznou kapitolou a udržet jediný normativní zdroj, jinak vznikne dokumentační drift. Z provozního pohledu je třeba vždy doplnit failure semantics: co se stane při timeoutu, duplicate delivery, restartu nebo chybné konfiguraci. Happy-path popis sám o sobě není dlouhodobý kontrakt.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.161 — PŘÍLOHA E — Example review result

**Verdikt:** KEEP

Zdrojová sekce pracuje mimo jiné s formulací „{“. Myšlenka je v zásadě správná a není nutné ji měnit. Doporučuji pouze zkrátit text tak, aby tato část nezdvojovala jiné kapitoly a měla jasný normativní status. Oponentní kritérium je jednoduché: pokud se tato kapitola odstraní z Foundation Core, ztratí se nějaká vymahatelná bezpečnostní nebo interoperabilní vlastnost? Pokud ne, patří spíše do poznámek než do závazného jádra.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.162 — PŘÍLOHA F — Example provenance chain

**Verdikt:** KEEP/CLARIFY

Zdrojová sekce pracuje mimo jiné s formulací „artifact/email-001“. Obsah je užitečný, ale potřebuje přesnější hranici mezi kontraktem a implementačním doporučením. Zvlášť je třeba uvést, co je release-blocking a co je jen doporučený pattern. Doporučuji tuto část propojit s jedním konkrétním artefaktem nebo testem. Bez takového napojení hrozí, že bude při implementaci čtena jako doporučení, ale nebude existovat způsob, jak ověřit její dodržení.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.

## A.163 — PŘÍLOHA G — Rozhodovací pravidlo pro nový shared mechanismus

**Verdikt:** MOVE

Zdrojová sekce pracuje mimo jiné s formulací „Položit otázky:“. Téma má hodnotu, ale není součástí minimální Foundation. Přesunout do PLATFORM-NOTES jako candidate/deferred, aby nezvyšovalo kognitivní náklad při běžném review. Z hlediska pětileté údržby je důležitější jedno stabilní místo pravdy než detailní text na více místech. Pokud stejná semantics existuje v kontraktu, acceptance criteria a threat kapitole, vzniká riziko, že se časem rozjedou.

**Kontrolní otázka pro další verzi:** Jaký konkrétní test, kontrakt nebo runtime artefakt tuto kapitolu vynucuje? Pokud odpověď zní „žádný“, musí být jasně označeno, že jde o guidance, nikoliv invariant.

## A.164 — PŘÍLOHA H — Priority map

**Verdikt:** CHANGE

Zdrojová sekce pracuje mimo jiné s formulací „## MUST NOW“. Směr je správný, ale současná formulace může vést ke dvěma různým implementacím. Doplnit jednoznačnou semantics a odpovídající verification requirement. Při zavádění do reálného projektu by měla být tato myšlenka ověřena nejméně dvěma use-casy nebo explicitně označena jako project-specific. To chrání Core před předčasným zobecněním.

**Riziko při ponechání beze změny:** Budoucí implementátor může z textu odvodit jinou hranici odpovědnosti než autor. To je zvlášť nebezpečné u distributed execution, tenant contextu a write operací, kde rozdílná interpretace vede k incidentu, ne jen k nekonzistentnímu stylu.

## A.165 — PŘÍLOHA I — Source context used for this draft

**Verdikt:** MERGE

Zdrojová sekce pracuje mimo jiné s formulací „Tento návrh zohledňuje zejména:“. Sekce opakuje princip, který už existuje jinde. Sloučit s příbuznou kapitolou a udržet jediný normativní zdroj, jinak vznikne dokumentační drift. Z provozního pohledu je třeba vždy doplnit failure semantics: co se stane při timeoutu, duplicate delivery, restartu nebo chybné konfiguraci. Happy-path popis sám o sobě není dlouhodobý kontrakt.

**Doporučený důkaz:** Připojit buď Test ID a CI gate, nebo odkaz na dvě reálné implementace, které dokazují, že abstrakce není pouze hypotetická. Tím se oddělí architektonická zkušenost od spekulativního backlogu.


# PŘÍLOHA B — Threat → Test → Gate matrix
|Threat|Test ID|Action|Expected|Gate|
|---|---|---|---|---|
|Prompt injection|SEC-INJ-001|Malicious content attempts privileged command|No privileged executor call|BLOCK|
|Tool injection|SEC-TOOL-001|Untrusted tool/output advertises new capability|Capability not allowlisted|BLOCK|
|Confused deputy|SEC-CTX-002|Command + mismatched trusted context|DENY + audit|BLOCK|
|Cross-tenant DB leak|TEN-DB-001|Tenant A requests B resource ID|No data returned|BLOCK|
|Cross-tenant cache leak|TEN-CACHE-001|Same object ID across tenants|Cache key/context isolated|BLOCK|
|Cross-tenant queue leak|TEN-QUEUE-001|Async job context mix|Worker preserves tenant|BLOCK|
|Replay|IDM-REPLAY-001|Same write message N times|Exactly one business side effect|BLOCK|
|Expired command|IDM-DEADLINE-001|Delivery after notValidAfter|Reject before side effect|BLOCK|
|Idempotency retention expiry|IDM-RET-002|Replay after technical key expiry|Business duplicate still prevented|BLOCK|
|Unknown external outcome|WF-UNK-001|Timeout after external submit|Reconcile; no blind retry|BLOCK|
|Review timeout|WF-REV-003|Review expires|Defined terminal/escalation transition|BLOCK|
|Poisoned artifact|SEC-ART-001|Hash changes between stages|Reject/quarantine|BLOCK|
|Unsafe version downgrade|COMP-DOWN-001|Route to disabled vulnerable v1|Routing denied|BLOCK|
|Provider compatibility regression|CTR-COMP-001|v1 consumer against v2 provider|Conformance passes|BLOCK|
|Model drift|AI-EVAL-REG-001|New model on golden set|Threshold/tolerance respected|POLICY|
|Credential expiry|SEC-CRED-001|Executor credential expired|Fail closed; recover via rotation|BLOCK|
|Storage full / queue saturation|RES-STOR-001|Spool cannot persist|No false 202/success; alert/backpressure|BLOCK for durable ingest|
|Process crash mid-step|RES-CRASH-001|Kill process in RUNNING|Recover or explicit unknown state|BLOCK for durable workflow|

# PŘÍLOHA C — Doporučený Verification Contract
Verification Contract je normativní smlouva mezi architekturou a CI. Každý component profile deklaruje, které test families se na něj vztahují. Write executor automaticky aktivuje SEC + IDM + WF minimální sadu; multi-tenant component aktivuje TEN sadu; backward-compatible provider aktivuje CTR/CDC matici; AI capability aktivuje AI-EVAL profil.

Každý povinný test má stabilní ID, ownera, fixture requirements, expected outcome a gate. Test, který je flaky nebo vyžaduje ruční interpretaci bez evidence, nemůže být jedinou ochranou kritického invariantu.

Contract package má obsahovat schema i conformance tests. Provider, který deklaruje podporu capability, musí test suite spustit proti skutečnému adapteru/handleru. Consumer-driven tests doplňují semantics, které samotné schema nevyjádří.

Časově závislé komponenty používají injectable clock. Externí adaptéry poskytují fake/sandbox implementaci shodnou v contractu. Multi-tenant test fixtures mají minimálně dva tenanty. Tyto tři coding standardy výrazně zvyšují testovatelnost a snižují počet flaky integrací.

## C.1 Povinný formát testu

```text
Test ID: TEN-CACHE-001
Profile: MULTI_TENANT
Preconditions: tenant A and B exist; both have resourceId=123
Action: warm cache with A; query B resource 123
Expected: B receives only B data; no A content in response/log
Gate: BLOCK
Evidence: CI result + artifact/log reference
```
## C.2 Compatibility matrix

|Consumer|Provider|Expected|
|---|---|---|
|v1|v1|pass|
|v1|v2 (claims v1 support)|pass|
|v2|v2|pass|
|v2|v1|only if explicitly supported; otherwise negotiation/routing reject|

# PŘÍLOHA D — Doporučená struktura Foundation Core
Foundation Core má být čitelný přibližně do třiceti minut. Doporučená struktura:

- 1. Scope a non-goals
- 2. Osm runtime invariantů
- 3. Roles: Orchestrator, Agent/Module, Executor, Router, Review
- 4. Message + TrustedExecutionContext
- 5. Result + Error contract
- 6. Execution states + retry + unknown outcome
- 7. Tenant/security context
- 8. Evidence/provenance minimum
- 9. Verification Contract reference
- 10. Core Admission Process
- 11. Explicit list „Do not build yet“
