# ČÁST I — Kontext, historie a omezení

## 1.1 Odkud návrh vychází

### Metodika `ai-agenti`

Veřejný repozitář s metodikou stavby AI agentů. Jádro v jedné větě: **AI rozpoznává, kód vykonává.** Model dělá rozpoznání záměru, extrakci struktury a syntézu textu; všechno ostatní je deterministický kód. Metodika už obsahuje: žádnou tichou větev, neznámý výsledek jako regulérní stav, identitu a oprávnění, lidské brány, křížovou kontrolu, paměť, idempotenci, modulární kontrakty, zákaz sahání do databáze jiného modulu, build gates a evaly. Má návrhový list (`sablony/navrhovy-list.md`), který se vyplňuje před prvním řádkem kódu, a build předpis.

Tento balíček metodiku nenahrazuje. Rozšiřuje ji o to, co jeden agent nepotřebuje a farma agentů ano: orchestraci, capability discovery, obálku zpráv, vyjednávání verzí, zpětnou kompatibilitu, jednoúčelové executory, trust boundaries mezi komponentami, evidence chain, retenci a dlouhodobou provozovatelnost.

### Precedent z praxe: endpoint agent

Autor má pracovní zkušenost s on-prem projektem, který v praxi ověřil: Windows Service agent na stanicích, automatický enrollment, vzdálené nasazení bez ručně sdílených hesel, oddělené deploy identity, heartbeat, centrálně distribuovanou policy, offline provoz s durable lokální frontou, version reporting přes git commit, update a rollback přes verzované balíčky, audit a health checks. Tento projekt vystupuje v balíčku **výhradně jako zdroj vzorů**. Jeho kód, názvy ani konfigurace se do osobního portfolia nepřenášejí; obecný vzor se implementuje znovu podle vlastního kontraktu (II §9, ADR-009).

### Portfolio reálných projektů

Pět projektů, které byly skenovány pro evidenci (část V):

| Projekt | Co dělá | Stav |
|---|---|---|
| `job-watch` | denní monitor volných míst pro vedoucí IT, AI skóring, notifikace; CF Worker + D1 + cron | nasazeno za CF Access |
| `gmail-mcp` | vzdálený MCP server nad Gmailem, čištění schránky z Claude, multi-user OAuth | nasazeno |
| `domlov` | generátor značkových názvů + kontrola domén (RDAP) + webová stopa (Brave) | nasazeno veřejně |
| `faxx-hr` | hodnocení CV proti zadání s detekcí skrytého textu v CV | nasazeno |
| `faxx-dox` | extrakce metadat z dokumentů, e-mail vstup, krmí DMS | jen návrh, fáze F0 |

Všechny běží na Cloudflare Workers. To je **aktuální stack autora, ne rozhodnutí platformy.** Norma nesmí na Cloudflare záviset.

## 1.2 Historie dokumentu

Vše se odehrálo 5. 9. 2026. Uvádíme to podrobně, protože historie vysvětluje, proč norma vypadá, jak vypadá.

| Krok | Artefakt | Rozsah | Co přinesl | Co bylo špatně |
|---|---|---|---|---|
| 1 | Foundation v0.1 (generováno v diskusi s LLM) | 74 sekcí | správné invarianty, referenční architektura, seznam témat | všechno v režimu „musí", žádná priorita; konkrétní rozpory v obálce (target vs capability, chybí capabilityVersion, error kontrakt, tenant binding, idempotence vs quality retry, review expiry, kompenzace, LLM planning vs zákaz raw výstupu, delivery semantics) |
| 2 | Review v0.1 (autor s asistentem) | | pojmenoval rozpory výše; navrhl rozdělit INVARIANT / CANDIDATE / DEFERRED; upozornil, že vertical slice už existuje jako `faxx-dox` a že Core nesmí obsahovat pracovní kód | |
| 3 | Foundation v0.2 (generováno) | 155 kapitol | opravil většinu rozporů: trusted context oddělen od payloadu, RETRYABLE není stav, quality retry má nový klíč, UNKNOWN je explicitní, at-least-once; zavedl tři úrovně normativity | dvojnásobný objem; 12 invariantů, z nichž některé jsou dvojice; testování jen jako taxonomie; evidence matrix plná slova „verify" |
| 4 | Oponentura v0.2 (generováno) | 1 741 řádků | hlavní tělo silné: capability ≠ security principal ≠ deployment unit; ekonomický argument (pravidlo dražší než obejití se obejde); orchestrátor jako hrozba centrálního mozku; deadline `notValidAfter`; retence idempotence; Verification Contract jako rovnocenná norma; Threat → Test → Gate | příloha A (1 324 řádků, 76 % objemu) byla šablonový text: tři závěrečné odstavce rotující 55× doslova; skóre 7,8 nebylo průměrem dílčích hodnot; matice hrozeb vynechala dvě z dvanácti; vlastní evidence matrix zůstala prázdná |
| 5 | Čtyři automatická hodnocení oponentury | | testing tax (generovat testy z descriptoru, izolaci vynucovat ve wrapperu); mutant testy; CTR-ERR rodina; fixture corpus; immutable workflow definice; clock jako invariant | skóre 6,5 / 9,3 / 7,2 / 7,8 pro stejný text; jedno hodnocení opsalo tabulku skóre z oponentury číslo po čísle; jedno nezaznamenalo šablonovou přílohu |
| 6 | Balíček v1.0-draft | jádro 549 řádků, verifikace 242, evidence 287, notes 122, 4 schémata | provedl, co všech pět předchozích kroků doporučovalo: zkrátit závaznou část, doplnit verifikaci, otevřít reálná repa | viz 0.6 a XII.A |
| 7 | 1. kolo oponentury 1.0-draft (čtyři posudky, 8,2 / 6,8 / 8,5 / 8,6) | | shoda čtyř posudků: logická izolace hostu ≠ fyzická; podpis uvnitř podepisovaného objektu; rotace klíče; testing tax; `retryable` vs `reissuable`; odvozené profily; claim vs autorita; conformance tiers; rodina `INT` | jeden posudek zopakoval strukturu svého předchozího kola a označil jako BLOCKER věci, které norma už měla jako BLOCK; jeden posudek byl doručen zkrácený; protokol v části XIII |
| 8 | Balíček v1.0-rc | 5 schémat, 27 negativních testů, `EVD-006`, rodina `INT`, protokol oponentury | zapracováno 28 nálezů, 3 odmítnuty s důvodem | viz XIII |
| 9 | 2. kolo oponentury 1.0-rc (čtyři posudky, 9,1 / 9,1 / 8,5 / bez čísla) | | shoda: architektura obhájena, další text má klesající návratnost; nálezy míří na hrany první implementace: `PRINCIPAL` musí být vynucen mimo paměť handleru, sdílený HMAC klíč otevírá blast radius, manuální evidence mutantů u solo operátora je sebeklam, atomická migrace, stárnutí fronty, sémantické validátory | jeden posudek doručen bez skóre (záměrně); rozptyl klesl z 1,8 na 0,6 bodu |
| 10 | Balíček v1.0-rc2 | 29 negativních testů, 53 řádků matice, T19, protokol 2. kola | zapracováno 19 nálezů, 1 odmítnut s důvodem, 1 vzat na vědomí | viz XIV |
| 11 | 3. kolo oponentury 1.0-rc2 (čtyři posudky, 9,3 / 9,0 / bez čísla / 9,4) | | jeden skutečný rozpor II/III/IV: `SEC-SEM-001` vyžadoval deklaraci validátorů, kterou descriptor neuměl vyjádřit (dva posudky nezávisle); `PRINCIPAL` přes broker v témže procesu stále obejitelný RCE; migrace s in-flight externími voláními; klíč platný v čase podpisu; cena izolace na Workers | dva posudky výslovně: „už nepřestavovat, jen errata a kód" |
| 12 | Balíček v1.0-rc2.1 (errata) | `effectFields` + `semanticValidation` ve schématu, 32 negativních testů, 56 řádků matice, protokol 3. kola | zapracováno 12 nálezů, 1 odmítnut, 1 vzat na vědomí | viz XV |
| 13 | 4. kolo oponentury rc2.1 (9,2 / 9,5 / 9,5 + opakovaný posudek z 3. kola) | | 1 MINOR (HMAC v ukázce jádra), 3 NOTE k přípravě implementace (formát policy, rozhraní fixture, scope pentestu); shoda: přijmout, zmrazit, stavět | rozptyl 0,3 |
| 14 | **Tento balíček, v1.0-rc2.1 (finální)** | ADR-016 a vzor policy, ADR-017 scope pentestu, rozhraní `CredentialResolverFixture`, část XVI | **textová fáze uzavřena; jádro, verifikace a schémata zmrazeny** | viz XVI |

Poučení, které se promítlo do formy balíčku:

1. **Objem zabíjí normu.** Pravidla, která se vejdou na třicet minut čtení, se dodržují. Pravidla na 155 kapitol se ignorují. Proto je jádro (II) samostatné a všechno ostatní je zdůvodnění nebo backlog.
2. **Tvrzení bez testu je literatura.** Proto je Verification Contract (III) normativně rovnocenný s jádrem a každý invariant má rodinu testů a mutanty.
3. **Abstrakce před evidencí je hypotéza.** Proto vznikla evidence matrix (V) z reálného kódu dřív než jakýkoli sdílený balíček, a proto dnes žádný sdílený balíček neexistuje.
4. **Generovaný text potřebuje měřit, ne číst.** Rozsah šablonového textu v oponentuře byl zjištěn grepem, ne dojmem. Stejný přístup platí pro evidence matrix: odkaz na soubor a řádek, ne „projekt X má retry".

## 1.3 Co se změnilo mezi v0.2 a v1.0-draft

| Oblast | v0.2 | v1.0-draft | Důvod |
|---|---|---|---|
| Invarianty | 12 | 7 (F1–F7) + procesní P1, P2 | „AI nemá write" + „write jen executor" = jedna privilege boundary; „capabilities ne internals" + „orchestrátor zná kontrakty" = jedna contract boundary; „nic není Core jen proto, že vypadá reusable" a „každý invariant má verifikaci" jsou procesní pravidla, ne runtime invarianty (P1 přesunuto po 1. kole) |
| Obálka | bez deadline, bez causation | `notValidAfter` povinné u commandů, `causationId` volitelné | opožděné doručení write commandu je reálná škoda; causation umožňuje rekonstruovat řetězec |
| Trusted context | oddělen od payloadu | + životní cyklus, `originatingActorId`, `expiresAt`, **binding rule** per transport | confused deputy přes frontu byl nepokrytý |
| Idempotence | klíč + unknown result | + `idempotencyRetention` per capability, business transaction identity pro IRREVERSIBLE | dedup cache s TTL 24 h není idempotence po 25 hodinách |
| Executor | „single-purpose" | capability boundary ≠ security principal ≠ deployment unit; Executor Host | jinak exploze deployables a tlak na obcházení |
| Workflow | deterministická definice | + `workflowVersion` pinning, policy `FINISH_ON_PINNED`, guards přechodů | nasazení v2 nesmí implicitně změnit graf běžící instance |
| Review | task + role + expiry | + `expiryPolicy` povinná, decision = auditovaný přechod, reviewer bez admin práv | „nic se nestane po expiraci" byla tichá větev |
| Testování | taxonomie (unit, contract, …) | Verification Contract: profily → rodiny, 33 řádků threat → test → gate, mutanty, conformance balíček, flaky → UNVERIFIED | taxonomie není vymahatelná |
| Evidence | matice plná „verify" | 16 dimenzí × 5 projektů s odkazy soubor:řádek | jinak je Core hypotéza |
| Core | 12 invariantů + admission rule | admission jako proces s kategoriemi evidence a pořadím extrakce | kontrakt před implementací, implementace až při třetím použití |
| Nestavět | seznam | seznam + trigger u každé položky (IX) | bez triggeru se položka buď nikdy neotevře, nebo otevře předčasně |

## 1.4 Omezení, která norma respektuje

1. **Jeden člověk.** Každé pravidlo musí být splnitelné bez týmu. Kde to nejde (např. oddělení autora promptu od vlastníka labelů), norma to říká a nechává jako přiznanou slabinu.
2. **Předatelnost.** Za pět let nesmí systém záviset na tom, že autor „ví, jak to funguje". Proto runbook, health signály, standardní chyby, dokumentace kontraktů, známé failure modes.
3. **Bez univerzálních rozhodnutí.** Norma nevybírá broker, workflow engine, cloud, identity providera, databázi ani LLM providera. Definuje kontrakty a invarianty, které musí přežít výměnu kterékoli z těchto technologií.
4. **Bez pracovního kódu.** Nic z pracovních projektů se nepřenáší. Vzory se implementují znovu.
5. **Ekonomika.** Výchozí cesta musí být zároveň nejlevnější (II §3.5). Bezpečnostní pravidlo, jehož dodržení stojí víc než obejití, se obejde.

## 1.5 Co je záměrně nerozhodnuto

Dnes není nutné rozhodnout a norma to výslovně nechává otevřené:

- konkrétní message broker nebo frontu,
- konkrétní workflow engine,
- konkrétní cloud,
- konkrétní identity provider pro všechny scénáře,
- jeden univerzální datový model,
- jednoho LLM providera,
- zda každý serverový modul bude proces nebo container,
- mechanismus vazby trusted contextu přes frontu (podepsaná obálka vs. broker identita vs. token), jen povinnost ho pojmenovat.

Co naopak **je** rozhodnuto a oponent to má napadat: at-least-once delivery; statické workflow definice v v1; executor host jako povolená topologie; `EXISTS × 2` jako práh pro Core; fail-closed jako default; sedm invariantů a dvě procesní pravidla; Ed25519 jako výchozí podpis dispatch obálky. Zdůvodnění v části VII.

## 1.6 Regulace jako návrhová čočka, ne jako tvrzení

Norma počítá s prostředím, kde platí NIS2 (český zákon o kybernetické bezpečnosti), CRA, GDPR a AI Act. **Netvrdí compliance.** Compliance závisí na organizaci, scope, procesech a konkrétním nasazení. Norma poskytuje mechanismy, které compliance umožňují: identity, least privilege, audit, evidence, retence, mazání, šifrování, traceability incidentů, access review. Konkrétní zákazník dostane compliance profil jako konfiguraci nad platformou.

Praktický příklad z portfolia: `faxx-hr` (hodnocení CV) je z pohledu AI Act vysoce rizikový systém. Norma na to odpovídá F7 (rozhodnutí člověka je auditovaný přechod) a profilem `AI_CAPABILITY` (kritická pole bez regrese). Evidence (V §1.8) ukazuje, že tento projekt AI výstup správně označuje jako podporu rozhodování, ale lidské rozhodnutí nezaznamenává. To je přesně mezera, kterou F7 uzavírá pro nové komponenty.

## 1.7 Slovník

Termíny jsou v glosáři (část XI). Pro čtení částí II až IV stačí vědět:

- **capability**: pojmenovaná, verzovaná schopnost (`invoice.extract`), ne metoda ani služba,
- **executor**: jediná komponenta s write právem k jedné capability,
- **trusted context**: identita, tenant a scopes vzniklé mimo business payload,
- **command / event / query**: záměr změny / oznámení, co se stalo / dotaz bez side effectu,
- **idempotency key**: identita jedné logické write intent,
- **UNKNOWN_OUTCOME**: stav, kdy side effect možná proběhl a systém to neví,
- **EXISTS × 2**: práh pro vstup mechanismu do sdíleného Core.
