# ČÁST 0 — Průvodce pro oponenty

## 0.1 Co je předmětem oponentury

Předmětem je **návrh normy**, ne produkt. Konkrétně:

1. `FOUNDATION CORE` (část II): sedm runtime invariantů a dvě procesní pravidla, role komponent, executor model, kontrakty zpráv, stavový model, tenant context, evidence minimum a procesní pravidlo, kdy něco smí do sdíleného Core.
2. `VERIFICATION CONTRACT` (část III): jak se každý invariant dokazuje, jaké testy jsou povinné podle profilu komponenty, jaké mutanty musí selhat, jaké CI brány blokují.
3. Pět strojových kontraktů v JSON Schema 2020-12 (část IV) a jejich testy.
4. Evidence z pěti reálných repozitářů (část V): co v nich skutečně je a není, s odkazy na soubor a řádek.
5. Provedené příklady, architektonická rozhodnutí a threat model (části VI až VIII), které normu ilustrují a zdůvodňují.

Předmětem **není**:

- volba technologií (message broker, databáze, cloud, identity provider, LLM provider),
- business pravidla jakékoli domény,
- kód existujících projektů. Nálezy v části V jsou evidence, ne zadání. Vlastník rozhodl, že se staré projekty neupravují.

## 0.2 Kontext, který oponent potřebuje znát

- **Autor je jeden člověk.** Solo operátor s portfoliem malých cloudových aplikací (Cloudflare Workers, D1, KV, Durable Objects, Workers AI, Claude API) a s pracovní zkušeností z většího on-prem endpoint projektu, který tady vystupuje jen jako zdroj vzorů, ne kódu.
- **Cíl je pětiletá provozovatelnost** portfolia AI agentů, které by jednou mohly sloužit více zákazníkům. Ne framework na prodej. Ne akademická práce.
- **Metodický základ** je repozitář `ai-agenti` s jádrem „AI rozpoznává, kód vykonává". Tento balíček ho rozšiřuje na úroveň více spolupracujících komponent.
- **Historie za jeden den** (5. 9. 2026): tři generované drafty a čtyři automatická hodnocení, všechny s totožným doporučením, které nikdo neprovedl. Tento balíček je provedení. Podrobně v části I.

## 0.3 Jak číst

| Pořadí | Část | Čas | Závaznost |
|---|---|---|---|
| 1 | 0 Průvodce, I Kontext | 20 min | orientace |
| 2 | II Foundation Core | 45 min | **závazné** |
| 3 | III Verification Contract | 30 min | **závazné** |
| 4 | IV Kontrakty s komentářem | 30 min | **závazné** |
| 5 | VI Provedené příklady | 40 min | ilustrace normy; rozpor mezi příkladem a normou je nález |
| 6 | VII Rozhodnutí (ADR) | 30 min | zdůvodnění; alternativy jsou uvedeny, aby šly napadnout |
| 7 | VIII Threat model | 30 min | zdůvodnění bezpečnostních invariantů |
| 8 | V Evidence matrix | 30 min | data; ověřitelné proti veřejným repozitářům |
| 9 | IX Platform Notes | 15 min | nezávazné, backlog |
| 10 | X Otázky pro oponenty | 20 min | seznam toho, na co chceme odpověď |
| 11 | XI Glosář, XII Přílohy | dle potřeby | |

Celkem přibližně pět hodin soustředěného čtení. Části II až IV jsou normativní; všechno ostatní je buď zdůvodnění, nebo data.

## 0.4 Co od oponentury chceme

Seřazeno podle hodnoty pro autora.

1. **Rozpory.** Mezi jádrem (II), verifikací (III), schématy (IV) a příklady (VI). Každý rozpor je nález s nejvyšší prioritou, protože tři dokumenty, které si odporují, se po roce rozjedou.
2. **Množina invariantů.** Je osm správné číslo? Který invariant je ve skutečnosti dva? Který chybí? Který je jen doporučení převlečené za pravidlo?
3. **Vymahatelnost.** Existuje invariant, který nemá test, nebo test, který invariant ve skutečnosti neověřuje? Je požadavek na mutanty (III §6) reálný?
4. **Core Admission.** Je pravidlo `EXISTS × 2` příliš přísné (nic nikdy nevznikne) nebo příliš volné (vznikne nesmysl)?
5. **Ekonomika pro jednoho člověka.** Kde norma vytváří práci, kterou jeden člověk neunese, a kde se proto začne obcházet? Část III §7 (testing tax) je náš pokus; posuďte, zda stačí.
6. **Bezpečnostní model.** Kde je díra v threat modelu (VIII)? Který útok normou projde?
7. **Odpovědi na konkrétní otázky** v části X.

## 0.5 Formát odpovědi, který nám pomůže

Za každý nález prosíme:

```text
Sekce:      II §4.3
Nález:      binding rule nedefinuje, co se stane při rotaci podpisového klíče uprostřed dispatch
Důsledek:   zprávy podepsané starým klíčem budou po rotaci odmítnuty (SEC-CTX-003), fronta se zasekne
Návrh:      keyId v binding + přechodné období, kdy router přijímá oba klíče; test SEC-CRED-002
Závažnost:  MAJOR
```

Stupnice závažnosti:

| Stupeň | Význam |
|---|---|
| BLOCKER | norma v tomto bodě nesmí být přijata; vede k bezpečnostnímu incidentu nebo k nesplnitelnosti |
| MAJOR | norma je v tomto bodě chybná nebo neúplná způsobem, který se projeví při první implementaci |
| MINOR | nepřesnost, nejednoznačnost, chybějící příklad |
| NOTE | názor, alternativa, doporučení bez nároku na změnu |

Co nám naopak **nepomůže** (a proč to říkáme): číselné skóre na desetinná místa bez zveřejněné rubriky; komentář, který se dá zkopírovat ke každé sekci beze změny; tvrzení „chybí X" bez toho, kde by X mělo být a jaký test by ho vynutil. Předchozí generovaná oponentura obsahovala 165 položek, z nichž 55 mělo doslova stejný závěrečný odstavec. To nechceme opakovat.

## 0.6 Známé slabiny přiznané předem

Aby oponenti neztráceli čas objevováním toho, co víme. Podrobně v příloze XII.A. Stav po 1. kole v závorce.

1. Nic z toho neběží. Norma má nula implementací; profil `MULTI_TENANT` nemá ani jednoho reálného kandidáta. (Trvá.)
2. Injektovatelné hodiny (III §8.1) nejsou v žádném z pěti skenovaných projektů. (V 1.0-rc lint pravidlo pro nové komponenty, staré vyňaty.)
3. Mechanismus vazby trusted contextu přes frontu. (V 1.0-rc vybrán default `signed-envelope`; podpis přesunut vně contextu.)
4. Executor Host (II §3.2) je logická konstrukce bez ověření, že blast radius skutečně drží. (V 1.0-rc izolační třídy a `SEC-HOST-001`; empirický běh trvá jako CANDIDATE.)
5. AI-EVAL profil (III §10) předpokládá golden set s vlastníkem labelů, což u jednoho člověka znamená, že vlastník labelů je zároveň autor promptu. (Trvá.)
6. Evidence matrix je jednodenní snímek pěti repozitářů; sémantická shoda byla posouzena čtením, ne spuštěním. (Trvá.)
7. Bus factor je jedna. (Trvá.)
8. Rodina `INT` a golden master workflow vznikly v 1.0-rc jako specifikace bez jediného běžícího případu. (Nové.)

## 0.6b Co je v tomto vydání nového

Toto je **1.0-rc2.1**, errata k rc2. Část XIII obsahuje protokol 1. kola (31 nálezů), část XIV protokol 2. kola (21 nálezů), část XV protokol 3. kola (14 nálezů). U každého nálezu je rozhodnutí přijato / přijato s úpravou / odmítnuto s důvodem a odkaz na změněnou sekci. Třetí kolo našlo jeden skutečný rozpor mezi částmi II, III a IV (sémantické validátory bez místa v descriptoru); errata ho opravují ve schématu a zároveň zpřesňují `PRINCIPAL` a migraci s in-flight voláními. Není to nová architektonická revize. Závazek „žádné rc3 bez kódu" platí; verze 1.0 vznikne po první implementaci ve dvou komponentách a po penetračním testu izolace hostu (XII.D).

## 0.7 Mapa souborů

Balíček je sestaven z repozitáře `agent-platform-foundation`. Odkazy na soubory v textu odpovídají částem takto:

| Soubor v repozitáři | Část balíčku |
|---|---|
| `FOUNDATION-core.md` | II |
| `VERIFICATION-CONTRACT.md` | III |
| `contracts/*.v1.schema.json` (message, trusted context, dispatch, result, module descriptor) | IV |
| `docs/review-pack/parts/13-oponentura-kolo1.md` | XIII |
| `docs/review-pack/parts/14-oponentura-kolo2.md` | XIV |
| `docs/review-pack/parts/15-oponentura-kolo3.md` | XV |
| `docs/review-pack/parts/16-oponentura-kolo4-uzavreni.md` | XVI |
| `contracts/policy/*.policy.example.json` | vzor platform policy (ADR-016), IV a VII |
| `EVIDENCE-MATRIX.md` | V |
| `PLATFORM-NOTES.md` | IX |
| `docs/history/*` | zdroje, nejsou součástí balíčku |
