# BUILD — jak repozitář postavit a ověřit od nuly

Repozitář je dokumentační. „Build" znamená: ověřit, že kontrakty jsou platná JSON Schema 2020-12, že jejich příklady procházejí a že negativní případy padají.

## Požadavky

- Node.js 20+ (LTS)
- npm

Žádná tajemství, žádné bindingy, žádný deploy.

## Kroky

```bash
git clone <remote> agent-platform-foundation
cd agent-platform-foundation
npm ci
npm test
```

`npm test` spustí `scripts/validate-contracts.mjs`:

1. načte každé `contracts/*.schema.json`,
2. zkompiluje ho Ajv 2020 s `ajv-formats` (formát `date-time`),
3. zvaliduje všechny `examples` uvnitř schématu (musí projít),
4. spustí negativní případy (musí selhat): `tenantId` v envelope, command bez `idempotencyKey`, `FAILED` bez `error`, `UNKNOWN_OUTCOME` bez `reconciliationRef`, `external-write` capability bez `reversibility`, capability name s velkým písmenem.

Výstup končí souhrnem `OK` nebo nenulovým exit kódem.

## Přidání nového kontraktu

1. Nové schéma do `contracts/<name>.v<N>.schema.json` s `$id`, `examples` a `additionalProperties: false`.
2. Odpovídající sekce do `FOUNDATION-core.md` a odkaz v `docs/ARCHITECTURE.md`.
3. Negativní případ do `scripts/validate-contracts.mjs`.
4. Breaking změna existujícího schématu = nový soubor s `v<N+1>`, starý zůstává (lifecycle viz `FOUNDATION-core.md` příloha A).

## Obnova evidence matrix

`EVIDENCE-MATRIX.md` je snímek k datu a commitům uvedeným v hlavičce. Obnova:

1. `git pull --ff-only` ve všech skenovaných repo (GitHub je místo pravdy).
2. Pro každé repo projít 16 dimenzí z `EVIDENCE-MATRIX.md §1` a ke každé zapsat status, odkaz `soubor:řádek` a jednu větu o skutečné sémantice. Nehádat; když se něco jmenuje „retry", ověřit, co dělá.
3. Aktualizovat hlavičku (datum, commit hash), §2 (co prochází admission) a §5 (nálezy do projektů).
4. Nálezy z §5 zapsat do `HANDOFF.md` příslušných repo, ne jen sem.

## CI (až bude remote)

Doporučený workflow na push do `main`:

```text
npm ci
npm test
gitleaks (secret scan)
kontrola odkazů v *.md
```

Stejný tvar jako v `ai-agenti/.github/workflows/kontrola.yml`.
