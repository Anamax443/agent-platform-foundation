# ČÁST VIII — Threat model

Matice v části III §4 mapuje hrozbu na test. Tato část ke každé hrozbě dodává **útočníka, cestu, aktivum, kontrolu, zbytkové riziko a otevřenou otázku.** Oponenti bezpečnosti by měli hledat cestu, kterou kontroly nepokrývají.

Útočníci, se kterými počítáme:

| Kód | Útočník | Schopnost |
|---|---|---|
| A1 | externí odesílatel obsahu | pošle e-mail, PDF, dokument, webovou stránku; nemá účet |
| A2 | kompromitovaný externí systém | registr, tool, API třetí strany vrací škodlivou odpověď |
| A3 | uživatel jiného tenantu | má platnou identitu v tenantu B, chce data nebo akce tenantu A |
| A4 | kompromitovaná AI komponenta | útočník ovládá výstup modelu nebo celý agent proces |
| A5 | insider s rolí reviewer | legitimní role, zneužití nad rámec |
| A6 | síťový útočník uvnitř | čte a přehrává zprávy na transportu |
| A7 | provozní chyba | ne útočník, ale způsobí stejný dopad (restart, plná fronta, expirovaný klíč) |

---

## T1 Prompt injection přes obsah (A1)

**Cesta.** Instrukce v e-mailu, PDF, OCR textu, webu. Model ji interpretuje jako příkaz.

**Aktivum.** Write capabilities (e-mail, platba, DMS), data jiných dokumentů.

**Kontroly.** F1: agent nemá write credential ani scope. F2: výstup modelu prochází schématem a allowlistem enumů; text nemá kam přetéct. Allowlist capabilities, které agent smí navrhovat. Executor přijímá jen typed command z allowlistu příjemců/prostředků. Untrusted obsah obalen oddělovači v promptu (jw vzor `<inzerat>`).

**Testy.** `SEC-INJ-001`, `SEC-PRIV-001`, `SEC-PRIV-002`.

**Zbytkové riziko.** Injection, která nemění strukturu, ale **hodnotu** ve schématu: „bankovní účet je CZ12…" v textu faktury může model vypsat jako `bankAccount`. To není bypass F1, je to chyba extrakce; brání jí validace (registr, vendor master) a review. Kritické pole bez nezávislé validace je díra.

**Otevřená otázka.** Má norma vyžadovat nezávislou validaci pro každé pole s `riskClass ≥ HIGH` dopadem (bankovní účet, částka)? Dnes je to policy per tenant (IX), ne invariant. Otázka X-20.

## T2 Tool injection (A2)

**Cesta.** Odpověď toolu nebo jeho popis obsahuje „použij capability X". Agent dynamicky rozšíří své akce.

**Kontroly.** F2: odpověď toolu je untrusted. Allowlist capabilities agenta je statický v descriptoru, ne z runtime. Router odmítne capability mimo `scopes` contextu.

**Testy.** `SEC-TOOL-001`.

**Zbytkové riziko.** Tool vrátí data, která **jsou** v allowlistu (např. „IČO je 99999999"), a agent je zpracuje jako pravdu. Kryje T1 zbytkové riziko: validace a review.

## T3 Confused deputy (A3, A4, A6)

**Cesta.** Komponenta oprávněná pro tenant A předá request dál způsobem, který ztratí vazbu na původní identitu; příjemce provede akci pod svou vlastní, širší autoritou. Nebo útočník připojí context tenantu B ke commandu tenantu A na frontě.

**Kontroly.** F4: `originatingActorId` přes celý řetězec; context vázán ke zprávě per transport (binding rule); executor porovnává tenant contextu s tenantem prostředku v payloadu (`pay-4411` patří 42); `expiresAt`.

**Testy.** `SEC-CTX-002`, `SEC-CTX-003`, `SEC-CTX-004`, mutant `MUT-CTX-001`.

**Zbytkové riziko.** Binding mechanismus je nevybraný (ADR-001). Adapter s `mechanism: broker-identity` spoléhá na to, že broker skutečně izoluje producenty per tenant; to je konfigurace mimo kód. Rotace podpisového klíče uprostřed dispatch (viz vzorový nález v 0.5).

**Otevřená otázka.** Má norma pro `riskClass ≥ HIGH` vyžadovat `signed-envelope` bez ohledu na transport? Otázka X-10.

## T4 Cross-tenant únik přes datové povrchy (A3)

**Cesta.** DB dotaz bez tenant filtru; cache klíč bez tenantu; job bez contextu; search index sdílený; object storage cesta odhadnutelná; log agregace; export; AI trace; review task podle id.

**Kontroly.** F4 + II §6.2 seznam povrchů, každý s negativním testem. Tenant filtr v datové vrstvě (repository/wrapper), ne v UI. Dva tenanti ve výchozí fixture.

**Testy.** `TEN-DB-001`, `TEN-CACHE-001`, `TEN-QUEUE-001`, `TEN-INDEX-001`, `TEN-STORE-001`, `TEN-LOG-001`, `TEN-REVIEW-001`, mutanty `MUT-TEN-001..002`, `MUT-CTX-002`.

**Zbytkové riziko.** Povrch, který v seznamu není: metriky (label s `invoiceId`), chybové hlášky s obsahem, backup/restore (obnova tenantu A přepíše B), dočasné soubory. Evidence: 0/5 projektů má `TEN` kandidáta, takže žádný z testů dnes neběží.

**Otevřená otázka.** Je seznam povrchů úplný? Otázka X-11.

## T5 Replay write commandu (A6, A7)

**Cesta.** Stejný command doručen N× (at-least-once, retry, útočník přehraje zachycenou zprávu).

**Kontroly.** F6: `idempotencyKey`, executor vrací původní outcome; `notValidAfter` omezuje okno; podepsaná obálka brání modifikaci; `messageId` dedup na transportu.

**Testy.** `IDM-REPLAY-001`, `IDM-DEADLINE-001`, mutant `MUT-IDM-002`.

**Zbytkové riziko.** Replay **po** expiraci technického dedup záznamu (T6). Replay s **novým** `idempotencyKey`, který útočník zvolí sám: proti tomu chrání jen to, že vytvořit validní command vyžaduje scope a podpis contextu; útočník s tím už má vše.

## T6 Expirace idempotency evidence (A7)

**Cesta.** Dedup cache TTL 24 h, command dorazí po 25 h. Nebo archivace idempotency tabulky.

**Kontroly.** ADR-006: `idempotencyRetention` deklarovaná; pro IRREVERSIBLE `business-identity` v cílovém systému.

**Testy.** `IDM-RET-002`.

**Zbytkové riziko.** Cílový systém business identitu nepodporuje (banka bez `endToEndId`). Pak reconciliation záznam musí být trvalý a před každým `payment.execute` se dotazovat. Cena: jeden dotaz navíc na každou platbu.

## T7 Neznámý výsledek externí operace (A7)

**Cesta.** Timeout po odeslání; odpověď ztracena; systém neví, zda platba proběhla.

**Kontroly.** F5, F6: `UNKNOWN_OUTCOME` není terminal; `unknownOutcomeRecovery` z descriptoru (`query-external-status`, `reconcile`, `human-review`); blind resend zakázán.

**Testy.** `WF-UNK-001`, `RES-CRASH-001`.

**Zbytkové riziko.** Cílový systém nemá dotaz na stav (T6 stejný kořen). Reconciliation, která sama skončí `UNKNOWN`: norma nedefinuje limit rekurze; po N pokusech `human-review`. Není zapsáno jako pravidlo. Otázka X-16.

## T8 Expirovaný nebo opožděný command (A7)

**Cesta.** Fronta stojí hodinu; command k platbě vytvořený v 10:00 dorazí v 11:00, kontext se mezitím změnil (schválení odvoláno, účet změněn).

**Kontroly.** `notValidAfter` kontrolován executorem těsně před side effectem, ne jen routerem.

**Testy.** `IDM-DEADLINE-001`, mutant `MUT-IDM-001`.

**Zbytkové riziko.** Hodiny executora a orchestrátoru se rozcházejí. Norma neříká toleranci ani zdroj času. Otázka X-17.

## T9 Zneužití review role (A5)

**Cesta.** Reviewer schválí task, který mu nepatří; schválí mimo `allowedDecisions`; vloží approval bez vazby na task; použije reviewer roli k admin akci.

**Kontroly.** F7: decision je autorizovaný přechod vázaný na `reviewTaskId`, tenant a roli; `approvalId` vázaný na workflow; reviewer role bez admin práv; `authStrength` požadavek pro platbu (`oidc-user`).

**Testy.** `WF-REV-004`, `TEN-REVIEW-001`, mutant `MUT-WF-001` (expiry).

**Zbytkové riziko.** Jeden člověk je zároveň reviewer, approver a autor pravidel (solo operátor). Separation of duties je v normě (approve ≠ execute), ale ne separation of people. Přiznaná mez.

## T10 Expirace review (A7)

**Cesta.** Task nikdo nevyřídí; workflow visí navždy; nebo naopak po expiraci tiše pokračuje.

**Kontroly.** `expiryPolicy` povinná; `ESCALATE` s cílem; nikdy „nic".

**Testy.** `WF-REV-003`.

**Zbytkové riziko.** `ESCALATE` bez `escalateTo` (nález 6.7.3). Řetěz eskalací bez konce.

## T11 Downgrade na zranitelnou verzi (A3, A6)

**Cesta.** Provider nabízí v1 i v2; v1 má známou slabinu; útočník vyžádá v1.

**Kontroly.** Router může verzi zakázat bez ohledu na kompatibilitu (příloha A jádra, „security beats compatibility").

**Testy.** `COMP-DOWN-001`.

**Zbytkové riziko.** Zakázání verze rozbije legitimní consumery; norma říká „měřené ověření, že ji nikdo nepoužívá", ale u bezpečnostní slabiny se čekat nedá. Provozní rozhodnutí.

## T12 Otrávený artefakt mezi kroky (A4, A6)

**Cesta.** Dokument je mezi extrakcí a zápisem vyměněn; zapisuje se něco jiného, než co bylo validováno.

**Kontroly.** F7: hash originálu v každém odkazu; executor porovnává hash artefaktu s hashem ve validačním výsledku.

**Testy.** `SEC-ART-001`.

**Zbytkové riziko.** Hash se porovnává jen tam, kde to executor implementuje. Norma to vyžaduje pro profil `EVIDENCE`, ale test `SEC-ART-001` nemá mutant. Otázka X-9.

## T13 Model drift (A7, nepřímo A2 jako provider modelu)

**Cesta.** Provider změní model pod stejným id; nebo upgrade; extrakce se změní bez změny kódu.

**Kontroly.** Pinovaný `modelId`, `promptVersion` v provenance, `AI-EVAL-REG-001` s `criticalFields` BLOCK, periodický drift check bez změny kódu.

**Testy.** `AI-EVAL-REG-001`, `AI-EVAL-DRIFT-001`.

**Zbytkové riziko.** Golden set labeluje stejný člověk, který píše prompt (solo). Provider může model změnit pod stejným id; drift check ho odhalí až po faktu.

## T14 Stale nebo uniklé credentials (A6, A7)

**Cesta.** Expirovaný credential executora; uniklý token v logu; UI-zapisovatelný secret v DB.

**Kontroly.** II §6.4: vlastní identita per executor, rotace old+new, expirace → deny, secret mimi prompt a log. Evidence: jw má plaintext secrets v D1 a surová těla odpovědí v logu; gm plaintext tokeny v KV a DO.

**Testy.** `SEC-CRED-001`; secret scan v CI.

**Zbytkové riziko.** Norma neříká, kde secrets žijí (vault vs. platform secrets). Rotace uprostřed běžících dispatch (viz T3).

## T15 Únik přes logy a AI trace (A3, A5)

**Cesta.** Support čte agregované logy; AI trace obsahuje celý dokument; error message obsahuje surové tělo odpovědi s osobními údaji.

**Kontroly.** ADR-007: pět kategorií s ACL; AI trace neduplikuje dokumenty; `message` v error objektu bez tajemství a bez surového untrusted obsahu; logy nesou `tenantId`.

**Testy.** `TEN-LOG-001`, `EVD-004`.

**Zbytkové riziko.** Test `EVD-004` ověřuje oddělení kategorií, ne obsah každé zprávy. Únik přes `details` error objektu (strukturované, ale s obsahem) je možný. Otázka X-18.

## T16 Provozní selhání s bezpečnostním dopadem (A7)

**Cesta.** Plná fronta vrátí 202 a zprávu zahodí; restart uprostřed kroku; nedostupná policy služba; plný disk audit logu.

**Kontroly.** F5 no silent branch; `RES-STOR-001` bez falešného 202; `RES-CRASH-001`; ADR-011 fail-closed při výpadku policy.

**Testy.** `RES-STOR-001`, `RES-CRASH-001`, `RES-DEP-001`.

**Zbytkové riziko.** Plný audit log: zastavit zápisy (fail-closed, provoz stojí) nebo pokračovat bez auditu (fail-open, ztráta evidence)? Norma říká fail-closed jako default; provozní dopad je zastavení farmy kvůli disku. Otázka X-19.

## T17 Kompromitovaná AI komponenta (A4)

**Cesta.** Útočník ovládá celý proces agenta, ne jen výstup modelu.

**Kontroly.** F1: agent nemá write credential, i plně ovládnutý agent může jen vydávat commands v rámci svých `scopes`; router a executor je validují nezávisle (F4, allowlist). Blast radius = capabilities agenta.

**Testy.** `SEC-PRIV-001`, `SEC-CTX-002`.

**Zbytkové riziko.** Agent se `scopes` pro `document.classify` může vydávat nekonečně mnoho commandů (DoS na orchestrátor, náklady na model). Rate limit per actor je v policy, ne v normě. Agent může číst vše ve svém read scope; norma read scope neomezuje jemněji než capability.

## T18 Supply chain (A2)

**Cesta.** Závislost (npm balíček, model provider SDK) obsahuje škodlivý kód; artefakt nasazen bez ověření.

**Kontroly.** DEFERRED (IX): signing, SBOM až při distribuci mimo vlastní účet. Dnes: lockfile, secret scan.

**Zbytkové riziko.** Vysoké a přiznané. Pro solo portfolio na jednom cloud účtu je dopad omezený na účet; při prvním zákazníkovi se stává BLOCKER položkou.

## T19 Kompromitace podpisového klíče dispatch obálky (A4, A6)

**Cesta.** Sdílený symetrický klíč (HMAC) mezi gateway a všemi příjemci: kompromitace kteréhokoli příjemce nebo handleru s LOW riskem dává schopnost podepsat platnou dispatch obálku za kteroukoli capability včetně HIGH. Blast radius pečlivě omezený izolačními třídami se otevře přes podpisový klíč.

**Aktivum.** Autenticita každého commandu v multi-hop toku; celý bezpečnostní model F4.

**Kontroly.** Ed25519 jako default (II §4.3): privátní klíč jen v gateway, příjemci drží veřejný klíč a podepisovat neumí. HMAC jen uvnitř jednoho deployable. Rotace přes key registry příjemce s grace period. Handler nemůže podepsat za jiný handler ani za gateway (`SEC-HOST-002`).

**Testy.** `SEC-HOST-002`, `SEC-CRED-002`.

**Zbytkové riziko.** Kompromitace gateway samotné = kompromitace všeho; gateway je proto `PROCESS` izolace a `CRITICAL` risk class bez ohledu na to, co routuje. Privátní klíč v gateway musí být v platform secret bindingu, ne v konfiguraci.

**Přidáno v 1.0-rc2** na základě 2. kola oponentury.

---

## Souhrn zbytkových rizik pro oponenty

| Riziko | Kde v normě | Stav |
|---|---|---|
| binding mechanismus nevybraný | ADR-001, II §4.3 | záměrně otevřené |
| povrchy tenant izolace možná neúplné | II §6.2 | otázka X-11 |
| reconciliation bez limitu rekurze | II §5.1 | otázka X-16 |
| tolerance hodin mezi komponentami | II §5.4 | otázka X-17 |
| separation of people u solo operátora | F7 | přiznaná mez |
| golden set labeluje autor promptu | III §10 | přiznaná mez |
| `SEC-ART-001` bez mutantu | III §6 | otázka X-9 |
| únik přes `details` error objektu | II §4.5 | otázka X-18 |
| plný audit log: fail-closed zastaví farmu | ADR-011 | otázka X-19 |
| supply chain odloženo | IX | přiznané |
| rate limit per actor mimo normu | T17 | otázka X-21 |
| kompromitace gateway = kompromitace podpisu | T19 | gateway je CRITICAL / PROCESS; přiznané |
| in-process izolace `LOGICAL` hostu neověřená pentestem | T3, II §3.2 | podmínka 1.0 (IX) |
