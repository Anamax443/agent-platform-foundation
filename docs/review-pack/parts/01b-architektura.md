## 1.8 Referenční architektura v obrazech

Obrázky nejsou norma. Jsou pomůcka pro čtení částí II až IV. Každá šipka má u sebe invariant, který ji hlídá.

### Vrstvy

```text
                     USERS / EXTERNAL SYSTEMS
                    chat | email | API | event | cron
                                 |
                                 v
                    +---------------------------+
                    |   GATEWAY / CAPABILITY    |   F4: TrustedExecutionContext
                    |   ROUTER                  |       vzniká zde, ne v payloadu
                    +-------------+-------------+
                                  |
                                  v
                    +---------------------------+
                    |       ORCHESTRATOR        |   F5: durable journal, každý krok
                    |  versioned workflow defs  |       končí explicitním stavem
                    +------+---------+----------+   ADR-004: bez LLM planningu
                           |         |
            capability     |         |    review task
                           v         v
   +----------------+  +----------------+  +----------------+
   |   AI AGENT     |  | DETERMINISTIC  |  | REVIEW SERVICE |   F7: decision je
   | classify,      |  | MODULE         |  | roles, expiry, |       auditovaný přechod
   | extract,       |  | validate, hash,|  | decisions      |
   | propose        |  | lookup         |  +----------------+
   +-------+--------+  +-------+--------+
           |  F1: žádné write credentials
           |  F2: výstup = data, prochází schématem
           v
   +-----------------------------------------------+
   |        POLICY / SECURITY BOUNDARY             |   II §3.3 rozhodovací řetězec
   |  schema -> actor -> context -> allowlist ->   |   jakýkoli DENY končí zde
   |  policy -> approval -> deadline -> idempotency|
   +----------------------+------------------------+
                          |
                          v
   +-----------------------------------------------+
   |              EXECUTOR HOST(S)                 |   ADR-003: N handlerů,
   |  payment.prepare | payment.execute | doc.stamp|   N credential referencí,
   |  cred:erp        | cred:bank       | cred:dms |   žádný super-secret
   +----------------------+------------------------+
                          |  F6: idempotence, deadline,
                          |      UNKNOWN_OUTCOME, reverzibilita
                          v
                 EXTERNAL SYSTEMS (ERP, bank, DMS, mail)

   Common services (kontrakty, ne implementace):
   identity | tenant context | contract registry (soubory) | journal
   audit + evidence | review queue | health/version | secrets
```

### Rozhodovací řetězec pro write command

```text
 AI/Module proposes command
        |
        v
 [1] schema validation ----------- FAIL -> SCHEMA_VALIDATION_FAILED
        |
 [2] authenticated actor --------- FAIL -> deny
        |
 [3] trusted context == command -- FAIL -> TENANT_SCOPE_MISMATCH   (SEC-CTX-002)
        |
 [4] capability in allowlist ----- FAIL -> CAPABILITY_NOT_ALLOWED  (SEC-PRIV-001)
        |
 [5] business policy ------------- FAIL -> POLICY error / WAITING(REVIEW)
        |
 [6] human approval bound to task  FAIL -> APPROVAL_REQUIRED / APPROVAL_MISMATCH (WF-REV-004)
        |
 [7] notValidAfter --------------- FAIL -> COMMAND_EXPIRED         (IDM-DEADLINE-001)
        |
 [8] idempotency key seen? ------- YES  -> return original outcome (IDM-REPLAY-001)
        |
 [9] SIDE EFFECT
        |
 [10] result + audit + reconciliation hook (UNKNOWN_OUTCOME -> WF-UNK-001)
```

### Faktura jako stavový graf

```text
 mail.received (event)
        |
        v
 classify ---- uncertain ----> RECLASSIFY / WAITING(REVIEW)
        |
        v
 extract ----- QUALITY fail --> quality retry: nová strategie, nový klíč
        |                        (budget 3, pak WAITING(REVIEW))
        v
 validate ---- BUSINESS issue -> cross-check / WAITING(REVIEW) --- decision
        |                                                             |
        |<------------------------------------------------------------+
        v
 prepare (COMPENSATABLE, payment.release)
        |
        v
 approve (review, role payment.approver, authStrength oidc-user)
        |
        v
 execute (IRREVERSIBLE) --- timeout --> UNKNOWN_OUTCOME --> reconcile --> SUCCEEDED / FAILED
        |
        v
 invoice.paid (event)
```

### Cílový obraz farmy

Není to aktuální stav. Dnes existuje pět nezávislých projektů bez společného Core. Obrázek říká, kam norma míří, až podmínka `EXISTS × 2` několikrát projde.

```text
 Orchestrator
   +-- Mail screening agent          (AI)
   +-- Document classification agent (AI)
   +-- Invoice extraction agent      (AI)
   +-- Validation module             (deterministic)
   +-- Review service
   +-- Executor hosts
         +-- finance:   payment.prepare, payment.execute, payment.release
         +-- documents: document.stamp, document.archive
         +-- comms:     email.send
   +-- Endpoint agents (CANDIDATE)   inventory, diagnostics

 Shared contracts (soubory v contracts/), žádný shared runtime.
```

### Která šipka, který invariant

| Šipka | Invariant | Test, který ji hlídá |
|---|---|---|
| vstup → gateway | F4 (context vzniká z identity) | `SEC-CTX-003`, `TEN-*` |
| gateway → orchestrátor | F3 (capability, ne služba) | `CTR-001`, routing |
| orchestrátor → agent | F5 (krok má stav a deadline) | `WF-*`, `RES-CRASH-001` |
| agent → policy boundary | F1, F2 (návrh, ne akce; data, ne instrukce) | `SEC-PRIV-001`, `SEC-INJ-001` |
| policy boundary → executor | F4, F6 (context sedí, klíč, deadline) | `SEC-CTX-002`, `IDM-*` |
| executor → externí systém | F6, F7 (jeden side effect, audit, hash) | `IDM-REPLAY-001`, `EVD-003`, `SEC-ART-001` |
| review → orchestrátor | F7 (decision je autorizovaný přechod) | `WF-REV-003`, `WF-REV-004`, `TEN-REVIEW-001` |
| všechno → journal, audit | F5, F7 | `EVD-*` |
