# Implementation notes

Status: selected reference direction.

## Selection reasons

- Persistent global navigation makes all seven Core MVP areas discoverable
  without turning setup into a one-way wizard.
- Installation/screen context remains visible before the Core feature region,
  supporting both the fixed self-hosted workspace and a hosted shell that has
  already fixed scope server-side.
- Readiness, blockers, last-known-good continuity, freshness, planned display,
  and draft/effective status form one operational overview rather than isolated
  settings pages.
- The rail collapses cleanly into a mobile disclosure/top-level list while the
  Core region retains source order and landmarks.

## Binding translation

The native reference keeps the rail hierarchy, scope band, readiness-first
overview, continuity card, and persistent draft/effective boundary. Planned
display uses the studio concept's contact-sheet/stage pattern inside this
global IA.

## Intentional deviations from generated pixels

- The contradictory generated combination of “Ready to go” and setup blockers
  is replaced by finite blocker/warning/information readiness semantics.
- “Restore LKG” is not a one-click overview action. Recovery remains a
  separately described, confirmation-protected workflow.
- Invented routes, source names, dates, and display artwork are discarded.
- The code-native reference preserves Chalkwright's dark slate application
  canvas instead of the generated white main canvas.
- Exact text, DOM order, semantics, responsive reflow, keyboard behavior,
  interaction states, and shell/Core boundaries come from versioned contracts,
  fixtures, renderers, and tests—not from the image.
