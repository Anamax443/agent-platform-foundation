# ČÁST X — Otázky pro oponenty

Číslované, aby se na ně dalo odkazovat. U každé je uvedeno, jak vypadá odpověď, která autorovi pomůže. Otázky označené ★ považuje autor za nejdůležitější.

## Stav po 1. kole oponentury

| Otázka | Stav | Výsledek v 1.0-rc |
|---|---|---|
| X-2 | vyřešeno | F8 přesunut do §9 jako procesní pravidlo P1; sedm runtime invariantů |
| X-4 ★ | vyřešeno | izolační třídy `LOGICAL` / `PRINCIPAL` / `PROCESS`, minimum z `riskClass`, `SEC-HOST-001` + `MUT-HOST-001` |
| X-9 | vyřešeno | `SEC-HOST-001` má mutant; `MUT-ART-001`, `MUT-EVD-001` jako CANDIDATE |
| X-10 | vyřešeno | `signed-envelope` je default pro každý hop přes hranici procesu bez ohledu na riskClass; alternativy jen s doloženou ekvivalencí |
| X-14 | vyřešeno | `reissuable` v error objektu, tabulka platformových kódů |
| X-15 | vyřešeno | `escalateTo` povinné, `maxEscalationDepth` |
| X-16 | vyřešeno | `reconciliationBudget` default 3 → `WAITING(REVIEW)`, `WF-UNK-002` |
| X-17 | vyřešeno | tolerance 30 s, log skew nad 5 s, `IDM-DEADLINE-002` |
| X-18 | vyřešeno | `EVD-005` scan error objektů |
| X-19 ★ | vyřešeno | provozní režimy §6.6; plný audit store → `READ_ONLY`, ne zastavení farmy; `RES-STOR-002` |
| X-22 ★ | částečně | MUST/CONDITIONAL rozdělení profilu, testovací podpora mimo Core Admission, odhad pro první komponentu revidován; odpověď na „kde se to obejde" zůstává otevřená do první implementace |
| X-23 | vyřešeno | generátor a fixtures jsou součást kontraktového balíčku, ne runtime Core; catch-22 odstraněn |
| IV-2, IV-3, IV-6 | vyřešeno | viz část IV 4.0 |
| ostatní (X-1, X-3, X-5 až X-8, X-11 až X-13, X-20, X-21, X-24 až X-30) | otevřené | čekají na 2. kolo nebo na první implementaci |

Nové otázky pro 2. kolo: IV-8 (HMAC vs Ed25519), X-31 (je `MUST` sada osmi testů a čtyř mutantů správné minimum pro první executor?), X-32 (má `INT-E2E-001` běžet i pro workflow bez `external-write` kroku?).

## Stav po 2. kole oponentury

| Otázka | Stav | Výsledek v 1.0-rc2 |
|---|---|---|
| IV-1 | vyřešeno | čistý výpočet = `query`; command vždy s klíčem a deadline; dummy hodnoty = porušení |
| IV-8 | vyřešeno | Ed25519 default; HMAC jen v jednom deployable; T19 |
| X-20 | vyřešeno | sémantický validátor povinný pro pole vybírající cíl side effectu u `riskClass ≥ HIGH`; `SEC-SEM-001` |
| X-31 | částečně | MUST sada zůstává; adopční plán měří čas a nad 40 h vrací III §7 k přehodnocení (XII.G) |
| X-32 | vyřešeno | `INT-E2E-001` jen pro workflow s alespoň jedním write krokem |
| X-22 ★ | otevřeno | zodpoví první implementace; žádné další textové kolo |

Otázky pro 3. kolo nevypisujeme. Třetí kolo proběhne nad kódem první dvojice komponent, ne nad tímto dokumentem.

## Stav po 3. kole (errata rc2.1)

Třetí kolo proběhlo přesto nad textem, protože poradci reagovali na rc2. Přineslo jeden skutečný rozpor (sémantické validátory bez místa v descriptoru), který errata opravují, a několik zpřesnění. Žádná nová otázka pro čtvrté textové kolo. Otázky X-1, X-3, X-5 až X-8, X-11 až X-13, X-21, X-22, X-24 až X-30 zůstávají otevřené a zodpoví je první implementace.

## Invarianty (část II §1)

**X-1 ★** Je sedm invariantů F1–F7 (plus procesní P1, P2) správná množina? Který z nich jsou ve skutečnosti dva? Který chybí? Užitečná odpověď: návrh formulace chybějícího invariantu + jaký test ho vynutí + proč nejde vyjádřit jako součást existujícího.

**X-2** F8 (verifiable architecture) je meta-invariant o normě samotné. Patří mezi runtime invarianty, nebo do procesních pravidel vedle Core Admission? Autor ho drží mezi invarianty, aby `UNVERIFIED` blokoval release stejně jako selhaný test.

**X-3** F2 říká „AI-generated content is data". Znamená to, že výstup deterministického modulu je trusted? Autor: ano, pokud modul sám nezpracovává untrusted vstup bez validace. Je to dost přesné?

## Executor model (část II §3)

**X-4 ★** Executor Host (ADR-003): je in-process oddělení handlerů s oddělenými credential referencemi dostatečné pro `riskClass: HIGH`? Kde je hranice, za kterou musí být samostatný proces? Užitečná odpověď: konkrétní útok, který host nezastaví a proces ano.

**X-5** Rozhodovací řetězec II §3.3 má deset kroků v pevném pořadí. Je pořadí správné? Konkrétně: idempotency check (8) je až po human approval (6). Argument autora: duplicitní command s platným approval má vrátit původní outcome, ne selhat na approval. Protiargument: dedup dřív šetří práci. Co je správně?

## Core Admission (část II §9, ADR-008)

**X-6 ★** `EXISTS × 2`: evidence z pěti projektů pustila jediný mechanismus. Je práh správně, nebo je portfolio příliš heterogenní na to, aby pravidlo dávalo smysl? Alternativa: `EXISTS × 1` + `DESIGNED × 1` pro dokumentové projekty.

**X-7** „Kontrakt první, implementace až při třetím použití." Nevede to k tomu, že tři projekty budou mít tři různé implementace téhož kontraktu, a extrakce bude dražší než dřív? Kde je bod, kdy duplicita stojí víc než abstrakce?

## Verifikace (část III)

**X-8 ★** Je Verification Contract vymahatelný pro jednoho člověka? Kolik z 33 řádků matice by první `WRITE_EXECUTOR` komponenta musela reálně splnit a kolik práce to je? Užitečná odpověď: odhad v hodinách pro jednu komponentu s jednou write capability.

**X-9** Mutanty (III §6) jsou definované jen pro `SEC`, `TEN`, `IDM`, `WF-REV`. Které BLOCK testy by měly mít mutant a nemají? Kandidát autora: `SEC-ART-001` (hash mezi kroky), test, že handler A nemůže načíst credential B (nemá ani Test ID).

**X-10** Má norma pro `riskClass ≥ HIGH` vyžadovat `binding.mechanism: signed-envelope` bez ohledu na transport?

**X-11 ★** Seznam povrchů tenant izolace (II §6.2): DB, cache, fronty, search, storage, logy, exporty, AI trace, review, support dashboard. Co chybí? Kandidáti autora: metriky s labely, chybové hlášky, backup/restore, dočasné soubory, e-mailové notifikace (příjemce z jiného tenantu).

**X-12** Flaky policy (III §9): 14 dní výjimky s manuální evidencí. Je to příliš benevolentní, nebo příliš přísné pro solo provoz?

**X-13** AI-EVAL (III §10): `criticalFields` s BLOCK regresí bez ohledu na agregát. Jak definovat „regresi" u pole s malým počtem vzorků v golden setu (např. 3 faktury s IBAN)? Statistická otázka, na kterou autor nemá odpověď.

## Kontrakty (část IV)

**X-14** Nález 6.7.1: `retryable` (executor) vs. `reissuable` (orchestrátor). Má obálka nést obě vlastnosti, nebo je `reissuable` vlastnost kódu chyby v tabulce `CTR-ERR`?

**X-15** Nález 6.7.3: `expiryPolicy: ESCALATE` bez `escalateTo`. Přidat `escalateTo` jako podmíněně povinné pole review tasku? A limit délky eskalačního řetězce?

**X-16** Reconciliation, která sama skončí `UNKNOWN`: má norma definovat limit pokusů a přechod do `human-review`? Návrh autora: `reconciliationBudget` v descriptoru, default 3.

**X-17** Tolerance hodin mezi orchestrátorem a executorem při kontrole `notValidAfter`. Návrh autora: executor přijme command s `notValidAfter` do +30 s tolerance, ale zaloguje skew nad 5 s. Je to rozumné?

**X-18** `details` v error objektu je „strukturované, bez untrusted obsahu v surové podobě". Jak to testovat? Kandidát: `EVD-005` scan error objektů na patterny (e-mail, IBAN, delší než N znaků).

**X-19 ★** Plný audit log: fail-closed zastaví farmu. Je to správné pro solo portfolio, kde není nikdo, kdo by disk v noci uvolnil? Alternativa: degradovaný režim `READ_ONLY` (kill switch z v0.1 §48), kde se čte, ale nezapisuje.

**X-20** Má být nezávislá validace (registr, vendor master) povinná pro každé pole, jehož chyba vede k `riskClass ≥ HIGH` side effectu? Dnes per-tenant policy. Autor se kloní k invariantu pro platební údaje.

**X-21** Rate limit per actor (T17) je mimo normu. Patří do descriptoru (`maxCommandsPerMinute`), do policy, nebo je to provozní věc?

Otázky IV-1 až IV-7 z části IV (obálka: `idempotencyKey` u commandů bez side effectu; `binding` uvnitř vs. vně; `actorType` množina; povinnost `provenance`; `WAITING` jako status výsledku; descriptor jako tři role; chybějící negativní testy) patří sem také.

## Ekonomika a udržitelnost

**X-22 ★** Kde norma vytváří práci, kterou jeden člověk neunese, a kde se proto začne obcházet? Užitečná odpověď: konkrétní pravidlo + odhad ceny + co by se místo něj v praxi udělalo.

**X-23** Testing tax (III §7): generování testů z descriptoru a izolace ve wrapperu. Je to reálné bez frameworku, který norma zakazuje stavět? Nebo je generátor testů první legitimní sdílený nástroj?

**X-24** Předatelnost za pět let: co v balíčku chybí, aby cizí člověk převzal provoz? Runbook? Příklad incidentu od detekce po uzavření?

## Evidence (část V)

**X-25** Byla sémantická shoda posouzena správně? Konkrétně: „deterministický kód gateuje výstup modelu" je označeno EXISTS ×3 (jw region gate, fh rubric bez score pole, dl whitelist). Jsou to opravdu tři instance téhož, nebo tři různé věci se stejným popisem?

**X-26** Chybí v matici dimenze, která by změnila závěr? Kandidáti: „konfigurace jako kód", „lokalizace", „migrace DB".

## Bezpečnost (část VIII)

**X-27 ★** Který útok normou projde? Užitečná odpověď: útočník (A1–A7), cesta krok za krokem, která kontrola měla zasáhnout a proč nezasáhla.

**X-28** T9: separation of duties bez separation of people. Existuje technická náhrada pro solo operátora (např. časový odstup mezi prepare a execute, druhý kanál potvrzení)?

**X-29** T18 supply chain je odloženo. Je to obhajitelné i pro portfolio, které je veřejně nasazené (domlov bez autentizace)?

## Forma

**X-30** Je jádro (II) čitelné za třicet minut? Které sekce by šly zkrátit bez ztráty vymahatelné vlastnosti? Které naopak potřebují příklad?

---

## Hodnoticí list

Prosíme o vyplnění místo číselného skóre. Součty nálezů podle závažnosti říkají víc než průměr.

| Oblast | BLOCKER | MAJOR | MINOR | NOTE | Nejdůležitější nález (číslo sekce) |
|---|---|---|---|---|---|
| II Invarianty | | | | | |
| II Role a executor | | | | | |
| II Kontrakty a stavy | | | | | |
| II Tenant a security | | | | | |
| II Evidence | | | | | |
| II Core Admission | | | | | |
| III Verifikace | | | | | |
| IV Schémata | | | | | |
| VI Příklady vs. norma | | | | | |
| VII ADR | | | | | |
| VIII Threat model | | | | | |
| V Evidence matrix | | | | | |
| Forma a čitelnost | | | | | |

Souhrnný verdikt (jeden z):

- **PŘIJMOUT** jako v1.0 s opravou MINOR,
- **PŘEPRACOVAT** uvedené sekce, pak přijmout,
- **ODMÍTNOUT** s uvedením BLOCKER nálezů.

Pokud oponent přesto chce dát číslo, prosíme o zveřejnění rubriky: které oblasti, jaké váhy, jak se počítá celek.
