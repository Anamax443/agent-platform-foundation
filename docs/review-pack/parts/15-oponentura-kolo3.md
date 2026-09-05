# ČÁST XV — Protokol 3. kola oponentury (errata rc2.1)

| | |
|---|---|
| **Předmět** | balíček v1.0-rc2 |
| **Posudky** | čtyři, tytéž zdroje jako v předchozích kolech, označené 1 až 4 |
| **Výsledek** | 14 nálezů: 11 přijato, 1 přijato s úpravou, 1 odmítnut s důvodem, 1 vzat na vědomí; vydání 1.0-rc2.1 jako **errata**, ne nová revize |
| **Proč kolo proběhlo** | rc2 se označilo za poslední textové vydání; poradci přesto rc2 přečetli a jeden z nich našel skutečný rozpor mezi částmi II, III a IV. Rozpor mezi normativními částmi je podle vlastní části 0.4 nález nejvyšší priority a nelze ho nechat do kódu |

## 15.1 Posudky

| Posudek | Skóre | Verdikt | Hlavní nález |
|---|---|---|---|
| 1 | 9,3 (architektura 9,6) | rc2.1 jen jako errata, pak kód | `SEC-SEM-001` požaduje vlastnost, kterou descriptor neumí vyjádřit; navrženo rozdělení claim (pole) / autorita (validátor v policy) |
| 2 | 9,0 | přijmout jako 1.0 s implementačním ověřením | žádný nový normativní nález; checklist pro první implementaci |
| 3 | bez skóre | připraveno k implementaci po opravách | `PRINCIPAL` přes broker v témže procesu je RCE obejitelný; in-flight externí volání při migraci; klíč platný v čase podpisu; stav publikovaný během reconciliace |
| 4 | 9,4 | přijmout po dvou MAJOR | totéž o `SEC-SEM-001`; cena `PRINCIPAL` na Workers (jeden Worker na handler); `MUT-HOST-001` není 5 řádků |

Rozptyl skóre 0,4 bodu. Posudky 1 a 4 našly stejný rozpor nezávisle; posudek 3 a 4 tlačily `PRINCIPAL` z opačných stran (bezpečnost vs. cena) a řešení muselo vyhovět oběma.

## 15.2 Nálezy a rozhodnutí

Rozhodnutí: **P** přijato, **PÚ** přijato s úpravou, **O** odmítnuto, **Z** vzato na vědomí.

| # | Nález | Kdo | Závažnost | Rozh. | Změna |
|---|---|---|---|---|---|
| 1 | Jádro a verifikace vyžadují sémantické validátory u HIGH, descriptor je neumí deklarovat; rozpor II/III/IV | 1, 4 | MAJOR | **P** | `effectFields` (pole + role, claim) a `semanticValidation.policyRef` (autorita v policy) v capability; schéma vyžaduje pro `HIGH`/`CRITICAL`; evidence validace v provenance payloadu; `SEC-SEM-001` přepsán na tři vrstvy; 3 negativní testy; ADR-015; II §1 F2, III §4 řádek 53, IV 4.5 |
| 2 | `PRINCIPAL` přes externí broker v témže procesu je z pohledu RCE stále `LOGICAL`; vyžadovat fyzicky oddělený execution context | 3 | MAJOR | **P** | `PRINCIPAL` = vlastní isolate / Worker / OS proces s bindingy scoped na něj; `PROCESS` = navíc vlastní security principal end-to-end; broker v procesu `PRINCIPAL` nevytváří; II §3.2, ADR-003 |
| 3 | `PRINCIPAL` na Workers = jeden Worker na handler; exploze deployables; chybí ekonomická analýza; zvážit MEDIUM jako LOGICAL s rozhodnutím | 4 | MAJOR | **PÚ** | hranice `PRINCIPAL` = credential doména, ne handler: handlery téže externí identity sdílejí context; tabulka ceny v IX §7 (10 LOW + 3 MEDIUM + 1 HIGH + 1 CRITICAL = 5 deployables, ne 15); generovaný `wrangler.jsonc` z descriptorů jako CANDIDATE. **Odmítnuta část:** MEDIUM jako `LOGICAL` s `isolationDecision`; `LOGICAL` s papírem je `LOW` s papírem |
| 4 | Atomická migrace neřeší asynchronní kroky s externím callbackem zahájené ve v1 a dokončené po přechodu na v2 | 3 | MAJOR | **P** | drained state jako podmínka migrace, jinak `MIGRATION_DEFERRED`; callback nese `executionId` a zpracuje se v kontextu verze, se kterou byl krok odeslán; `WF-VER-004`; II §5.7 |
| 5 | Zpráva zpožděná ve frontě přes grace period selže, ačkoli `signedAt` i `notValidAfter` spadaly do platnosti starého klíče | 3 | MINOR | **P** | key registry s okny platnosti; ověření proti klíči platnému v `signedAt`; odebrání klíče až po `validUntil + max deadlinePolicy`; `SEC-CRED-003`; II §4.3 |
| 6 | Stav publikovaný klientům během reconciliace není definován; hrozí předčasný `FAILED` a duplicitní požadavek zvenčí | 3 | MINOR | **P** | vždy `UNKNOWN_OUTCOME` s podstavem `IN_PROGRESS` / `AWAITING_REVIEW`; `WF-UNK-003`; II §5.1 |
| 7 | `MUT-HOST-001` není 5 až 10 řádků; vyžaduje resolver scopeovaný podle volajícího handleru | 4 | MINOR | **P** | `CredentialResolverFixture` v kontraktovém balíčku; mutant = flag v resolveru; III §6, §7 |
| 8 | Generátor kostry testů má generovat i mutant doubles, jinak je režie MUST mutantů příliš vysoká a vývojář bude obcházet deklaraci profilu | 3 | MINOR | **P** | generátor emituje doubles; obcházení deklarace odhalí `ARCH-DEP-001` a odvozené profily; III §7 |
| 9 | Threshold 2× u `RES-QUEUE-001` není zdůvodněn | 4 | MINOR | **P** | `maxQueueAgeFactor` konfigurovatelný per transport, default 2 s důvodem (1× pozdě, 3× dvě generace expirovaných); II §6.6 |
| 10 | Podpora Ed25519 na Cloudflare Workers | 4 | NOTE | **P** | poznámka v IX §7: WebCrypto Ed25519 od 2023, ověřit v `/health` gateway; fallback HMAC jen uvnitř jednoho deployable |
| 11 | „Čtyři strojové kontrakty" v části 0 | 1 | MINOR | **P** | opraveno na pět |
| 12 | Stale text „pravděpodobně signed-envelope (HMAC)" v XII.A | 1 | MINOR | **P** | řádek přepsán na stav po rc2 |
| 13 | Verzovat jako rc2.1 errata, ne rc3 | 1 | rozhodnutí | **P** | rc2.1; závazek „žádné rc3 bez kódu" trvá |
| 14 | Posudek 2: bez nových normativních nálezů, přijmout jako 1.0 s implementačním ověřením | 2 | — | **Z** | verze 1.0 zůstává podle XII.D vázaná na dvě implementace a pentest, ne na posudek |

## 15.3 Co se změnilo v souborech

| Soubor | Změna |
|---|---|
| `contracts/module-descriptor.v1.schema.json` | `effectFields[]` (field, role, validator), `semanticValidation { policyRef, evidenceField }`; podmínka `HIGH`/`CRITICAL` → obojí povinné; příklad doplněn |
| `scripts/validate-contracts.mjs` | 32 negativních případů (+3); `EVD-006` odmítlo původní ukázku v části VI, což je první doložený úlovek tohoto testu |
| `FOUNDATION-core.md` | 1.0-rc2.1; F2 mechanismus tří vrstev; §3.2 `PRINCIPAL` = vlastní execution context, hranice = credential doména, `PROCESS` = plus security principal end-to-end; §4.3 okna platnosti klíčů, ověření v `signedAt`; §5.1 publikovaný stav při reconciliaci; §5.7 drained state a `WF-VER-004`; §6.6 `maxQueueAgeFactor` |
| `VERIFICATION-CONTRACT.md` | 1.0-rc2.1; řádek 53 přepsán; řádky 54–56 (`WF-VER-004`, `SEC-CRED-003`, `WF-UNK-003`); §6 `CredentialResolverFixture`; §7 generátor doubles; registr |
| `PLATFORM-NOTES.md` | §7 cena izolace na Workers, Ed25519 podpora; číslování otázek |
| části balíčku | 0 (pět kontraktů, rc2.1, mapa XV), I (historie 11, 12), IV (4.0c, řádky `effectFields` / `semanticValidation`), VI (6.2 přepsáno na tři deployables, ukázka `bank-executor`), VII (ADR-003 revize, ADR-015), X (stav po 3. kole), XII (slabina 4, verze) |

## 15.4 Rozhodnutí o dalším postupu

Errata jsou vydána. Další verze tohoto balíčku vznikne z první implementace podle XII.G. Posudek 1 to formuloval přesně: další body může získat jen běžící kód.
