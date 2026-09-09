<!-- Generated from docs/project-knowledge.json by scripts/codex/project-knowledge.mjs. Do not edit. -->

<!-- prettier-ignore-start -->

# Current Chalkwright project state

This is the canonical, compact semantic state of the repository. Edit
`docs/project-knowledge.json`, review it against implementation and operating
evidence, record the new implementation fingerprint, and run `npm run
docs:sync`. Repository documentation is not a live-service probe.

## Freshness contract

- Reviewed: `2026-09-09` (0 days ago; maximum 7)
- Implementation files covered: 517
- Implementation fingerprint: `fc3658a48eaa1de7c5a65f994d893182203eedec628f3080b41e8849bbe4c6a5`
- Semantic review: **CURRENT**
- Review statement: The phase, capabilities, workstreams, limits, production deployment claim, PowerSchool recovery boundary, completed M-18 retirement, classroom-display polish, and homepage-demonstration pipeline were reviewed against the current implementation and documentation on 2026-09-09. Repository evidence records bounded automatic PowerSchool recovery, Calendar reconciliation after a successful plan refresh, release-build hardening, the completed retirement of the legacy shadow, and responsive classroom-display improvements. The separate landing page remains independently published; this review does not assert a fresh live application-service probe.
- Working-tree classification: 0/0 governed entries assigned to an active workstream; 0 unclassified; 0 excluded local-artifact entries.

## Development position

- Phase: **Production stabilization and public-preview preparation**
- Milestone: **Post-M18 retirement; production stabilization and display polish**
- Release: `0.1.0`
- Summary: The standalone Chalkwright service is documented as the classroom display source of truth. The separate narrated public landing page is now published with canonical private Git history, while current application-repository work continues on stabilization, demonstration reproducibility, synthetic fixture presentation, and the self-documenting development workflow.

## Documented deployment state

- Status: `documented-production`
- Summary: Repository evidence says the standalone production lane serves the classroom display path, provider acquisition and owned-Calendar follower jobs are active, and the historical shadow has been retired with retained cold-recovery material.
- Evidence basis: Reviewed repository documentation dated through 2026-08-31. This refresh directly verified the separate landing page through its loopback and public routes, including exact v15 media bytes, headers, markup and bounded ranges. A fresh interactive browser pass was unavailable, and no application-service, provider, credential, or classroom-display probe was performed.
- Evidence: [`README.md`](../README.md), [`docs/permanent-production-deployment.md`](permanent-production-deployment.md), [`docs/migration/m17-review-package.md`](migration/m17-review-package.md), [`docs/migration/m18-retirement-record.md`](migration/m18-retirement-record.md)

## Current priorities

- Keep the permanent production lane stable and retain the documented cold-recovery material after M-18 retirement.
- Make the repository's present state, capabilities, workstreams, limitations, and verification status continuously available to Codex.
- Keep the published privacy-safe landing page reproducible, accessible, independently versioned, and operationally separate from application releases.
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
| `durable-state` | Durable state, recovery, and last-known-good behavior | `documented-production` | Uses SQLite migrations, integrity checks, backups, retention, restart-safe jobs, and last-known-good projections. | [`docs/decisions/0013-state-retention-and-recovery.md`](decisions/0013-state-retention-and-recovery.md), [`docs/operations.md`](operations.md) |
| `deployment-and-rollback` | Immutable production deployment and rollback | `documented-production` | Builds digest-bound releases, polls protected main, verifies readiness, switches atomically, and rolls back failed releases. | [`docs/permanent-production-deployment.md`](permanent-production-deployment.md), [`docs/decisions/0025-permanent-production-delivery.md`](decisions/0025-permanent-production-delivery.md) |
| `site-presentation` | School branding and bounded site media | `implemented` | Supports an installation-specific school logo, course art, countdown media, local validation, and digest-pinned serving. | [`docs/configuration.md`](configuration.md), [`docs/homepage-demo-video.md`](homepage-demo-video.md) |
| `fixture-evaluation` | Synthetic local evaluation and public demonstration | `fixture-supported` | Provides a loopback-only B407 demonstration, reproducible screenshots, privacy-safe homepage media, smoke checks, and disposable rehearsals. | [`docs/b407-display-mvp.md`](b407-display-mvp.md), [`docs/homepage-demo-video.md`](homepage-demo-video.md) |
| `guided-setup` | Guided non-secret installation configuration | `planned` | Replace direct editing of strict runtime files with a versioned, approachable setup layer while retaining protected secret separation. | [`docs/configuration.md`](configuration.md), [`docs/future-parity-roadmap.md`](future-parity-roadmap.md) |
| `legacy-retirement` | Historical shadow retirement | `documented-production` | M-18 retired the historical shadow after documented readiness, route, timer, and recovery gates; retained local material remains available only for cold recovery. | [`docs/migration/retirement-decisions.md`](migration/retirement-decisions.md), [`docs/future-parity-roadmap.md`](future-parity-roadmap.md), [`docs/migration/m18-retirement-record.md`](migration/m18-retirement-record.md) |
| `attendance-administration` | Attendance administration workflow | `deferred` | An operator-facing attendance administration workflow remains deliberately outside the current production scope. | [`docs/future-parity-roadmap.md`](future-parity-roadmap.md), [`docs/decisions/0015-aggregate-attendance-continuity.md`](decisions/0015-aggregate-attendance-continuity.md) |

## Active workstreams

### Obsessively self-documenting development workflow

- Status: `active`
- Outcome: Keep semantic project state and capability knowledge current, enforced, and directly available inside every Codex task.
- Present state: The generated documentation router, tiered session and prompt hooks, quiet resume/compaction host refresh, path watcher, timer, semantic state registry, implementation-fingerprint gate, workstream classification, mandatory same-task cross-repository landing-page handoff, and isolated-worktree guidance are active.
- Current working-tree entries in scope: 0
- Capabilities: `deployment-and-rollback`, `fixture-evaluation`
- Next: Maintain the registry and relevant durable prose with every implementation change, acknowledge each new implementation fingerprint only after semantic review, and keep the complete verification chain green.
- Documentation: [`docs/documentation-system.md`](documentation-system.md), [`docs/project-state.md`](project-state.md)

### Privacy-safe homepage demonstration

- Status: `active`
- Outcome: Produce reproducible, accessible, privacy-safe media that explains Chalkwright accurately on the separate public landing page.
- Present state: Synthetic storyboards, narration/render tooling, provenance boundaries, and landing-page operating instructions remain an active application-repository workstream. The published 123-second native-1080p v15 cut follows one coherent day: Web Design appears in the first coming-up state and completes its class sequence before the later Robotics sequence and Robotics dismissal. Its Web Design opening uses a measured natural clause pause; the Classroom-to-vocabulary handoff uses a short continuous breath without a fade. Every captured display state uses the ChalkWright logo as the unconfigured school-brand placeholder. The Robotics sequence animates its explicitly labeled Google Classroom assignment, task details, and due date before its translation faces; the assignment remains stable through the edit instead of beginning an automatic card advance during its final frames. The translation faces remain synchronized to narration-topic boundaries without repeating the language enumeration. Displayed demo branding uses ChalkWright casing, the schedule narration says the day's complete schedule, and the closing voice explicitly says Apache two point oh. The live v15 release removes the unspoken fourth overview bullet, retimes each anatomy callout to lead its matching spoken phrase by about 0.2 seconds, lets the final full-screen pullback settle after narration, introduces the second class with the authentic Robotics coming-up display, accelerates its runtime-formatted lower-left countdown from 10:00 to 0:00, holds at zero before dissolving into its objective, shortens the following narration to avoid repeating the Robotics class name, and adds an explicit sentence break before the classroom-specific language explanation. The separate private landing-page repository records deployed runtime source commit ef120516f84fc31c9c59b29a9b09e4b3aeaa6d1c. The Lenovo origin and public Cloudflare route were verified on 2026-08-31, including exact video and caption hashes, text/vtt caption delivery, HTTP 206 bounded video ranges, release-tokened markup and a zero-finding production dependency audit. A fresh interactive live browser pass was unavailable; the unchanged player UI and v15 media retain their prior local visual verification. Authorized cleanup removed superseded v13/v14 render packages, v8/v9 narration sets and reproducible Docker build cache. After v15 verification, the user explicitly requested removal of latent obsolete production video copies, so the unused predecessor Docker image was deleted; canonical Git history remains the prior-release recovery source. Future landing-page changes require their canonical application documentation and semantic-state handoff within the same task.
- Current working-tree entries in scope: 0
- Capabilities: `classroom-display`, `lesson-enrichment`, `site-presentation`, `fixture-evaluation`
- Next: Maintain reproducible media provenance, caption accuracy, public delivery checks and independent landing-page source history as the demonstration evolves.
- Documentation: [`docs/homepage-demo-video.md`](homepage-demo-video.md), [`docs/landing-page-runbook.md`](landing-page-runbook.md)

### Synthetic display-content polish

- Status: `active`
- Outcome: Keep fixture-backed captures representative of current objectives, assignments, and multilingual vocabulary without introducing private classroom data.
- Present state: The B407 synthetic fixture and preview evidence include richer Web Design and Robotics carousel content. Coursework retains an explicit Google Classroom presentation, the Robotics assignment includes synthetic task and due-date details, and an unconfigured school-brand slot uses the ChalkWright placeholder logo; corresponding display assertions are updated.
- Current working-tree entries in scope: 0
- Capabilities: `classroom-display`, `lesson-enrichment`, `fixture-evaluation`
- Next: Verify the accepted viewport envelope and regenerate only reproducible synthetic preview evidence when presentation behavior changes.
- Documentation: [`docs/b407-display-mvp.md`](b407-display-mvp.md), [`docs/homepage-demo-video.md`](homepage-demo-video.md)

## Known limits

- General installation support and public-production readiness for external adopters are not claimed.
- The historical shadow is retired; its retained local recovery material must not be deleted or reactivated without a separately approved recovery action.
- PowerSchool and Google Classroom remain read-only; Calendar writes remain limited to verified application-owned events.
- Semantic documentation accuracy is a mandatory model-reviewed completion condition; documented deployment claims still require a separately authorized live probe before being reported as current live state.
- The current strict configuration schemas are not yet the intended guided end-user setup experience.

## Next decisions

- Whether the completed M-18 retirement warrants any later removal or revision of retained cold-recovery material.
- What maintenance and contribution workflow should govern the now-published landing page as Chalkwright approaches broader installation support.
- Which post-MVP enrichment or guided-setup slice should follow the current stabilization and presentation work.
<!-- prettier-ignore-end -->
