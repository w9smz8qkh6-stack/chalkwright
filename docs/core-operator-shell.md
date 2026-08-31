# Core operator shell

Status: C02-C04 and C09 implemented for synthetic qualification. This document describes
the private, no-login self-hosted operator process and its deliberate limits.
It does not claim a durable production configuration adapter, installed service,
public ingress, or completed Core operator MVP.

## Process and authority boundary

The Core operator shell is a distinct Node process rooted at
[`core-operator-server.ts`](../src/entrypoints/core-operator-server.ts). Its HTTP
server, route table, controller, document wrapper, capability discovery, and
readiness are separate from the existing classroom display server. The
operator composition can construct only the operator listener; the display
server imports none of its route or presentation modules.

Anyone who can reach this listener has full operator authority for its one
self-hosted installation. There is no Chalkwright account, login, cookie,
session, organization selector, hosted role, billing control, or provider grant.
Every page repeats the persistent A07 warning that the listener must not be
published.

The listener requires an explicit `127.0.0.1` or `::1` host. Omitting the host,
using `0.0.0.0`, or supplying another address fails before listening. C02 does
not accept forwarded headers or configure a trusted proxy. B05 later owns
installed service identities, store privileges, cookies/cache namespaces,
service templates, and independent-failure hardening.

## Closed route table

The operator listener recognizes only:

- `/` as a redirect to `/overview`;
- the seven A07 page paths: `/overview`, `/displays`, `/sources`,
  `/planned-display`, `/presentation`, `/configuration`, and
  `/diagnostics-recovery`;
- `/capabilities` for the finite page/task availability catalog;
- `/health` for process viability and `/ready` for operator-shell/configuration
  readability; and
- `/assets/operator-shell.css` for the shell-owned stylesheet.

C03 adds three exact ordinary-form actions under `/actions/displays/` for
display-draft save, class-code rotation, and class-code/session revocation.
Their behavior and protected-state boundary are documented in
[Core display configuration and viewer admission](core-display-configuration.md).

All page and discovery paths use `GET` or `HEAD`; only the three C03 action
paths accept `POST`. A non-read request must first provide the exact same Origin
and an approved ordinary-form content type. Foreign or missing mutation origins
fail earlier, and POST to any read route returns `405 Method Not Allowed`. The
request target must be an exact canonical origin-form
path before route lookup, so authority-form, dot-segment, encoded dot-segment,
and backslash-normalized targets cannot alias a known handler. Requests with an
unexpected Host, foreign read Origin, forwarding header, query string, unknown
route, or display route fail closed.
No permissive CORS header or WebSocket surface is supplied.

Responses are non-cacheable and set a restrictive CSP, deny framing, suppress
referrers and MIME sniffing, and set no cookies. Unexpected controller failures
produce a finite server-rendered error page without returning exception detail.

## Application and presentation composition

[`CoreOperatorShellService`](../src/application/operator-panel/core-operator-shell-service.ts)
reads the C01 `VersionedConfigurationService` and creates guarded A07
`OperatorFeatureRegionModel` values. It does not import HTTP or document
presentation. The shell controller renders those route-independent regions
inside the self-hosted document, navigation, fixed installation context, and
authority warning.

All seven stable pages render now so navigation and information architecture do
not drift. Capability discovery marks C01-C04 and C09-backed areas available:

- overview, presentation, configuration, and diagnostics/recovery are readable;
- displays projects rooms, screens, timezone, display references, readiness,
  and protected viewer-admission controls from C03;
- sources records C04 teacher-entered draft definitions without acquisition; and
- planned-display summarizes C09's injected, date-bound mutation-free frame
  projection without supplying C10's contact-sheet or carousel controls.

Later pages remain visible with disabled actions and the owning WBS item.
C02-C03 do not implement later tasks early. Reading any page is mutation-free and
does not advance the C01 state version or active revision.

The shell uses complete server-rendered HTML and CSS with no client script,
framework, or bundler. Navigation works without JavaScript. Browser evidence
covers the accepted 390x844, 768x1024, 1366x768, and 1920x1080 viewports,
approximately 200% effective reflow, reduced motion, skip navigation, landmarks,
visible focus, minimum target size, horizontal overflow, and console/page
errors.

## Synthetic execution boundary

The executable entry point is deliberately gated as synthetic because C01 has
no durable production adapter yet. It requires all three values:

```text
CHALKWRIGHT_CORE_OPERATOR_SYNTHETIC=1
CHALKWRIGHT_CORE_OPERATOR_HOST=127.0.0.1
CHALKWRIGHT_CORE_OPERATOR_PORT=<explicit port>
```

It creates one empty, synthetic-only self-hosted workspace in the bounded C01
in-memory conformance repository. State does not survive restart. No supplied
service definition, proxy rule, package script, deployment controller, or live
route starts this process.

## Acceptance evidence and deferrals

Focused tests prove:

- the exact A08 C02 scenario returns ready under private-reachability authority
  with no account or JavaScript requirement;
- every generated region passes the A07 guard and exposes no forbidden
  shell-owned fields;
- explicit loopback bind, Host/Origin/forwarding/method/content-type negatives,
  closed routes, headers, readiness, and finite error handling;
- display ingress returns 404 for operator page and discovery routes while the
  operator ingress returns 404 for display/mutation routes; and
- the accepted responsive, reduced-motion, keyboard/focus, no-JavaScript, and
  reflow evidence.

C02-C03 do not add source forms or acquisition, planned-display projection,
durable SQLite schemas/adapters, provider OAuth,
accounts/authentication, hosted or commercial framework code, package
hardening, installed services, deployment, or live effects. C04 is the next
authoritative WBS item; Phase B and D00 remain gated until C10.
