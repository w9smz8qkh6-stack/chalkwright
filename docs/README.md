# Documentation index

## Product and migration planning

- [Current project state](project-state.md) — continuously checked phase,
  milestone, deployment evidence basis, capability maturity, active
  workstreams, limits, and next decisions.
- [Product vision](product-vision.md) — users, workflows, target capabilities,
  MVP boundary, safety, non-goals, and measurable success.
- [B407 Classroom Display MVP](b407-display-mvp.md) — immediate offline M-05
  product slice, evidence, and explicit non-production boundary.
- [Legacy parity inventory](legacy-parity-inventory.md) — evidence register,
  behavior ledger, acceptance criteria, dispositions, and open unknowns.
- [Architecture principles](architecture-principles.md) — enduring boundaries,
  canonical flow, state ownership, isolation, and accepted/proposed choices.
- [Migration strategy](migration-strategy.md) — phased risk-reduction strategy,
  promotion/stop gates, continuity, and rollback posture.
- [Migration execution plan](migration-plan.md) — dependency-ordered work,
  per-step verification and side-effect boundaries, and requirements
  traceability.
- [Future parity roadmap](future-parity-roadmap.md) — post-M18 parity and product
  direction, including the planned Core operator panel and exploratory hosted
  service.
- [ChalkWrite.com Commercial Hosted App](chalkwrite-com-commercial-hosted-app.md)
  — exploratory paid authenticated account application, source strategy,
  tenant model, student-view boundary, security baseline, and delivery stages.
- [Core and hosted implementation work breakdown](core-and-hosted-implementation-work-breakdown.md)
  — dependency-ordered tasks from architecture decisions through the Core
  operator panel, hosted account application, and paid-pilot qualification.
- [Core and hosted feature acceptance matrix](core-and-hosted-feature-acceptance-matrix.md)
  — authoritative feature ownership, edition and surface availability, MVP
  disposition, safety boundaries, acceptance evidence, and task traceability.
- [Core and hosted threat model](core-and-hosted-threat-model.md) — authoritative
  A02 assets, actors, trust boundaries, threat register, security invariants,
  residual-risk dispositions, and downstream negative-test obligations.
- [Core workspace and actor contracts](core-workspace-actor-contracts.md) — A04
  versioned workspace, target, actor, independent-authority, request-context,
  runtime-validation, and bounded audit-scope invariants for both shells.
- [Core configuration and durable-state contracts](core-configuration-state-contracts.md)
  — A05 configuration lifecycle, protected-reference, persistence, class-code,
  export/backup, forward-migration, and rollback invariants shared by adapters.
- [Core source-mode contracts](core-source-mode-contracts.md) — A06 stream/mode
  matrix, closed formats and budgets, upload/shared/connected admission,
  provenance, freshness, and last-known-good invariants shared by adapters.
- [Core operator-panel information architecture](core-operator-panel-information-architecture.md)
  — A07 stable navigation/pages, readiness and mutation semantics,
  planned-display keyboard behavior, finite states, responsive/accessibility
  acceptance, and the shell-neutral Core feature-region seam.
- [Core shared synthetic fixture suite](core-shared-synthetic-fixture-suite.md)
  — A08 versioned deterministic installation, scope, configuration, source,
  content, OAuth, preview, cross-tenant, and privacy conformance catalog.
- [Offline glossary catalog](glossary-catalog.md) — normalized local vocabulary,
  translations, BLOB media, import limits, and review/provenance rules.
- [Architecture decision records](decisions/README.md) — accepted direction and
  unresolved implementation choices.
- [Migration evidence](migration/README.md) — review packages, executable parity
  accounting, visual evidence requirements, and retirement decisions.
- [Public-preview publication gate](publication-readiness.md) — legal, privacy,
  history, presentation, CI, and release requirements before repository
  visibility changes.
- [Public history plan](publication-history-plan.md) — value-free audit result,
  recommended clean-root strategy, rejected alternatives, and final evidence.
- [Release and version policy](release-policy.md) — pre-release SemVer,
  publication contents, npm-publish prevention, and support boundaries.
- [Third-party notices](../THIRD_PARTY_NOTICES.md) — locked direct dependency
  licenses, aggregate lockfile inventory, and gated media provenance.
- [Configuration guide](configuration.md) — safe local defaults, protected
  references, current schema boundaries, and the planned guided setup layer.
- [Offline operations](operations.md) — bounded M-06 jobs, temporary rehearsal,
  inert deployment artifacts, and future activation gates.
- [Permanent production deployment](permanent-production-deployment.md) — the
  protected-main polling controller, immutable releases, local readiness,
  automatic rollback, and the separately controlled first-release gate.
- [M-07A synthetic PowerSchool qualification](migration/m07a-review-package.md)
  — completed offline evidence for a repository-owned read-only adapter; live
  characterization remains a separately authorized M-07B gate.
- [M-07B bounded PowerSchool characterization](migration/m07b-review-package.md)
  — exact one-shot authorization, sanitized evidence boundary, managed-profile
  lifecycle, and the recorded future Sunday-through-Friday morning requirement.
- [M-07C filtered-session integration](migration/m07c-review-package.md) —
  offline manual-bootstrap/passive-read separation, disposable profiles,
  containment evidence, roadmap reconciliation, and completed credential-free
  exact-read gate.
- [M-08 Google Classroom reads](migration/m08-review-package.md) — accepted
  least-privilege model, adapter/cache/refresh evidence, protected external
  grant, roadmap fit, completed bounded OAuth/live-read gate, and stable-TV-
  latency evidence. M-08 is promoted; operational registration remains gated.
- [M-09 attendance and continuity](migration/m09-review-package.md) — accepted
  transient P/T/A matrix, validated compatibility links, aggregate-only safe
  export quarantine, and reconciliation evidence.
- [M-10 read-only integration](migration/m10-review-package.md) — bounded
  mutation-free orchestration, redacted evidence, permission inventory, offline
  cases, prerequisite reconciliation, and a passed protected C509 live gate.
  M-10 is promoted; its M-11 successor has passed the accelerated gate.
- [M-11 isolated shadow](migration/m11-review-package.md) — separate loopback
  service/state/configuration, fixed seven-day timer, read-only provider jobs,
  backup/restart evidence, and a passed accelerated zero-mutation
  qualification. M-11 is promoted; M-12 subsequently passed its separate gates
  and was promoted.
- [M-12 behavior comparison](migration/m12-review-package.md) — value-free
  plan/display/operations comparison, exact scenario and accepted-difference
  policy, redacted SQLite evidence, and an accepted corrected visual baseline.
  The user approved the comparison result and promotion; M-12 is promoted.
- [M-13 Calendar ownership audit](migration/m13-review-package.md) — promoted
  intended-scope read-only adapter, fixed projection policy, strong
  ownership/adoption classifier, approved Tuesday dispositions, dry-run
  evidence, and pure lease simulation. Its adapter remains list-only; the
  later separately authorized M-14 qualification remains isolated from
  operations and production.
- [M-14 Calendar writer qualification](migration/m14-review-package.md) —
  complete offline writer/rollback implementation and bounded Auto Lesson 2
  lifecycle ending empty; independently reviewed and explicitly promoted, with
  M-15 authorized only afterward.
- [M-15 bounded production Calendar trial](migration/m15-review-package.md) —
  fixed Tuesday prepare/approval/execute boundary, legacy-writer exclusion,
  fresh backup, successful three-replacement execution, and rollback-ready
  evidence; explicitly accepted and promoted on 2026-08-10.
- [M-16 cutover rehearsal](migration/m16-review-package.md) — promoted bounded
  target, recovery, candidate, and alert-qualification evidence without a live
  route or scheduler handoff.
- [M-17 parallel-canary and handoff record](migration/m17-review-package.md) —
  historical isolated-candidate evidence plus the current permanent-production
  handoff status. The standalone lane now serves the existing classroom path;
  its timers and owned-Calendar follower are active; the legacy app and shadow
  were retired from active service in M-18 and retained only for cold recovery.
- [M-18 legacy-retirement record](migration/m18-retirement-record.md) —
  explicit retirement approvals, fail-closed execution gates, completed
  runtime/repository actions, and retained cold-recovery artifacts.
- [Offline PowerSchool collector](powerschool-bell-collector.md) — safe
  configuration, filtered and persistent protected-state handling, four-way
  passive/manual/JIT/compatibility capability split, containment limits, and
  the separately authorized live stop gate.

The planning documents are intentionally non-exhaustive summaries of a parity-
first process. The parity inventory governs behavior preservation: absence from
a summary does not authorize retirement.

## Environment and tooling

- [Structured project knowledge](project-knowledge.json) — semantic source for
  the generated current-state view and per-prompt Codex digest.
- [Engineering standards](engineering-standards.md) — documentation and comment
  policy, dependency/build practices, testing, migrations, and definition of
  done.
- [Documentation maintenance system](documentation-system.md) — generated
  facts and inventory, Codex lifecycle context, host automation, semantic
  review boundaries, verification, and recovery.
- [Changelog](../CHANGELOG.md) — consequential unreleased product, contract,
  operational, security, and runtime changes.
- [Working environment](../.codex/environment.md) — repository-scoped Codex
  bootstrap assumptions, boundaries, and safe commands.
- [Tooling and canonical documentation](tooling.md) — generated detected/locked
  software versions with canonical, version-appropriate documentation links.

Contributors can run `npm run docs:check:portable` to verify the changelog and
local documentation links. Maintainers can run `npm run docs:check` to also
confirm that the generated tooling index matches the canonical deployment
host. Run
`npm run docs:check-links` when network access is authorized to validate
canonical external links.

<!-- prettier-ignore-start -->

<!-- BEGIN GENERATED DOCUMENTATION INVENTORY -->
## Complete generated inventory

This exhaustive list is generated from every Markdown file under `docs/`.
The curated sections above explain authority and routing; this inventory makes
new, renamed, and removed documentation discoverable without manual indexing.

- [Architecture principles](architecture-principles.md) — `architecture-principles.md`
- [B407 Classroom Display MVP](b407-display-mvp.md) — `b407-display-mvp.md`
- [ChalkWrite.com Commercial Hosted App](chalkwrite-com-commercial-hosted-app.md) — `chalkwrite-com-commercial-hosted-app.md`
- [Configuration](configuration.md) — `configuration.md`
- [Chalkwright Core and Hosted Feature Acceptance Matrix](core-and-hosted-feature-acceptance-matrix.md) — `core-and-hosted-feature-acceptance-matrix.md`
- [Chalkwright Core and Hosted Service Implementation Work Breakdown](core-and-hosted-implementation-work-breakdown.md) — `core-and-hosted-implementation-work-breakdown.md`
- [Chalkwright Core and Hosted Threat Model](core-and-hosted-threat-model.md) — `core-and-hosted-threat-model.md`
- [Core configuration and durable-state contracts](core-configuration-state-contracts.md) — `core-configuration-state-contracts.md`
- [Core Operator-Panel Information Architecture](core-operator-panel-information-architecture.md) — `core-operator-panel-information-architecture.md`
- [Core shared synthetic fixture suite](core-shared-synthetic-fixture-suite.md) — `core-shared-synthetic-fixture-suite.md`
- [Core source-mode contracts](core-source-mode-contracts.md) — `core-source-mode-contracts.md`
- [Core workspace and actor contracts](core-workspace-actor-contracts.md) — `core-workspace-actor-contracts.md`
- [ADR-0001: Self-contained host-native runtime](decisions/0001-self-contained-host-native-runtime.md) — `decisions/0001-self-contained-host-native-runtime.md`
- [ADR-0002: Canonical day plan and SQLite state](decisions/0002-canonical-plan-and-sqlite-state.md) — `decisions/0002-canonical-plan-and-sqlite-state.md`
- [ADR-0003: Bounded external-system effects](decisions/0003-bounded-external-system-effects.md) — `decisions/0003-bounded-external-system-effects.md`
- [ADR-0004: Separate sensitive material and runtime state](decisions/0004-separate-sensitive-and-runtime-state.md) — `decisions/0004-separate-sensitive-and-runtime-state.md`
- [ADR-0005: systemd and Tailnet-only deployment](decisions/0005-systemd-and-tailnet-deployment.md) — `decisions/0005-systemd-and-tailnet-deployment.md`
- [ADR-0006: Parity-first migration and single writer](decisions/0006-parity-first-migration-and-single-writer.md) — `decisions/0006-parity-first-migration-and-single-writer.md`
- [ADR-0007: First-class screens and rooms](decisions/0007-first-class-screens-and-rooms.md) — `decisions/0007-first-class-screens-and-rooms.md`
- [ADR-0008: Server-controlled carousel holds](decisions/0008-server-controlled-carousel-holds.md) — `decisions/0008-server-controlled-carousel-holds.md`
- [ADR-0009: Initial UI delivery strategy](decisions/0009-initial-ui-delivery-strategy.md) — `decisions/0009-initial-ui-delivery-strategy.md`
- [ADR-0010: Direct PowerSchool browser/auth adapter](decisions/0010-direct-powerschool-auth-adapter.md) — `decisions/0010-direct-powerschool-auth-adapter.md`
- [ADR-0011: Google Classroom client, credential model, and scopes](decisions/0011-google-client-and-scopes.md) — `decisions/0011-google-client-and-scopes.md`
- [ADR-0012: Alert delivery transport](decisions/0012-alert-delivery-transport.md) — `decisions/0012-alert-delivery-transport.md`
- [ADR-0013: State retention and recovery](decisions/0013-state-retention-and-recovery.md) — `decisions/0013-state-retention-and-recovery.md`
- [ADR-0014: Filtered PowerSchool session state and separate manual repair](decisions/0014-filtered-powerschool-session-state.md) — `decisions/0014-filtered-powerschool-session-state.md`
- [ADR-0015: Aggregate-only attendance continuity and transient matrix](decisions/0015-aggregate-attendance-continuity.md) — `decisions/0015-aggregate-attendance-continuity.md`
- [ADR-0016: Calendar read identity and ownership classification](decisions/0016-calendar-read-identity-and-ownership.md) — `decisions/0016-calendar-read-identity-and-ownership.md`
- [ADR-0017: Isolated Calendar writer qualification](decisions/0017-calendar-writer-qualification.md) — `decisions/0017-calendar-writer-qualification.md`
- [ADR-0018: Bounded production Calendar trial](decisions/0018-bounded-production-calendar-trial.md) — `decisions/0018-bounded-production-calendar-trial.md`
- [ADR-0019: Bounded cutover and rollback rehearsal](decisions/0019-bounded-cutover-rehearsal.md) — `decisions/0019-bounded-cutover-rehearsal.md`
- [ADR-0020: Just-in-time PowerSchool session repair](decisions/0020-just-in-time-powerschool-repair.md) — `decisions/0020-just-in-time-powerschool-repair.md`
- [ADR-0021: Persistent PowerSchool compatibility lane](decisions/0021-persistent-powerschool-compatibility-lane.md) — `decisions/0021-persistent-powerschool-compatibility-lane.md`
- [ADR-0022: Isolated parallel production canary before final handoff](decisions/0022-parallel-production-canary.md) — `decisions/0022-parallel-production-canary.md`
- [ADR-0023: Chalkwright public identity and compatibility migration](decisions/0023-chalkwright-public-identity.md) — `decisions/0023-chalkwright-public-identity.md`
- [ADR-0024: Application-owned PowerSchool authentication lifecycle](decisions/0024-application-owned-powerschool-authentication.md) — `decisions/0024-application-owned-powerschool-authentication.md`
- [ADR-0025: Permanent production delivery lane](decisions/0025-permanent-production-delivery.md) — `decisions/0025-permanent-production-delivery.md`
- [ADR-0026: Public Core and separate hosted shell](decisions/0026-public-core-and-hosted-shell.md) — `decisions/0026-public-core-and-hosted-shell.md`
- [Architecture decision records](decisions/README.md) — `decisions/README.md`
- [Documentation maintenance system](documentation-system.md) — `documentation-system.md`
- [Engineering standards](engineering-standards.md) — `engineering-standards.md`
- [Future parity roadmap](future-parity-roadmap.md) — `future-parity-roadmap.md`
- [Offline glossary catalog](glossary-catalog.md) — `glossary-catalog.md`
- [Documentation-backed learning objectives](learning-objectives.md) — `learning-objectives.md`
- [Legacy parity inventory](legacy-parity-inventory.md) — `legacy-parity-inventory.md`
- [Migration execution plan](migration-plan.md) — `migration-plan.md`
- [Migration strategy](migration-strategy.md) — `migration-strategy.md`
- [M-01 contract and sanitized-evidence review package](migration/m01-review-package.md) — `migration/m01-review-package.md`
- [M-02 domain ports and canonical-plan review package](migration/m02-review-package.md) — `migration/m02-review-package.md`
- [M-03 pure plan, state, and enrichment review package](migration/m03-review-package.md) — `migration/m03-review-package.md`
- [M-04 SQLite persistence and continuity review package](migration/m04-review-package.md) — `migration/m04-review-package.md`
- [M-05 review package: B407 display and local controls](migration/m05-review-package.md) — `migration/m05-review-package.md`
- [M-06 review package: offline operations and deployment artifacts](migration/m06-review-package.md) — `migration/m06-review-package.md`
- [M-07A review package: synthetic direct PowerSchool adapter qualification](migration/m07a-review-package.md) — `migration/m07a-review-package.md`
- [M-07B review package: bounded PowerSchool characterization](migration/m07b-review-package.md) — `migration/m07b-review-package.md`
- [M-07C review package: filtered PowerSchool session integration](migration/m07c-review-package.md) — `migration/m07c-review-package.md`
- [M-08 review package: Google Classroom read qualification](migration/m08-review-package.md) — `migration/m08-review-package.md`
- [M-09 review package: attendance and continuity safety](migration/m09-review-package.md) — `migration/m09-review-package.md`
- [M-10 review package: read-only integration gate](migration/m10-review-package.md) — `migration/m10-review-package.md`
- [M-11 review package: isolated mutation-disabled shadow](migration/m11-review-package.md) — `migration/m11-review-package.md`
- [M-12 review package: behavior comparison](migration/m12-review-package.md) — `migration/m12-review-package.md`
- [M-13 review package: Calendar ownership audit without writes](migration/m13-review-package.md) — `migration/m13-review-package.md`
- [M-14 review package: non-production Calendar writer qualification](migration/m14-review-package.md) — `migration/m14-review-package.md`
- [M-15 review package: bounded production Calendar trial](migration/m15-review-package.md) — `migration/m15-review-package.md`
- [M-16 review package: cutover and rollback rehearsal](migration/m16-review-package.md) — `migration/m16-review-package.md`
- [M-17 review package: isolated parallel production canary](migration/m17-review-package.md) — `migration/m17-review-package.md`
- [M-18 legacy-retirement record](migration/m18-retirement-record.md) — `migration/m18-retirement-record.md`
- [Migration evidence index](migration/README.md) — `migration/README.md`
- [Retirement decision log](migration/retirement-decisions.md) — `migration/retirement-decisions.md`
- [Offline operations and future activation](operations.md) — `operations.md`
- [Permanent production deployment](permanent-production-deployment.md) — `permanent-production-deployment.md`
- [Offline PowerSchool session collector](powerschool-bell-collector.md) — `powerschool-bell-collector.md`
- [Product vision](product-vision.md) — `product-vision.md`
- [Current Chalkwright project state](project-state.md) — `project-state.md`
- [Public history plan](publication-history-plan.md) — `publication-history-plan.md`
- [Public-preview publication gate](publication-readiness.md) — `publication-readiness.md`
- [Release and version policy](release-policy.md) — `release-policy.md`
- [Tooling and canonical documentation](tooling.md) — `tooling.md`
- [A07 code-native operator reference brief](ui-references/a07-code-native-reference/brief.md) — `ui-references/a07-code-native-reference/brief.md`
- [A07 code-native reference implementation notes](ui-references/a07-code-native-reference/implementation-notes.md) — `ui-references/a07-code-native-reference/implementation-notes.md`
- [A07 code-native translation specification](ui-references/a07-code-native-reference/prompt.md) — `ui-references/a07-code-native-reference/prompt.md`
- [A07 concept brief — Readiness rail](ui-references/a07-readiness-rail/brief.md) — `ui-references/a07-readiness-rail/brief.md`
- [Implementation notes](ui-references/a07-readiness-rail/implementation-notes.md) — `ui-references/a07-readiness-rail/implementation-notes.md`
- [Generation prompt](ui-references/a07-readiness-rail/prompt.md) — `ui-references/a07-readiness-rail/prompt.md`
- [A07 concept brief — Studio board](ui-references/a07-studio-board/brief.md) — `ui-references/a07-studio-board/brief.md`
- [Implementation notes](ui-references/a07-studio-board/implementation-notes.md) — `ui-references/a07-studio-board/implementation-notes.md`
- [Generation prompt](ui-references/a07-studio-board/prompt.md) — `ui-references/a07-studio-board/prompt.md`
<!-- END GENERATED DOCUMENTATION INVENTORY -->

<!-- prettier-ignore-end -->
