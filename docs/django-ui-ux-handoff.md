# Chalkwright Django UI/UX handoff

## Purpose and authority

This is the implementation contract for recreating the current Chalkwright
classroom-screen experience in Django. It records the accepted visual and
interaction decisions from the live application; it is not a request to copy
the current Node/TypeScript runtime or provider integrations.

The primary user is a teacher and their students viewing a continuously visible
classroom screen, most often via Fully Kiosk on a large smart TV. The display
must be legible at classroom distance, calm while idle, and immediately useful
without requiring mouse, keyboard, or close reading. The companion operator
pages are a separate, laptop-oriented teacher/admin surface.

Preserve the visual language: **calm, high-contrast, classroom-first,
information-rich without looking like a dashboard**. Do not substitute a
generic Bootstrap admin, a bright white application shell, glassmorphism, or a
marketing-site hero treatment.

The current evidence-bearing implementation is:

- display HTML: [`src/presentation/html.ts`](../src/presentation/html.ts)
- display CSS: [`public/display.css`](../public/display.css)
- browser interaction controller: [`src/presentation/display-client.ts`](../src/presentation/display-client.ts)
- presentation model: [`src/presentation/models.ts`](../src/presentation/models.ts)
- representative visual tests: [`test/presentation/m16-responsive-browser.test.ts`](../test/presentation/m16-responsive-browser.test.ts) and [`test/presentation/glossary-vocabulary-browser.test.ts`](../test/presentation/glossary-vocabulary-browser.test.ts)

Use those files as pixel- and behavior-level reference material when the prose
below is incomplete. The Django app may serve server-rendered templates plus a
small static JavaScript controller; it should keep HTML semantic and avoid a
client framework unless a separately approved decision requires one.

## Non-negotiable experience rules

1. The classroom screen is a full-screen **presentation**, not an operator
   dashboard. At a glance, students should know the course, current time,
   current/next task, and imminent timing information.
2. Large text, high contrast, bounded line lengths, and deliberate whitespace
   win over showing every possible field.
3. The display remains dark navy at its foundation. Course imagery and accent
   colors add context; they never make text hard to read.
4. A card means a single instructional unit. Do not turn every region into a
   floating card.
5. Motion explains a change of instructional focus. It must be brief,
   interruptible, and suppressed under reduced-motion preferences.
6. Preserve the eight display states and their exact hierarchy. They are part
   of the classroom experience, not interchangeable loading pages.
7. Keep provider data and credentials out of the presentation layer. The UI
   receives a safe display view-model only.

## Design tokens and foundations

Use the following semantic tokens as the starting point. They are the current
accepted palette, not a license to hard-code every color in templates.

| Role | Token/value | Intended use |
| --- | --- | --- |
| Main text | `--ink: #f8fafc` | Primary text on dark surfaces |
| Supporting text | `--muted: #cbd5e1` | Labels, dates, examples, metadata |
| Card surface | `--panel: rgba(15, 23, 42, .9)` | Standard classroom content cards |
| Dividers | `--line: rgba(226, 232, 240, .25)` | Restrained outlines and separators |
| Warm accent | `--warm: #fb923c` | Announcements and warm card edge |
| Calm accent | `--calm: #38bdf8` | Cool/blue card edge and water context |
| Bright accent | `--bright: #facc15` | Featured learning goal, bellringer emphasis |
| Focus | `--focus: #fef08a` | Visible keyboard focus |
| Base canvas | `#0f172a` | Page background |

Use the native/system rounded sans stack: `ui-rounded`, `Segoe UI`, `system-ui`,
`-apple-system`, `BlinkMacSystemFont`, `sans-serif`. Do not introduce a remote
font dependency for the classroom display. Use tabular numerals for clocks and
countdowns.

The canvas is dark navy with two restrained radial glows: cool blue toward the
upper-left and warm orange toward the lower-right. The persistent header uses a
near-black translucent surface with a one-pixel divider. Standard cards use a
single subtle border, a large `1.5rem` radius, and one soft deep shadow.

## Persistent classroom-screen shell

The desktop/TV shell is a two-row grid: a persistent header and the state
scene beneath it. Keep the body at `100vh` and normally prevent page scrolling
on TV. The main scene itself may scroll within a card only as a last-resort
safety valve; content should normally be split or compacted before scrolling.

### Header

Use a three-column header at large sizes:

1. Left: school logo, if configured. Use contain sizing and preserve its
   intrinsic art; current widths are 204px on large TV, 168px on a short/lower
   resolution viewport, and 132px on narrow screens. If no school logo exists,
   retain a blank alignment slot rather than inserting the Chalkwright mark.
2. Center: current course/meeting label, centered and large (`clamp(1.35rem,
   2.6vw, 3rem)`).
3. Right: large live time, date beneath it, and optional compact bell countdown.
   The bell countdown is a dark, rounded mini-panel with an amber outlined bell
   and a high-weight numeric value. It is supporting context, not the page
   hero.

An optional Water Break timer opens below the right header area as a cool-blue
countdown panel. It should be highly visible when active but absent otherwise.

The Chalkwright identity belongs at the lower-right as an intentionally quiet
system credit (small grayscale logo, version, and `www.chalkwright.org`), not
as a competing header brand.

### Shared labels and type hierarchy

- `eyebrow` / type labels: uppercase, muted, 0.12em tracking, 800 weight.
- Main scene headings: `clamp(3rem, 7vw, 7rem)`, tight line-height (`.98`).
- Ordinary card title: `clamp(2.4rem, 5vw, 5.4rem)`.
- Standard card body/list: `clamp(1.35rem, 2.5vw, 2.65rem)`.
- Never make a card title wider than roughly 24 characters unless the specific
  component calls for it. Use `overflow-wrap: anywhere` for untrusted/long
  instructional text.

## Display-state contract

The Django state selector must emit exactly these states. State names may be
internal, but visual behavior must remain stable.

| State | Student-facing scene | Required hierarchy |
| --- | --- | --- |
| `no_classes` | No-class day | Date eyebrow, “No classes scheduled”, friendly short reassurance on a blue/navy gradient. |
| `morning_overview` | Day-at-a-glance | “Good morning”, “Today in this room”, ordered meeting list, next check-in countdown. A softened, darkened course-art montage is background only. |
| `idle` | Coming Up | Next course is the hero, with time window and a compact countdown anchored low-left. |
| `pre_checkin` | Check In | “Check In”, class/window subtitle, very large countdown, and optional QR/class-code card. |
| `in_class_content` | Instructional carousel | Optional announcement, then one dominant instructional card at a time. |
| `dismissal_warning` | Dismissal | “Dismissing soon”, teacher message, and a very large minutes/seconds countdown. |
| `post_end` | Next class or next-day schedule | Reuse Coming Up if another meeting exists; otherwise transition to next-class-day schedule. |
| `day_complete` | Next class day | Next class-day label/date, class count, and a concise ordered schedule (show at most six rows, then `+N more`). |

In idle, morning overview, day complete, and post-end states, hide rather than
remove the center meeting label if no active class context should be shown; this
keeps the shell balanced.

## Course art and scene backgrounds

Use only local, approved assets. Current reference assets are:

- [`public/banners/advisory-v1.png`](../public/banners/advisory-v1.png)
- [`public/banners/computer-fundamentals-v2.png`](../public/banners/computer-fundamentals-v2.png)
- [`public/banners/digital-media-production-v2.png`](../public/banners/digital-media-production-v2.png)
- [`public/banners/robotics-v2.png`](../public/banners/robotics-v2.png)
- [`public/banners/web-design-v2.png`](../public/banners/web-design-v2.png)
- [`public/dismissal-poster.svg`](../public/dismissal-poster.svg) (fallback)

The banner artwork belongs on the right. Render it with `object-fit: contain`
and `object-position: right center`; cover-cropping loses designed artwork on
non-16:9 displays. Darken the art with a left-to-right overlay so the left-side
text stays legible. The Coming Up, Check In, and course-banner Dismissal scenes
use large left-aligned or centered copy over the darker side.

Coming Up may add a restrained, low-opacity course-specific glimmer over the
illustration. It is a decorative cue only: two soft radial motifs with slow
drift, not particles, confetti, or a busy animation. Under reduced motion it
becomes a static low-opacity treatment.

If a configured dismissal countdown video exists, it takes priority over course
art. Otherwise use course art; when neither exists, use the locally stored
poster fallback. Never fetch a video/image from the browser at render time.

## Instructional carousel

The content carousel is the core class-time surface.

### Geometry and controls

- Maximum width: 86rem. Center it in the available display region.
- Card minimum height: `min(56vh, 40rem)`; maximum normally `66vh`.
- Vocabulary cards may use a 77vh maximum because they have a two-part layout.
- Card padding: `clamp(1.5rem, 4vw, 4rem)`; radius 1.5rem.
- Controls are semantic buttons: Previous, dot tabs with individual labels,
  Next, and Pause/Resume. Support touch swipe with a 45px threshold.
- Preserve the current slide and pause state on an ordinary data refresh for
  the same meeting. A server-held carousel disables pause and communicates the
  held state.
- Announce manual card changes and Pause/Resume in a polite live region.

Cards advance automatically using their configured duration (12 seconds by
default; never less than 5). A card with deferred detail content reveals that
lower material at 45% of its duration, capped so it has at least four seconds
of readable time. This intentional first reveal delay is part of the current
classroom rhythm.

For cards that overflow, first apply the existing compact-fit behavior
(reduced padding/type). Do not allow an ordinary classroom display to become a
wall of tiny text.

### Card types

| Type | Visual contract |
| --- | --- |
| Announcement | Standard card, optional warm accent edge; concise and high contrast. |
| Bellringer | Large bright/yellow title; strip a redundant “Bellringer:” title prefix. |
| Generic | Standard title, optional featured line, normal bullet/body content. |
| Objective | Specialized layout described below; do not show a generic all-caps OBJECTIVE label. |
| Vocabulary | Dedicated anchored-English and flipping-translation layout described below. |

Accent edges are a 0.5rem top border: warm orange, calm blue, bright yellow, or
default ink. Accent should group content, not encode status by color alone.

### Objective-card contract (recent, important refinements)

An objective card intentionally **does not** repeat “OBJECTIVE” above the
heading. The heading is “Objective 1”, “Objective 2”, etc., but smaller and
muted: `clamp(1.35rem, 2.35vw, 2.5rem)`, 760 weight, 1.12 line-height. The
featured objective statement below it is bright/yellow, large, and remains the
visual anchor.

The top portion (small objective heading + featured statement) remains fixed.
Only the lower detail-list area may paginate:

- Split details into lower pages at **three bullets** or **360 characters**,
  whichever would overflow next.
- Keep the entire objective as one outer carousel card and one dot. Do not
  create separate outer cards for continuation pages.
- The first lower page uses the normal staged reveal after the top section.
- Subsequent lower pages animate in immediately while the fixed heading and
  featured statement remain visible. Do not replay the first reveal pause,
  title entry, or featured-text animation.
- Preserve current lower-page position across Pause/Resume; reset to its first
  page only when entering that outer card again.
- List bullets use a pointer (`👉`) by default; “Open Classroom” uses a check
  (`✅`). Use visible text too; emoji alone does not carry meaning.

Due-date bullets use a compact calendar icon rather than an emoji. It has a red
month strip, white body, 2.28em width, 1.78em minimum height, and a large dark
day numeral. The **current approved day numeral is `0.64em`** (it was enlarged
for classroom viewing); do not regress it to the prior `0.48em`. The associated
deadline text remains in the normal detail-text column.

### Vocabulary-card contract

Vocabulary is a special, high-value teaching moment rather than a generic
carousel card:

- English term, part of speech/pronunciation metadata, definition, and example
  stay anchored and readable at all times.
- Translation content (Vietnamese, Korean, Simplified Chinese when available)
  appears in one secondary panel. It flips one face at a time every 10 seconds.
- The panel identifies its active language. Inactive faces are `aria-hidden`.
- Use a 3D Y-axis flip only when motion is permitted; one face remains stable
  under reduced motion.
- Protect reading room: vocabulary cards fit content by progressively applying
  the existing `content-tight` then `content-compact` typography, rather than
  clipping text.

## Motion and timing

Motion should communicate a new instructional unit, not decorate the screen.

| Element | Current timing/behavior |
| --- | --- |
| Carousel card enter/leave | 420ms horizontal slide and subtle scale. |
| Featured objective/card text | 780ms stepped reveal. |
| Lower details initial reveal | 360ms container reveal plus 260ms upward item reveal; list items stagger by 120ms. |
| Objective continuation page | 360ms upward/fade animation, **no inherited page-level stagger or initial reveal pause**. |
| Vocabulary translation | 820ms Y-axis panel flip; rotate faces every 10 seconds. |
| Bell icon | One 900ms shimmer for a change, not continuous pulsing. |
| Scene halo/course art | Slow 30s/9s background-only motion. |

When `prefers-reduced-motion: reduce` is set, reduce animation/transition
durations to effectively immediate, stop scene/art motion, disable vocabulary
flips, and leave one readable vocabulary face. This is a required behavior,
not an optional polish item.

## Responsive and accessibility contract

Target large TV first, then preserve the exact information hierarchy below.

| Envelope | Required behavior |
| --- | --- |
| 3840×2160 | Native smart-TV output; large type may reach the top of its `clamp` ranges. |
| 1920×1080 | Primary large-display verification baseline. |
| 1366×768 | Legacy/laptop display baseline; preserve readability, compact fit if necessary. |
| `max-height: 850px` | School logo reduces to 168px; vocabulary uses shorter, smaller but still readable regions. |
| `max-width: 64rem` | Permit normal document flow/vertical scrolling, use two-column header with meeting label on its own row, stack check-in layout, remove card max-height. |
| `max-width: 32rem` | Single-column header, hide empty brand slot, reflow schedule rows and operator scope fields. |

Required accessible behavior:

- Semantic landmarks: header, main, footer; a skip link targets the main scene.
- Visible `:focus-visible` focus ring: 0.25rem pale yellow with offset.
- Carousel uses `aria-roledescription="carousel"`, labeled dot tabs, and real
  buttons—not click handlers on arbitrary divs.
- Clock, bell, water-break, connection delay, hold state, and operator form
  outcomes have usable labels/live announcements.
- Decorative course art/media is `aria-hidden`; QR image has useful alt text
  and its containing link has an action label.
- Do not rely only on hue for warning, held, or active status.
- Support keyboard controls, touch/swipe, long course names, translated text,
  and 200% reflow without accidental horizontal overflow.
- Respect forced-colors mode with visible borders around cards/forms.

## Operator surface (not the TV display)

The Django implementation should retain a restrained, utilitarian operator
surface for teacher/admin use. It uses the same dark foundation but is not a
full-screen presentation.

- Header: small Chalkwright mark/wordmark at left, page title and short scope
  explanation at right.
- Main: centered `min(72rem, 100%)` column, generous padding, stacked
  bordered sections/forms, 1rem radius.
- Preview page: date/time controls, sandboxed rendered preview, timeline,
  diagnostics, expandable canonical/effective plan details.
- Override page: scope summary; bounded announcement, card behavior,
  hide-assignments, and dismissal-message controls; visually distinct danger
  action for removing an override.
- Hold page: scope summary, held/released status banner, explicit reason and
  duration choices, disabled controls when holding is unavailable.
- Operator forms use actual `label`, `input`, `select`, `textarea`, `button`,
  live form-status, and clear disabled/danger states. They should never feel
  like the student TV surface.

## Django implementation outline

1. Create a presentation-only view-model matching the fields in
   [`src/presentation/models.ts`](../src/presentation/models.ts): state,
   meetings, cards, vocabulary, attendance, branding, hold, and safe media
   references. Keep it provider-neutral.
2. Build a base `display.html` shell containing header, main scene block,
   system credit, live region, and static CSS/JS. Use templates/partials for
   all eight scenes and for each card type.
3. Port the CSS tokens and component rules first. Prefer CSS Grid, `clamp()`,
   intrinsic sizing, and semantic DOM order over framework utility-class
   approximations.
4. Add a small isolated display controller for clock, target polling,
   carousel, objective lower-page progression, vocabulary faces, pause/hold,
   and reduced-motion behavior. Do not make the Django template depend on
   browser timing for its initial meaningful content.
5. Implement operator pages separately with Django forms/views and the same
   clear scope/status patterns.
6. Use only local/static assets or Django-managed approved media. Keep the
   current banner filenames stable until an intentional asset migration.

## Acceptance checklist for the Django agent

- [ ] All eight display states exist and preserve the table above.
- [ ] Header hierarchy, quiet system credit, dark canvas, and local school logo
      behavior match the classroom reference.
- [ ] Coming Up preserves right-side art and left-side copy without cover crop.
- [ ] Carousel has accessible controls, touch support, Pause/Resume, hold, and
      state-preserving refresh behavior.
- [ ] Objective cards have no duplicate OBJECTIVE label; fixed top content and
      paged lower bullets behave exactly as specified.
- [ ] Deadline calendar day numeral is visibly large (`0.64em` reference), not
      the earlier undersized variant.
- [ ] Vocabulary keeps English anchored, has one accessible active translation
      face, and honors reduced motion.
- [ ] Narrow/short layouts, 200% reflow, forced colors, and reduced motion are
      tested.
- [ ] At least 3840×2160, 1920×1080, and 1366×768 are browser-tested for every
      display state; operator pages are tested at laptop width.
- [ ] No external browser asset/provider request is needed to render a screen.

## Reference image and verification

[`docs/assets/classroom-hub-preview.png`](assets/classroom-hub-preview.png) is
a useful historical visual reference, but the live implementation and the
tests linked above govern newer details such as objective pagination, immediate
continuation animation, and the enlarged deadline numeral.

Before declaring parity, compare rendered Django screenshots against the
current display at the listed viewports, inspect objective overflow and
translated vocabulary explicitly, run keyboard/reduced-motion checks, and get
a teacher visual review on the actual smart-TV/Fully Kiosk path.
