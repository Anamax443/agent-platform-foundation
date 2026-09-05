# ARCHITECTURE — jak je repozitář poskládaný

Tento repozitář neobsahuje běžící software. Obsahuje normy, kontrakty a evidenci. „Architektura" tady znamená, jak spolu dokumenty souvisejí a v jakém pořadí se čtou a mění.

## Vrstvy normativity

```text
FOUNDATION-core.md          ZÁVAZNÉ   8 invariantů + přímé kontrakty
VERIFICATION-CONTRACT.md    ZÁVAZNÉ   jak se každý invariant dokazuje
contracts/*.schema.json     ZÁVAZNÉ   strojová podoba kontraktů
EVIDENCE-MATRIX.md          DATA      co v reálných projektech je a není
PLATFORM-NOTES.md           BACKLOG   kandidáti a odložené věci s triggery
docs/history/               ARCHIV    předchozí drafty, jen ke čtení
```

Pravidlo: nic se nepřesune z `PLATFORM-NOTES.md` do `FOUNDATION-core.md` bez záznamu v `EVIDENCE-MATRIX.md` (`EXISTS × 2`) a bez odpovídajícího Test ID ve `VERIFICATION-CONTRACT.md`.

## Tok při návrhu nové komponenty

```text
ai-agenti/sablony/navrhovy-list.md     (co agent dělá, brány, vstupy, selhání)
            |
            v
FOUNDATION-core.md §1–§7               (invarianty, role, kontrakty)
            |
            v
contracts/module-descriptor.v1         (deklarace capabilities + profilů)
            |
            v
VERIFICATION-CONTRACT.md §1            (profily -> povinné testovací rodiny)
            |
            v
implementace + conformance balíček     (schema, fixtures, golden, errors.md)
            |
            v
CI gates                               (build, unit, ARCH-DEP, secret scan, CTR, + podle profilu)
```

## Tok při rozšiřování Core

```text
projekt A  +  projekt B
      |
      v
EVIDENCE-MATRIX.md    stejný mechanismus, stejná sémantika, EXISTS x 2?
      |  ne -> zůstává v PLATFORM-NOTES s triggerem
      | ano
      v
kontrakt + conformance test            (implementace zůstává v projektech)
      |
      v
třetí použití nebo divergentní chyba
      |
      v
sdílený balíček                        (owner, verze, breaking-change strategie)
```

## Vztah dokumentů ke kontraktům

| Sekce jádra | Schéma |
|---|---|
| §4.1 envelope | `contracts/message-envelope.v1.schema.json` |
| §4.2, §4.3 trusted context + binding | `contracts/trusted-context.v1.schema.json` |
| §4.4, §4.5, §5.1 result, error, stavy | `contracts/result-envelope.v1.schema.json` |
| §8 profily, §3 executor deklarace, příloha A verze | `contracts/module-descriptor.v1.schema.json` |

Změna sekce jádra bez změny schématu, nebo naopak, je chyba. `scripts/validate-contracts.mjs` hlídá alespoň to, že schémata kompilují, příklady procházejí a negativní případy padají.

## Co tady záměrně není

- runtime knihovna nebo SDK,
- volba brokeru, DB, cloudu, identity providera,
- business pravidla jakékoli domény,
- kód z pracovních projektů (USB Guardian je jen pattern source).

## Historie

`docs/history/` drží tři drafty z 5. 9. 2026 v původní podobě. v0.1 (74 sekcí bez priorit), v0.2 (155 kapitol, INVARIANT/CANDIDATE/DEFERRED) a oponentura v0.2 (1 741 řádků, z toho příloha A 1 324 řádků šablonového textu). Tento repozitář je jejich redukce na to, co je vymahatelné.
