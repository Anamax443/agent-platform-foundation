# agent-platform-foundation

> Česky: [README.cs.md](README.cs.md)

> One sentence: the binding rules, contracts and verification requirements for a modular farm of AI agents, deterministic modules and single-purpose write executors.

## What it is

A small normative core plus the evidence that justifies it. The platform is not a runtime or a framework. It is a set of rules that must survive any change of message broker, workflow engine, cloud, LLM provider or implementation language.

Core idea, inherited from the `ai-agenti` methodology: **AI recognizes, deterministic code executes.** AI components never hold write credentials. Every write goes through a scoped executor that accepts only a typed, validated command.

## Documents

| File | Role | Binding |
|---|---|---|
| [FOUNDATION-core.md](FOUNDATION-core.md) | seven runtime invariants and two process rules, component roles, executor model, message and result contracts, state model, tenant context, evidence minimum, Core Admission Process | **yes** |
| [VERIFICATION-CONTRACT.md](VERIFICATION-CONTRACT.md) | test families, threat → test → gate matrix, conformance package per capability, mutants, testability coding standards, AI eval profile, CI gates | **yes** |
| [EVIDENCE-MATRIX.md](EVIDENCE-MATRIX.md) | what actually exists in five real repositories (16 dimensions × 5 projects, file:line references), what passes Core Admission, findings to return to each project | data |
| [PLATFORM-NOTES.md](PLATFORM-NOTES.md) | CANDIDATE and DEFERRED backlog with explicit triggers, design principles, anti-pattern checklist, open questions | no |
| [contracts/](contracts/) | JSON Schema 2020-12: message envelope v1, trusted execution context v1, dispatch envelope v1 (signed binding), result envelope v1, module descriptor v1 | **yes** |
| [docs/review-pack/](docs/review-pack/) | single-file review pack for external advisors (`npm run build:pack`): all of the above plus reviewer guide, worked examples, ADRs, threat model, questions, glossary, adoption plan, incident walkthrough | derived |
| [docs/history/](docs/history/) | the drafts this repository replaces (v0.1, v0.2, and the review of v0.2) | archive |

## How to use it

1. Before designing an agent, fill in `sablony/navrhovy-list.md` from `ai-agenti`, then read `FOUNDATION-core.md` (thirty minutes).
2. Declare the component in a `module-descriptor` and pick its verification profiles. The profiles decide which test families are mandatory.
3. Exchange messages using the envelope and result contracts. Never put `tenantId` or `targetComponent` in the business payload.
4. Nothing becomes shared Core until `EVIDENCE-MATRIX.md` shows the same mechanism with the same semantics in two independent projects.

## Status (2026-09-05, v1.0-rc2.1)

- **Frozen for implementation at v1.0-rc2.1.** Four review rounds, 80 findings, protocols in the review pack parts XIII to XVI; last round scored 9.2 to 9.5 with no MAJOR findings. `FOUNDATION-core.md`, `VERIFICATION-CONTRACT.md` and `contracts/*.schema.json` change only with evidence from code. Becomes v1.0 after two implemented components and the host isolation penetration test (ADR-017).
- Evidence scan done on `job-watch`, `gmail-mcp`, `domlov`, `faxx-hr`, `faxx-dox`. Exactly one mechanism passes Core Admission today: the `/version` endpoint shape. No shared package is justified yet.
- Recommended first consumers: `job-watch` (result envelope, `/version`), then `faxx-dox` phase F1.
- Contracts are validated by `npm test` (schema compile, examples, negative cases). See [docs/BUILD.md](docs/BUILD.md).

## Related repositories

| Repository | Relation |
|---|---|
| `ai-agenti` | methodology home; design sheet and build prescription |
| `faxx-dox` | first vertical slice: email → document → extraction → validation → review |
| `job-watch`, `gmail-mcp`, `domlov`, `faxx-hr` | real implementations scanned for evidence |
| `project-standard` | repository conventions this repo follows |

## License

Proprietary, see [LICENSE](LICENSE). Sources are readable as a work sample, not open source.
