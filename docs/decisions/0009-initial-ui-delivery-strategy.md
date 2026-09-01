# ADR-0009: Initial UI delivery strategy

- **Status:** Accepted
- **Date:** 2026-08-08
- **Goal 1 amendment:** 2026-08-31

## Context

Initial cutover requires precise route, state, timing, media, offline-asset, and
visual parity. The current scaffold has no UI framework dependency, and adding
one affects build output, browser behavior, upgrade surface, and documentation.

## Decision

Use small server-rendered TypeScript presentation modules, HTML/CSS, and an
explicit strictly checked TypeScript browser controller for the B407 Classroom Display MVP and
initial replacement. Keep domain decisions, route contracts, and presentation
models outside the browser controller so a later presentation implementation
remains replaceable.

The same deliberately small delivery strategy governs the first Core operator-
panel goal. Its private Node process uses server-rendered pages, ordinary HTML
forms, server-side validation, existing CSS conventions, and only focused
strictly checked browser TypeScript where platform behavior cannot express the
interaction adequately. It adds no UI framework, client router, client state
library, or bundler. A07 owns the page/action specification and C01-C04/C09/C10
own the first vertical slice and independent rehearsal.

No UI framework or client bundler is added. The current requirements are a
bounded set of server-rendered display/operator views, deterministic polling
and carousel behavior, offline assets, and precise HTTP/media contracts. The
platform DOM APIs, the existing strict TypeScript build for server/application
code, a dedicated dependency-free DOM TypeScript build, and focused executable
client tests provide those behaviors without another runtime, dependency graph,
or hydration boundary. The emitted browser asset is generated under `dist/`
and never committed. This amendment does not select a framework for the future
commercial account application; D00 makes that decision after the Core panel is
proven and may select Django or another mature SaaS framework.

## Alternatives

- Server templates plus a small browser controller.
- A lightweight component library/framework.
- A full client-side SPA and build pipeline.
- Preserve/adapt legacy static assets first, then refactor after stabilization.

## Consequences

This keeps the asset graph small, offline operation inspectable, CSP simple,
and timing/media controllers directly testable. It also means repository code
owns accessible HTML composition and focused browser-controller tests instead
of inheriting framework conventions. A framework remains available as a later
superseding Core decision if component complexity or evidence demonstrates a
real maintenance or correctness benefit. The separate commercial application
is not required to preserve this choice.

## Reversibility

High if domain/routes are independent and the TV contract is versioned. Lower
after UI-specific state and tests spread across the application.

## Verification implications

M-05 and the Goal 1 C10 gate must verify all representative display states and
operator views,
countdown/polling determinism, reload/LKG, media transitions, offline assets,
keyboard/focus behavior, reduced motion, reflow, and browser console/network
cleanliness. Browser evidence must demonstrate that the no-framework choice is
not masking a material visual or accessibility defect.
