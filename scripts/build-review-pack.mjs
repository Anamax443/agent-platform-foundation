// Assembles docs/review-pack/OPONENTNI-BALICEK-v1.0-draft.md from parts + core docs + contracts.
// Run: npm run build:pack
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const parts = join(root, "docs", "review-pack", "parts");
const VERSION = "1.0-rc2.1";
const out = join(root, "docs", "review-pack", `OPONENTNI-BALICEK-v${VERSION}.md`);

const read = (p) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");

// Strip "# TITLE", blank, "## subtitle" from the core docs so the part header replaces them.
const stripTitle = (text) => {
  const lines = text.split("\n");
  if (lines[0]?.startsWith("# ")) lines.splice(0, 1);
  if (lines[0] === "") lines.splice(0, 1);
  if (lines[0]?.startsWith("## ")) lines.splice(0, 1);
  return lines.join("\n").trim() + "\n";
};

const schemaBlock = (file) => {
  const json = read(join(root, "contracts", file)).trim();
  return `### ${file}\n\n\`\`\`json\n${json}\n\`\`\`\n`;
};

const sections = [
  { toc: "ČÁST 0 — Průvodce pro oponenty", body: read(join(parts, "00-pruvodce.md")) },
  { toc: "ČÁST I — Kontext, historie, omezení a referenční architektura", body: read(join(parts, "01-kontext.md")).trim() + "\n\n" + read(join(parts, "01b-architektura.md")) },
  {
    toc: "ČÁST II — FOUNDATION CORE (závazné)",
    body: "# ČÁST II — FOUNDATION CORE\n\n**Závazná část.** Úplné znění `FOUNDATION-core.md`.\n\n" + stripTitle(read(join(root, "FOUNDATION-core.md"))),
  },
  {
    toc: "ČÁST III — VERIFICATION CONTRACT (závazné)",
    body: "# ČÁST III — VERIFICATION CONTRACT\n\n**Závazná část.** Úplné znění `VERIFICATION-CONTRACT.md`.\n\n" + stripTitle(read(join(root, "VERIFICATION-CONTRACT.md"))),
  },
  {
    toc: "ČÁST IV — Kontrakty v1 s komentářem (závazné)",
    body:
      read(join(parts, "04-kontrakty-komentar.md")).trim() +
      "\n\n" +
      ["message-envelope.v1.schema.json", "trusted-context.v1.schema.json", "dispatch-envelope.v1.schema.json", "result-envelope.v1.schema.json", "module-descriptor.v1.schema.json"]
        .map(schemaBlock)
        .join("\n"),
  },
  {
    toc: "ČÁST V — Evidence matrix (data)",
    body:
      "# ČÁST V — EVIDENCE MATRIX\n\n**Data, ne norma.** Úplné znění `EVIDENCE-MATRIX.md`. Nálezy v §5 jsou evidence; vlastník rozhodl, že se existující projekty kvůli nim neupravují (viz 0.1).\n\n" +
      stripTitle(read(join(root, "EVIDENCE-MATRIX.md"))),
  },
  { toc: "ČÁST VI — Provedené příklady", body: read(join(parts, "06-priklady.md")) },
  { toc: "ČÁST VII — Architektonická rozhodnutí (ADR)", body: read(join(parts, "07-adr.md")) },
  { toc: "ČÁST VIII — Threat model", body: read(join(parts, "08-threat-model.md")) },
  {
    toc: "ČÁST IX — Platform Notes (nezávazné)",
    body: "# ČÁST IX — PLATFORM NOTES\n\n**Nezávazné.** Úplné znění `PLATFORM-NOTES.md`.\n\n" + stripTitle(read(join(root, "PLATFORM-NOTES.md"))),
  },
  { toc: "ČÁST X — Otázky pro oponenty a hodnoticí list", body: read(join(parts, "10-otazky.md")) },
  { toc: "ČÁST XI — Glosář", body: read(join(parts, "11-glosar.md")) },
  { toc: "ČÁST XII — Přílohy (slabiny, mapování, adopční plán, DoD, incident)", body: read(join(parts, "12-prilohy.md")).trim() + "\n\n" + read(join(parts, "12b-adopce-incident.md")) },
  { toc: "ČÁST XIII — Protokol 1. kola oponentury (31 nálezů, rozhodnutí, změny)", body: read(join(parts, "13-oponentura-kolo1.md")) },
  { toc: "ČÁST XIV — Protokol 2. kola oponentury (21 nálezů)", body: read(join(parts, "14-oponentura-kolo2.md")) },
  { toc: "ČÁST XV — Protokol 3. kola oponentury (14 nálezů; errata rc2.1)", body: read(join(parts, "15-oponentura-kolo3.md")) },
  { toc: "ČÁST XVI — Protokol 4. kola a uzavření textové fáze (freeze rc2.1)", body: read(join(parts, "16-oponentura-kolo4-uzavreni.md")) },
];

const header = `# AGENT PLATFORM FOUNDATION — OPONENTNÍ BALÍČEK

## Návrh normy v${VERSION} pro nezávislou oponenturu

| | |
|---|---|
| **Verze** | ${VERSION} (finální; čtyři kola oponentury zapracována, protokoly v částech XIII až XVI; jádro, verifikace a schémata zmrazeny pro první implementaci) |
| **Datum sestavení** | ${new Date().toISOString().slice(0, 10)} |
| **Určeno pro** | tým poradců / nezávislá technická oponentura |
| **Zdroj** | repozitář \`agent-platform-foundation\`, sestaveno skriptem \`scripts/build-review-pack.mjs\` |
| **Jazyk** | čeština; machine contracts, identifikátory, stavy a kódy chyb anglicky |
| **Závazné části** | II, III, IV. Ostatní jsou zdůvodnění, data nebo backlog. |

Předmětem oponentury je návrh normy pro modulární farmu AI agentů, deterministických modulů a jednoúčelových write executorů. Jádro v jedné větě: **AI rozpoznává, deterministický kód vykonává; write privilegia patří jen scoped executorům; komponenty vystavují capabilities, ne interní implementaci; tenant a identita vznikají mimo payload a jsou k zprávě podepsané; každý konec je pozorovatelný; originál je immutable; každý invariant má test.**

Textová fáze je uzavřena částí XVI. Čtenáři, kteří přicházejí nově: části 0, II, III, IV, pak XVI. Další kolo proběhne nad kódem první dvojice komponent, ne nad tímto dokumentem.

## Obsah

${sections.map((s, i) => `${i + 1}. ${s.toc}`).join("\n")}

`;

const doc = header + sections.map((s) => s.body.trim()).join("\n\n---\n\n") + "\n";

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, doc, "utf8");

const words = doc.split(/\s+/).filter(Boolean).length;
const lines = doc.split("\n").length;
console.log(`written: ${out}`);
console.log(`lines: ${lines}, words: ${words}, chars: ${doc.length}, est. pages @400 words: ${Math.round(words / 400)}`);

const dl = join(homedir(), "Downloads", `OPONENTNI-BALICEK-AGENT-PLATFORM-FOUNDATION-v${VERSION}.md`);
if (existsSync(dirname(dl))) {
  copyFileSync(out, dl);
  console.log(`copied: ${dl}`);
}
