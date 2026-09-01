# Future parity roadmap

This roadmap records the remaining parity work after the M-17 parallel canary
and permanent-production handoff. Work resumed on August 21, 2026. The
standalone Chalkwright service now serves the existing classroom display path;
its permanent timers and owned-Calendar follower are active. The historical
app and migration shadow are inactive and disabled after completed M-18
retirement, with local artifacts retained only for cold recovery.

The priority order is user-directed: vocabulary first, on-disk lesson-reference
slide enhancement second, and attendance-admin parity later.

## 1. Vocabulary parity slice

Implementation status: complete and live in standalone production. Protected
read-only Drive configuration binds the current academic year and five class
sources outside the repository. The display reads only the imported local
catalog and keeps working when Drive is unavailable.

Goal: make the migrated app's word-of-the-day and vocabulary cards feel as
useful as the legacy app while remaining explainable and bounded.

Scope:

- inventory the current vocabulary sources, including class-specific terms,
  subject terms, CodeHS or course signals, and vocabulary history;
- select one vocabulary item per meeting, avoid repeats until the pool is
  exhausted, and preserve repeat behavior explicitly when exhaustion occurs;
- keep bilingual, definition, and pronunciation-ready fields where available;
- add teacher-configurable vocabulary pools by course, unit, or lesson; and
- expose safe diagnostics explaining the selection without printing private
  lesson source text.

The implemented source is every direct-child CSV at each teacher-controlled,
bounded exact course path. English and teacher-supplied Vietnamese, Korean, and
Simplified Chinese columns are imported together; no LLM translation call is
part of the feature. Web Design, Robotics, Computer Fundamentals, and Digital
Media Production are live-bound. Existing meeting selections retain their word
identity while teacher corrections refresh display capitalization and content.

Acceptance:

- the display reliably shows relevant vocabulary during in-class content;
- repeated words are intentional and explainable; and
- missing vocabulary degrades gracefully without fabricated filler.

## 2. On-disk lesson-reference slide enhancement

Goal: augment in-class cards from teacher-owned lesson references without
mutating those references or inventing schedule truth.

Scope:

- define a safe on-disk lesson-reference folder structure;
- index only approved local lesson, unit, textbook, and support materials;
- map references to course, unit, date, and current objective;
- generate or enrich objective, bellringer, reminder, vocabulary-support,
  textbook/reference, and "today you'll need" cards; and
- retain source attribution that is inspectable by the teacher.

Acceptance:

- a known class/day can produce useful enriched cards from local references;
- card text remains bounded for the classroom display; and
- missing references fall back to Classroom/static content without blocking the
  screen.

## 3. Google Classroom assignment polish

Goal: make Classroom-derived cards concise and visually balanced.

Scope:

- compact long assignment directions;
- improve due-date badges and "open Classroom for full directions" wording;
- avoid duplicating static objectives when Classroom already supplies equivalent
  content; and
- preserve the read-only Classroom boundary.

Acceptance:

- assignment cards are scannable on the TV; and
- long descriptions do not dominate the carousel.

## 4. Preview and schedule confidence

Implementation status: complete and working in production.
Current-day acquisition, unavailable-day distinction, bounded future
lookahead, and physical next-class-day preview have passed. The natural Sunday
2026-08-30 acquisition successfully stored the next verified class day, but
the exact Sunday plan was absent. The deployed correction serves the already
stored next class day as a morning overview without provider access or
calendar-day guessing; direct and routed readiness checks passed.

Goal: keep Sunday lookahead, morning verification, and end-of-day preview
boring and trustworthy.

Scope:

- maintain verified next-class-day serving after the successful Sunday
  acquisition of the following class week;
- verify morning schedule checks against the live PowerSchool bell page;
- distinguish "no classes found" from "not loaded yet"; and
- retain day-complete next-class-day preview behavior.

Acceptance:

- the screen shows the next real class day after classes end; and
- unavailable days are skipped only under the documented bounded lookahead
  policy.

## 5. Operational stabilization and handoff evidence

Implementation status: permanent handoff and M-18 retirement completed.
The production service serves the existing classroom URL, all permanent timers
are active, Calendar reconciliation converges, and the historical app and
shadow are inactive and disabled. One successful full classroom day and the
Sunday acquisition/readiness gate are recorded. Alert activation and future
restore/restart drills remain post-retirement operational improvements, not
retirement gates.

The August 21 OpenClaw dependency scan found no reference in any active
Chalkwright unit, production entrypoint, systemd dependency, package dependency,
or protected production configuration. M-18 has removed the obsolete
managed-profile PowerSchool characterization executor and the historical M-15
Calendar-trial provisioning/writer-exclusion path from source, package commands,
tests, and compiled releases. The unrelated dormant M-16 alert-provisioning
script and deliberate publication/systemd denial guards still name OpenClaw but
cannot be invoked by a production unit. Independent user-scoped OpenClaw
services remain active on the shared host but are not a Chalkwright dependency.
The PowerSchool-specific legacy Chrome instance is disabled and stopped; its
unit template and profile remain as cold-recovery artifacts. M-18 did not
remove unrelated OpenClaw workloads merely because they share the host.

The active native repair runs in Bren's systemd user manager and is working:
its last three recorded runs returned `authenticated` with exit code zero and
no OpenClaw involvement. The failed `browser-launch-closed` record belongs to
the obsolete system-manager lane and is not current repair evidence. A
controlled August 21 qualification then ran the native repair followed by two
consecutive credential-free production plan refreshes. Both refreshes returned
`succeeded`; the display exposed a current, verified, non-degraded three-meeting
plan with no diagnostics. After the legacy OpenClaw PowerSchool Chrome instance
was disabled and stopped, a third credential-free refresh also succeeded and
the display remained ready. The obsolete system-manager repair unit was moved
to root-owned rollback storage; the working user-manager unit remains loaded.
This closes native repair-to-routine state handoff and OpenClaw runtime
separation as functional gates. The later Sunday acquisition and readiness
evidence closed the retirement observation gate; scheduled execution remains a
normal ongoing operational check.

Goal: keep the migrated app reliable after the completed final handoff.

Scope:

- observe scheduled refresh, backup, integrity, restart, and recovery behavior;
- keep alerts report-only until their permanent ownership and destination are
  explicitly approved;
- run Fully Kiosk smoke checks in representative states; and
- retain redacted route, timer, writer, and recovery evidence for future
  operations.

Acceptance:

- the migrated display runs through real school-day cycles with bounded,
  recoverable failures; and
- bounded cold recovery retains explicit approval and rollback criteria.

## 6. Attendance-admin parity, deferred

Goal: keep the student-facing QR/check-in display stable now, while deferring
deeper teacher/admin attendance surfaces.

Deferred scope:

- attendance inspection routes;
- teacher attendance matrix; and
- any external Sheet/report continuity that the user still wants.

Acceptance later:

- QR behavior remains stable in the display; and
- admin/reporting work is treated as a separate parity slice rather than a
  blocker for display parity.

## 7. Core operator panel with planned-display review

Implementation status: architecture-planning workstream active; implementation
has not begun.

This is the project's **first delivery goal**.

Goal: give every Chalkwright Core installation a browser-based operator panel
for guided configuration, connection setup, visual review, and presentation
preferences without editing internal runtime files.

Core does not require a Chalkwright user account or login to reach this panel.
Anyone who can reach it has operator authority, so the self-hosted deployment
must keep it behind an operator-controlled local or private exposure boundary
and must not publish it openly. Tailscale may provide that boundary but is not
required. The operator configures the class code that classroom displays and
students enter to reach the separate low-privilege display view; the class code
does not protect the operator panel.

The control center should cover schedule and content sources, approved
connectors, rooms and screens, branding, languages, themes, transition
profiles, readiness, source freshness, and protected enrollment workflows. A
planned-display review presents each day's expected states and carousel cards
as a contact sheet, supports enlarged single-frame review and a day carousel,
and loads distant dates on demand outside a bounded rolling preview window.

The first vertical slice is deliberately smaller: server-rendered
TypeScript/HTML/CSS pages with ordinary forms and server-side validation for
timezone, rooms, screens, courses, a manual timetable, approved basic content,
draft validation, mutation-free preview, activation, rollback, redacted export,
and recovery. It adds no UI framework, client router, account system,
commercial navigation, provider enrollment, or billing. Uploads, shared
resources, connected providers, contact sheets, themes, and broader diagnostics
follow only after C10 proves this basic workflow in a clean non-creator
rehearsal.

Every consequential source should support a connected-provider lane and the
closest safe application-managed, shared-resource, or uploaded lane. A URL or
Calendar ID does not itself grant access, and Google Classroom automation has
no share-URL equivalent. Chalkwright will own Google OAuth, token storage,
revocation, and official API calls directly; managed identity or integration
brokers are not part of the selected architecture.

The completed A06
[Core source-mode contracts](core-source-mode-contracts.md) now fix the exact
first-release/later mode matrix, closed logical formats and budgets,
upload/shared/connected admission boundaries, normalized provenance, and
freshness/last-known-good behavior. They do not implement a parser, provider,
storage adapter, route, or UI.

The commercial service may reuse or reproduce the proven Core panel behavior
inside a complete authenticated account application and adds organizations,
invitations and roles, billing, subscriptions, provider connections, account
export/deletion, and hosted operations. Accounts and authorization belong to
the hosted service rather than becoming a requirement of Core. D00 selects
Django versus a TypeScript shell and the Core integration/port boundary only
after the first Core panel passes C10.

Packaging must preserve Core as a complete public self-hosted application while
also making it the upstream dependency for the commercial service. The hosted
repository should consume versioned Core use cases, contracts, and presentation
primitives below the HTTP boundary; it must not mount Core's unauthenticated
self-hosted routes. Core supplies a private-by-default operator listener and a
separately configurable display listener. The proposed ownership, package,
compatibility, and verification boundaries are recorded in
[ADR-0026](decisions/0026-public-core-and-hosted-shell.md).

The first approved execution sequence is A07, A08, C01-C04, C09, and C10 in the
[Core and Hosted Service Implementation Work Breakdown](core-and-hosted-implementation-work-breakdown.md).
A01-A06 are already complete. This sequence finishes the Core page/action and
fixture specifications, implements the smallest useful panel directly in the
existing TypeScript application, and independently rehearses it before package
hardening or commercial architecture.

## 8. Commercial hosted service, exploratory

Implementation status: roadmap concept only; not authorized for deployment.
Commercial framework, account architecture, and the TypeScript-versus-Python
Core boundary are deliberately deferred until the Core operator-panel C10 gate.

Goal: offer a paid ChalkWrite.com service that hosts logical Chalkwright screen
instances for teachers and schools that do not want to operate the free
self-hosted application.

The working concept charges $9.99 per active screen per month. An account
manages its organization, screens, approved schedule and content sources,
Google Classroom connection, branding, art, and language options through the
signed-in application. Each screen receives an opaque URL and
operator-configured class code. The same class-code-gated view may be opened on
student devices, where presentation preferences such as a preferred translation
language affect only that viewer.

The architecture, Core-panel/hosted-account boundary, direct provider-
authorization decision, security boundary, Ubuntu pilot constraints, tenant
model, staged delivery plan, acceptance criteria, and open decisions are
detailed in the
[ChalkWrite.com Commercial Hosted App concept](chalkwrite-com-commercial-hosted-app.md).
The service should use one tenant-isolated application rather than a separately
deployed website per customer, and must remain operationally isolated from the
existing private Chalkwright deployment.
