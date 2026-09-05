# ČÁST XIV — Protokol 2. kola oponentury

| | |
|---|---|
| **Předmět** | balíček v1.0-rc (5. 9. 2026 večer) |
| **Posudky** | čtyři, tytéž zdroje jako v 1. kole, označené 1 až 4 |
| **Výsledek** | 21 nálezů: 15 přijato, 4 přijato s úpravou, 1 odmítnut s důvodem, 1 vzat na vědomí; vydání 1.0-rc2 |
| **Shoda posudků** | architektura oddělených modulů je obhájená; další textové kolo má klesající návratnost; první hodnotu přinese kód |

## 14.1 Posudky

| Posudek | Skóre (1. kolo → 2. kolo) | Verdikt | Hlavní nález |
|---|---|---|---|
| 1 | 8,6 → 9,1 | nepřestavovat, začít stavět | `PRINCIPAL` musí být vynucen mimo paměť a kód handleru, jinak je to `LOGICAL+` |
| 2 | 8,5 → 9,1 (rubrika zveřejněna, součet 9,1) | přijmout po třech MAJOR | sdílený HMAC klíč otevírá blast radius; manuální evidence mutantů u solo operátora je sebeklam; `SEC-HOST-001` neběžel |
| 3 | 6,8 → 8,5 | přijmout s opravou | atomická migrace (`WF-VER-003`), stárnutí fronty (`RES-QUEUE-001`), `conformanceTier` per workflow, časové pásmo |
| 4 | bez skóre (záměrně) | připraveno k první implementaci po dvou opravách | key registry na straně příjemce; zrušit manuální evidenci mutantů; sémantické validátory proti logické injection |

Rozptyl skóre klesl z 1,8 bodu (6,8 až 8,6) na 0,6 (8,5 až 9,1). Posudek 4 skóre neuvedl a odpověděl nálezy ve formátu z 0.5, což je přesně to, oč jsme žádali.

## 14.2 Nálezy a rozhodnutí

Rozhodnutí: **P** přijato, **PÚ** přijato s úpravou, **O** odmítnuto, **Z** vzato na vědomí.

| # | Nález | Kdo | Závažnost | Rozh. | Změna |
|---|---|---|---|---|---|
| 1 | `PRINCIPAL` definovaný jako „vlastní credential identita" slibuje víc, než sdílený proces garantuje; musí být vynucen mimo handler-controlled memory (token broker, OS principal, sidecar, sandbox) | 1 | MAJOR | **P** | definice `PRINCIPAL` = credential od brokera mimo proces hostu; N handlerů v jednom Workeru se společnými bindingy = `LOGICAL`; host smí `PRINCIPAL` jen s brokerem mimo proces; II §3.2 |
| 2 | `SEC-HOST-001` definován, ale neběžel; první host stojí na víře; navrženo pentest trigger, ADR s mitigacemi, nebo jeden handler `PROCESS` | 2 | MAJOR | **PÚ** | pentest in-process izolace je **podmínka přechodu na 1.0** (IX, XII.D); `isolationDecision` pro HIGH musí jmenovat mitigace a výsledek pentestu; s nálezem #1 je HIGH v hostu možný jen s brokerem. Varianta „jeden handler PROCESS" nepřijata: neřeší izolaci ostatních |
| 3 | Manuální evidence MUST mutantů u první komponenty = solo operátor si sám vystaví marodku | 2, 4 | MAJOR | **P** | výjimka zrušena; mutant je 5 až 10 řádků test doublu; bez automatizace `UNVERIFIED`; III §6 |
| 4 | Sdílený HMAC klíč mezi gateway a příjemci: kompromitace LOW handleru = podpis za HIGH | 2 | MAJOR | **P** | Ed25519 default, privátní klíč jen v gateway; HMAC jen v jednom deployable; T19; `SEC-HOST-002`; II §4.3, IV 4.3b, VIII |
| 5 | Rotace klíče: obálka má jediné `keyId`; přechod musí řešit key registry příjemce s n verzemi, ne vyjednávání po drátě | 4 | MAJOR | **P** | text II §4.3 upřesněn: registry příjemce drží aktuální i předchozí klíč po grace period; postup rotace popsán; schéma beze změny |
| 6 | Rodina `INT` je spekulace bez běžícího případu; označit CANDIDATE do první dvojice | 2 | MINOR | **O** | `INT-FAIL-*` běží proti adapter fakes a nepotřebuje reálnou integraci; `INT-E2E-001` proti fakes také. Snížení na doporučené by znamenalo, že první dvojice komponent smí být nasazena bez testu spoje, což je přesně stav, který 1. kolo označilo za fatální. Přijato místo toho: přesná definice `INT-FAIL-004` (#7) a obecný `INT-E2E-001` (#8) |
| 7 | `INT-FAIL-004` vyžaduje fake s business logikou | 2 | MINOR | **PÚ** | fake business logiku nezná, vrací připravenou hodnotu; dvě varianty: mimo rozsah → `VALIDATION`, formálně správná a věcně nemožná → `QUALITY` / review; III §4 řádek 45 |
| 8 | `INT-E2E-001` vázaný na hypotetickou workflow definici | 2 | MINOR | **P** | test je obecný nad libovolnou definicí; III §4 řádek 47 |
| 9 | Conformance tier MUST pole = claim providera, ne autorita | 2 | MINOR | **P** | seznam MUST polí žije v kontraktovém balíčku (vlastník kontraktu), consumer může jen rozšířit (`CDC-SEM-001`); provider, který zúží, mění major; III §5 |
| 10 | `conformanceTier` chybí na workflow definici, `INT-E2E-001` se nemá čím řídit | 3 | MINOR | **P** | `conformanceTier` na workflow definici s významem per tier; II §5.7 |
| 11 | `MIGRATE_INSTANCE` bez testu selhání uprostřed; hrozí částečně migrovaná instance | 3 | MAJOR | **P** | migrace atomická; `migrationStatus: MIGRATION_FAILED`, audit, notifikace; `WF-VER-003`; II §5.7 |
| 12 | Stárnoucí fronta (pomalý consumer) není plné úložiště; systém zkolabuje na timeouty | 3 | MAJOR | **P** | `oldestPendingAge` > 2× maximální `deadlinePolicy` → `DEGRADED` + backpressure + alert; `RES-QUEUE-001`; II §6.6 |
| 13 | Trigger `INT-REPLACE-001` nejasný | 3 | MINOR | **P** | běží při změně `runtime`, `trustClass`, `modelId`, jazyka implementace nebo major `componentVersion`; III §4 řádek 48 |
| 14 | Časové pásmo: `IDM-DEADLINE-002` testuje rozdíl hodin, ne offset | 3 | MINOR | **P** | všechna `date-time` pole musí končit `Z` (pattern ve všech schématech); dva negativní testy; `CTR-TIME-001` |
| 15 | F1/F2 tenzní bod: `ProposedCommand` projde schématem, hodnoty způsobí destruktivní akci; chybí sémantické validátory | 4 | MAJOR (autor) | **P** | F2 rozšířeno: pole vybírající cíl nebo rozsah side effectu u `riskClass ≥ HIGH` musí projít deterministickým sémantickým validátorem; `SEC-SEM-001`; zároveň odpověď na X-20; II §1 F2 |
| 16 | `UNKNOWN_OUTCOME` po vyčerpání budgetu: orchestrátor nemá jak založit review task bez dotazu do executora (F3) | 4 | MINOR | **PÚ** | žádné nové pole: přechod do `WAITING(REVIEW)` provádí orchestrátor sám z `reconciliationRef`, task zakládá v Review Service a `reviewTaskId` dává do vlastního result záznamu; executor review task nezakládá; II §5.1 |
| 17 | `idempotencyKey` a `notValidAfter` u výpočetních commandů = dummy hodnoty a obcházení | 4, otázka IV-1 | MINOR | **P** | čistý výpočet bez artefaktu = `query`; command vždy mění stav a obě pole nese; dummy = porušení; II §4.1 |
| 18 | Zbytky draftu: „osm invariantů", `binding` v komentáři contextu | 1 | MINOR | **P** | vyčištěno v částech 0, I, IV, README |
| 19 | T19 (kompromitace podpisového klíče) chybí v threat modelu | 2 | NOTE | **P** | T19 přidán, VIII |
| 20 | `canonicalization` jako enum s jedinou hodnotou | 3 | NOTE | **Z** | ponecháno; explicitní pole umožní v2 přidat druhou kanonizaci bez změny tvaru |
| 21 | Přestat psát; postavit první vertical slice classify → validate → stamp a spustit proti němu testy | 1, 2, 3, 4 | rozhodnutí | **P** | rc2 je poslední textové vydání; XII.G doplněn o doporučený první řez a pravidlo měření času (X-31); 3. kolo proběhne nad kódem |

## 14.3 Co se změnilo v souborech

| Soubor | Změna |
|---|---|
| `FOUNDATION-core.md` | 1.0-rc2; F2 sémantické validátory; §3.2 `PRINCIPAL` přes broker, host jen `LOGICAL` bez brokera, `SEC-HOST-002`, pentest jako podmínka 1.0; §4.1 command vs query, UTC; §4.3 Ed25519 default, key registry příjemce; §5.1 přechod do review provádí orchestrátor; §5.7 `conformanceTier` workflow, atomická migrace; §6.6 stárnutí fronty |
| `VERIFICATION-CONTRACT.md` | 1.0-rc2; řádky 45, 47, 48 upřesněny; nové 49–53 (`WF-VER-003`, `RES-QUEUE-001`, `SEC-HOST-002`, `CTR-TIME-001`, `SEC-SEM-001`); §5 vlastník MUST polí; §6 bez výjimky pro mutanty; registr |
| `contracts/` | všechna `date-time` pole s patternem `Z`; popis `algorithm` s defaultem Ed25519; tvar schémat beze změny |
| `scripts/validate-contracts.mjs` | 29 negativních případů (+2 časové pásmo) |
| `PLATFORM-NOTES.md` | pentest jako podmínka 1.0; credential broker; MUST pole per doména |
| části balíčku | 0 (rc2, mapa), I (historie 9, 10), IV (binding pryč z contextu, Ed25519, IV-1/IV-8 vyřešeno, 4.0b), VIII (T19), X (stav po 2. kole), XII (slabiny 5/14/15, verze, adopční plán s prvním řezem a měřením) |

## 14.4 Co zůstává otevřené, a kde se to rozhodne

| Položka | Kde se rozhodne |
|---|---|
| cena MUST sady (odhad 20 h) | první implementace, měřeno do HANDOFF; nad 40 h přehodnotit III §7 |
| in-process izolace hostu na reálném runtime | pentest po prvním hostu se dvěma handlery; podmínka 1.0 |
| credential broker uvnitř jednoho deployable | druhý `MEDIUM` handler v témže hostu |
| kompromitace gateway samotné | přiznané: gateway je `CRITICAL` / `PROCESS` |
| golden set labelovaný autorem promptu, separation of people | přiznané meze solo provozu |
| X-22 (kde se norma začne obcházet) | jen první implementace |

## 14.5 Rozhodnutí o dalším postupu

Všechny čtyři posudky se nezávisle shodly, že další oponentura na papíře přinese méně než první dvě reálné kostky. Autor s tím souhlasí a zapisuje jako závazek: **žádné 1.0-rc3 bez kódu.** Další verze tohoto balíčku vznikne až s evidencí z první implementace podle XII.G (M1 až M3), a její část XV bude protokol implementace, ne oponentury.
