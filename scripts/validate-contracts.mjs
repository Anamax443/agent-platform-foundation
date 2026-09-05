// Validates contracts/*.schema.json: compile, examples must pass, negative cases must fail,
// and tagged JSON examples in docs (```json <schema-name>) must validate (EVD-006).
// Run: npm test
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "contracts");

const ajv = new Ajv2020({ strict: true, strictRequired: false, allErrors: true });
addFormats(ajv);

let failures = 0;
const ok = (msg) => console.log(`  ok   ${msg}`);
const bad = (msg, errors) => {
  failures++;
  console.log(`  FAIL ${msg}`);
  if (errors) console.log("       " + ajv.errorsText(errors, { separator: "\n       " }));
};

// Register all schemas first so cross-file $ref (dispatch-envelope -> message/context) resolves.
const files = readdirSync(dir).filter((f) => f.endsWith(".schema.json")).sort();
const loaded = files.map((file) => ({ file, name: file.replace(".schema.json", ""), schema: JSON.parse(readFileSync(join(dir, file), "utf8")) }));
for (const { schema } of loaded) ajv.addSchema(schema);

const schemas = {};
for (const { file, name, schema } of loaded) {
  console.log(`\n${file}`);
  let validate;
  try {
    validate = ajv.getSchema(schema.$id) ?? ajv.compile(schema);
    ok("compiles");
  } catch (e) {
    bad(`compile: ${e.message}`);
    continue;
  }
  schemas[name] = validate;
  for (const [i, ex] of (schema.examples ?? []).entries()) {
    validate(ex) ? ok(`example[${i}] valid`) : bad(`example[${i}] invalid`, validate.errors);
  }
}

// ---------- Negative cases: each MUST fail validation. ----------
const base = (over = {}) => ({
  messageId: "m-1", correlationId: "c-1", type: "event", capability: "invoice.validated",
  capabilityVersion: "1", schemaVersion: "1", createdAt: "2026-09-05T12:00:00Z", payload: {}, ...over,
});
const ctx = (over = {}) => ({
  dispatchId: "d-1", tenantId: "t-1", actorId: "a-1", actorType: "service", scopes: [], sourceComponent: "s",
  authenticatedAt: "2026-09-05T12:00:00Z", expiresAt: "2026-09-05T13:00:00Z", ...over,
});
const res = (over = {}) => ({
  messageId: "r-1", inReplyTo: "m-1", correlationId: "c-1", status: "SUCCEEDED", payload: {},
  capability: "invoice.extract", capabilityVersion: "1", schemaVersion: "1", completedAt: "2026-09-05T12:00:00Z", ...over,
});
const cap = (over = {}) => ({
  name: "email.send", versions: ["1"], preferredVersion: "1", executionMode: "async", sideEffects: "external-write", trustClass: "executor",
  riskClass: "MEDIUM", isolationClass: "PRINCIPAL", idempotency: "required", idempotencyRetention: "P30D", deadlinePolicy: "PT10M",
  effectFields: [{ field: "recipientRef", role: "target" }], semanticValidation: { policyRef: "policy/email.send/v1" },
  reversibility: "IRREVERSIBLE", unknownOutcomeRecovery: "reconcile", humanApproval: "none", ...over,
});
const desc = (over = {}) => ({
  module: "x", componentVersion: "1.0.0", runtime: "cloud-service", tenantMode: "SINGLE",
  verificationProfiles: ["WRITE_EXECUTOR", "PROVIDER", "EVIDENCE"], capabilities: [cap()], ...over,
});
const cmd = base({ type: "command", capability: "invoice.extract", idempotencyKey: "k", notValidAfter: "2026-09-05T12:10:00Z" });

const negatives = [
  ["message-envelope.v1", "tenantId in envelope", base({ tenantId: "tenant-42" })],
  ["message-envelope.v1", "targetComponent in envelope", base({ targetComponent: "x" })],
  ["message-envelope.v1", "command without idempotencyKey/notValidAfter", base({ type: "command" })],
  ["message-envelope.v1", "capability with uppercase", base({ capability: "Invoice.Extract" })],
  ["message-envelope.v1", "capability without dot", base({ capability: "invoice" })],
  ["message-envelope.v1", "createdAt with timezone offset instead of Z (CTR-TIME-001)", base({ createdAt: "2026-09-05T14:00:00+02:00" })],
  ["result-envelope.v1", "completedAt without Z (CTR-TIME-001)", res({ completedAt: "2026-09-05T12:00:00" })],
  ["result-envelope.v1", "FAILED without error", res({ status: "FAILED", payload: undefined })],
  ["result-envelope.v1", "UNKNOWN_OUTCOME without reconciliationRef", res({ status: "UNKNOWN_OUTCOME", payload: undefined })],
  ["result-envelope.v1", "WAITING without deadline", res({ status: "WAITING", waitReason: "REVIEW", payload: undefined })],
  ["result-envelope.v1", "error code not UPPER_SNAKE", res({ status: "FAILED", payload: undefined, error: { code: "bad-code", class: "TECHNICAL", retryable: true, message: "x" } })],
  ["result-envelope.v1", "reissuable not boolean", res({ status: "FAILED", payload: undefined, error: { code: "COMMAND_EXPIRED", class: "POLICY", retryable: false, reissuable: "yes", message: "x" } })],
  ["trusted-context.v1", "missing tenantId", ctx({ tenantId: undefined })],
  ["trusted-context.v1", "binding inside context (must live in dispatch envelope)", ctx({ binding: { mechanism: "signed-envelope" } })],
  ["dispatch-envelope.v1", "signed-envelope without signature/keyId", { message: cmd, context: ctx(), binding: { mechanism: "signed-envelope" } }],
  ["dispatch-envelope.v1", "in-process with signature", { message: cmd, context: ctx(), binding: { mechanism: "in-process", signature: "abcdefghijklmnopqrstuvwxyz" } }],
  ["dispatch-envelope.v1", "context carrying tenantId override in message", { message: base({ tenantId: "t-2" }), context: ctx(), binding: { mechanism: "in-process" } }],
  ["module-descriptor.v1", "external-write without reversibility/idempotency", desc({ capabilities: [{ name: "email.send", versions: ["1"], preferredVersion: "1", executionMode: "async", sideEffects: "external-write", trustClass: "executor" }] })],
  ["module-descriptor.v1", "COMPENSATABLE without compensationCapability", desc({ capabilities: [cap({ name: "stock.reserve", reversibility: "COMPENSATABLE" })] })],
  ["module-descriptor.v1", "external-write but WRITE_EXECUTOR profile omitted (self-lowered obligations)", desc({ verificationProfiles: ["PROVIDER", "EVIDENCE"] })],
  ["module-descriptor.v1", "external-write but EVIDENCE profile omitted", desc({ verificationProfiles: ["WRITE_EXECUTOR", "PROVIDER"] })],
  ["module-descriptor.v1", "usesLlm without AI_CAPABILITY profile", desc({ capabilities: [{ name: "document.classify", versions: ["1"], preferredVersion: "1", executionMode: "async", sideEffects: "none", trustClass: "untrusted-processing", usesLlm: true }], verificationProfiles: ["PROVIDER"] })],
  ["module-descriptor.v1", "MULTI_TENANT_ACTIVE without MULTI_TENANT profile", desc({ tenantMode: "MULTI_TENANT_ACTIVE" })],
  ["module-descriptor.v1", "dependsOn without MODULE_DEPENDENCY profile", desc({ dependsOn: ["bank.status.query"] })],
  ["module-descriptor.v1", "missing PROVIDER profile", desc({ verificationProfiles: ["WRITE_EXECUTOR", "EVIDENCE"] })],
  ["module-descriptor.v1", "riskClass CRITICAL with LOGICAL isolation", desc({ capabilities: [cap({ riskClass: "CRITICAL", isolationClass: "LOGICAL" })] })],
  ["module-descriptor.v1", "riskClass HIGH with PRINCIPAL but no isolationDecision", desc({ capabilities: [cap({ riskClass: "HIGH", isolationClass: "PRINCIPAL" })] })],
  ["module-descriptor.v1", "riskClass MEDIUM with LOGICAL isolation", desc({ capabilities: [cap({ riskClass: "MEDIUM", isolationClass: "LOGICAL" })] })],
  ["module-descriptor.v1", "query-external-status without statusQuery", desc({ capabilities: [cap({ unknownOutcomeRecovery: "query-external-status" })] })],
  ["module-descriptor.v1", "riskClass HIGH without effectFields (SEC-SEM-001)", desc({ capabilities: [cap({ riskClass: "HIGH", isolationClass: "PROCESS", effectFields: undefined })] })],
  ["module-descriptor.v1", "riskClass HIGH without semanticValidation.policyRef (SEC-SEM-001)", desc({ capabilities: [cap({ riskClass: "HIGH", isolationClass: "PROCESS", semanticValidation: undefined })] })],
  ["module-descriptor.v1", "effectFields with unknown role", desc({ capabilities: [cap({ effectFields: [{ field: "x", role: "whatever" }] })] })],
];

console.log("\nnegative cases (must fail)");
for (const [name, label, data] of negatives) {
  const validate = schemas[name];
  if (!validate) { bad(`${name}: schema not compiled`); continue; }
  const clean = JSON.parse(JSON.stringify(data)); // drop undefined
  validate(clean) ? bad(`${name}: "${label}" unexpectedly VALID`) : ok(`${name}: "${label}" rejected`);
}

// ---------- EVD-006: tagged JSON examples in docs must validate. ----------
// A fenced block whose info string is "json <schema-name>" (e.g. ```json result-envelope.v1) is validated.
console.log("\ndocs examples (EVD-006)");
const docDirs = [join(root, "docs", "review-pack", "parts"), root];
let tagged = 0;
for (const d of docDirs) {
  for (const f of readdirSync(d).filter((x) => x.endsWith(".md"))) {
    const text = readFileSync(join(d, f), "utf8");
    const re = /```json\s+([a-z-]+\.v\d+)\s*\n([\s\S]*?)```/g;
    let m;
    while ((m = re.exec(text))) {
      tagged++;
      const [, name, body] = m;
      const validate = schemas[name];
      const label = `${f} -> ${name} @${text.slice(0, m.index).split("\n").length}`;
      if (!validate) { bad(`${label}: unknown schema`); continue; }
      let data;
      try { data = JSON.parse(body); } catch (e) { bad(`${label}: not JSON (${e.message})`); continue; }
      validate(data) ? ok(label) : bad(label, validate.errors);
    }
  }
}
if (!tagged) console.log("  (no tagged examples found)");

console.log(failures ? `\n${failures} failure(s)` : "\nOK");
process.exit(failures ? 1 : 0);
