# Chalkwright Core and Hosted Service Implementation Work Breakdown

Status: active architecture execution plan. This document divides the agreed
product direction into bounded Codex tasks. It does not authorize
implementation, provider enrollment, repository creation, package publication,
billing, deployment, or public exposure.

## Execution status

- **Complete:** A01 froze feature ownership, edition and surface availability,
  MVP dispositions, exclusions, safety boundaries, acceptance evidence, and
  task traceability in the
  [feature acceptance matrix](core-and-hosted-feature-acceptance-matrix.md).
  A02 applied those boundaries in the authoritative
  [threat model](core-and-hosted-threat-model.md), including security invariants,
  residual-risk dispositions, and 18 negative-test families. A03 accepted
  [ADR-0026](decisions/0026-public-core-and-hosted-shell.md) with project
  references and restricted exports, GitHub Release tarballs, separate operator
  and display processes, exact `0.x` Core/hosted pairing, and a typed feature-
  region presentation seam. A04 added the versioned
  [workspace and actor contracts](core-workspace-actor-contracts.md), exact
  fail-closed runtime guards, independent authority grants, and bounded audit
  projection without applying them to existing use cases. A05 added the
  versioned [configuration and durable-state contracts](core-configuration-state-contracts.md),
  executable lifecycle/migration semantics, and representative fixtures without
  changing a persistence adapter or current schema.
- **Next:** A06 defines source modes and their first-release formats,
  provenance, freshness, validation, and failure behavior.
- **Architecture gate:** A06 through A08 remain incomplete. Do not
  begin Phase B until A04-A08 are complete and the architecture-ready gate is
  satisfied.

## Execution rules

Each numbered item is intended to be one focused Codex task and isolated branch
or worktree. Split a task further if evidence shows that its outcome is too
broad; do not combine unrelated outcomes.

Every implementation task must preserve unrelated work, start from the current
documented project state, add focused tests, run the required checks, and update
governing documentation, the Unreleased changelog, and the active workstream in
the same branch. Fixtures and captures use synthetic or explicitly approved
data. Provider actions, repository publication, billing activation,
infrastructure changes, deployment, merge, and other live effects require
explicit authorization in the task that performs them.

## Delivery gates

1. **Architecture ready:** contracts, trust boundaries, package direction, and
   acceptance evidence are agreed.
2. **Core structurally ready:** Core is independently buildable and distributable
   with separately bound operator and display ingress.
3. **Core operator MVP:** a self-hoster can configure, preview, and operate one
   installation without editing internal files or using a Chalkwright login.
4. **Core connected-data release:** direct Google connections and manual source
   alternatives work through the operator panel.
5. **Hosted alpha:** authenticated accounts and tenant-safe hosted adapters
   compose a pinned Core release.
6. **Paid pilot ready:** billing, privacy, recovery, security, and operational
   evidence satisfy the bounded pilot criteria.

## Phase A — decisions, contracts, and safety

### A01 — Freeze the feature and acceptance matrix

Map every requested feature to shared Core, self-hosted shell, hosted shell,
classroom display, or student view, with observable acceptance criteria and MVP
exclusions.

Depends on: none.

Complete when: account management, the Core panel, class codes, source modes,
Google authorization, planned-display review, presentation profiles, student
personalization, billing, and lifecycle work all have unambiguous ownership.

### A02 — Threat-model the new surfaces

Model the Core operator listener, hosted accounts, class-code display,
provider callbacks and tokens, uploads, shared URLs, tenant boundaries, support
tools, webhooks, and jobs.

Depends on: A01.

Complete when: assets, actors, entry points, abuse cases, mitigations, residual
risks, and required negative tests are reviewed.

Completed by: the
[Core and hosted threat model](core-and-hosted-threat-model.md). Its `must
never` invariants and negative-test catalog govern all downstream tasks.

### A03 — Resolve ADR-0026 implementation choices

Choose the initial package mechanism, Core artifact channel, one-process/two-
listener versus separate-process shape, compatibility window, and shared
server-rendered presentation seam. Accept or revise ADR-0026 without performing
the reorganization.

Depends on: A01, A02.

Complete when: no security-significant packaging choice remains implicit.

Completed by: accepted
[ADR-0026](decisions/0026-public-core-and-hosted-shell.md), including its
incremental B01-B07 migration and rollback checkpoints. No reorganization was
performed by A03.

### A04 — Define workspace and actor contracts

Specify installation/workspace, organization when hosted, room, screen, date,
resource, actor, and audit scope. Core must never silently select a tenant; the
self-hosted shell supplies one fixed installation workspace and the hosted shell
derives organization scope from the server-side session.

Depends on: A02, A03.

Complete when: versioned types distinguish Core invariants from shell
authentication and authorization responsibilities.

Completed by: the versioned
[Core workspace and actor contracts](core-workspace-actor-contracts.md) and
their focused compile-time/runtime tests. Existing use-case integration remains
explicitly deferred to B03.

### A05 — Define configuration, persistence, and migrations

Design editable configuration, secret references, source and screen records,
class-code state, preview snapshots, revisions, audit events, concurrency,
backup/export, and migrations across SQLite and hosted persistence ports.

Depends on: A04.

Complete when: schemas and forward/rollback rules have representative fixtures.

Completed by: the versioned
[Core configuration and durable-state contracts](core-configuration-state-contracts.md)
and their compile-time, runtime, state-transition, migration, and rollback
fixtures. Current adapter implementation and A04 use-case integration remain
explicitly deferred.

### A06 — Define source modes and first-release formats

Specify application-managed, uploaded snapshot, shared resource, and connected
account modes for each data stream, including accepted formats, validation,
provenance, freshness, and error behavior.

Depends on: A01, A02, A05.

Complete when: every MVP stream has a feasible non-connected lane or an explicit
reason that provider authorization is unavoidable.

### A07 — Specify operator-panel information architecture

Define Core navigation, pages, guidance, readiness, planned-display review,
responsive behavior, accessibility, reduced motion, and the presentation seams
used by the hosted account shell.

Depends on: A01, A04, A06.

Complete when: page specifications cover the Core MVP without assuming Core
authentication UI.

### A08 — Establish shared synthetic fixtures

Create the fixture catalog and contract-suite interface for installations,
organizations, courses, schedules, vocabulary, media, OAuth state, previews,
and cross-tenant attempts.

Depends on: A04–A06.

Complete when: expected results and privacy rules are versioned and executable.

## Phase B — Core package and runtime boundaries

### B01 — Enforce internal dependency direction

Add architecture checks for domain, application, ports, contracts,
infrastructure, presentation, and entry points.

Depends on: A03, A04.

Complete when: existing behavior passes and a reversed dependency fails a
focused test.

### B02 — Introduce deliberate Core exports

Implement the accepted TypeScript project-reference graph and one Core package
with restricted exports; npm workspaces remain deferred. Prevent consumers from
importing arbitrary internal paths or self-hosted entry points.

Depends on: B01.

Complete when: existing entry points build through public exports and an
unsupported deep import fails validation.

### B03 — Make workspace scope explicit

Thread A04 scope through use cases, ports, persistence, snapshots, and screen
operations without changing current classroom behavior.

Depends on: A04, A08, B02.

Complete when: no scoped shared operation uses an ambient tenant and isolation
tests pass.

### B04 — Extract the self-hosted composition shell

Wire SQLite, files, local jobs, provider adapters, configuration, and
presentation around the shared Core exports with no commercial concerns.

Depends on: A05, B02, B03.

Complete when: current Chalkwright behavior runs through the self-hosted shell
and shared packages remain independently testable.

### B05 — Separate operator and display ingress

Create separate operator and display processes, service identities, route
tables, cookies, caches, storage capabilities, and readiness endpoints. Make
operator ingress explicitly loopback/Unix-socket private by default while
keeping class-code display admission separate.

Depends on: A02, A03, B04.

Complete when: supplied defaults never publish the operator surface and the
display listener cannot serve operator routes.

### B06 — Build the shared contract-test kit

Turn A08 into conformance suites for use cases, persistence, connectors,
rendering, snapshots, and migrations.

Depends on: A08, B02, B03.

Complete when: self-hosted adapters pass and a deliberately nonconforming
adapter fails.

### B07 — Produce an installable Core artifact

Create the npm-compatible Core package tarball and complete self-hosted archive,
machine-readable manifest, checksums/provenance, examples, safe service/container
templates, migrations, and source-build path without publishing them.

Depends on: B04–B06.

Complete when: a clean isolated environment can install, start, upgrade, roll
back, and uninstall Core without any commercial account or credential.

## Phase C — Core operator panel and configuration

### C01 — Implement versioned configuration services

Add validated reads, drafts, preview, optimistic revisions, activation,
rollback, redacted effective configuration, and audit events.

Depends on: A05, B03, B06.

Complete when: invalid or conflicting edits cannot replace the last known good
configuration.

### C02 — Implement the unauthenticated Core operator shell

Add the private-listener browser shell, navigation, capability discovery,
readiness, error boundaries, and accessible layout without login or account UI.

Depends on: A07, B05, C01.

Complete when: the operator boundary serves the synthetic panel while display
ingress cannot reach it.

### C03 — Implement rooms, screens, and class codes

Add room, screen, timezone, display URL, slowly hashed class-code rotation,
viewer-session revocation, and readiness controls.

Depends on: C01, C02.

Complete when: rotating a code invalidates old viewer sessions without affecting
the operator panel.

### C04 — Implement the source registry and forms

Add source modes, provenance, freshness, validation, course/screen mapping, and
guided instructions.

Depends on: A06, C01, C02.

Complete when: initial manual sources can be configured without editing
protected runtime files.

### C05 — Implement bounded uploads and imports

Add limits, actual-content validation, safe filenames, media handling,
structured parsing, transactional import, provenance, and rollback for approved
formats.

Depends on: A02, A06, C04.

Complete when: valid fixtures import and oversized, mislabeled, active,
malformed, or path-manipulation inputs fail safely.

### C06 — Implement shared-resource acquisition

Add approved published/shared Calendar and file mechanisms, bounded refresh,
caching, provenance, and request-forgery protections.

Depends on: A02, A06, C04.

Complete when: allowed resources refresh deterministically and private,
loopback, metadata, redirect, and unsupported targets cannot be fetched.

### C07 — Implement direct Google enrollment for Core

Build application-owned OAuth initiation, callback/state validation,
incremental scopes, protected token storage, reconnect, revocation, and
sanitized diagnostics. Core operator access remains separate from provider
authorization.

Depends on: A02, A06, B05, C04.

Complete when: synthetic flows cover success, partial consent, state mismatch,
expiration, revocation, and redaction. Live Google setup is a separate task.

### C08 — Implement connected Google sources and mappings

Expose approved read-only Classroom, Calendar, Drive, Docs, and Sheets
capabilities incrementally with resource selection, course mapping, refresh
jobs, quotas, and last-known-good behavior.

Depends on: B06, C04, C07.

Complete when: connectors request no unapproved roster/write scopes and provider
failure cannot erase the current display snapshot.

### C09 — Implement planned-display projection

Generate mutation-free expected screen states by date with a bounded rolling
cache, input fingerprints, readiness/freshness, and on-demand distant dates.

Depends on: B06, C01, C03, C04.

Complete when: identical inputs are deterministic, future data is bounded, and
preview has no provider or Calendar mutation capability.

### C10 — Implement the contact sheet and carousel

Add daily thumbnail sections, date picker, enlarged view, modal carousel,
keyboard controls, responsive layouts, loading states, and accessible labels.

Depends on: A07, C09.

Complete when: accepted viewports, keyboard focus, reduced motion, overflow,
empty states, and errors pass automated and visual review.

### C11 — Implement presentation profiles

Add versioned themes, languages, timing, and a bounded set of transition
profiles, with synthetic preview and reduced-motion behavior.

Depends on: A07, C01, C09.

Complete when: profiles are previewable and reversible and never alter content
truth.

### C12 — Complete Core diagnostics and distribution

Add freshness/readiness explanations, redacted diagnostics, audit history,
configuration export/import, backup/restore integration, and updated packaging
and operator documentation.

Depends on: B07, C03–C11.

Complete when: a clean self-hoster can install, configure sources, preview,
activate a display, recover, upgrade, and restore without commercial
infrastructure or direct file editing.

## Phase D — commercial hosted account application

### D01 — Create the hosted repository and pin Core

After explicit authorization, create the private hosted repository with web and
worker roots, CI, a lockfile, an exact Core artifact, and checks forbidding
self-hosted entry-point or deep imports.

Depends on: A03, B07; requires repository-creation authorization.

Complete when: the skeleton executes a synthetic Core use case through supported
exports only. No deployment occurs.

### D02 — Select the local authentication library

Evaluate version-compatible libraries for Google/Microsoft login,
application-owned accounts and sessions, recovery, MFA, cookies, CSRF,
PostgreSQL, migration control, license, and maintenance. WorkOS is not the
selected architecture.

Depends on: A02, D01.

Complete when: a decision record selects the exact library/version and defines
the account model and upgrade policy.

### D03 — Implement account registration and security

Add users, verification, login/logout, recovery, MFA-ready settings, active
sessions, reauthentication, notifications, and security events.

Depends on: D02.

Complete when: takeover, fixation, CSRF, recovery, rotation, revocation, and
sensitive-action tests pass.

### D04 — Implement Google and Microsoft sign-in

Add both identity providers with safe account linking. Keep login identity
separate from Google or Microsoft classroom-data consent.

Depends on: D03.

Complete when: synthetic signup, login, linking, conflicting claims, revocation,
and fallback recovery tests pass without requesting data scopes.

### D05 — Implement organizations and roles

Add organization creation, ownership, invitations, memberships, owner/admin
roles, transfer, and protected destructive actions.

Depends on: A04, D03.

Complete when: transition tests prevent unauthorized access and ownerless
organizations.

### D06 — Implement hosted persistence and authorization

Add organization-scoped PostgreSQL, object, cache/queue, and audit adapters.
Derive Core workspace scope from the authenticated session.

Depends on: A05, B06, D05.

Complete when: negative tests block cross-tenant records, objects, previews,
jobs, caches, and support actions.

### D07 — Compose the hosted account and control UI

Build Account, Organization, Screens, Connections and content, Planned
displays, Presentation, and Billing/support navigation around shared Core
presentation primitives without mounting Core routes.

Depends on: C02–C11, D05, D06.

Complete when: role checks protect every page/action and shared features have no
self-hosted-server assumptions.

### D08 — Implement hosted Google data connections

Add development/production project separation, encrypted organization-scoped
tokens, incremental scopes, reconnect/revocation, provider jobs, quotas, and
connection history through shared connector contracts.

Depends on: C07, C08, D06; live provider setup requires authorization.

Complete when: tenant and token-redaction tests prove one organization cannot
select, refresh, or revoke another's connection.

### D09 — Implement hosted non-connected sources

Adapt manual, shared, and upload workflows to object storage, workers, quotas,
retention, content handling, and tenant-scoped provenance.

Depends on: C04–C06, D06, D07.

Complete when: an account produces a complete synthetic display without Google
and every artifact is tenant-isolated.

### D10 — Implement hosted screens and viewers

Add opaque URLs, class-code rotation, throttled admission, secure viewer
cookies, revocation, last-known-good snapshots, and subscription state separate
from viewer traffic.

Depends on: C03, C09, D06, D07.

Complete when: viewers receive only their admitted screen projection and no
account, billing, or operator data.

### D11 — Select and implement billing

Choose the provider and implement per-active-screen subscriptions, checkout,
proration policy, signed idempotent webhooks, reconciliation, invoices, grace,
and cancellation without handling raw card data.

Depends on: D05, D10; enrollment and live keys require authorization.

Complete when: replay, reorder, failure, cancellation, and tenant-mismatch tests
pass.

### D12 — Implement lifecycle, support, and compatibility gates

Add account/organization export and deletion, connection revocation, retention,
support-safe diagnostics, bounded support roles, audit evidence, Core version
manifests, migration preflights, and compatibility checks.

Depends on: D06–D11.

Complete when: export/deletion and rollback work in isolation, incompatible Core
blocks release, and support cannot bypass tenant scope silently.

## Phase E — student experience and later providers

### E01 — Enforce the student-safe projection

Classify every field and generate a bounded viewer DTO rather than returning
internal plans or provider objects.

Depends on: A02, C09, D10.

Complete when: tests exclude rosters, names, private links, raw payloads,
diagnostics, and account data.

### E02 — Implement per-viewer language preferences

Add local or short-session language choice, selected translation, approved-text
toggles, and interface catalogs without student accounts or shared-state
mutation.

Depends on: C11, D10, E01.

Complete when: two viewers can present the same authoritative state differently
without affecting each other or the classroom display.

### E03 — Qualify Microsoft data connectors

Define incremental Entra/Graph scopes and adapters for Calendar,
OneDrive/SharePoint, and education classes after Google behavior stabilizes.
Keep Microsoft login separate from data consent.

Depends on: A06, D04, D08; provider registration requires authorization.

Complete when: a decision record and synthetic suite establish minimum scopes,
token lifecycle, mappings, and manual alternatives before live qualification.

### E04 — Automate Core-to-hosted upgrades

Automate artifact creation, provenance/checksum verification, hosted
compatibility tests, migration rehearsal, release notes, and deliberate
dependency updates.

Depends on: B07, D12.

Complete when: compatible updates are reviewable and incompatible or tampered
artifacts fail before release.

## Phase F — bounded paid-pilot readiness

### F01 — Complete privacy and provider-policy readiness

Finalize data inventory, subprocessors, retention/deletion, notices, terms,
school-data review, provider verification requirements, and incident ownership.

Depends on: A02, D08–D12, E01.

Complete when: permitted pilot data and responsibilities are reviewed by the
appropriate human owners without unsupported compliance claims.

### F02 — Build isolated pilot infrastructure as code

Define isolated ingress, web, workers, PostgreSQL, object storage, queue/cache,
secrets, network policy, monitoring, and off-host backups without sharing the
current classroom deployment.

Depends on: A02, D12; applying infrastructure requires authorization.

Complete when: local/staging plans prove isolation, least privilege,
reproducibility, and rollback without production changes.

### F03 — Prove observability, backup, and restore

Add tenant-safe metrics, redacted logs, alerts, job visibility, backup checks,
restore automation, deletion propagation, and recovery objectives.

Depends on: D12, F02.

Complete when: an isolated restore reproduces allowed state without exposing
secrets or resurrecting deleted data.

### F04 — Run security, abuse, and capacity qualification

Test authentication, authorization, class-code guessing, rate limits, uploads,
SSRF, XSS, CSRF, tokens, webhook replay, queue exhaustion, provider failure,
screen polling, and student bursts.

Depends on: E01, E02, F01–F03.

Complete when: pilot thresholds pass and unresolved high-risk findings block
launch explicitly.

### F05 — Prepare pilot operations and support

Define enrollment, support, readiness, billing exceptions, provider outages,
incidents, restores, deletion, upgrades, rollback, capacity limits, exit
criteria, and the move-off-single-host trigger.

Depends on: F03, F04.

Complete when: staging rehearsal succeeds and every pilot failure mode has an
owner and rollback path.

### F06 — Conduct an explicitly authorized pilot deployment

Create production clients/secrets, apply isolated infrastructure, deploy exact
qualified releases, enroll a bounded account, and verify billing, callbacks,
smoke, rollback, backup, and monitoring.

Depends on: F01–F05; every live effect requires explicit authorization.

Complete when: the pilot meets its acceptance criteria or rolls back cleanly
with the failure and next decision recorded.

## Recommended first tranche

Begin with A01 through A08, in dependency order. Do not begin B01 until the
architecture-ready gate is met. This prevents Codex from hardening accidental
package seams or building an operator UI before its trust, scope, persistence,
source, and hosted-composition contracts are defined.
