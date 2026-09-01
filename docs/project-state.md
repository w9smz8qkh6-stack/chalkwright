<!-- Generated from docs/project-knowledge.json by scripts/codex/project-knowledge.mjs. Do not edit. -->

<!-- prettier-ignore-start -->

# Current Chalkwright project state

This is the canonical, compact semantic state of the repository. Edit
`docs/project-knowledge.json`, review it against implementation and operating
evidence, record the new implementation fingerprint, and run `npm run
docs:sync`. Repository documentation is not a live-service probe.

## Freshness contract

- Reviewed: `2026-09-01` (0 days ago; maximum 7)
- Implementation files covered: 528
- Implementation fingerprint: `8085e5027e9e374168be567bfccac8df57d7fdbe8bd4d5b5a60e94b63c9d58bb`
- Semantic review: **CURRENT**
- Review statement: The phase, capabilities, workstreams, limits, repository-backed application deployment claim, completed M-18 retirement record, documentation automation, isolated-worktree guidance, and operator-first control plane were reviewed together on 2026-09-01. The planning WBS and generated task/execution ledger—not an agent's idle flag or a dirty, behind canonical checkout—are the scheduling authority. Goal 1's required lane A07 → A08 → C01 → C02 → C03 → C04 → C09 → C10 is accepted: C04 evidence is commit 564fc70, C09 evidence is commit 609abd5 and reconciliation commit bbd6392, and C10's final non-creator acceptance evidence is commits 8060793 and b3edda8. C10 is exclusively the clean non-creator Core operator-panel acceptance gate. C11's Core contact-sheet, date-picker, enlarged preview, and keyboard carousel are accepted at remote commit cebcc13c28d2b7d6b4ec76af2a07498d1a914dcb. WBS freshness and queue validation report all 51 tasks current; B01, C05, C06, and C12 remain independently ready. After C10, D00 selected Django and the private versioned Core service/worker boundary recorded in ADR-0027; D07 is separately owned and remains in progress. D04 remains blocked on external provider-registration inputs. No production deployment, DNS, provider, credential, route, service, or classroom-display probe was performed for this review.
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

- Deliver dispatched C12 Core presentation-profile and transition controls through its isolated worktree while maintaining the WBS and generated queue ledger as dispatch authority; C11 is accepted and B01, C05, and C06 remain independently ready but unassigned.
- Observe post-retirement production stability and preserve the retained cold-recovery evidence and explicit restoration boundary.
- Make the repository's present state, capabilities, workstreams, limitations, and verification status continuously available to Codex.
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
| `guided-setup` | Guided non-secret installation configuration | `planned` | Goal 1 accepted a private-by-default Core operator panel using the existing server-rendered TypeScript/HTML/CSS strategy. A04 established the workspace/actor vocabulary, A05 the immutable detached configuration lifecycle and recovery contracts, A06 the source-mode/format, admission, consent/grant, provenance, freshness, and last-known-good contracts, and A07/A08 the Core pages/actions and fixtures for C01-C04/C09/C10. The accepted panel evidence is retained on isolated implementation branches; the advanced review UI, adapters, OAuth clients, durable persistence, and connected-provider work remain follow-on. Commercial account architecture was selected by D00 after C10. | [`docs/configuration.md`](configuration.md), [`docs/core-and-hosted-feature-acceptance-matrix.md`](core-and-hosted-feature-acceptance-matrix.md), [`docs/core-and-hosted-threat-model.md`](core-and-hosted-threat-model.md), [`docs/core-workspace-actor-contracts.md`](core-workspace-actor-contracts.md), [`docs/core-configuration-state-contracts.md`](core-configuration-state-contracts.md), [`docs/core-source-mode-contracts.md`](core-source-mode-contracts.md), [`docs/future-parity-roadmap.md`](future-parity-roadmap.md), [`docs/core-and-hosted-implementation-work-breakdown.md`](core-and-hosted-implementation-work-breakdown.md), [`docs/decisions/0026-public-core-and-hosted-shell.md`](decisions/0026-public-core-and-hosted-shell.md) |
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

### Core operator-panel follow-on and hosted architecture

- Status: `active`
- Outcome: Maintain Goal 1's accepted private-by-default Core operator panel, complete its independently schedulable follow-on work, and build the hosted Django wrapper through the selected private versioned Core service/worker boundary.
- Present state: Goal 1 is complete and accepted. A07/A08 specify the Core-only information architecture and exact synthetic suite; C01 implements reusable versioned configuration services; C02 supplies the private-listener, no-login operator shell; C03 adds draft room/screen/timezone references and class-code lifecycle; C04 adds the Core source registry and ordinary forms (accepted evidence 564fc70); C09 reconciles the final operator workflow (609abd5 and bbd6392); and C10 independently confirms the full non-creator configuration, preview, activation, rollback, redacted-export, and recovery path (8060793 and b3edda8). C11 is accepted at remote commit cebcc13c28d2b7d6b4ec76af2a07498d1a914dcb and supplies a server-rendered contact sheet, date picker, enlarged review, and keyboard carousel with an ordinary form/no-JavaScript path. C12 is in progress on its isolated Core branch; remote checkpoint 4bb215443df1ee9f3e67b2d843fc2f600735f79d adds the bounded private profile-preview seam, but route and preview qualification remain before acceptance. The generated queue reports B01, C05, and C06 independently ready. D00 has selected Django plus a private versioned Core service/worker boundary through ADR-0027. D07 is separately owned and in progress; D04 awaits external provider-registration inputs. The Core planning checkout is not evidence of hosted deployment or live operational state.
- Capabilities: `guided-setup`, `preview-and-controls`, `durable-state`, `fixture-evaluation`
- Next: Use the WBS and generated task/execution ledger as the only scheduling authority; run WBS synchronization and freshness checks whenever their source changes. Do not derive status from the canonical checkout's divergence or an agent idle flag. Complete C12's Core presentation-profile and transition controls in its assigned isolated worktree, return its verified remote checkpoint for acceptance, then choose the next ready item. Do not dispatch B01, C05, or C06 before that queue decision; continue separately owned hosted work under ADR-0027, and resolve D04 provider-registration inputs before connected-provider work.
- Documentation: [`docs/core-and-hosted-feature-acceptance-matrix.md`](core-and-hosted-feature-acceptance-matrix.md), [`docs/core-and-hosted-threat-model.md`](core-and-hosted-threat-model.md), [`docs/core-workspace-actor-contracts.md`](core-workspace-actor-contracts.md), [`docs/core-configuration-state-contracts.md`](core-configuration-state-contracts.md), [`docs/core-source-mode-contracts.md`](core-source-mode-contracts.md), [`docs/core-and-hosted-implementation-work-breakdown.md`](core-and-hosted-implementation-work-breakdown.md), [`docs/core-and-hosted-work-queue.md`](core-and-hosted-work-queue.md), [`docs/project-state.md`](project-state.md)

## Known limits

- General installation support and public-production readiness for external adopters are not claimed.
- M-18 removed the active legacy and shadow fallbacks; any temporary cold-recovery restoration now requires explicit incident authorization and must be disabled again after the bounded recovery window.
- PowerSchool and Google Classroom remain read-only; Calendar writes remain limited to verified application-owned events.
- Semantic documentation accuracy is a mandatory model-reviewed completion condition; documented deployment claims still require a separately authorized live probe before being reported as current live state.
- Goal 1's Core operator-panel acceptance is complete, but the advanced contact-sheet/carousel UI (C11), connected sources, presentation profiles, package hardening, durable production persistence, and external-provider onboarding remain follow-on work. The current strict runtime configuration is not yet the full guided end-user setup experience.
- The A06 shared-resource CIDR policy is a reviewed conservative snapshot, not a dynamic future-registry claim. The theoretical 2000::/3 IPv6 envelope is not treated as allocated: only current IANA IPv6 Global Unicast ALLOCATED rows are positive-listed before special-purpose subtraction. Re-review is required before shared-resource implementation and whenever a referenced IANA registry updates.

## Next decisions

- What post-retirement observation interval and evidence should close the remaining stabilization period without weakening the cold-recovery boundary.
- What maintenance and contribution workflow should govern the separate landing page as Chalkwright approaches broader installation support.
- Which independently ready Core follow-on item—B01, C05, or C06—should be dispatched after C12 under the WBS dependencies and isolated-worktree ownership rules.
- When should the blocked D04 Google/Microsoft provider-registration inputs and an explicitly authorized hosted deployment/DNS workstream be initiated.
<!-- prettier-ignore-end -->
