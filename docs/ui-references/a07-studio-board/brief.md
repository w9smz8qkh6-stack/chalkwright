# A07 concept brief — Studio board

## Audience and primary task

A self-hosting teacher or installation operator needs to review what each
screen will show, move between configuration areas, and understand blockers
without mistaking preview for activation. The same Core feature region must be
safe to compose inside a future hosted document shell.

## Target and user state

- Target: route-independent `planned-display` Core feature region inside an
  illustrative self-hosted document shell.
- State: synthetic selected date with a daily contact sheet, one enlarged frame,
  two warnings, an effective revision, and a newer draft.
- This is an exploratory desktop visual direction, not production UI.

## Current problem

The current preview stacks one large frame, timeline, diagnostics, and raw plan
details. It does not provide a daily contact sheet, date-oriented review,
clear mutation-free preview signaling, cross-page readiness, or a scalable
navigation model.

## Required information hierarchy

1. Chalkwright Core identity and explicit installation/screen/date context.
2. Compact top-level global navigation without a persistent sidebar.
3. Large selected display frame as the central review canvas.
4. Horizontal daily contact sheet and date controls.
5. Right-side review inspector with readiness, provenance, freshness, and
   draft/effective comparison.
6. Persistent preview-only signaling and clear return/focus behavior.

## Required UI states

Selected frame, keyboard focus, loading frame, empty date, partial day,
degraded/stale source, draft changed, disabled activation, and preview-only
state must remain distinct without color alone.

## Viewport and input constraints

- Primary reference: 1920×1080 desktop.
- Must later reflow to stacked mobile/tablet views rather than shrink.
- Contact-sheet order and frame selection must be keyboard-operable.
- Generated small text is illustrative; exact copy belongs to code.

## Existing language to preserve

Dark slate surfaces (`#0f172a`, `#020617`), sky blue (`#38bdf8`), warm orange
(`#fb923c`), yellow (`#facc15`/`#fef08a`), soft borders, rounded system type,
visible focus, and display-card visual motifs already used by Chalkwright.

## Accessibility and localization

Use semantic landmarks, one page heading, descriptive controls, large targets,
no color-only status, predictable focus and focus return, contrast, reduced
motion, status announcements, and copy regions that tolerate expansion.

## Binding decisions if selected

- Global navigation is a compact shell-owned top bar.
- Planned-display review uses a central stage plus a right inspector.
- The date/contact sheet behaves like a storyboard across the bottom.
- Preview-only state is persistent at both page and selected-frame level.
- Draft/effective comparison is adjacent to the preview inspector.

## Non-binding details

Generated preview imagery, icons, exact type metrics, gradients, and pixel-level
spacing are inspirational only.
