# Chalkwright Core and Hosted Service Implementation Work Breakdown

Status: active architecture execution plan. This document divides the agreed
product direction into bounded Codex tasks. The first delivery goal is the
smallest complete self-hosted Core operator-panel MVP; commercial accounts,
authentication, tenancy, billing, and framework selection are deliberately
downstream decisions. It does not authorize
implementation, provider enrollment, repository creation, package publication,
billing, deployment, or public exposure.

## Execution status

- **Execution ledgers:** the generated
  [task status overlay](core-and-hosted-work-queue.json) and
  [execution ledger](core-and-hosted-work-queue.md) reconcile this WBS with
  assignment, status, evidence, and dispatch readiness. This WBS remains the
  authority for definitions, order, dependencies, and gates.

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
  changing a persistence adapter or current schema. A06 added the versioned
  [source-mode contracts](core-source-mode-contracts.md), including the exact
  stream/mode/format matrix, bounded acquisition and consent/grant state,
  normalized provenance, explicit freshness, and executable last-known-good
  behavior without implementing adapters. A07 defined the Core-only operator
  information architecture, ordinary-form/server-validation and no-JavaScript
  delivery contract, persistent private-listener authority warning, responsive
  and reduced-motion behavior, planned-display review, shell-neutral region
  seam, fail-closed guards, and reproducible browser evidence. A08 added the
  versioned Core Goal 1 synthetic catalog and executable scenario runner for
  C01-C04, C09, and C10, with exact self-hosted scope, redacted export and
  recovery fixtures, and fail-closed privacy rules.
  C01 implemented the reusable versioned-configuration service and transaction
  port for validated reads, exact optimistic draft/revision transitions,
  mutation-free preview, activation, rollback, redacted effective
  configuration/export, exact-workspace recovery preflight, and bounded
  value-free audit events. Its real use-case adapter passes all six A08 C01
  scenarios; the accepted isolated-branch evidence is commit `2533e6bc`.
  C02 added the explicit-loopback, synthetic-only operator process, closed
  operator route table, accessible server-rendered seven-page shell,
  capability/readiness discovery, finite errors, canonical request-target
  enforcement, and display-ingress isolation. Its accepted isolated-branch
  evidence is commit `f5dc61e4`.
  C03 added the Core display-configuration lifecycle: timezone and draft room/
  screen references, one-time 128-bit class-code rotation stored only as a
  slow verifier, digest-only viewer sessions, atomic session revocation, and
  bounded same-origin no-JavaScript forms. Its accepted isolated-branch
  evidence is commit `70e4dc1`; the full gate passed 1,003 tests after the
  checkout's pre-existing group-write installer mode was restored to the
  tracked `0755`.
  C04 added draft-only, teacher-entered source definitions with bounded stream
  and label validation, provenance/freshness/validation projection, and
  optional screen mappings through the C02 private ordinary-form boundary. It
  deliberately performs no upload, URL acquisition, provider connection, or
  production persistence. Its accepted isolated-branch evidence is commit
  `564fc70`; the full gate passed 1,007 tests.
  C09 added the deterministic, mutation-free planned-display projection over
  injected normalized frames, with explicit date/configured-screen admission,
  SHA-256 input fingerprint, preview-basis revision, and bounded rolling or
  on-demand cache. It has no acquisition, provider, Calendar, or configuration
  mutation capability. Its accepted evidence is C09 commit `609abd5` plus
  clarification commit `bbd6392`; the full gate passed 1,009 tests.
  C10 independently qualified the complete synthetic C01-C04/C09 vertical
  slice for a non-creator: draft configuration, manual source mapping,
  validation, mutation-free preview, activation, projected frames, class-code
  rotation, redacted export, recovery preflight, rollback, and private-listener
  isolation. Its accepted evidence is commits `8060793` and `b3edda8`; the
  full gate passed 1,011 tests after restoring the checkout's tracked `0755`
  installer mode.
- **First goal complete:** a private-by-default Core
  operator panel using the existing server-rendered TypeScript, HTML, CSS, and
  small browser-controller approach. It must configure, validate, preview,
  activate, roll back, and export one installation without a Chalkwright login
  or direct editing of internal runtime files.
- **Next:** B01 Core dependency-direction hardening and D00 commercial
  architecture selection are independently dependency-ready after C10.
- **Commercial deferral:** package extraction for a hosted consumer and all
  hosted framework/account decisions are off the first-goal critical path.
  D00 reopens the commercial architecture only after the Core operator MVP has
  passed C10.

- **Post-gate decisions:** D00 selected Django with a private versioned
  TypeScript Core service/worker boundary in ADR-0027. D01 created the private
  `w9smz8qkh6-stack/chalkwright-hosted` repository and its contract-only Django
  scaffold; branch `codex/d01-hosted-repository-boundary` commit `09c018e`
  passes pip installation, contract validation, and its synthetic scoped
  planned-display boundary test. No hosted listener, account, provider, or
  deployment exists.

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

### Git checkpoint policy

At every verified logical increment, and no later than handoff, pause, or a
task-status transition, the responsible agent commits the scoped source, tests,
and required documentation and pushes its isolated branch. The Project Manager
records the remote commit SHA and verification evidence in the task-status
overlay before it may mark the increment checkpointed or accepted, or release a
dependent task. Unpushed work remains local `in_progress` work and is never
acceptance evidence. This standing checkpoint policy does not authorize pull
requests, merges, deployment, route changes, or other live effects.

## Queue scheduling policy

- **Goal 1 sequence:** A07 → A08 → C01 → C02 → C03 → C04 → C09 → C10.
- **Goal 1 acceptance gate:** C10.
- **Before C10:** only the next incomplete Goal 1 task may be dispatched. All
  other pending work remains gated even when its local dependencies are
  satisfied. Commercial accounts, authentication, tenancy, billing, framework
  selection, and Core-integration implementation are therefore unschedulable.
- **After C10:** ordinary WBS dependency scheduling resumes. B01–B07 Core
  hardening and D00 commercial architecture selection may proceed as their
  dependencies allow. D00 must select Django versus TypeScript and the Core
  integration boundary before dependent commercial implementation begins.

## Delivery goals and gates

1. **Goal 1 specified:** A07 and A08 define the Core-only panel pages, actions,
   accessibility behavior, and synthetic acceptance fixtures. Hosted account
   navigation and cross-tenant fixtures do not block this gate.
2. **Goal 1 implemented:** C01-C04 and C09 form a narrow vertical slice using
   the existing TypeScript runtime and simple server-rendered UI strategy.
3. **Goal 1 accepted — Core operator MVP:** C10 proves that a non-creator can
   configure, validate, preview, activate, roll back, export, and recover one
   private installation without editing code or internal runtime files.
4. **Commercial architecture selected:** D00 uses the proven Core workflows to
   decide Django versus a TypeScript hosted shell and direct reuse versus a
   versioned process/service or incremental Python-port boundary. It must amend
   or supersede ADR-0026 before incompatible hosted work begins.
5. **Core connected-data and distribution ready:** the remaining B and C tasks
   harden package/process boundaries, connected sources, advanced presentation,
   diagnostics, and independently installable distribution. This work may
   proceed alongside D00 after C10; D01 waits for whichever Core prerequisite
   the D00 decision selects.
6. **Hosted alpha:** authenticated accounts and tenant-safe hosted behavior use
   the architecture selected by D00.
7. **Paid pilot ready:** billing, privacy, recovery, security, and operational
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

Completed by: the versioned
[Core source-mode contracts](core-source-mode-contracts.md), complete mode and
format catalog, bounded upload/shared/connected acquisition contracts,
privacy-safe fixtures, and executable verification/last-known-good transitions.
Google Classroom authorization is necessary only for automatic course discovery
and coursework refresh; display-equivalent non-connected lanes remain
available. No parser, fetcher, storage adapter, OAuth client, route, UI, current
schema, or live provider behavior changed.

### A07 — Specify operator-panel information architecture

Define Core navigation, pages, guidance, readiness, planned-display review,
responsive behavior, accessibility, reduced motion, and the smallest complete
server-rendered action model. Use the accepted TypeScript/HTML/CSS strategy and
ordinary forms with server-side validation; add no UI framework or account UI.
Record reusable behavior without designing hosted navigation or authentication.

Depends on: A01, A04, A06.

Complete when: page specifications cover the Core MVP, its no-JavaScript and
reduced-motion behavior, and its private-listener warnings without assuming
Core authentication UI or a commercial presentation framework.

### A08 — Establish Core Goal 1 synthetic fixtures

Create the first-goal fixture catalog and contract-suite interface for one
self-hosted installation, rooms, screens, courses, manual schedules,
vocabulary, media, configuration revisions, previews, activation, rollback,
export, and recovery. Hosted organizations, account sessions, OAuth enrollment,
billing, and cross-tenant fixtures are deferred to D00 and its downstream
architecture tasks.

Depends on: A04–A06.

Complete when: the Core expected results and privacy rules required by C01-C04,
C09, and C10 are versioned and executable.

## Phase B — Core package and runtime hardening after Goal 1

Phase B is important to distribution and any future downstream consumer, but it
does not block the first Core operator-panel vertical slice. Do not start B01
before C10 unless a focused Goal 1 task proves that a specific boundary is a
required safety prerequisite rather than packaging preparation.

### B01 — Enforce internal dependency direction

Add architecture checks for domain, application, ports, contracts,
infrastructure, presentation, and entry points.

Depends on: A03, A04, C10.

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

### B05 — Harden operator and display runtime isolation

Harden the separate operator process introduced by C02 and the display process
with distinct service identities, route tables, cookies, caches, storage
capabilities, and readiness endpoints. Keep operator ingress explicitly
loopback/Unix-socket private by default while keeping class-code display
admission separate.

Depends on: A02, A03, B04, C02.

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

## Phase C — Goal 1 Core operator panel, then connected capabilities

C01-C04, C09, and C10 are the first implementation sequence. C05-C08 and
C11-C13 are follow-on enrichment, connected-data, advanced-presentation, and
distribution work; they do not delay Goal 1 acceptance.

### C01 — Implement versioned configuration services

Add validated reads, drafts, preview, optimistic revisions, activation,
rollback, redacted effective configuration, and audit events.

Depends on: A05, A08.

Complete when: invalid or conflicting edits cannot replace the last known good
configuration.

### C02 — Implement the unauthenticated Core operator shell

Add a distinct private-listener Node process with its own route table plus the
server-rendered browser shell, navigation, capability discovery, readiness,
error boundaries, and accessible layout without login, account UI, a new UI
framework, or a client bundler.

Depends on: A02, A03, A07, C01.

Complete when: the operator boundary serves the synthetic panel only from an
explicit loopback/private bind, Host/Origin and mutation-method negatives pass,
and display ingress cannot resolve an operator handler. B05 later hardens OS
identities, stores, services, cookies, caches, and independent failure.

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

Complete when: the closed first-goal manual timetable and content sources can be
configured without editing protected runtime files. Upload, shared-resource,
and connected-account implementations remain C05-C08 work.

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

Depends on: A08, C01, C03, C04.

Complete when: identical inputs are deterministic, future data is bounded, and
preview has no provider or Calendar mutation capability.

### C10 — Qualify the first Core operator-panel goal

Integrate the C01-C04 and C09 vertical slice, provide redacted configuration
export and documented recovery for that slice, and give the release plus its
instructions to a competent non-creator in a clean isolated environment.

This is the final Goal 1 non-creator acceptance gate. It does **not** implement
the contact-sheet or carousel interface; that follow-on presentation feature is
C11 and remains outside the pre-C10 dispatch lane.

Depends on: A07, A08, C01-C04, C09.

Complete when: the independent operator can configure one installation's
timezone, rooms, screens, courses, manual timetable, and approved basic content;
validate and preview it; activate a revision; observe the display remain
separate; roll back; export redacted configuration; and recover the prior valid
state without editing TypeScript or internal runtime files. Operator ingress is
private by default, no critical defect remains in the exercised workflow, and
the evidence and limitations are recorded.

### C11 — Implement the contact sheet and carousel

Add daily thumbnail sections, date picker, enlarged view, modal carousel,
keyboard controls, responsive layouts, loading states, and accessible labels.

Depends on: A07, C09.

Complete when: accepted viewports, keyboard focus, reduced motion, overflow,
empty states, and errors pass automated and visual review.

### C12 — Implement presentation profiles

Add versioned themes, languages, timing, and a bounded set of transition
profiles, with synthetic preview and reduced-motion behavior.

Depends on: A07, C01, C09.

Complete when: profiles are previewable and reversible and never alter content
truth.

### C13 — Complete Core diagnostics and distribution

Add freshness/readiness explanations, redacted diagnostics, audit history,
configuration export/import, backup/restore integration, and updated packaging
and operator documentation.

Depends on: B07, C03–C12.

Complete when: a clean self-hoster can install, configure sources, preview,
activate a display, recover, upgrade, and restore without commercial
infrastructure or direct file editing.

## Phase D — commercial architecture and hosted account application

No Phase D implementation begins before C10. The Core panel is evidence for the
commercial product, not a reason to preselect its web framework or reproduce
account management inside Core.

### D00 — Select the commercial application architecture

Evaluate the proven Core workflows against a Django SaaS shell, a TypeScript
hosted shell, and the viable Core integration boundaries: exact in-process
package reuse, a private versioned worker/service contract, or an incremental
Python port backed by the Core conformance suite. Define the account,
organization, authorization, persistence, background-work, and presentation
ownership model without implementing it.

Decision status: **Django is selected as the commercial application framework.**
D00 selects a private, versioned TypeScript Core service/worker boundary rather
than direct package consumption or a Python port; ADR-0027 records the decision.
No hosted account or authentication implementation is authorized by D00 alone.

Depends on: C10.

Complete when: an accepted decision record selects the commercial framework and
Core integration boundary, states migration/rollback and duplication costs, and
amends or supersedes ADR-0026 wherever the selected hosted design differs. No
hosted repository, account system, provider enrollment, or deployment is
created by D00.

### D01 — Create the hosted repository and bind the selected Core boundary

After explicit authorization, create the private hosted repository with the web
and worker roots, CI, dependency manifests, and exact Core integration contract
selected by D00. Direct TypeScript-package consumption must pin and verify one
Core artifact and forbid self-hosted entry-point or deep imports; a service or
port boundary must pin its schema/engine versions and equivalent provenance.

Depends on: D00 and every Core artifact or service prerequisite selected by its
decision record; requires repository-creation authorization.

Complete when: the skeleton executes a synthetic Core workflow through only the
D00-approved boundary. No deployment occurs.

### D02 — Select the hosted authentication implementation

Within D00's selected framework, evaluate version-compatible built-in features
and maintained libraries for Google/Microsoft login, application-owned accounts
and sessions, recovery, MFA, cookies, CSRF, PostgreSQL, migration control,
license, and maintenance. Do not recreate mature framework authentication
primitives merely to preserve a language choice.

Depends on: A02, D00, D01.

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

Depends on: A05, D00, D05, and the conformance/persistence prerequisites
selected by D00.

Complete when: negative tests block cross-tenant records, objects, previews,
jobs, caches, and support actions.

### D07 — Implement the hosted account and control UI

Build Account, Organization, Screens, Connections and content, Planned
displays, Presentation, and Billing/support navigation using D00's selected
framework and the proven Core operator workflows. Reuse shared presentation
primitives only when D00 retains that boundary; never mount Core's
unauthenticated routes.

Depends on: C10, D00, D05, D06, plus the later Core capabilities actually
included in the hosted release.

Complete when: role checks protect every page/action and the implementation
conforms to D00's Core integration and tenant-isolation boundary.

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

Depends on: C12, D10, E01.

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

Automate the D00-selected Core-to-hosted boundary: artifact or engine/service
version creation, provenance/checksum or image verification, hosted
compatibility tests, migration rehearsal, release notes, and deliberate
dependency updates.

Depends on: D00, D12, and B07 when direct Core package consumption is selected.

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

Complete A07 and A08, then execute C01, C02, C03 and C04 in dependency order,
followed by C09 and C10. This is Goal 1. It deliberately proves the simplest
useful Core configuration workflow in the existing TypeScript application
before package restructuring, connected-provider expansion, advanced panel
features, or commercial account architecture. Do not start B01 or D00 before
C10 except to resolve a demonstrated Goal 1 safety prerequisite.
