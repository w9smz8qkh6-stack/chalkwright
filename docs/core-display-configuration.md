# Core display configuration and viewer admission

Status: C03 implemented for synthetic qualification. This document describes
the room, screen, timezone, display-reference, class-code, and viewer-session
slice added to the private Core operator shell. It does not claim a durable
production adapter or a public viewer service.

## Operator controls and configuration continuity

The `/displays` page projects the active C01 configuration into room and screen
cards, an IANA timezone, and shell-owned HTTPS display references. It includes
ordinary server-rendered forms to save a display draft, rotate a screen class
code, or revoke its code and viewer sessions. The forms work without
JavaScript.

Saving a display draft can update the timezone and optionally add one room and
screen. It uses the exact C01 optimistic state and draft versions. A successful
save advances only the draft; the active last-known-good revision and classroom
display remain unchanged until the later validation and activation workflow.
Invalid and conflicting submissions return bounded results and preserve the
active revision.

The displayed URL is a low-privilege screen reference rooted at an explicitly
supplied HTTPS display origin. The operator listener does not serve that route,
and the existing classroom-display listener still cannot resolve an operator
handler.

## Class-code and session lifecycle

Rotation generates a 128-bit random code within the A05 12–32 character
policy. The plaintext is returned once in the private operator response and is
never written to configuration, the protected adapter, a viewer session, an
error, an audit event, or an export. The adapter receives only a random salt
and a 64-byte `scrypt-v1` verifier using `N=16384`, `r=8`, and `p=1`, referenced
from the A05 class-code state.

Viewer admission is uniform and screen-scoped. Valid admission creates a
random 256-bit session token, persists only its SHA-256 digest, binds it to the
current verifier version, and caps its lifetime at the A05 twelve-hour maximum.
Failures are retained only as a bounded list of timestamps: five failures per
screen in a rolling minute. No attempted code is retained. Wrong-screen,
missing, revoked, malformed, and incorrect codes all return the same denial.

Rotation and revocation transact one screen's verifier state and session set
together. Both clear every existing viewer session. Session validation also
requires the current active verifier version, screen, workspace, token digest,
and unexpired lifetime, so a prior session cannot survive a successful rotate
or revoke. Operator authority remains private reachability and is not coupled
to viewer sessions; the operator page and readiness endpoint remain available
after either action.

## HTTP and safety boundary

C03 adds exactly three same-origin ordinary-form routes beneath
`/actions/displays/`: `save-draft`, `rotate-class-code`, and
`revoke-class-code`. They accept only `POST` with the exact operator Origin,
non-cross-site fetch metadata, URL-encoded content, an 8 KiB body limit,
unique bounded fields, and the existing exact Host/no-forwarding/canonical-
target rules. All operator responses remain non-cacheable, script-free,
cookie-free, frame-denied, and protected by the C02 CSP.

The executable entrypoint remains explicitly synthetic, loopback-only, and
in-memory. C03 does not add a display admission route, persistent SQLite schema
or adapter, installed service, public ingress, provider connection, account,
login, hosted framework, package reorganization, deployment, or live effect.

## Evidence

Focused application and integration tests prove the exact A08 C03 projection,
draft-only continuity, slow-verifier and token-digest protection, uniform
bounded failures, screen scoping, expiry/version checks, atomic session
revocation, same-origin form controls, and continued operator access after
rotation. Browser evidence covers the accepted mobile, tablet, laptop, and
desktop envelope, 200% effective reflow, reduced motion, keyboard focus,
overflow, and page/console errors. C04 is next; Phase B and D00 remain gated
behind C10.
