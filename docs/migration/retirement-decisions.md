# Retirement decision log

Approved retirements: **2.**

Every discovered behavior in the legacy parity inventory remains Preserve,
Replace equivalently, or Preserve pending a named decision. An empty or absent
legacy state snapshot does not authorize retirement.

When the user explicitly approves a retirement, add a row with all fields and a
corresponding ADR/inventory update. Do not record proposals as approvals.

| Parity ID | Decision                                                                                                                                                                                                                    | Approved by | Approval date | Replacement or rationale                                                                                                                             | ADR/inventory reference                                                                                                                              |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DEP-001` | Retire the original OpenClaw Classroom Screen runtime, dedicated Tailnet handler, and private source repository; retain its local source, state, backups, service definition, and route snapshot as cold recovery evidence. | Bren        | 2026-08-30    | Chalkwright is the self-contained production classroom display and contains no required OpenClaw runtime edge.                                       | [M-18 retirement record](m18-retirement-record.md), [`DEP-001`](../legacy-parity-inventory.md#http-media-health-persistence-operations-and-security) |
| `OPS-004` | Retire the migration-era shadow service and refresh timer without deleting its state, backups, unit definitions, or rollback instructions.                                                                                  | Bren        | 2026-08-30    | The permanent lane owns display delivery and recurring jobs; retained artifacts preserve the bounded recovery path after active fallback retirement. | [M-18 retirement record](m18-retirement-record.md), [ADR-0019](../decisions/0019-bounded-cutover-rehearsal.md)                                       |

These approvals name the retirement boundary. Execution remains fail-closed:
the route and services may be retired only after the current production
readiness and recovery gates pass, and every completed action must be recorded
in the M-18 evidence record.
