# ČÁST XII — Přílohy

## XII.A Slabiny přiznané autorem

Podrobnější verze seznamu z 0.6. Každá má dopad a co by ji odstranilo.

| # | Slabina | Dopad | Co ji odstraní |
|---|---|---|---|
| 1 | Nula implementací normy | všechno v částech II–IV je hypotéza, dokud nevznikne první komponenta | první `WRITE_EXECUTOR` komponenta napsaná proti kontraktům; druhá naplní `EXISTS × 2` |
| 2 | Profil `MULTI_TENANT` bez kandidáta | `TEN-*` testy nemají kde běžet; seznam povrchů je z hlavy, ne z incidentu | první `CLOUD_MULTI_TENANT` projekt (faxx-dox míří do firemního prostředí) |
| 3 | Injektovatelné hodiny nikde | deadline testy flaky z principu; nutnost `strictRequired: false` v Ajv je malý příklad téhož druhu kompromisu | `ClockFixture` v první nové komponentě |
| 4 | Binding mechanismus | vyřešeno v rc2: `signed-envelope` s Ed25519 jako default, privátní klíč jen v gateway; HMAC jen uvnitř jednoho deployable | zbývá: kompromitace gateway samotné (T19) |
| 5 | Executor Host neověřený | tvrzení o blast radius je logické, ne empirické | v 1.0-rc2: `PRINCIPAL` vyžaduje broker mimo proces (jinak je to `LOGICAL`), `SEC-HOST-002` proti podpisu za cizí handler; penetrační test in-process izolace je **podmínka přechodu na 1.0** |
| 6 | Golden set labeluje autor promptu | eval měří shodu autora se sebou samým | druhý labeler, i externí, na kritických polích |
| 7 | Evidence matrix je snímek | sémantická shoda posouzena čtením kódu, ne spuštěním; jeden den, pět repo | obnova podle BUILD při každém novém projektu; spustit conformance suite místo čtení |
| 8 | Bus factor jedna | norma může být správná a přesto neudržitelná | předatelnost: runbook, incident příklad, EN parita dokumentů |
| 9 | Solo separation of duties | approve ≠ execute je technické, ne personální | časový odstup, druhý kanál, externí approver pro HIGH |
| 10 | Supply chain odloženo | veřejně nasazené projekty bez SBOM a signing | trigger: první zákazník nebo první distribuce mimo vlastní účet |
| 11 | EN parita chybí | normy jen česky; README bilingvní | překlad po přijetí v1.0, ne dřív |
| 12 | Tři nálezy z vlastních příkladů (6.7) | norma nerozlišovala `retryable` a `reissuable`; `ESCALATE` bez cíle; příklad měl `error: null` | vyřešeno v 1.0-rc: `reissuable`, `escalateTo`, `EVD-006` |
| 13 | Rodina `INT` a golden master workflow jsou specifikace bez běžícího případu | evidence V: pět projektů, nula integrací mezi nimi; `INT-E2E-001` nikdy neběžel | první dvě komponenty, které si vyměňují zprávy (adopční plán M4) |
| 14 | Podpisový klíč HMAC sdílený mezi gateway a všemi příjemci | kompromitace jednoho příjemce = možnost podepisovat | vyřešeno v 1.0-rc2: Ed25519 default, T19; zbývá: kompromitace gateway samotné |
| 15 | MUST sada ≈ 20 h je odhad, ne měření | adopční plán může být dvakrát dražší | první implementace měří; nad 40 h se III §7 přehodnotí (XII.G) |

## XII.B Mapování na návrhový list `ai-agenti`

`sablony/navrhovy-list.md` má sekce: Základ, Vstupy, Nepřátelský vstup, Regulace a data, Scénáře, Dělba práce, Brány, Křížová kontrola, Limity, Paměť, Proaktivita, Selhání, Moduly, Pořadí stavby, Náklady. Tabulka říká, co z tohoto balíčku do které sekce patří a co v listu chybí.

| Sekce listu | Co z balíčku tam patří | Chybí v listu |
|---|---|---|
| Základ | capability name, deployment model, tenant mode, `riskClass` | deployment model, tenant mode |
| Vstupy | untrusted content seznam (F2), provenance vstupů | trustLevel vstupů |
| Nepřátelský vstup | T1, T2, `SEC-INJ-*`, allowlist capabilities agenta | allowlist capabilities, které agent smí navrhovat |
| Regulace a data | pět kategorií záznamů, retence per datová třída, AI Act profil | retence per datová třída jako povinný řádek |
| Scénáře | příklady VI jako vzor zápisu scénáře s obálkami | — |
| Dělba práce | role II §2: co dělá AI, co deterministický modul, co executor | executor jako samostatná role |
| Brány | review task, `expiryPolicy`, `humanApproval` per capability, `authStrength` | expiry policy, authStrength požadavek |
| Křížová kontrola | validace s provenance (`validation.status`, `provider`), T1 zbytkové riziko | — |
| Limity | rate limit per actor (X-21), per-request capy (V §1.15), `notValidAfter` | deadline commandu |
| Paměť | idempotency retention, dedup evidence | retence dedup |
| Proaktivita | scheduler jako `WAITING(SCHEDULE)`; `actorType` pro cron (IV-3) | — |
| Selhání | error class, `retryable`, tři třídy retry, `UNKNOWN_OUTCOME`, reconciliation, kompenzace | reversibility a compensation capability per write akce |
| Moduly | module descriptor, `verificationProfiles` | verifikační profily |
| Pořadí stavby | kontrakt → descriptor → profily → testy → implementace (ARCHITECTURE tok) | — |
| Náklady | AICOST evidence: capy ano, accounting nikde | účtování tokenů a peněz jako řádek |

Návrh: doplnit do listu osm řádků z pravého sloupce. Ne přepisovat list podle balíčku.

## XII.C Registr Test ID

Úplný registr je v části III, příloha. Zde jen počty a pokrytí invariantů.

| Invariant | Rodiny | Test ID (počet) | Mutanty |
|---|---|---|---|
| F1 privilege boundary | SEC-PRIV, SEC-INJ, MUT-PRIV | 4 | 1 |
| F2 untrusted data | SEC-INJ, SEC-TOOL, CTR | 5 | 0 |
| F3 contract boundary | CTR, CDC, ARCH-DEP, COMP-DOWN | 6 | 0 |
| F4 trusted context | TEN, SEC-CTX, SEC-CRED | 11 | 4 |
| F5 observable execution | WF, RES | 8 | 1 |
| F6 safe state change | IDM, WF-UNK | 5 | 2 |
| F7 evidence integrity | EVD, WF-REV, SEC-ART | 9 | 2 CANDIDATE |
| P1 verifiable architecture (procesní) | CI: `derivedProfiles == executedProfiles`, `EVD-006` | 1 | 0 |
| INT (integrace, průřezově F3, F5, F6) | INT-FAIL, INT-UPGRADE, INT-E2E, INT-REPLACE | 7 | 0 |

Pozorování po 1. kole: F1, F4, F6 mají MUST mutanty; F2, F3, F7 mají jen CANDIDATE. Rodina `INT` vznikla v 1.0-rc a nemá mutanty. To je přiznaná mez, ne opomenutí.

## XII.D Pravidla verzování tohoto balíčku

| Verze | Kdy |
|---|---|
| 1.0-draft | první verze balíčku; před oponenturou (5. 9. 2026 dopoledne) |
| 1.0-rc | po zapracování 1. kola (čtyři posudky, protokol v části XIII) |
| 1.0-rc2 | po zapracování 2. kola (část XIV) |
| 1.0-rc2.1 | **tento dokument**; errata po 3. kole (část XV): oprava rozporu II/III/IV u sémantických validátorů, zpřesnění `PRINCIPAL`, migrace s in-flight voláními; poslední textové vydání před kódem |
| 1.0 | po první implementaci ve dvou komponentách **a** po penetračním testu in-process izolace hostu (invarianty se stanou `ACCEPTED`) |
| 1.x | additive změny: nový Test ID, nová CANDIDATE položka, upřesnění bez změny významu |
| 2.0 | změna významu invariantu, změna obálky v1 → v2, změna prahu Core Admission |

Historie draftů zůstává v `docs/history/` a nemění se.

## XII.E Jak poslat zpětnou vazbu

1. Formát nálezu podle 0.5 (sekce, nález, důsledek, návrh, závažnost).
2. Odkazy na sekce ve tvaru `II §4.3`, `III §6`, `VI 6.2 trace B`, `ADR-003`, `T3`, `X-11`.
3. Hodnoticí list z části X vyplněný součty, ne průměry.
4. Souhrnný verdikt: PŘIJMOUT / PŘEPRACOVAT / ODMÍTNOUT.
5. Pokud oponent najde rozpor mezi příkladem (VI) a normou (II–IV), uvést obě místa; rozpor má nejvyšší prioritu.

Autor zapracuje nálezy do `1.0-rc` s changelogem, kde u každého nálezu bude uvedeno: přijato / přijato s úpravou / odmítnuto s důvodem.

## XII.F Změny oproti zdrojovým dokumentům

Pro oponenty, kteří četli předchozí drafty.

| Zdroj | Co bylo převzato | Co bylo změněno nebo vypuštěno |
|---|---|---|
| v0.1 | referenční architektura, tři typy komponent, manifest (10 vět), acceptance kritéria, do-not-build | 74 sekcí bez priorit → 8 invariantů + notes; obálka s `target` → capability + router; chybějící error kontrakt, tenant binding, kompenzace, delivery semantics doplněny |
| v0.2 | 12 invariantů → 8; trusted context oddělen; RETRYABLE není stav; quality retry s novým klíčem; UNKNOWN explicitní; at-least-once; error contract; workflow model; review contract; Core admission; evidence matrix (jako úkol) | 155 kapitol → 549 řádků jádra; evidence matrix vyplněna; verifikace z taxonomie na kontrakt |
| oponentura v0.2 | executor host; `notValidAfter`; idempotency retention; Verification Contract; Threat → Test → Gate; CTR-ERR; mutanty; conformance balíček; testing tax; flaky → UNVERIFIED; clock jako standard; orchestrátor bez domain entit; capability granularita | příloha A (1 324 řádků šablon) vypuštěna; skóre bez rubriky vypuštěno; doplněny dvě chybějící hrozby (log leakage, review abuse) |
| čtyři hodnocení | testing tax s generováním z descriptoru; izolace ve wrapperu; immutable workflow definice; fixture corpus; golden master; tolerance additive polí; strangler pattern (kontrakt první, implementace později) | skóre ignorována; jedno hodnocení opisovalo tabulku oponentury |
| 1. kolo oponentury 1.0-draft (čtyři posudky) | dispatch envelope s podpisem vně; default `signed-envelope` + rotace klíče; izolační třídy; odvozené profily; claim vs autorita; `reissuable`; `reconciliationBudget`; `MIGRATE_INSTANCE`; provozní režimy; conformance tiers; rodina `INT`; MUST/CONDITIONAL; lint pro hodiny; F8 → P1 | odmítnuto: linter místo mutantů; `MULTI_TENANT` jako CANDIDATE (profil je už podmíněný); `INT-COMP-001` jako samostatný test; detail v části XIII |
