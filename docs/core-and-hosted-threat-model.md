# Chalkwright Core and Hosted Threat Model

Status: A02 architecture baseline; implementation has not begun.

This is the authoritative threat model for the surfaces frozen by the
[feature acceptance matrix](core-and-hosted-feature-acceptance-matrix.md). It
defines the security invariants and downstream negative-test obligations used
to accept [ADR-0026](decisions/0026-public-core-and-hosted-shell.md), without
selecting vendors or authorizing package, provider, repository, infrastructure,
billing, route, service, publication, deployment, or other live changes.

## Scope, non-claims, and risk method

The model covers the self-hosted Core operator and display listeners; hosted
accounts and organizations; class-code display and student viewers; provider
authorization callbacks, grants, tokens, and refresh jobs; configuration,
uploads, shared resources, previews, exports, backups, and deletion; hosted
tenant boundaries, queues, caches, objects, metrics, support tools, billing
webhooks, and Core artifacts.

It is an architecture threat model, not a claim of implementation, regulatory
compliance, penetration testing, provider approval, or production readiness.
Legal and school-data review remains `F01`; operational qualification remains
`F02`-`F05`; every live pilot effect remains an explicitly authorized `F06`
action.

Likelihood and impact use **Low**, **Moderate**, and **High**. Inherent risk is
the credible risk before the listed controls. Residual risk is the expected
risk after all listed controls and tests pass:

- **Low** can be accepted within the stated product boundary.
- **Moderate** requires an explicit bounded disposition, ownership, and
  monitored assumptions.
- **High** is a release blocker for the affected surface. It may not be silently
  accepted or reduced by documentation alone.

Every `must never` invariant is fail-closed: uncertainty, missing scope, failed
validation, or incompatible artifacts deny the action and preserve the last
known good state. Threshold values and concrete schemas remain assigned to
their downstream design tasks; this model fixes the property those choices
must enforce.

## Trust boundaries and authority separation

Four authorities are deliberately independent. Possessing one never implies
another:

| Authority                    | How it is established                                                                                                             | What it permits                                                | Must never imply                                                                               |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Core operator reachability   | Network access to the separately bound, private-by-default operator listener                                                      | Full administration of one self-hosted installation            | Hosted identity, display admission, provider consent, or public safety                         |
| Viewer admission             | A current class code exchanged for a short, screen-scoped viewer session                                                          | The committed low-privilege projection for one screen          | Operator access, account access, another screen, internal plan/configuration, or provider data |
| Hosted account authorization | Server-side session, organization membership, role, and reauthentication where required                                           | Approved actions in the session-derived organization workspace | A customer-supplied tenant choice, provider consent, or support bypass                         |
| Provider consent             | A verified callback bound to the initiating actor, session, provider issuer, redirect, PKCE transaction, and requested capability | Only the granted scopes for the bound workspace and connection | Account ownership, broader scopes, another tenant, or mutation authority                       |

The principal trust boundaries are:

1. browser to Core operator listener;
2. browser/display to low-privilege display listener;
3. public browser to hosted TLS ingress and authenticated shell;
4. hosted shell to Core use cases below the self-hosted HTTP boundary;
5. shell/use cases to persistence, objects, cache, queues, and workers;
6. application to provider authorization and data APIs;
7. application to billing-provider webhooks;
8. application to customer uploads and remote resources;
9. operator/support tooling to protected data and lifecycle operations; and
10. Core source/release channel to the hosted build and runtime.

The self-hosted operator listener defaults to loopback or an equivalent private
socket and is never published by supplied service/container examples. A person
who can reach that listener has full operator authority; private reachability
is therefore an authentication boundary, not a convenience setting. The hosted
shell must compose Core below its HTTP entry point and must never mount, proxy,
or start the unauthenticated Core operator server.

## Assets and classification

| Asset                                                                               | Classification                          | Required property                                                                     |
| ----------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------- |
| Public static assets and intentionally published display labels                     | Public                                  | Integrity, provenance, safe caching                                                   |
| Committed classroom and student-safe projections                                    | Low-privilege school data               | Minimum fields, screen scope, bounded freshness                                       |
| Internal plans, source records, mappings, configuration, previews, and diagnostics  | Confidential operational data           | Operator/account authorization; never returned as a viewer projection                 |
| Rosters, student names, attendance detail, private links, and raw provider payloads | Restricted school data                  | Excluded from viewer delivery unless a later field-level review explicitly permits it |
| Password verifiers, sessions, recovery and MFA state                                | Restricted authentication data          | Strong storage, rotation, revocation, redaction                                       |
| OAuth state, authorization codes, refresh/access tokens, and provider credentials   | Restricted secrets                      | Transaction binding, encryption/protected storage, least privilege, deletion          |
| Billing events, customer identity, subscription and entitlement state               | Confidential commercial data            | Authenticity, ordering, tenant binding, auditability                                  |
| Uploads and acquired remote resources                                               | Untrusted content                       | Bounded parsing, inert rendering, provenance, isolation                               |
| Tenant-scoped records, object keys, cache keys, jobs, metrics, and audit events     | Confidential multi-tenant state         | Explicit organization scope in every adapter and execution context                    |
| Configuration revisions, exports, backups, deletion markers, and restore media      | Confidential or restricted by contents  | Integrity, encryption, retention, non-resurrection                                    |
| Core packages, manifests, migrations, and compatibility metadata                    | Security-critical software supply chain | Exact versions, integrity/provenance, supported interfaces                            |
| Service controls, deployment credentials, logs, traces, and support actions         | Restricted operations data              | Isolation, least privilege, redaction, accountable access                             |

## Actors

| Actor                              | Expected authority                                                       | Adversarial or failure mode                                               |
| ---------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Self-hosted operator               | Full control of one reachable Core installation                          | Misconfiguration, compromised browser/device, accidental public exposure  |
| Classroom display                  | Read one admitted screen projection                                      | Stolen session, route confusion, untrusted rendered content               |
| Student/viewer                     | Read one admitted screen projection with local/short-session preferences | Code guessing, enumeration, tampering, sharing a session                  |
| Hosted member                      | Role-bounded actions in session-derived organizations                    | IDOR, privilege escalation, confused-deputy requests                      |
| Hosted owner/admin                 | Tenant administration and high-risk actions after reauthentication       | Account takeover, unsafe recovery, destructive mistakes                   |
| Support operator                   | Explicit, audited, time-bounded support capability                       | Insider misuse, silent impersonation, scope bypass                        |
| Background worker                  | Execute signed/validated tenant-scoped jobs                              | Replay, stale authorization, forged or cross-tenant payload               |
| Provider or billing service        | Return authenticated callbacks/data/events                               | Compromise, partial consent, replay, reordering, outage                   |
| Malicious Internet client          | No authority                                                             | Discovery, credential/code guessing, injection, SSRF, resource exhaustion |
| Customer-controlled content/source | Supply data under an authorized account/operator                         | Active content, parser abuse, oversized data, malicious URLs              |
| Core publisher/build dependency    | Supply reviewed artifacts                                                | Tampering, dependency compromise, incompatible release                    |

## Entry points and data flow

| Flow                            | Untrusted input crosses into            | Required gate/output                                                          |
| ------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------- |
| Core operator request           | Private operator HTTP boundary          | Origin/host/request validation and one-installation scope                     |
| Display or student request      | Public/LAN display boundary             | Code/session admission and screen-safe projection only                        |
| Hosted browser request          | Hosted account shell                    | CSRF-safe authenticated session, role, organization, resource scope           |
| Provider authorization response | OAuth callback                          | Exact transaction, issuer, redirect, state, PKCE, actor and workspace binding |
| Provider data response          | Connector and canonicalization boundary | Schema/size/scope validation and approved projection                          |
| Upload/import                   | Parser and media store                  | Type/content/size/path validation; inert derived artifact                     |
| Shared URL acquisition          | Outbound fetcher                        | HTTPS and destination policy before every resolution and redirect             |
| Preview/configuration change    | Revisioned application service          | Authorization, validation, concurrency, audit; last-known-good preservation   |
| Queue/job payload               | Worker                                  | Authenticated producer, tenant and capability scope, idempotency, freshness   |
| Billing webhook                 | Billing adapter                         | Signature, age, replay, ordering, account and tenant binding                  |
| Export/backup/restore/deletion  | Lifecycle service and protected storage | Least data, encryption, retention, restore/deletion invariants                |
| Core artifact/upgrade           | Hosted build and release gate           | Provenance, checksum/signature, exact pin, compatibility and migration tests  |

## Stable threat register

The two keyed views below jointly form the register. Every ID has one surface,
asset/actor, abuse case, consequence, inherent likelihood/impact, mitigation,
residual disposition, negative-test requirement, and downstream owner.

### Threat and consequence view

| ID             | Surface or entry point                                                | Asset / actor                                                                  | Abuse or failure                                                                                                                           | Consequence                                                       | Inherent likelihood / impact |
| -------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- | ---------------------------- |
| `T-CORE-01`    | Core operator listener                                                | Configuration, secrets / Internet client                                       | Supplied defaults, proxying, or binding exposes the no-login operator surface publicly                                                     | Full installation and provider-connection compromise              | Moderate / High              |
| `T-CORE-02`    | Operator and display routing                                          | Operator authority / viewer                                                    | Route, middleware, cookie, cache, or listener confusion lets a display path reach an operator handler                                      | Low-privilege viewer becomes operator                             | Moderate / High              |
| `T-CORE-03`    | Core operator browser requests                                        | Operator action / hostile site or tab                                          | Cross-site request, WebSocket, permissive CORS, or ambient browser credential triggers a change                                            | Unintended configuration or connection mutation                   | Moderate / High              |
| `T-CORE-04`    | Private listener host resolution                                      | Operator authority / hostile DNS or proxy                                      | DNS rebinding or untrusted `Host`/forwarded headers defeats private reachability assumptions                                               | Remote control of a locally reachable panel                       | Moderate / High              |
| `T-CONTENT-01` | Every rendered field or link                                          | Browser integrity / customer or provider content                               | Markup, script, style, URL scheme, template, CSV, or formula becomes executable                                                            | XSS, credential theft, navigation abuse, data exfiltration        | High / High                  |
| `T-SECRET-01`  | Forms, diagnostics, logs, errors, previews, exports, support, backups | Secrets / any viewer or operator without need                                  | Secret value is returned, persisted in an unsafe field, logged, rendered, exported, or restored outside its protected store                | Provider/account compromise and durable disclosure                | Moderate / High              |
| `T-FILE-01`    | Upload and local file processing                                      | Host filesystem / customer content                                             | Path traversal, symlink, archive path, race, or server filename collision escapes the media boundary                                       | File disclosure or overwrite, service compromise                  | Moderate / High              |
| `T-FILE-02`    | Upload/import parser                                                  | Availability and browser safety / customer content                             | Oversized, mislabeled, active, malformed, compressed, or parser-hostile content bypasses checks                                            | Resource exhaustion, active delivery, parser exploit              | High / High                  |
| `T-SSRF-01`    | Shared-resource acquisition                                           | Internal network and credentials / customer URL                                | Redirects, DNS changes, alternate IP forms, credentials, or schemes reach private, loopback, link-local, metadata, or disallowed endpoints | Internal service access or secret exfiltration                    | High / High                  |
| `T-VIEW-01`    | Class-code admission                                                  | Screen projection / Internet or nearby viewer                                  | Guessing, enumeration, response oracle, reuse, or unlimited attempts discovers a screen                                                    | Unauthorized classroom/student view                               | High / Moderate              |
| `T-VIEW-02`    | Viewer session                                                        | Screen projection / session thief                                              | Fixation, leakage, weak cookie scope, shared-device residue, or replay extends admission                                                   | Continued unauthorized viewing or wrong-screen access             | Moderate / Moderate          |
| `T-VIEW-03`    | Code/session rotation                                                 | Revocation state / former viewer                                               | Old codes or sessions remain valid after rotate, screen disable, deletion, or tenant change                                                | Revocation fails and stale access persists                        | Moderate / High              |
| `T-ACCT-01`    | Registration/login/recovery/MFA                                       | Hosted account / attacker                                                      | Enumeration, brute force, weak recovery, missing reauthentication, or session theft takes over an account                                  | Tenant administration and provider data compromise                | High / High                  |
| `T-ACCT-02`    | Hosted session and forms                                              | Hosted actions / hostile site or browser state                                 | CSRF, fixation, overly broad cookie, missing rotation/revocation, or stale role performs an action                                         | Unauthorized account or tenant mutation                           | High / High                  |
| `T-ACCT-03`    | Social sign-in and linking                                            | Account identity / attacker or wrong user                                      | Email/claim collision, unverified claim, silent link, or provider mismatch joins identities                                                | Account takeover or inaccessible split identity                   | Moderate / High              |
| `T-OAUTH-01`   | Provider authorization transaction                                    | Grant/token / attacker                                                         | Missing state, PKCE, nonce where applicable, one-time use, or actor/session binding permits CSRF or code injection                         | Attacker's grant is attached or victim's grant stolen             | High / High                  |
| `T-OAUTH-02`   | Callback and multi-provider routing                                   | Grant/token / malicious authorization endpoint                                 | Issuer mix-up, callback confusion, open redirect, or redirect mismatch sends a code to the wrong client/provider                           | Token disclosure or wrong-provider connection                     | Moderate / High              |
| `T-OAUTH-03`   | Consent and capability mapping                                        | School/provider data / operator or connector                                   | Overbroad, roster/write, partial, stale, or incorrectly mapped scopes exceed the activated feature                                         | Excess collection or mutation authority                           | Moderate / High              |
| `T-OAUTH-04`   | Token store, refresh, reconnect, disconnect                           | Provider tokens / tenant member or operations                                  | Token crosses tenant, leaks in observability, survives deletion, or reconnect replaces the wrong grant                                     | Durable cross-tenant provider access                              | Moderate / High              |
| `T-TENANT-01`  | Hosted use cases and persistence                                      | Tenant records / hosted member                                                 | Customer-supplied organization/resource IDs, missing predicates, or unsafe object references cross tenant scope                            | Confidentiality or integrity breach                               | High / High                  |
| `T-TENANT-02`  | Objects, cache, queues, previews, metrics, audit, support             | Tenant state / worker or support                                               | Non-namespaced key, stale context, shared cache, log correlation, or support query crosses organizations                                   | Indirect cross-tenant leak or mutation                            | High / High                  |
| `T-JOB-01`     | Hosted queues/workers                                                 | Tenant/provider action / forged or stale job                                   | Tampering, replay, duplicate delivery, stale authorization, or confused deputy executes the wrong capability/workspace                     | Cross-tenant action, duplicated work, provider misuse             | High / High                  |
| `T-JOB-02`     | Refresh/render/import workers                                         | Availability and last-known-good / abusive tenant or provider                  | Unbounded payload, retry, fan-out, concurrency, or outage starves other tenants or overwrites valid state                                  | Multi-tenant outage or empty/stale display                        | High / High                  |
| `T-BILL-01`    | Billing webhook and entitlement                                       | Subscription/tenant / attacker or provider reordering                          | Forged, replayed, reordered, duplicated, stale, or tenant-mismatched event changes access                                                  | Unauthorized service, wrongful cutoff, billing data corruption    | Moderate / High              |
| `T-STUDENT-01` | Display/student projection                                            | Restricted school data / viewer                                                | Internal plan, roster/name, attendance, private link, raw provider object, diagnostic, or account field reaches a viewer                   | Student privacy breach and scope amplification                    | High / High                  |
| `T-CAP-01`     | Preview/read-only/provider operations                                 | Mutation authority / operator, member, or connector                            | A read/preview code path receives a mutation port or write scope, or side effects occur before validation                                  | External or durable mutation outside the approved boundary        | Moderate / High              |
| `T-CFG-01`     | Configuration/import/preview/rollback                                 | Last-known-good state / concurrent operator/member                             | Lost update, stale revision, partial import, invalid migration, unsafe rollback, or cross-scope reference replaces valid state             | Broken display, wrong data, silent corruption                     | High / High                  |
| `T-BACKUP-01`  | Export, backup, restore, deletion                                     | Secrets and tenant data / operations or former tenant                          | Backup contains avoidable secrets, crosses tenant, lacks integrity, or restore resurrects deleted data/grants                              | Persistent disclosure or failed deletion promise                  | Moderate / High              |
| `T-SUPPORT-01` | Support and lifecycle tools                                           | Tenant authority / insider or compromised support account                      | Silent impersonation, unrestricted query, unbounded elevation, or unaudited destructive action bypasses tenant controls                    | Insider breach or irrecoverable customer impact                   | Moderate / High              |
| `T-SUPPLY-01`  | Core artifact and hosted integration                                  | Shared behavior / compromised publisher or drift                               | Tampered/unpinned/incompatible artifact, deep import, migration mismatch, or mounted self-hosted route bypasses the supported seam         | Shared compromise, auth bypass, failed release/rollback           | Moderate / High              |
| `T-DOS-01`     | Login, codes, previews, polling, uploads, refresh, export, jobs       | Availability / abusive client or tenant                                        | Unbounded requests, payloads, fan-out, storage, retries, or expensive rendering exhaust shared resources                                   | Classroom or multi-tenant outage and cost amplification           | High / High                  |
| `T-INFRA-01`   | Hosted pilot ingress/runtime                                          | Existing Chalkwright service and hosted tenants / operator error or compromise | Shared identity, network, mount, secret, route, database, backup, or control plane couples the services                                    | Hosted breach reaches the private classroom service or vice versa | Moderate / High              |

### Control, residual-risk, test, and ownership view

| ID             | Required mitigation or invariant                                                                                                                                     | Residual risk and disposition                                                                                                               | Required negative tests   | Downstream tasks                                                                  |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | --------------------------------------------------------------------------------- |
| `T-CORE-01`    | Loopback/private socket default; explicit bind; safe service/container examples; startup warning and readiness evidence                                              | Moderate — accept only for deliberately private reachability; any public default or accidental publication blocks release                   | `NT-01`, `NT-17`          | `A03`, `B05`, `B07`, `C02`, `F04`                                                 |
| `T-CORE-02`    | Distinct ingress, route tables, cookies, cache namespaces, and composition roots; hosted never mounts Core HTTP                                                      | Low — accept after route/package tests                                                                                                      | `NT-01`, `NT-15`          | `A03`, `B05`, `B07`, `C02`, `D07`                                                 |
| `T-CORE-03`    | Reject untrusted origins/hosts and cross-site mutation; narrow methods/content types; no permissive CORS; CSRF-safe browser flow                                     | Low — accept after browser and protocol tests                                                                                               | `NT-02`                   | `A03`, `C02`, `F04`                                                               |
| `T-CORE-04`    | Validate effective host/origin; do not trust forwarded headers without configured proxy; document DNS-rebinding-safe proxying                                        | Moderate — private-LAN/reverse-proxy operators own network policy after safe defaults and warnings                                          | `NT-02`, `NT-17`          | `A03`, `B05`, `C02`, `C12`, `F04`                                                 |
| `T-CONTENT-01` | Contextual escaping; inert typed view models; scheme/URL policy; restrictive CSP; no customer templates/styles/scripts; safe CSV export                              | Low — accept after multi-context payload suite                                                                                              | `NT-03`                   | `C05`, `C09`-`C11`, `D07`, `D09`, `E01`, `F04`                                    |
| `T-SECRET-01`  | Secret-reference types and protected stores; write-only forms; centralized redaction; allowlisted diagnostics/export/support/backup fields                           | Moderate — operations retain bounded privileged access; disclosure in any ordinary surface blocks release                                   | `NT-04`, `NT-14`          | `A05`, `C01`, `C07`, `C12`, `D06`, `D08`, `D12`, `F03`, `F04`                     |
| `T-FILE-01`    | Server-owned IDs; canonical root containment; no archive extraction or symlink following unless independently sandboxed; atomic writes                               | Low — accept after filesystem abuse suite                                                                                                   | `NT-05`                   | `A06`, `C05`, `D09`, `F04`                                                        |
| `T-FILE-02`    | Independent signature/content validation; active-format denylist; strict bytes/dimensions/records/time limits; isolated re-encode                                    | Moderate — parser vulnerabilities remain; unsupported/failed content is rejected without state replacement                                  | `NT-05`, `NT-16`          | `A06`, `C05`, `D09`, `F04`                                                        |
| `T-SSRF-01`    | HTTPS/allowlist policy; validate every DNS result and redirect hop; reject private/reserved destinations and credentials; egress limits                              | Moderate — DNS/network changes remain; any private-address reachability blocks the feature                                                  | `NT-06`                   | `A06`, `C06`, `D09`, `F02`, `F04`                                                 |
| `T-VIEW-01`    | Non-sequential codes with threshold chosen in `A05`; uniform responses; rate limits; screen-safe data only; monitoring                                               | Moderate — codes are shareable convenience credentials; accept only for low-privilege projections                                           | `NT-07`, `NT-16`          | `A05`, `C03`, `D10`, `E01`, `F04`                                                 |
| `T-VIEW-02`    | Rotate session on admission; secure scoped cookie/token; short bounded lifetime; no URL/referrer token; clear local state                                            | Moderate — possession grants bounded viewing until expiry/revocation                                                                        | `NT-07`                   | `A05`, `C03`, `D10`, `F04`                                                        |
| `T-VIEW-03`    | Code generation and viewer sessions carry screen/revision status; rotate/disable/delete atomically revokes all prior admission                                       | Low — accept after revocation race tests                                                                                                    | `NT-07`, `NT-11`          | `A05`, `C03`, `D10`, `F04`                                                        |
| `T-ACCT-01`    | Vetted exact-version auth library in `D02`; verified identity, rate limits, strong recovery/MFA path, session inventory, high-risk reauth                            | Moderate — credential/device compromise remains; pilot response and recovery must be rehearsed                                              | `NT-08`, `NT-16`          | `D02`, `D03`, `F04`, `F05`                                                        |
| `T-ACCT-02`    | Secure HTTP-only same-site cookies; CSRF tokens/origin checks; login/privilege rotation; server-side role refresh and revocation                                     | Low — accept after browser/session tests                                                                                                    | `NT-08`                   | `D02`, `D03`, `D05`, `F04`                                                        |
| `T-ACCT-03`    | Bind only verified provider identifiers; explicit reauthenticated linking; handle collisions without disclosure or silent merge                                      | Moderate — provider identity errors remain; ambiguous identity is denied and support-reviewed                                               | `NT-08`, `NT-09`          | `D02`-`D04`, `D12`, `F04`                                                         |
| `T-OAUTH-01`   | One-use, short-lived server transaction bound to actor/session/workspace/provider/redirect; state plus S256 PKCE; nonce where protocol requires                      | Low — accept after adversarial transaction tests                                                                                            | `NT-09`                   | `A06`, `C07`, `D04`, `D08`, `E03`, `F04`                                          |
| `T-OAUTH-02`   | Exact registered redirects; issuer-aware callback and token endpoint binding; no open redirects; distinct provider configuration                                     | Low — accept after mix-up/callback suite                                                                                                    | `NT-09`                   | `A06`, `C07`, `D04`, `D08`, `E03`, `F04`                                          |
| `T-OAUTH-03`   | Capability-to-minimum-scope allowlist; explicit incremental consent; fail partial consent safely; no Classroom writes/rosters by default                             | Moderate — provider scopes may bundle access; every exception needs product/privacy review                                                  | `NT-09`, `NT-10`          | `A06`, `C07`, `C08`, `D08`, `E03`, `F01`, `F04`                                   |
| `T-OAUTH-04`   | Workspace-scoped encrypted/protected token store; reference-only use; redaction; reconnect reauth; revocation and deletion verification                              | Moderate — providers may retain their own history; local token survival or cross-tenant use blocks release                                  | `NT-04`, `NT-09`, `NT-14` | `A05`, `C07`, `D06`, `D08`, `D12`, `F03`, `F04`                                   |
| `T-TENANT-01`  | Shell derives workspace from session; explicit scoped Core contracts; deny-by-default authorization and ownership in every adapter                                   | Low — accept only after complete per-use-case cross-tenant matrix                                                                           | `NT-10`                   | `A04`, `B03`, `B06`, `D05`-`D10`, `D12`, `F04`                                    |
| `T-TENANT-02`  | Tenant namespace and authorization context in records, objects, cache, jobs, metrics, audit, previews, provider grants, and support queries                          | Moderate — observability/support retain bounded exposure; any unscoped shared key blocks pilot                                              | `NT-10`, `NT-12`, `NT-14` | `A04`, `A05`, `B03`, `B06`, `D06`-`D10`, `D12`, `F04`                             |
| `T-JOB-01`     | Trusted producer; immutable tenant/capability/resource IDs; server-side reauthorization; idempotency key; expiry; bounded retries and audit                          | Low — at-least-once delivery remains but cannot duplicate external/state effects                                                            | `NT-12`                   | `A04`, `A05`, `D06`, `D08`-`D10`, `F04`                                           |
| `T-JOB-02`     | Per-tenant quotas and fair concurrency; bounded payload/runtime/retry; circuit breakers; last-known-good state; dead-letter review                                   | Moderate — provider/shared-infrastructure outages remain; one tenant must not starve others                                                 | `NT-12`, `NT-16`          | `A06`, `D06`, `D08`-`D10`, `F02`, `F04`, `F05`                                    |
| `T-BILL-01`    | Provider signature and timestamp; durable event ID; tenant/customer/subscription binding; monotonic reconciliation; idempotent entitlement updates                   | Moderate — provider disputes/outages remain; ambiguous events preserve safe entitlement and enter review                                    | `NT-13`                   | `D11`, `D12`, `F04`, `F05`                                                        |
| `T-STUDENT-01` | Allowlisted audience-classified projection built server-side; never serialize internal plan/provider/config objects; field-level regression fixtures                 | Moderate — teacher-authored content may identify people; any restricted/system field blocks viewer release                                  | `NT-03`, `NT-10`, `NT-18` | `A04`, `A08`, `C09`, `D10`, `E01`, `F01`, `F04`                                   |
| `T-CAP-01`     | Capability-specific ports and grants; read/preview paths have no mutation dependency; validate/authorize before side effects; preserve existing read-only boundaries | Low — accept after mutation traps and scope inventory                                                                                       | `NT-10`, `NT-11`          | `A04`, `B03`, `B06`, `C07`-`C09`, `D06`, `D08`, `F04`                             |
| `T-CFG-01`     | Versioned schemas/revisions; optimistic concurrency; validate full candidate before atomic replace; reversible migrations and compatibility checks                   | Moderate — operator error remains; invalid/conflicting state must never replace last known good                                             | `NT-11`, `NT-15`          | `A05`, `B06`, `C01`, `C12`, `D06`, `D12`, `F03`, `F04`                            |
| `T-BACKUP-01`  | Minimized encrypted artifacts with tenant/installation identity, integrity, retention and deletion markers; isolated restore verification                            | Moderate — recovery media intentionally retains bounded data; undeclared resurrection blocks pilot                                          | `NT-04`, `NT-14`          | `A05`, `C12`, `D12`, `F01`, `F03`, `F05`                                          |
| `T-SUPPORT-01` | Least-privilege support roles; explicit reason/tenant/window; visible impersonation; high-risk reauth/approval; immutable audit; kill switch                         | Moderate — trusted insider risk remains and requires human operational ownership                                                            | `NT-10`, `NT-14`          | `D05`, `D12`, `F01`, `F04`, `F05`                                                 |
| `T-SUPPLY-01`  | Exact Core pin and lock; integrity/provenance; restricted exports; no deep imports/Core HTTP mount; compatibility/migration/rollback gates                           | Moderate — upstream/dependency compromise remains; unverifiable or incompatible artifact blocks promotion                                   | `NT-15`                   | `A03`, `B01`, `B02`, `B06`, `B07`, `D01`, `D12`, `E04`, `F04`                     |
| `T-DOS-01`     | Per-entry and per-tenant rate, size, storage, duration, concurrency and cost bounds; backpressure; graceful degradation; capacity evidence                           | Moderate — distributed or infrastructure-scale attacks remain; paid pilot needs thresholds and response runbook                             | `NT-16`                   | `A05`, `A06`, `C03`, `C05`, `C06`, `C09`, `D03`, `D08`-`D10`, `F02`, `F04`, `F05` |
| `T-INFRA-01`   | Dedicated identity/network/storage/secrets/ingress/backups/deployment; no shared mounts, DB, profiles, controls, or route wildcard                                   | Moderate — bounded single-host availability risk may be accepted only for an explicitly reviewed pilot; isolation failure blocks deployment | `NT-17`                   | `D12`, `F01`-`F06`                                                                |

The OAuth controls align with the current Internet Standards Track security
guidance for authorization-code injection, PKCE, CSRF, redirect handling, and
authorization-server mix-up in [RFC 9700](https://www.rfc-editor.org/rfc/rfc9700.html).
The concrete browser-client shape must also be reviewed against the selected
architecture and the browser-application guidance in
[RFC 10017](https://www.rfc-editor.org/rfc/rfc10017.html); these references do
not select an OAuth library or provider configuration.

## Security invariants

1. **Authority is not transitive.** Operator reachability, viewer admission,
   hosted authorization, provider consent, billing entitlement, and support
   capability are independently established and scoped.
2. **Core HTTP is not a hosted integration seam.** The hosted shell invokes
   supported Core contracts below the self-hosted route boundary.
3. **Scope is explicit.** Every reusable operation and adapter receives an
   installation/workspace plus relevant room, screen, resource, date, actor,
   capability, and audit scope; Core never selects a hosted tenant.
4. **Viewer output is a projection, not a filtered internal object.** Only
   allowlisted, audience-classified fields reach display/student clients.
5. **Untrusted content remains inert.** Customer/provider text, files, URLs,
   formulas, markup, styles, and templates never become executable.
6. **Secrets are references outside protected stores.** Ordinary reads,
   diagnostics, logs, previews, exports, backups, errors, and support views
   never reveal secret values.
7. **Reads and previews cannot mutate.** Mutation authority is represented by
   distinct capability-specific ports/grants and is unavailable to read-only
   paths.
8. **Invalid work does not replace valid state.** Failed validation,
   authorization, refresh, import, migration, callback, webhook, or job leaves
   the last-known-good committed state intact.
9. **Tenant context follows work.** Persistence, objects, cache, jobs, metrics,
   audit, provider grants, previews, exports, backups, and support actions carry
   and verify the same server-derived workspace identity.
10. **Lifecycle operations cover derived state.** Revocation/deletion includes
    sessions, codes, grants, jobs, cache, objects, exports, and documented
    backup retention; restore cannot silently reverse deletion.
11. **Artifacts are deliberate and compatible.** Hosted consumes an exact,
    verified Core artifact through public exports; unsupported combinations
    fail before migration or traffic.
12. **Public exposure is explicit.** Supplied Core defaults never publish the
    operator listener, and hosted pilot ingress never exposes the private
    classroom service or its controls.

## Negative-test catalog

| Test ID | Required adversarial evidence                                                                                                                                                                          | Primary evidence type                         | Principal threats                                                                      |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- | -------------------------------------------------------------------------------------- |
| `NT-01` | Public/default bind scan cannot reach operator routes; display requests, cookies, caches, and route variants cannot resolve an operator handler                                                        | Packaging + integration                       | `T-CORE-01`, `T-CORE-02`                                                               |
| `NT-02` | Foreign/missing origin, hostile host, rebinding-style host, forged forwarding, cross-site form/fetch/WebSocket, and disallowed method/type are denied before mutation                                  | Browser + integration                         | `T-CORE-03`, `T-CORE-04`                                                               |
| `NT-03` | Context-specific HTML/attribute/URL/CSS/template/CSV payload corpus remains inert in operator, hosted, display, student, preview, export, and error views                                              | Unit + browser                                | `T-CONTENT-01`, `T-STUDENT-01`                                                         |
| `NT-04` | Known canary secrets never appear in responses, HTML, JSON, logs, traces, diagnostics, errors, previews, exports, backups, or support views                                                            | Contract + integration                        | `T-SECRET-01`, `T-OAUTH-04`, `T-BACKUP-01`                                             |
| `NT-05` | Traversal, absolute paths, symlinks, collisions, polyglots, active/mislabeled/oversized/malformed/decompression payloads fail without filesystem escape or state replacement                           | Unit + isolated integration                   | `T-FILE-01`, `T-FILE-02`                                                               |
| `NT-06` | Loopback, private, link-local, metadata, reserved, credentialed, non-HTTPS, alternate-IP, DNS-change, and redirect-chain destinations are rejected at every hop                                        | Unit + network-isolated integration           | `T-SSRF-01`                                                                            |
| `NT-07` | Guess/enumeration limits, uniform misses, fixation, replay, wrong-screen use, expiry, rotation, disable, deletion, and concurrent revocation deny old viewer authority                                 | Unit + integration + browser                  | `T-VIEW-01`-`T-VIEW-03`                                                                |
| `NT-08` | Account enumeration, brute force, recovery takeover, missing reauth, CSRF, fixation, stale role, cookie scope, logout/revocation, and identity-link collision fail safely                              | Unit + browser + integration                  | `T-ACCT-01`-`T-ACCT-03`                                                                |
| `NT-09` | State/PKCE/nonce mismatch, reused/expired transaction, wrong actor/workspace/provider/issuer/redirect, code injection, mix-up, partial consent, reconnect, and revocation are denied                   | Protocol contract + integration               | `T-OAUTH-01`-`T-OAUTH-04`                                                              |
| `NT-10` | Every shared use case and resource type rejects customer-selected/wrong tenant, role, room, screen, provider grant, object, preview, audit, support, and student fields                                | Contract matrix + integration                 | `T-OAUTH-03`, `T-TENANT-01`, `T-TENANT-02`, `T-STUDENT-01`, `T-CAP-01`, `T-SUPPORT-01` |
| `NT-11` | Read/preview mutation traps remain untouched; invalid, stale, conflicting, partial, cross-scope, incompatible, and rollback candidates preserve last-known-good state                                  | Unit + contract + integration                 | `T-VIEW-03`, `T-CAP-01`, `T-CFG-01`                                                    |
| `NT-12` | Forged, cross-tenant, tampered, expired, replayed, duplicate, reordered, stale-role, poison, retry-storm, and starved jobs cannot cross scope or duplicate effects                                     | Worker integration + capacity                 | `T-TENANT-02`, `T-JOB-01`, `T-JOB-02`                                                  |
| `NT-13` | Bad signature/time, replay, duplicate, reorder, stale subscription, wrong customer/tenant, outage, cancellation, and reconciliation conflicts preserve audited safe entitlement                        | Contract + integration                        | `T-BILL-01`                                                                            |
| `NT-14` | Cross-tenant export/backup/restore/support attempts fail; deletion and token revocation survive queues/cache/restore; privileged access is bounded, visible, and audited                               | Lifecycle integration + operations rehearsal  | `T-SECRET-01`, `T-OAUTH-04`, `T-TENANT-02`, `T-BACKUP-01`, `T-SUPPORT-01`              |
| `NT-15` | Deep imports, commercial-to-Core reverse dependency, Core entry-point/route mounting, checksum/provenance failure, unsupported version, failed migration, and rollback incompatibility block promotion | Architecture + packaging + migration          | `T-CORE-02`, `T-CFG-01`, `T-SUPPLY-01`                                                 |
| `NT-16` | Per-identity/tenant/global abuse of codes, login, previews, polling, uploads, parsing, storage, provider refresh, export, rendering, and jobs stays within declared thresholds and degrades safely     | Abuse + capacity                              | `T-FILE-02`, `T-VIEW-01`, `T-ACCT-01`, `T-JOB-02`, `T-DOS-01`                          |
| `NT-17` | Default manifests and pilot plans expose only intended ingress and prove no shared identity, network, mount, secret, database, profile, backup, wildcard route, or control plane                       | Static policy + isolated deployment rehearsal | `T-CORE-01`, `T-CORE-04`, `T-INFRA-01`                                                 |
| `NT-18` | Versioned fixtures enumerate every display/student field and fail when restricted, unclassified, raw-provider, account, diagnostic, internal-plan, or private-link data appears                        | Schema/contract + snapshot                    | `T-STUDENT-01`                                                                         |

`A08` turns this catalog into versioned synthetic fixtures and a contract-suite
interface. Individual implementation tasks add focused cases; `F04` runs the
cross-surface abuse and capacity qualification and treats any unresolved High
residual risk or failed `must never` invariant as a blocker.

## Residual-risk and decision register

| Decision or residual risk                                                                            | Current disposition                                                                                                                                                                                                                                                                                                            | Resolution owner / gate                                                                                   |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Core has no account/login and equates private operator reachability with full installation authority | Deliberate Moderate residual. Accepted ADR-0026 selects a separate operator process with an explicit loopback/Unix-socket default, distinct identity/routes/cookies/cache/readiness, and Host/Origin controls; public-by-default behavior remains blocked.                                                                     | Selected in `A03`; implementation/evidence in `B05`, `B07`, `C02`, `C12`, `F04`                           |
| Class codes are shareable convenience credentials                                                    | Deliberate Moderate residual only for a minimal screen-safe projection. A05 fixes a 64-bit minimum generated entropy, 12-32 character bound, 12-hour maximum viewer session, versioned verifier references, and atomic rotation/revocation contracts; alphabet, cadence, throttling, and projection privacy remain unresolved. | Persistence/thresholds in `A05`; fixtures in `A08`; implementation in `C03`/`D10`; privacy in `E01`/`F01` |
| Student-safe fields, especially attendance and provider-linked text                                  | Not accepted by category. An explicit allowlist and fixture evidence are required; unclassified or restricted fields block viewer release.                                                                                                                                                                                     | Contracts in `A04`/`A08`; implementation in `E01`; human privacy review in `F01`                          |
| Provider scope bundling, external retention, verification, and outage                                | Moderate third-party residual. Minimum capability mapping and last-known-good behavior are required; roster/write/translation expansion needs a new decision.                                                                                                                                                                  | `A06`, `C07`/`C08`, `D08`, `E03`, `F01`, `F04`                                                            |
| Support and trusted operations can access bounded customer state                                     | Moderate insider residual. Least privilege, reauthentication/approval, visible time bounds, audit, and rehearsed incident ownership are required.                                                                                                                                                                              | `D12`, `F01`, `F04`, `F05`                                                                                |
| Shared Core supply chain and cross-repository compatibility                                          | Moderate upstream/dependency residual. Accepted ADR-0026 selects project references, restricted exports, packed GitHub Release artifacts, provenance, exact `0.x` pairings, migration preflight, and verified predecessor/backup rollback; unverifiable artifacts remain blocked.                                              | Selected in `A03`; `B01`/`B02`/`B06`/`B07`; hosted gates in `D01`/`D12`/`E04`                             |
| A controlled hosted pilot may share a physical Ubuntu host                                           | High inherent availability/operational-concentration risk; only Moderate residual is acceptable after strong identity/network/storage/ingress/control isolation and explicit human pilot acceptance. Any cross-service reachability or shared secret/control is a blocker.                                                     | Design and review in `F01`-`F05`; live effect only in authorized `F06`                                    |
| Concrete scope/schema contracts, auth library, thresholds, infrastructure, and vendor choices        | Intentionally unresolved, not silently accepted. Each later task must preserve the accepted A03 mechanics and these invariants and record its own version-correct threat impact.                                                                                                                                               | `A04`-`A08`, `D02`, `D11`, `F01`-`F05` as assigned in the work breakdown                                  |

## A02-A05 completion and next gate

A02 is complete because the A01 surfaces now have explicit assets,
classifications, actors, trust boundaries, entry/data flows, stable threats,
inherent and residual risk, mandatory controls, negative-test families, and
downstream owners. The register does not accept an unresolved High residual
risk; every such condition blocks the affected release or live gate.

A03 accepted ADR-0026 with project references and restricted exports, packed
immutable-release artifacts, separate operator/display processes, exact `0.x`
pairings, and a typed feature-region presentation seam. A04 established the
workspace and actor vocabulary. A05 now defines configuration lifecycle,
optimistic concurrency, protected-secret references, bounded audit metadata,
portable export, protected backup, forward migration, and rollback contracts.
A05 admission compares the full A04 workspace discriminant and
installation/organization identity, and its detached snapshots prevent
post-validation caller mutation from changing immutable or checksummed state.
A06 through A08 remain incomplete, Phase B has not begun, and A02 through A05
performed no runtime or live effect.
