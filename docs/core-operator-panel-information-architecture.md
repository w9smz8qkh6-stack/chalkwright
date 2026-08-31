# Core Operator-Panel Information Architecture

Status: A07 architecture contract. This document specifies the Core operator
information architecture and the shell-neutral presentation seam accepted for
the first operator MVP. It does not add a production route, persistence
adapter, provider connection, authorization flow, or live panel.

The executable contract is version `1.0.0` in
`src/contracts/v1/operator-panel.ts`. The escaped feature-region renderer is
`src/presentation/operator-panel-region.ts`. Synthetic reference fixtures and
the nonproduction visual gallery live under `test/fixtures`, `test/reference`,
and `docs/ui-references`.

## Product boundary

Core owns the seven stable operator areas, their route-independent view models,
readiness language, mutation intent, finite states, and the escaped HTML feature
region. A shell owns the complete document, global navigation binding, URLs,
forms/action targets, authentication or private reachability, authorization,
cookies, response headers, CSP, caching, errors, and any account or organization
chrome.

The self-hosted shell supplies one fixed installation workspace and exposes the
operator process only through its private-by-default ingress. Core has no login,
account, organization membership, role, billing, or support UI. The hosted shell
authenticates the account, verifies membership and role, and fixes organization,
workspace, actor, and target scope server-side before it invokes Core. It may
place hosted account navigation around the Core region, but it may not import
the self-hosted route table or document wrapper.

Both shells consume the same `OperatorFeatureRegionModel` and the same pure
`renderOperatorFeatureRegion` export. The Core region contains semantic action
keys and opaque scoped resource references, never URLs or authorization
decisions. Contract guards reject additional shell-owned fields, raw HTML,
sparse/decorated arrays, hostile prototypes, duplicate semantic keys/targets,
contradictory readiness levels, and wrong-workspace targets both at the region
boundary and inside nested action resources.

Every self-hosted operator page must present this persistent shell-owned warning
before page-specific actions:

> Private operator access: anyone who can reach this panel can administer this
> installation. Do not expose it publicly.

The warning is server-rendered and non-dismissible. It explains the existing
private-reachability authority boundary; it does not introduce or imitate a
Core login. Hosted pages use their authenticated account authorization instead
and do not present this warning as their authority model.

## Stable navigation and page specifications

The order and keys below are contract surface. Labels may be refined only with
an explicit compatibility review; route paths remain shell-owned and are not
part of this contract.

| Order | Stable key             | Purpose and required scope                                                                                                                                   | Primary operator work                                                                                                 | Readiness effect                                                                                                                                                           | Core MVP traceability                                                                        |
| ----- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1     | `overview`             | Explain installation readiness, setup progression, active continuity, and the next safe action; workspace scope.                                             | Continue setup; review planned display; inspect readiness and effective configuration.                                | Aggregate workspace, screen, source, preview, and configuration signals without hiding last-known-good availability.                                                       | `PANEL-01`, `DISPLAY-01`, `SCOPE-01`                                                         |
| 2     | `displays`             | Manage rooms, screens, timezone, display identity, and low-privilege class-code controls; workspace and screen scope.                                        | Save a screen draft; add rooms/screens; rotate or revoke a class code.                                                | Missing room, screen, timezone, or display identity blocks activation. A missing viewer code is only a warning when viewer admission is intended.                          | `SCREEN-01`, `VIEW-01`, `DISPLAY-01`, `SCOPE-01`                                             |
| 3     | `sources`              | Configure the source registry, guided non-connected lanes, mappings, validation, provenance, freshness, and retained projections; workspace scope.           | Add application-managed, uploaded, or shared sources; validate mappings and inspect last-known-good evidence.         | A required stream without a committed projection blocks activation; stale retained data warns while remaining usable. Connected accounts are reserved for a later release. | `SRC-01`, `SRC-02`, `SRC-03`, `DISPLAY-01`, `SCOPE-01`                                       |
| 4     | `planned-display`      | Review an exact screen and school date through a frame stage and daily contact sheet; workspace, screen, and date scope.                                     | Move by frame or school date, choose a date, enlarge a frame, and review provenance/freshness.                        | Preview is mutation-free. It explains blockers and retained data but cannot activate configuration or invoke provider/Calendar writes.                                     | `PLAN-01`, `PLAN-02`, `DISPLAY-01`, `SCOPE-01`                                               |
| 5     | `presentation`         | Configure branding, palette, typography, timing, language, media, motion, and preview behavior; workspace and screen scope.                                  | Save a presentation draft and preview it at representative viewport/motion settings.                                  | Invalid contrast, unreadable text, unavailable media, or motion-only meaning blocks eligibility; optional translations may warn.                                           | `PRES-01`, `LANG-01`, `DISPLAY-01`, `SCOPE-01`                                               |
| 6     | `configuration`        | Make draft, preview, eligible revision, active revision, history, conflict, and rollback boundaries explicit; workspace scope.                               | Save/validate/preview a draft, activate an eligible revision, compare revisions, discard unsaved edits, or roll back. | Unsaved edits are informational; validation errors block eligibility; conflicts preserve the active state; activation remains disabled until blockers clear.               | `CFG-01`, `CFG-02`, `SCOPE-01`                                                               |
| 7     | `diagnostics-recovery` | Explain readiness/freshness safely and guide bounded audit, redacted export/import, backup, restore preflight, compatibility, and recovery; workspace scope. | Export redacted evidence, validate import, create a protected backup, and review restore/release compatibility.       | Failed backup or incompatible restore warns without replacing current state. Cross-workspace, corrupt, and unsupported artifacts are unavailable.                          | `PANEL-02`, `CFG-02`, `DIAG-01`, `PORT-01`, `DIST-01`, `COMPAT-01`, `DISPLAY-01`, `SCOPE-01` |

Every page begins with one page heading, purpose/guidance text, and an explicit
mutation-boundary badge. Relevant readiness signals follow before page sections
and actions. The shell-wide context band identifies the already fixed workspace
and selected target; it is not a Core tenant picker.

## Setup progression and guidance

The overview presents a single ordered six-stage progression:

1. Installation basics: workspace identity, timezone, and date policy.
2. Rooms and displays: at least one room and screen with display identity.
3. Sources and mappings: required streams have verified committed projections
   through feasible non-connected lanes.
4. Presentation: branding, language, timing, contrast, and reduced-motion
   preview validate.
5. Planned-display review: the selected screen/date contact sheet and
   representative frames are reviewed.
6. Validate and activate: an exact reviewed eligible revision has no blockers
   and is activated explicitly.

Provider consent is intentionally absent from this progression. Connected
Google data is a later-release convenience for automatic discovery and refresh,
not a prerequisite for the Core MVP or display-equivalent configuration.

Guidance must answer, in this order: what is safe now; what blocks or warns;
which last-known-good display/projection remains available; what the next safe
action is; and whether that action changes only a draft, creates a preview or
revision, changes effective state, or enters recovery. Copy must not imply that
a draft is active or that a stale retained projection has disappeared.

## Readiness model

Readiness signals have stable keys and exactly one of four levels:

- `blocker`: prevents activation and identifies its owning page and next action.
- `warning`: needs review but does not erase a usable last-known-good state.
- `information`: explains progress, unsaved work, or a non-blocking condition.
- `ready`: confirms a specific satisfied condition; it does not override a
  blocker elsewhere.

Each signal contains a concise summary, explanatory detail,
`blocksActivation`, `sourcePage`, and optional semantic `nextActionKey`. The UI
uses icon plus label plus text; color is supplemental. Overall readiness is an
aggregation, never a free-form optimistic status. A blocker and usable
last-known-good display may coexist and must both remain visible.

## Configuration mutation boundaries

| Boundary              | Effect            | Required operator meaning                                                                                                      |
| --------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Save draft            | Draft only        | Saves the next optimistic draft version. Effective display state is unchanged.                                                 |
| Preview draft         | Mutation-free     | Produces an expiring preview bound to the exact draft. It cannot activate or obtain provider/Calendar mutation authority.      |
| Validate draft        | Revision only     | Creates an immutable eligible revision only when the exact draft validates. The active pointer is unchanged.                   |
| Activate revision     | Effective state   | Atomically selects one eligible revision after readiness review. Conflict preserves the prior active revision.                 |
| Roll back revision    | Effective state   | Selects an eligible prior revision using exact optimistic evidence. The current last-known-good pointer remains until success. |
| Discard unsaved edits | Destructive local | Requires explicit confirmation and removes only unsaved browser edits, never a saved draft or active revision.                 |

Action models declare intent (`navigate`, `draft`, `preview`, `activate`,
`destructive`, or `recovery`), an optional target page/resource, a disabled
reason, and confirmation strength. Shells map these semantic keys to authorized
commands and URLs. The reference gallery leaves navigation inert by design.

## Server-rendered actions and progressive enhancement

The Core MVP uses the existing TypeScript, server-rendered HTML, and CSS
strategy. It adds no client framework or bundler. The owning shell binds every
semantic action key to an ordinary form or safe navigation only after fixing
workspace, actor, target, and capability scope on the server. State-changing
actions use non-GET submission, explicit intent, and optimistic evidence where
the configuration-state contract requires it.

Server-side validation is authoritative. An invalid submission returns a
complete page with an error summary, programmatic field associations, preserved
non-secret input, the unchanged effective state, and a safe next action. A
successful submission likewise returns a complete page naming the exact
draft, revision, activation, or recovery boundary that changed.

Every Core MVP workflow must remain operable when JavaScript is unavailable.
Ordinary forms and complete server-rendered responses are the baseline;
JavaScript may enhance responsiveness but may not be the only submission,
validation, date selection, frame selection, review, confirmation, success, or
recovery path. In particular, planned-display date/frame selection submits
through the shell and returns a complete selected-frame review. Arrow-key
selection and modal enlargement are optional enhancements to that same
behavior. Readiness, conflicts, loading completion, errors, and successes
remain present in page text and focusable structure without a client-side live
update.

The no-JavaScript path is motion-free. Enhanced behavior honors reduced-motion
preferences while preserving the same state, action, and focus semantics.

## Planned-display interaction contract

The planned-display page uses a selected-frame stage plus a daily contact sheet.
The frame includes its exact screen/date, sequence position, content, preview
basis, freshness, and retained-projection explanation. Selection and review are
preview-only.

- Left/Right Arrow selects the previous/next contact-sheet frame.
- Home/End selects the first/last frame.
- Enter or Space opens the selected frame in enlarged review.
- Escape closes enlarged review and returns focus to the trigger that opened it.
- While enlarged review is open, Left/Right Arrow reviews adjacent frames and
  keeps focus in the dialog.
- Previous/next-date actions move by school date. The date picker chooses an
  explicit date. After a result loads, focus returns to the page heading and a
  polite status announces the selected date/frame.

The code-native reference implements selection, Enter/Space, Escape, dialog
focus, and focus return. Production date/frame commands remain deferred.

## Finite page and region states

| State         | Required presentation and recovery meaning                                                                      |
| ------------- | --------------------------------------------------------------------------------------------------------------- |
| `ready`       | The scoped result is usable; name what is ready.                                                                |
| `loading`     | Preserve page/target context, identify what is loading, and avoid implying mutation.                            |
| `empty`       | Explain the legitimate absence and the next safe creation/import action.                                        |
| `validation`  | Summarize errors, associate field-level errors, preserve input, and block ineligible actions.                   |
| `conflict`    | Preserve active/effective state, explain optimistic drift, and require review rather than last-write-wins.      |
| `success`     | Name the completed boundary and resulting draft/revision/effective state.                                       |
| `partial`     | Identify completed and incomplete portions separately.                                                          |
| `degraded`    | Explain reduced capability and which retained state remains safe.                                               |
| `stale`       | Show observation/commit freshness and retained last-known-good use.                                             |
| `disabled`    | Keep the action visible with a programmatically associated reason.                                              |
| `unavailable` | Explain the bounded failure and recovery path without fabricating data.                                         |
| `destructive` | Require explicit review/confirmation and name the exact affected local resource.                                |
| `recovery`    | Separate preflight, confirmation, execution, and verified outcome while preserving current state until success. |

State meaning is conveyed by heading, text, structure, and status label as well
as color. Loading retains orientation. Destructive and recovery confirmations
take focus and are not announced only through a live region.

## Responsive and accessibility acceptance

The accepted viewport evidence set is 390x844, 768x1024, 1366x768, and
1920x1080. At 200% browser zoom, content must reflow without horizontal
clipping, and every action must remain reachable. The committed reference also
checks the approximately 683x384 effective CSS viewport produced by applying
200% zoom to the 1366x768 baseline.

The shell document supplies skip navigation plus banner, navigation, and main
landmarks. The Core region supplies one labelled region, one page heading,
labelled sections, semantic lists/buttons, and polite status output. DOM and
focus order follow reading order at every breakpoint; mobile layout may stack
the shell rail, context, readiness, and content but may not reorder meaning.

All workflows are keyboard operable. Focus is visible and predictable, modal
focus returns to its opener, and targets are at least 44x44 CSS pixels where
space permits and never below 24x24. Reduced motion removes nonessential
animation while preserving state changes. Contrast, disabled state, selection,
blockers, warnings, and success cannot rely on color alone.

## Reference selection and evidence

Two ImageGen concepts were produced and registered:

- `a07-readiness-rail` is the selected global direction because it exposes all
  seven areas and keeps readiness, scope, continuity, draft/effective state,
  and next actions legible across desktop and narrow layouts.
- `a07-studio-board` is retained only as an exploratory influence for the
  planned-display stage/contact sheet; its shallow global discoverability was
  unsuitable for the whole operator panel.

The selected concept was translated into the `a07-code-native-reference`
package in `docs/ui-references/registry.json`. Generated concept wording,
invented routes/identity controls, contradictory ready-and-blocked summaries,
and one-click restore affordances were rejected. The code-native reference uses
synthetic fixtures and exact contract semantics.

Run `npm run capture:operator-panel-reference` to regenerate browser evidence.
Its manifest records the installed Chrome version, required viewport results,
reduced-motion state, overflow/landmark/target measurements, browser-error
counts, images, and SHA-256 digests. Focused tests additionally prove the shell
seam, escaping/fail-closed guards, every finite state, 200% effective reflow,
the self-hosted authority warning and legible no-JavaScript reference, and
planned-display keyboard selection/dialog/focus return.

## A08 acceptance spine and deferred implementation

A08 now supplies the versioned
[Core Goal 1 fixture contract suite](core-goal1-fixture-contract-suite.md).
Its exact self-hosted scenarios bind this information architecture to the
configuration lifecycle, rooms/screens/class-code states, manual sources,
planned-display projection, export, and recovery expectations that C01-C04,
C09, and C10 must satisfy.

A07 deliberately did not thread these contracts into use cases or adapters.
C02 now implements the [self-hosted Core operator shell](core-operator-shell.md)
against this contract: all seven stable locations render through a separate
explicit-loopback listener, while capability discovery leaves C03, C04, and
C09 work visibly planned. The shell composes C01 reads with the escaped Core
feature region and owns only its document, navigation, private-reachability
warning, routes, headers, readiness, and finite errors. It adds no login,
account UI, client script/framework/bundler, mutation handler, provider flow,
durable adapter, installed service, deployment, or public/live effect. C03 is
next; Phase B and commercial architecture work remain gated behind C10.
