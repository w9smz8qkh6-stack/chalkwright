# Core configuration and durable-state contracts

Status: A05 complete. The adapter-neutral v1 TypeScript surface is split by
responsibility:

- [`configuration-state.ts`](../src/contracts/v1/configuration-state.ts) owns
  editable non-secret configuration, protected-reference identifiers,
  immutable validated revisions, optimistic-concurrency commands, and the
  executable lifecycle transition model;
- [`configuration-persistence.ts`](../src/contracts/v1/configuration-persistence.ts)
  owns preview, class-code, audit, portable-export, protected-backup, and
  artifact-admission contracts; and
- [`configuration-migration.ts`](../src/contracts/v1/configuration-migration.ts)
  owns exact Core/shell compatibility, checksum-bound forward migration, atomic
  completion, and release-rollback decisions.

These contracts do not implement SQLite or hosted adapters, change the current
database schema, execute backup/restore, select provider/file formats, or apply
A04 scope to existing use cases.

## Configuration lifecycle

Validated revision content and its checksum are immutable. Lifecycle metadata
and the active pointer change together in one adapter transaction. Every
command carries an expected aggregate state version as well as the narrower
draft or active-revision evidence relevant to that command.

| Operation               | Required concurrency evidence                                                                    | Successful result                                                                                                                             | Conflict or rejection                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Save draft              | Expected state version and exact current draft version, or explicit `null` for a new draft       | Saves the next draft version against the current active base                                                                                  | Preserves the complete prior state; no last-write-wins path                   |
| Validate draft          | Expected state and draft versions plus a new revision ID                                         | Creates one immutable `eligible` revision with a canonical content checksum                                                                   | Missing/stale/invalid or duplicate-revision input creates no revision         |
| Activate revision       | Expected state version and exact active revision, including explicit `null` for first activation | Selects one eligible revision, marks the prior active revision `superseded`, and advances the active pointer atomically                       | A stale pointer or non-eligible target preserves last-known-good active state |
| Roll back configuration | Expected state version and exact active revision                                                 | Selects a prior `superseded` or `rolled-back` revision, marks the replaced active revision `rolled-back`, and advances the pointer atomically | A stale or non-prior target preserves last-known-good active state            |
| Create preview          | Expected state version plus exact draft version or immutable revision checksum                   | Produces metadata bound to that basis, workspace, targets, generation time, and expiry                                                        | Never changes configuration state or activates a revision                     |

`draft`, `eligible`, `active`, `superseded`, and `rolled-back` are therefore
explicit and finite. A fresh workspace may have no active revision; once an
active pointer exists, exactly one validated revision must have `active`
lifecycle state.

Successful transitions detach the complete returned state from both the
caller-owned command and the prior mutable in-memory snapshot by canonical
JSON cloning. Portable exports, preview snapshots, migration plans/results,
and rollback plans use the same detachment rule. TypeScript `readonly` remains
the compile-time contract; A05 does not claim that returned objects are frozen
at runtime.

## Portable configuration and scope

Editable configuration contains one required A04 workspace and canonically
ordered, workspace-bound room, screen, and source records. A screen always
names an existing room and its class-code state record. The time policy carries
an IANA timezone and an opaque date-policy reference. There is no default
workspace, optional hosted organization, or missing-scope fallback.

“Exact workspace” never means `workspaceId` alone. Equality requires matching
the A04 workspace discriminant and ID plus `installationId` for self-hosted
workspaces or `organizationId` for hosted workspaces. Commands and preview
requests therefore carry the full workspace alongside namespacing IDs; their
A04 audit scopes must carry the same full identity. Portable manifests/content,
protected backups, migration bundles/plans, state content, import/restore, and
rollback admission apply this one rule. Individual records and targets retain
`workspaceId` for storage namespacing, but cannot establish tenant equality by
themselves.

A05 freezes only the four approved source-mode discriminants:
`application-managed`, `uploaded-snapshot`, `shared-resource`, and
`connected-account`. Each record has an opaque typed definition reference.
Only a connected source also has an opaque protected connection reference.
A06 remains responsible for detailed formats, provider semantics, validation,
provenance, freshness, and acquisition rules.

## Protected state, viewer admission, and audit

A protected reference is structurally distinct from an ordinary resource ID.
It is only a locator for a capability-specific store supplied by a shell; Core
has no secret-enumeration or ambient dereference contract. Configuration,
preview, audit, ordinary errors, and portable exports can therefore carry a
bounded reference or redacted connection requirement, never secret values,
OAuth material, tokens, browser profiles, private paths/URLs, password
verifiers, plaintext class codes, or raw provider payloads.

The initial low-privilege class-code policy requires at least 64 bits of
non-sequential entropy, 12–32 characters, and a viewer-session lifetime no
longer than 12 hours. C03 still owns generation, constant-time verification,
rate limits, uniform failures, cookies/sessions, and atomic revocation. Durable
class-code state stores only screen/workspace scope, policy and verifier
versions, a protected verifier reference while active, and rotation or
revocation time. Viewer sessions are not portable configuration and are not
defined by A05.

Audit events embed the bounded A04 `AuditScope` and only finite action, outcome,
subject, state-version, revision, and timestamp fields. There is no arbitrary
payload or details map.

The aggregate admits at most 256 current draft records and 256 immutable
revision records; migration schema/history and bundle-step counts are likewise
capped at 256. New draft or revision transitions reject at capacity while
preserving the exact prior state. Adapters may apply stricter operational
retention only if retained revision/backup evidence continues to satisfy the
rollback contract.

## Record and artifact classification

| Class                            | Included                                                                                                                                                         | Deliberately excluded                                                                                                         |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Editable/validated configuration | Workspace identity, timezone/date-policy reference, rooms, screens, four source modes, opaque definition references, protected connection references             | Secret values, provider payloads, viewer sessions, operational logs                                                           |
| Preview snapshot                 | Full workspace identity, exact draft/revision basis, workspace-bound targets, finite status/diagnostic codes, generated/expiry instants                          | Rendered/customer payload, activation authority, mutation result                                                              |
| Class-code state                 | Workspace/screen, policy version, verifier version, protected verifier reference while active, rotation/revocation time                                          | Plaintext code, verifier bytes, viewer sessions                                                                               |
| Audit event                      | A04 audit scope, finite action/outcome/subject, state versions, revision reference, time                                                                         | Payload/details maps, session/account objects, secrets, customer content                                                      |
| Portable configuration export    | Canonical configuration with connected references replaced by `connectionRequired`, exact workspace/revision/schema manifest, content and whole-export integrity | Protected references and values, verifier state, sessions, caches, previews, raw source/provider data, logs, other workspaces |
| Protected full backup manifest   | Exact workspace, state/migration versions, exact Core/shell pair, external artifact reference/checksum/size, isolated-restore requirements                       | Backup bytes, keys, tokens, verifier bytes, or any embedded protected artifact                                                |

Portable import and protected restore admission both reject a different full
workspace, including a same-ID/different-organization, same-ID/different-
installation, or cross-kind workspace. A05 defines no remapping contract.
Adapters must validate the whole artifact and all ownership, schema,
compatibility, and integrity evidence in isolation before atomically selecting
replacement state.

## Persistence responsibilities

| Concern             | Reusable Core contract                                                                    | Self-hosted SQLite adapter                                                                                     | Hosted persistence adapter                                                                                             |
| ------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Namespace           | Requires full workspace identity at admission and workspace ID on every shared record/key | Prefixes or keys every record by the one installation workspace                                                | Includes organization-derived workspace in every row, object, cache key, job, preview, and audit query                 |
| Concurrency         | Defines expected state/draft/pointer evidence and finite conflict outcomes                | Uses one transaction and conditional revision/pointer writes                                                   | Uses one tenant-scoped transaction and conditional version writes                                                      |
| Activation/rollback | Requires full candidate validation and atomic pointer/lifecycle change                    | Commits revision, lifecycle, pointer, and audit together                                                       | Commits the equivalent organization-scoped records together                                                            |
| Secrets             | Carries opaque protected references only and exposes no resolver/list API                 | Resolves an exact reference only through an injected owner-only protected-store capability                     | Resolves an exact organization-scoped reference only through an injected encrypted-store capability                    |
| Export/backup       | Distinguishes redacted portable export from protected backup metadata                     | Canonicalizes portable data; creates protected files outside the contract and verifies before isolated restore | Canonicalizes one tenant; stores protected artifacts outside the manifest and verifies tenant/isolation before restore |
| Failure             | Returns conflict/rejection or the exact prior state                                       | Rolls back the complete transaction                                                                            | Rolls back the complete tenant transaction                                                                             |

The public contract contains no SQL, table, filesystem path, object-store key,
database client, transaction implementation, or hosted infrastructure type.

## Forward migration and release rollback

Migration history begins at version 1 and is contiguous, ordered, and bound to
name/checksum records. A forward bundle and its checksum bind the full exact
workspace, predecessor and
successor Core/shell `0.x` pairs, the complete expected history, ordered new
steps, both releases' readable schema ranges, and a checksum over the complete
bundle. Gaps, history or bundle tampering, shell/release mismatch, downgrade,
and an unreadable future schema are rejected before migration.

Executable contract finalization has only two outcomes: all steps commit and
history/release/schema advance together, or failure returns the exact prior
state. Adapter execution must be synchronous within its transaction boundary;
there is no partial result or down-migration API.

| Current situation                                                               | Allowed rollback                                  | Required evidence                                                                                                                                          |
| ------------------------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Predecessor explicitly reads the current schema                                 | Code-only rollback                                | Exact predecessor Core/shell manifest and current schema within its declared readable range                                                                |
| Predecessor cannot read the current schema                                      | Restore protected backup, then select predecessor | Exact-workspace pre-migration backup made by the exact predecessor pair, checksum/integrity verification, schema readable by predecessor, isolated restore |
| Backup missing, cross-workspace, wrong release, corrupt, or schema-incompatible | Reject rollback                                   | Current state/traffic remains unchanged; no down migration is attempted                                                                                    |

The existing SQLite migration and backup implementations are evidence for
these invariants, not dependencies of the public types. Future SQLite and
hosted adapters must pass the same synthetic contract fixtures.

## Representative fixtures and next boundaries

[`test/fixtures/configuration-state.ts`](../test/fixtures/configuration-state.ts)
provides privacy-safe executable fresh self-hosted, hosted organization,
activated revision, redacted portable export, schema-v1/v2 migration, and
pre-migration protected-backup cases. Focused tests cover stale concurrency,
invalid activation, exact rollback, preview non-mutation, class-code/audit
redaction, forward success, atomic failure, bundle/history tampering, compatible
code rollback, backup-backed rollback, cross-workspace denial, and hostile JSON
shapes.

The suite also covers same-workspace-ID substitution across organizations,
installations, and workspace kinds for state, audit, import, restore,
migration, and rollback paths. Mutation regressions prove that changing a save
command/configuration, prior state, export source, preview request, migration
bundle/plan, or backup after construction cannot change the detached returned
snapshot, checksum, plan, or result.

A06 is next and specifies source modes' concrete first-release formats,
provenance, freshness, and validation. B03 later threads A04/A05 scope and state
contracts through current use cases, ports, persistence, and snapshots. Neither
boundary is implemented by A05, and Phase B remains blocked until A06 through
A08 complete.
