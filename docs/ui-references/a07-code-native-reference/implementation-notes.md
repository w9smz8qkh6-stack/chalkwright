# A07 code-native reference implementation notes

## Selected direction and deviations

The implementation follows `a07-readiness-rail` for global information
architecture. The `a07-studio-board` direction remains exploratory; only its
planned-display stage/contact-sheet idea is retained. Generated concept text,
routes, invented identity controls, contradictory ready/blocker states, and
one-click restore affordances were deliberately discarded.

## Code-native sources

- `src/contracts/v1/operator-panel.ts` defines the route-independent page,
  finite-state, readiness, setup, configuration-boundary, accessibility, and
  shell-seam contracts.
- `src/presentation/operator-panel-region.ts` renders only the escaped Core
  feature region.
- `test/fixtures/operator-panel.ts` supplies synthetic models for all pages and
  finite states.
- `test/reference/operator-panel-gallery.ts` and
  `test/reference/operator-panel-gallery.css` compose nonproduction shell
  wrappers and the planned-display interaction reference.

## Reproducible evidence

Run `npm run capture:operator-panel-reference`. The command compiles the test
reference, renders it in the installed Google Chrome with reduced motion, fails
on horizontal overflow or browser errors, and writes screenshots plus exact
measurements and SHA-256 digests under `evidence/`. The focused browser test
also verifies contact-sheet Arrow keys, Enter, Escape, modal state, focus return,
and a 200% effective reflow viewport. It separately disables JavaScript to prove
that page content, actions, contact-sheet frames, and the persistent self-hosted
operator-authority warning remain legible at the mobile viewport.

The gallery has no production route and deliberately leaves operator-area
navigation inert. Self-hosted and hosted shells must bind actions only after
fixing authorized scope. The reference warning demonstrates private-listener
authority; it is not a login or account control.

For local visual review, run `npm run preview:operator-panel-reference` and use
the loopback URL it prints. Query parameters select `page` and either the
`self-hosted` or `hosted` synthetic shell; `/states` renders the finite-state
sheet. This server is reference-only and is not imported by application code.
