# agent-platform-foundation

> English: [README.md](README.md)

> Jednou větou: závazná pravidla, kontrakty a verifikační požadavky pro modulární farmu AI agentů, deterministických modulů a jednoúčelových write executorů.

## Co to je

Malé závazné jádro plus důkazy, které ho odůvodňují. Platforma není runtime ani framework. Je to sada pravidel, která musí přežít výměnu message brokeru, workflow enginu, cloudu, LLM providera i jazyka implementace.

Základní myšlenka převzatá z metodiky `ai-agenti`: **AI rozpoznává, kód vykonává.** AI komponenta nikdy nedrží write credentials. Každý zápis jde přes scoped executor, který přijímá jen typed, validovaný command.

## Dokumenty

| Soubor | Role | Závazné |
|---|---|---|
| [FOUNDATION-core.md](FOUNDATION-core.md) | sedm runtime invariantů a dvě procesní pravidla, role komponent, executor model, message a result kontrakty, stavový model, tenant context, evidence minimum, Core Admission Process | **ano** |
| [VERIFICATION-CONTRACT.md](VERIFICATION-CONTRACT.md) | testovací rodiny, matice hrozba → test → gate, conformance balíček capability, mutanty, coding standardy pro testovatelnost, AI eval profil, CI gates | **ano** |
| [EVIDENCE-MATRIX.md](EVIDENCE-MATRIX.md) | co skutečně existuje v pěti reálných repozitářích (16 dimenzí × 5 projektů, odkazy soubor:řádek), co prochází Core Admission, nálezy k vrácení do projektů | data |
| [PLATFORM-NOTES.md](PLATFORM-NOTES.md) | CANDIDATE a DEFERRED backlog s explicitními triggery, design principy, checklist anti-patternů, otevřené otázky | ne |
| [contracts/](contracts/) | JSON Schema 2020-12: message envelope v1, trusted execution context v1, dispatch envelope v1 (podepsaný binding), result envelope v1, module descriptor v1 | **ano** |
| [docs/review-pack/](docs/review-pack/) | jednosouborový oponentní balíček pro externí poradce (`npm run build:pack`): vše výše plus průvodce pro oponenty, provedené příklady, ADR, threat model, otázky, glosář, adopční plán, ukázka incidentu | odvozené |
| [docs/history/](docs/history/) | drafty, které tento repozitář nahrazuje (v0.1, v0.2 a oponentura v0.2) | archiv |

## Jak to používat

1. Před návrhem agenta vyplnit `sablony/navrhovy-list.md` z `ai-agenti`, pak přečíst `FOUNDATION-core.md` (třicet minut).
2. Deklarovat komponentu v `module-descriptor` a zvolit verifikační profily. Profily určují povinné testovací rodiny.
3. Zprávy posílat podle envelope a result kontraktů. Nikdy nedávat `tenantId` ani `targetComponent` do business payloadu.
4. Nic se nestane sdíleným Core, dokud `EVIDENCE-MATRIX.md` neukáže stejný mechanismus se stejnou sémantikou ve dvou nezávislých projektech.

## Stav (5. 9. 2026, v1.0-rc2.1)

- **Zmrazeno pro implementaci na v1.0-rc2.1.** Čtyři kola oponentury, 80 nálezů, protokoly v částech XIII až XVI balíčku; poslední kolo 9,2 až 9,5 bez jediného MAJOR. `FOUNDATION-core.md`, `VERIFICATION-CONTRACT.md` a `contracts/*.schema.json` se mění jen s evidencí z kódu. Verzí 1.0 se stane po dvou implementovaných komponentách a penetračním testu izolace hostu (ADR-017).
- Evidence sken hotový na `job-watch`, `gmail-mcp`, `domlov`, `faxx-hr`, `faxx-dox`. Core Admission dnes prochází přesně jeden mechanismus: tvar `/version` endpointu. Žádný sdílený balíček zatím není odůvodněný.
- Doporučení první consumery: `job-watch` (result envelope, `/version`), pak `faxx-dox` fáze F1.
- Kontrakty validuje `npm test` (kompilace schémat, příklady, negativní případy). Viz [docs/BUILD.md](docs/BUILD.md).

## Související repozitáře

| Repozitář | Vztah |
|---|---|
| `ai-agenti` | metodický domov; návrhový list a build předpis |
| `faxx-dox` | první vertical slice: e-mail → dokument → extrakce → validace → review |
| `job-watch`, `gmail-mcp`, `domlov`, `faxx-hr` | reálné implementace skenované pro evidenci |
| `project-standard` | konvence repozitáře, které tento repozitář dodržuje |

## Licence

Proprietary, viz [LICENSE](LICENSE). Zdroje jsou čitelné jako ukázka práce, ne open source.
