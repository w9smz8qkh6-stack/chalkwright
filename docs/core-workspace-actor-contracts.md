# Core workspace and actor contracts

Status: A04 complete. The versioned TypeScript surface is
[`src/contracts/v1/workspace.ts`](../src/contracts/v1/workspace.ts). These
contracts define Core invocation boundaries; they do not implement shell
authentication, authorization policy, persistence, transport, routing, or UI.

## Stable invariants

- Every reusable Core request carries one explicit workspace. There is no
  optional, ambient, global, default, or caller-selected tenant path.
- A self-hosted workspace always has an installation ID and cannot carry an
  organization ID. The self-hosted shell constructs that one fixed workspace
  from installation-owned configuration.
- A hosted workspace always has an organization ID. The hosted shell derives
  both workspace and organization from the authenticated server-side session;
  an organization ID in request data is never authorization evidence.
- Room, screen, date, and generic resource targets are explicit,
  workspace-bound shapes. A screen also names its room. A request contains one
  or more targets, allowing a use case to compose, for example, screen and date
  scope without weakening either.
- Workspace, installation, organization, room, screen, resource, actor,
  capability, operation, and correlation identifiers are nominal TypeScript
  string types. They remain ordinary JSON strings on the wire or at rest.
- Actor attribution records who or what initiated work. It is not proof of
  identity and grants no capability by itself.
- Every grant names exactly one capability, workspace, and actor. Operator
  reachability, hosted account authorization, viewer admission, provider
  consent, billing entitlement, and support capability are distinct
  discriminated grant types. Possessing one never satisfies another.
- The base Core request context accepts only the shell's operator-reachability
  grant for self-hosted work or hosted-account grant for hosted work. Use cases
  that also need viewer, provider, billing, or support authority must require
  that separately; B03 will apply the contracts to existing operations.
- Runtime guards require plain, dense, exact JSON-safe shapes and reject
  missing, extra, malformed, cross-kind, cross-workspace, cross-organization,
  cross-installation, and cross-actor values. Shape validation does not
  authenticate an untrusted object.
- Audit scope is derived from a validated request context and contains only
  bounded identifiers: workspace/install-or-organization, actor, authority,
  capability, targets, operation, and correlation. It has no field for
  payloads, customer content, sessions, accounts, tokens, or secrets.

## Responsibility boundary

| Concern           | Reusable Core                                                                                            | Self-hosted shell                                                               | Hosted shell                                                                                              |
| ----------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Workspace source  | Requires and validates an explicit workspace and target alignment; never selects one                     | Constructs the single fixed installation-owned workspace                        | Derives the organization-bound workspace from the authenticated server-side session                       |
| Authentication    | None                                                                                                     | Private operator-process reachability is the boundary                           | Authenticates accounts and manages session security                                                       |
| Authorization     | Requires an exact capability grant and validates scope/ownership invariants                              | Establishes operator reachability and grants only within the fixed installation | Checks membership, role, reauthentication, and action policy before constructing a hosted-account grant   |
| Other authorities | Exposes distinct viewer, provider, billing, and support grant contracts; never treats them as transitive | Establishes viewer admission separately where used                              | Establishes viewer admission, provider consent, billing entitlement, and support capability independently |
| Request IDs       | Requires explicit nominal actor, operation, and correlation IDs                                          | Generates or propagates bounded IDs                                             | Generates or propagates bounded IDs from trusted server context                                           |
| Audit             | Produces a bounded audit scope and gives use cases stable attribution fields                             | Persists/emits records according to self-hosted policy                          | Persists/emits organization-scoped records according to hosted policy                                     |

## Runtime use

`scopeIdentifier(kind, value)` validates and brands an identifier.
`isCoreRequestContext` and `parseCoreRequestContext` validate exact request
shapes and all same-request scope alignment. `toAuditScope` derives the bounded
audit projection; `isAuditScope` and `parseAuditScope` validate persisted or
transported audit scope.

These functions deliberately cannot prove that a hosted session, membership,
role, provider callback, subscription, or support approval is genuine. The
owning shell must establish that authority before constructing the relevant
grant. A Core use case must then compare the supplied capability with the
specific capability it requires and validate resource ownership before any
side effect. That application work belongs to B03 and later tasks, not A04.

## Verification and next boundary

Focused compile-time assertions prove that hosted workspaces require an
organization, self-hosted workspaces exclude it, shell request contexts accept
only their corresponding grant, actors are not grants, and room/screen IDs are
not interchangeable. Runtime cases cover exact JSON round trips, all authority
discriminants, malformed IDs and dates, extra or missing properties, unsafe
object shapes, and cross-scope denial.

A04 does not restructure packages or thread scope into current use cases. A05
has now built on this vocabulary with configuration, persistence, migration,
revision, export/backup, rollback, and bounded audit-event contracts documented
in [Core configuration and durable-state contracts](core-configuration-state-contracts.md).
Phase B remains blocked until A06 through A08 complete.
