<!-- Generated from docs/project-knowledge.json by scripts/codex/project-knowledge.mjs. Do not edit. -->

<!-- prettier-ignore-start -->

# Current Chalkwright project state

This is the canonical, compact semantic state of the repository. Edit
`docs/project-knowledge.json`, review it against implementation and operating
evidence, record the new implementation fingerprint, and run `npm run
docs:sync`. Repository documentation is not a live-service probe.

## Freshness contract

- Reviewed: `2026-08-31` (0 days ago; maximum 7)
- Implementation files covered: 539
- Implementation fingerprint: `87d018cee18e14445a26302a19b388eb6aadbfb18136777a60b881e2392d02a8`
- Semantic review: **CURRENT**
- Review statement: The phase, capabilities, workstreams, limits, repository-backed deployment claim, M-18 retirement record, and completed A01-A08 architecture work were reviewed together against the accepted A07 commit 1962ae7 and the A08 sources, fixtures, documentation, and focused contract evidence in this worktree. A08 now supplies a versioned JSON-safe shared catalog and adapter-free scenario-only consumer seam that composes the A04 workspace, A05 configuration lifecycle, and all four A06 source modes into deterministic accepted and independently denied installation, scope, configuration, source, course/schedule/vocabulary/media, OAuth, preview, and cross-tenant cases. A consumer receives a detached scenario but never an expected decision; the suite checks its decision against the catalog and a committed digest detects catalog-byte drift. The exact display/student release registry rejects arbitrary names, misclassification, omissions, duplicates, nested values, and restricted, unclassified, raw-provider, account, diagnostic, internal-plan, secret-like, and private-link categories. The catalog covers NT-03, NT-04, NT-09, NT-10, NT-11, NT-14, and NT-18 without importing routes, storage, providers, authentication, or runtime adapters. A01-A08 now satisfy the architecture-ready gate; Phase B remains unstarted. A08 changes no production route, listener, persistence adapter/schema, parser/fetcher, OAuth client, provider enrollment, authentication, billing, hosted repository, service, deployment, live UI, or classroom data. Landing-page and synthetic-display worktrees remain separately owned, and no live application, provider, credential, route, or classroom-display probe was performed.
- Working-tree classification is evaluated live by hooks and documentation gates; volatile change counts are intentionally excluded from this tracked view.

## Development position

- Phase: **Production stabilization and public-preview preparation**
- Milestone: **M-18 completed; legacy app and migration shadow retired to cold recovery**
- Release: `0.1.0`
- Summary: The standalone Chalkwright service is documented as the classroom display source of truth. The legacy app and migration shadow are retired from active service with cold-recovery artifacts retained. Current repository work continues on post-retirement stabilization, roadmap design, demonstration reproducibility, synthetic fixture presentation, and the self-documenting development workflow.

## Documented deployment state

- Status: `documented-production`
- Summary: Repository evidence says the standalone production lane serves the existing classroom display path, provider acquisition and owned-Calendar follower jobs are active, and M-18 retired the legacy app and migration shadow from active service while retaining cold-recovery artifacts.
- Evidence basis: Reviewed repository documentation through origin/main commit 0f8f65f, including the completed M-18 record. This semantic refresh performed no new application-service, provider, credential, route, or classroom-display probe.
- Evidence: [`README.md`](../README.md), [`docs/permanent-production-deployment.md`](permanent-production-deployment.md), [`docs/migration/m17-review-package.md`](migration/m17-review-package.md), [`docs/migration/m18-retirement-record.md`](migration/m18-retirement-record.md)

## Current priorities

- Observe post-retirement production stability and preserve the retained cold-recovery evidence and explicit restoration boundary.
- Make the repository's present state, capabilities, workstreams, limitations, and verification status continuously available to Codex.
- Preserve the completed A01-A08 architecture gate while any Phase B package restructuring or operator-panel implementation is separately scoped and authorized.
- Keep privacy-safe demonstration work reproducible, accessible, independently versioned, and operationally separate from application releases.
- Continue bounded enrichment work for learning objectives, lesson references, vocabulary, and setup usability without broadening provider authority.

## Capability registry

Statuses are deliberately explicit: `documented-production` is a reviewed
repository claim, not a fresh service probe; `implemented` may still require
separate activation authority; `fixture-supported`, `planned`, and
`deferred` describe narrower maturity.

| ID | Capability | Status | Present behavior | Primary documentation |
| --- | --- | --- | --- | --- |
| `canonical-day-plan` | Canonical schedule and day-plan orchestration | `documented-production` | Normalizes trusted schedule observations into a provider-neutral canonical day plan and derives deterministic effective plans. | [`docs/product-vision.md`](product-vision.md), [`docs/architecture-principles.md`](architecture-principles.md) |
| `classroom-display` | Schedule-aware classroom display | `documented-production` | Serves responsive morning, coming-up, check-in, in-class, transition, dismissal, gap, and day-complete views with deterministic timing. | [`docs/b407-display-mvp.md`](b407-display-mvp.md), [`docs/operations.md`](operations.md) |
| `powerschool-read` | PowerSchool schedule acquisition | `documented-production` | Acquires bounded bell and schedule data through passive, manual-repair, just-in-time-repair, and compatibility lanes. | [`docs/powerschool-bell-collector.md`](powerschool-bell-collector.md), [`docs/decisions/0024-application-owned-powerschool-authentication.md`](decisions/0024-application-owned-powerschool-authentication.md) |
| `classroom-enrichment` | Google Classroom assignment enrichment | `documented-production` | Refreshes read-only Classroom coursework into a local cache and projects relevant assignments without blocking display responses. | [`docs/migration/m08-review-package.md`](migration/m08-review-package.md), [`docs/configuration.md`](configuration.md) |
| `owned-calendar` | Application-owned Calendar reconciliation | `documented-production` | Projects the canonical plan into explicitly owned Calendar events with a single writer, leases, journals, receipts, idempotency, and rollback evidence. | [`docs/migration/m15-review-package.md`](migration/m15-review-package.md), [`docs/decisions/0016-calendar-read-identity-and-ownership.md`](decisions/0016-calendar-read-identity-and-ownership.md) |
| `attendance-check-in` | Meeting-scoped attendance check-in presentation | `documented-production` | Presents class-scoped attendance links, response context, and QR codes for students to use on their own devices. | [`docs/product-vision.md`](product-vision.md), [`docs/b407-display-mvp.md`](b407-display-mvp.md) |
| `lesson-enrichment` | Learning objectives, lesson references, and vocabulary | `documented-production` | Imports bounded teacher-authored objectives and glossary data, selects deterministic vocabulary, and displays multilingual lesson content. | [`docs/learning-objectives.md`](learning-objectives.md), [`docs/glossary-catalog.md`](glossary-catalog.md) |
| `preview-and-controls` | Preview, overrides, and carousel controls | `implemented` | Supports future or frozen-time preview, scoped local overrides, and server-controlled carousel holds isolated by screen and date. | [`docs/b407-display-mvp.md`](b407-display-mvp.md), [`docs/decisions/0008-server-controlled-carousel-holds.md`](decisions/0008-server-controlled-carousel-holds.md) |
| `durable-state` | Durable state, recovery, and last-known-good behavior | `documented-production` | Uses SQLite migrations, integrity checks, backups, retention, restart-safe jobs, and last-known-good projections. A05 additionally defines the future adapter-neutral revision lifecycle, exact optimistic concurrency, redacted export, protected-backup admission, forward migration, and rollback contracts without changing current storage; returned plans and applied snapshots detach canonical JSON data from caller-owned inputs. | [`docs/decisions/0013-state-retention-and-recovery.md`](decisions/0013-state-retention-and-recovery.md), [`docs/operations.md`](operations.md), [`docs/core-configuration-state-contracts.md`](core-configuration-state-contracts.md) |
| `deployment-and-rollback` | Immutable production deployment and rollback | `documented-production` | Builds digest-bound releases, polls protected main, verifies readiness, switches atomically, and rolls back failed releases. | [`docs/permanent-production-deployment.md`](permanent-production-deployment.md), [`docs/decisions/0025-permanent-production-delivery.md`](decisions/0025-permanent-production-delivery.md) |
| `site-presentation` | School branding and bounded site media | `implemented` | Supports an installation-specific school logo, course art, countdown media, local validation, and digest-pinned serving. | [`docs/configuration.md`](configuration.md), [`docs/b407-display-mvp.md`](b407-display-mvp.md) |
| `fixture-evaluation` | Synthetic local evaluation and public demonstration | `fixture-supported` | Provides a loopback-only B407 demonstration, reproducible screenshots, privacy-safe fixture evidence, smoke checks, and disposable rehearsals. | [`docs/b407-display-mvp.md`](b407-display-mvp.md), [`docs/project-state.md`](project-state.md) |
| `guided-setup` | Guided non-secret installation configuration | `planned` | Provide a private-by-default Core operator panel for versioned configuration, guided sources, readiness, and planned-display review while retaining strict generated runtime contracts. A04 established the shared workspace and actor vocabulary; A05 established immutable detached configuration lifecycle and recovery contracts; A06 established every source stream's exact four-mode disposition and bounded acquisition behavior; and A07 now establishes seven stable operator areas, readiness and mutation semantics, 13 finite states, planned-display keyboard behavior, responsive/accessibility acceptance, ordinary-form and server-validation behavior without JavaScript, the persistent self-hosted authority warning, and a route-independent feature-region seam verified inside both shell types. The production panel, routes, adapters, OAuth clients, and persistence remain planned. | [`docs/configuration.md`](configuration.md), [`docs/core-and-hosted-feature-acceptance-matrix.md`](core-and-hosted-feature-acceptance-matrix.md), [`docs/core-and-hosted-threat-model.md`](core-and-hosted-threat-model.md), [`docs/core-workspace-actor-contracts.md`](core-workspace-actor-contracts.md), [`docs/core-configuration-state-contracts.md`](core-configuration-state-contracts.md), [`docs/core-source-mode-contracts.md`](core-source-mode-contracts.md), [`docs/core-operator-panel-information-architecture.md`](core-operator-panel-information-architecture.md), [`docs/future-parity-roadmap.md`](future-parity-roadmap.md), [`docs/core-and-hosted-implementation-work-breakdown.md`](core-and-hosted-implementation-work-breakdown.md), [`docs/decisions/0026-public-core-and-hosted-shell.md`](decisions/0026-public-core-and-hosted-shell.md) |
| `legacy-retirement` | Historical shadow retirement | `documented-production` | M-18 retired the original Classroom Screen runtime and migration shadow from active service while preserving source, state, unit definitions, route snapshots, and rollback instructions as cold-recovery evidence. | [`docs/migration/retirement-decisions.md`](migration/retirement-decisions.md), [`docs/future-parity-roadmap.md`](future-parity-roadmap.md) |
| `attendance-administration` | Attendance administration workflow | `deferred` | An operator-facing attendance administration workflow remains deliberately outside the current production scope. | [`docs/future-parity-roadmap.md`](future-parity-roadmap.md), [`docs/decisions/0015-aggregate-attendance-continuity.md`](decisions/0015-aggregate-attendance-continuity.md) |

## Active workstreams

### Obsessively self-documenting development workflow

- Status: `active`
- Outcome: Keep semantic project state and capability knowledge current, enforced, and directly available inside every Codex task.
- Present state: The generated documentation router, tiered session and prompt hooks, quiet resume/compaction host refresh, path watcher, timer, semantic state registry, implementation-fingerprint gate, workstream classification, and isolated-worktree guidance are implemented in this branch and installed on the canonical host.
- Capabilities: `deployment-and-rollback`, `fixture-evaluation`
- Next: Maintain the registry and relevant durable prose with every implementation change, acknowledge each new implementation fingerprint only after semantic review, and keep the complete verification chain green.
- Documentation: [`docs/documentation-system.md`](documentation-system.md), [`docs/project-state.md`](project-state.md)

### Privacy-safe homepage demonstration

- Status: `active`
- Outcome: Produce reproducible, accessible, privacy-safe media that explains Chalkwright accurately on the separate public landing page.
- Present state: Synthetic storyboards, narration/render tooling, provenance boundaries, and landing-page operating instructions remain an active application-repository workstream. The published 123-second native-1080p cut follows one coherent day: Web Design appears in the first coming-up state and completes its class sequence before the later Robotics sequence and Robotics dismissal. Its Web Design opening uses a measured natural clause pause; the Classroom-to-vocabulary handoff uses a short continuous breath without a fade. Every captured display state uses the ChalkWright logo as the unconfigured school-brand placeholder. The Robotics sequence animates its explicitly labeled Google Classroom assignment, task details, and due date before its translation faces; the assignment remains stable through the edit instead of beginning an automatic card advance during its final frames. The translation faces remain synchronized to narration-topic boundaries without repeating the language enumeration. Displayed demo branding uses ChalkWright casing, the schedule narration says the day's complete schedule, and the closing voice explicitly says Apache two point oh. This corrected cut is live at chalkwright.org with accurate default-on captions and a dedicated visible CC toggle. A newer unpublished 123-second candidate removes the unspoken fourth overview bullet, retimes each anatomy callout to lead its matching spoken phrase by about 0.2 seconds, lets the final full-screen pullback settle after narration, introduces the second class with the authentic Robotics coming-up display before dissolving during the spoken pause into its objective, and shortens the following narration to avoid repeating the Robotics class name. The landing page's separate private repository uses main as the default branch and records the deployed source at commit 7a4a9f207ff46c21092f8f7aef855c018e8095d8. The Lenovo origin and public Cloudflare route were verified on 2026-08-30, including exact video and caption hashes, text/vtt caption delivery, HTTP 206 video ranges and a zero-finding production dependency audit. Authorized capacity recovery and publication cleanup removed superseded build cache and predecessor images; the current live image and canonical source remain intact, with no predecessor image retained. Future landing-page changes require their canonical application documentation and semantic-state handoff within the same task.
- Capabilities: `classroom-display`, `lesson-enrichment`, `site-presentation`, `fixture-evaluation`
- Next: Maintain reproducible media provenance, caption accuracy, public delivery checks and independent landing-page source history as the demonstration evolves.
- Documentation: [`docs/project-state.md`](project-state.md), [`docs/future-parity-roadmap.md`](future-parity-roadmap.md)

### Synthetic display-content polish

- Status: `active`
- Outcome: Keep fixture-backed captures representative of current objectives, assignments, and multilingual vocabulary without introducing private classroom data.
- Present state: The B407 synthetic fixture and preview evidence include richer Web Design and Robotics carousel content. Coursework retains an explicit Google Classroom presentation, the Robotics assignment includes synthetic task and due-date details, and an unconfigured school-brand slot uses the ChalkWright placeholder logo; corresponding display assertions are updated.
- Capabilities: `classroom-display`, `lesson-enrichment`, `fixture-evaluation`
- Next: Verify the accepted viewport envelope and regenerate only reproducible synthetic preview evidence when presentation behavior changes.
- Documentation: [`docs/b407-display-mvp.md`](b407-display-mvp.md), [`docs/project-state.md`](project-state.md)

### Core configuration panel and hosted-shell planning

- Status: `active`
- Outcome: Move the agreed Core operator panel and related hosted-shell direction through an architecture-ready, measurable implementation gate without changing live runtime behavior prematurely.
- Present state: A01 through A08 are complete and the architecture-ready gate is satisfied; Phase B remains unstarted. A08 defines version 1.0.0 of the shared synthetic fixture catalog and reusable adapter-free scenario-only consumer seam. It composes the existing A04 workspace, A05 configuration lifecycle, and all four A06 source modes into deterministic JSON-safe accepted and independently denied installation, scope, configuration, source, course/schedule/vocabulary/media, OAuth lifecycle, mutation-free preview, and cross-tenant cases. Every family has both dispositions; distinct denials cover wrong actor/workspace/room/screen/resource/grant, wrong/replayed/expired OAuth, wrong/replayed/stale/mutating preview, malformed input, unsafe privacy, conflict, rollback, and cross-workspace export/import/backup/restore. A consumer receives a cloned scenario without an expectation; the suite alone compares its response and a committed digest detects catalog drift. The exact privacy registry enumerates released display/student scalar fields and rejects arbitrary/misclassified names, registry omissions/duplicates, restricted, unclassified, raw-provider, account, diagnostic, internal-plan, secret-like, private-link, duplicate, unknown, and nested values. The suite covers NT-03, NT-04, NT-09, NT-10, NT-11, NT-14, and NT-18 and fails closed for hostile catalog shapes, missing coverage, thrown consumers, and mismatched results. These contracts are not threaded into use cases or adapters; no parser, fetcher, OAuth client, production route, live UI, persistence schema, provider enrollment, account flow, hosted repository, billing integration, service, deployment, or classroom data changed.
- Capabilities: `guided-setup`, `preview-and-controls`, `durable-state`, `fixture-evaluation`
- Next: Keep the A08 catalog and privacy inventory versioned whenever a later implementation releases a new display or student field. Begin a Phase B task only under separate scoped authorization; this completed planning work does not authorize a package, adapter, route, or UI implementation.
- Documentation: [`docs/core-and-hosted-feature-acceptance-matrix.md`](core-and-hosted-feature-acceptance-matrix.md), [`docs/core-and-hosted-threat-model.md`](core-and-hosted-threat-model.md), [`docs/core-workspace-actor-contracts.md`](core-workspace-actor-contracts.md), [`docs/core-configuration-state-contracts.md`](core-configuration-state-contracts.md), [`docs/core-source-mode-contracts.md`](core-source-mode-contracts.md), [`docs/core-operator-panel-information-architecture.md`](core-operator-panel-information-architecture.md), [`docs/core-shared-synthetic-fixture-suite.md`](core-shared-synthetic-fixture-suite.md), [`docs/core-and-hosted-implementation-work-breakdown.md`](core-and-hosted-implementation-work-breakdown.md), [`docs/project-state.md`](project-state.md)

## Known limits

- General installation support and public-production readiness for external adopters are not claimed.
- M-18 removed the active legacy and shadow fallbacks; any temporary cold-recovery restoration now requires explicit incident authorization and must be disabled again after the bounded recovery window.
- PowerSchool and Google Classroom remain read-only; Calendar writes remain limited to verified application-owned events.
- Semantic documentation accuracy is a mandatory model-reviewed completion condition; documented deployment claims still require a separately authorized live probe before being reported as current live state.
- The current strict runtime configuration is not yet the intended guided end-user setup experience. A04-A08 define workspace/actor, configuration-state, source-mode, operator information-architecture, and shared synthetic conformance contract surfaces, but no source parser, fetcher, OAuth client, persistence adapter, production route, live UI, or use case implements those new contracts yet and current SQLite schemas and runtime behavior are unchanged.
- The A06 shared-resource CIDR policy is a reviewed conservative snapshot, not a dynamic future-registry claim. The theoretical 2000::/3 IPv6 envelope is not treated as allocated: only current IANA IPv6 Global Unicast ALLOCATED rows are positive-listed before special-purpose subtraction. Re-review is required before shared-resource implementation and whenever a referenced IANA registry updates.

## Next decisions

- What post-retirement observation interval and evidence should close the remaining stabilization period without weakening the cold-recovery boundary.
- What maintenance and contribution workflow should govern the separate landing page as Chalkwright approaches broader installation support.
- Which separately authorized Phase B implementation slice should first consume the completed A08 shared contract-suite seam.
<!-- prettier-ignore-end -->
