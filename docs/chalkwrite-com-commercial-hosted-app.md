# ChalkWrite.com Commercial Hosted App

Status: roadmap concept; no implementation or public deployment is authorized
by this document.

## Product idea

ChalkWrite.com would be the paid, hosted counterpart to the free self-hosted
Chalkwright application. It is a complete authenticated online application, not
merely a public display with a protected configuration page. A teacher or school
would create and manage an account, belong to an organization, manage billing
and subscriptions, configure one or more classroom screens, connect approved
data sources, choose branding and language options, review planned displays,
and receive a URL that can display the current Chalkwright screen without
installing or operating the application themselves.

The working commercial premise is **$9.99 per active screen per month**. One
customer account may own multiple screens, rooms, and configuration profiles;
billing scales with the number of active screen subscriptions.

`ChalkWrite.com` is the user-proposed hosted-service name. The repository's
canonical product name remains **Chalkwright**. Domain ownership, spelling,
trademark fit, and the final relationship between the service and the open-source
brand must be confirmed before any public launch.

## Intended experience

### Teacher or administrator

1. Create and verify an account, then create a school or organization.
2. Add a screen, give it a friendly name, associate it with a room, choose its
   timezone, and select the desired Chalkwright features.
3. Configure schedule and content sources through guided pickers and forms.
4. Connect Google Classroom or other approved providers through explicit,
   least-privilege authorization flows.
5. Upload or select the school logo and course art, configure supported
   languages, and preview the resulting screen with synthetic or approved data.
6. Activate the screen subscription at $9.99 per month.
7. Receive a stable, non-sequential screen URL and configure a revocable class
   code.
8. Open the URL on the classroom display, enter the class code, and receive the
   current screen after validation.

The settings experience should expose every supported user-facing option while
keeping internal runtime files, server paths, secrets, provider tokens, and
machine-specific configuration out of the form.

### Student or other viewer

A student may open the same screen URL on a personal device and enter the same
class code. After admission, the student sees the same current classroom state,
but presentation preferences may be applied locally to that viewer session.

Initial personalization should include:

- a preferred language;
- showing one selected translation rather than rotating through all configured
  translations;
- an on-demand translation toggle for a learning objective or other eligible
  text; and
- a global interface-language toggle for supported navigation, labels, and
  headings.

The shared screen state remains authoritative. A student preference changes
only that student's presentation and must never change the classroom display or
another viewer's experience.

Student accounts should not be required for the first release. Store the
preferred language in the viewer's short-lived session or local browser storage
unless a later, explicitly justified feature requires a durable identity. The
service should not import rosters merely to personalize the display.

## Authenticated account application

The signed-in Chalkwright application should organize account management and
screen operations as related workspaces rather than reducing the product to one
unstructured settings form or an `/admin` utility.

The configuration and control workspace is a Chalkwright Core capability, not a
commercial-only feature. The self-hosted Core edition exposes that capability
as an operator-facing panel without a Chalkwright user account, login, roles, or
application-session authentication. Anyone who can reach that panel can change
the installation, so the Core deployment must keep it on an operator-controlled
local or private interface and must never publish it as an unrestricted public
route. Tailscale is one possible deployment boundary, not a product
requirement.

The hosted edition wraps the shared Core configuration, control, and preview
capability in the complete account application. It adds authenticated accounts,
profile and security, organization membership, invitations and roles, billing,
subscriptions, data connections, exports, and tenant administration. URL
obscurity, a class code, or network reachability is not account authentication
for the hosted service.

The class code belongs to the low-privilege display and student-view surface. A
Core operator configures it in the operator panel; a hosted operator configures
it after signing in to the account application. Either operator can share it
directly with students. It never grants access to the hosted account
application.

| Boundary                 | Self-hosted Chalkwright Core                                     | Commercial hosted service                                                        |
| ------------------------ | ---------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Operator interface       | Browser-based operator panel                                     | Full account application containing the shared panel capability                  |
| Chalkwright identity     | No user account, login, roles, or authenticated operator session | Authenticated users, sessions, organizations, memberships, and roles             |
| Operator access boundary | Deployment-controlled local or private reachability              | Application login plus role-based authorization                                  |
| Connected provider data  | Optional direct OAuth authorization for the provider connection  | Optional direct OAuth authorization associated with the account and organization |
| Display admission        | Operator-configured class code                                   | Operator-configured class code                                                   |

Provider OAuth does not add Chalkwright account authentication to Core. It
authorizes only the selected external data connection.

The authoritative owning layer, edition and surface availability, MVP
disposition, safety boundary, acceptance evidence, and downstream task for each
agreed feature are frozen in the
[Core and Hosted Feature Acceptance Matrix](core-and-hosted-feature-acceptance-matrix.md).

### Public Core and commercial wrapper boundary

The public GitHub repository must remain a complete, independently useful
self-hosted product. It includes the planning engine, approved connectors,
operator panel, previews, display, local persistence and files, jobs, setup,
diagnostics, migrations, examples, and production packaging needed to reproduce
the Core experience without a ChalkWrite.com account or commercial dependency.

The commercial application is a separate downstream consumer of one packed,
versioned Core package with restricted exports, not a fork, source link, or
copy. Core owns domain behavior, use cases, ports, provider capability policy, display
projection, and route-independent operator-panel presentation. The commercial
repository owns accounts, sessions, organizations, roles, tenant isolation,
billing, hosted storage, queues, support, and public operations.

The integration seam sits below HTTP routing. The hosted application must not
mount Core's unauthenticated self-hosted server and hope that outer middleware
protects every route. Instead, it authenticates and authorizes an account,
derives the organization workspace on the server, and then calls a shared Core
use case through a supported package export. The self-hosted shell supplies one
installation-owned workspace through the same contract.

The versioned
[Core workspace and actor contracts](core-workspace-actor-contracts.md) make
that seam concrete. Actor attribution is not authentication, request-carried
organization data is not authorization, and hosted-account, viewer, provider,
billing, and support authority remain structurally independent.

The self-hosted package uses separate operator and display processes and service
identities. Its operator process is loopback/Unix-socket private by default and
is not published by repository-supplied deployment examples. The display
process has a distinct route table, cookies, cache, readiness, and storage
capability and may serve class-code-admitted viewers through separately
configured ingress. Sharing business behavior below these shells prevents drift
without sharing the wrong trust boundary.

Core releases expose only deliberate, versioned package entry points. During
`0.x`, each commercial release pins exactly one SHA-256- and provenance-verified
Core package tarball from an immutable GitHub Release and records the same
artifact in its lockfile and release manifest. Public npm and npm workspaces are
deferred. The shared contract suite plus hosted tenant-isolation tests run for
every deliberate upgrade. A shared fix lands upstream in Core first when it
affects both editions. The accepted mechanisms, rejected alternatives,
compatibility rules, and rollback gates are recorded in
[ADR-0026](decisions/0026-public-core-and-hosted-shell.md).

The primary hosted signed-in navigation should include:

- **Account:** profile, login methods, active sessions, security, notifications,
  data export, and account deletion;
- **Organization:** school identity, members, invitations, roles, ownership,
  billing contact, and organization lifecycle;
- **Screens:** rooms, screens, stable display URLs, class codes, subscriptions,
  readiness, and viewer-session controls;
- **Connections and content:** provider grants, shared resources, uploads,
  courses, mappings, objectives, vocabulary, translations, and approved media;
- **Planned displays:** daily contact sheets, enlarged frames, date selection,
  and carousel review;
- **Presentation:** branding, themes, motion profiles, timing, languages, and
  student-view preferences; and
- **Billing and support:** plan status, invoices, usage, diagnostics, audit
  history, and support-safe evidence.

### Organization and billing

- organization or school name;
- owners and administrators;
- billing contact and payment status;
- active, paused, and cancelled screen subscriptions; and
- usage and invoice history without exposing payment-card data to Chalkwright.

### Room and screen

- room name, screen name, timezone, and school-day calendar;
- stable screen URL and class-code controls;
- class-code changes, viewer-session revocation, and device sign-out;
- preview, readiness, last refresh, and last-known-good status; and
- display behavior supported by the free application, presented as safe
  user-facing settings rather than raw runtime configuration.

### Schedule and content sources

- an approved schedule provider, uploaded schedule, or bounded Google file;
- Google Classroom course selection and mapping;
- learning-objective, vocabulary, and translation sources;
- course names, aliases, colors, and art mappings; and
- validation that shows exactly which screen and course each source can affect.

A hosted service cannot safely accept paths on a customer's local computer.
"Spreadsheet path" should therefore mean a file selected with an approved
provider picker, an opaque Google Drive/Sheets file identifier, or a validated
uploaded CSV. The service must never interpret customer input as an arbitrary
server filesystem path.

### Dual source strategy

Every consequential content type should offer a connected provider lane and the
closest safe non-connected lane. Provider integration improves discovery and
freshness; it must not be the price of entry for using Chalkwright.

| Data stream                                                   | Connected lane                                                       | Manual, shared, or uploaded lane                                                             |
| ------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| School, rooms, and screens                                    | Future institutional directory import                                | Account and organization forms                                                               |
| Course catalog                                                | Read-only Google Classroom or future Microsoft Education discovery   | Add courses in the application or import a validated CSV, JSON, or structured Markdown table |
| Daily schedule and bell times                                 | Selected Calendar, supported SIS, or future Microsoft Graph calendar | Recurring timetable form, ICS/CSV upload, or date-specific exceptions                        |
| Holidays and no-class dates                                   | Selected Calendar                                                    | ICS/CSV upload or direct calendar controls                                                   |
| Assignments, links, and due dates                             | Read-only Classroom coursework or future Microsoft Education source  | Teacher-maintained Sheet, CSV, structured Markdown, or direct entry                          |
| Learning objectives and lesson references                     | Selected Drive, Docs, OneDrive, or SharePoint sources                | Uploaded Markdown, text, DOCX, CSV, or direct entry                                          |
| Vocabulary, translations, and pronunciations                  | Selected Sheets, Excel, or approved media folders                    | CSV/XLSX, structured Markdown, pronunciation text, and bounded audio uploads                 |
| School logo, course art, and display media                    | Provider file picker                                                 | Direct validated upload, preferred for the initial release                                   |
| Attendance or check-in destination                            | Future approved form or attendance connector                         | Pasted reviewed URL and generated QR presentation                                            |
| Rosters                                                       | Separately enabled read-only Classroom, Microsoft, or SIS connector  | Explicit CSV import only when a roster-dependent feature has been approved                   |
| Announcements, class code, themes, transitions, and overrides | No provider needed                                                   | Managed directly in the signed-in application                                                |

The supported non-connected modes are:

- **application-managed:** values entered and versioned in the signed-in app;
- **uploaded snapshot:** a validated file imported at a known instant;
- **shared resource:** a public/published resource or a private resource shared
  with an explicit Chalkwright service identity; and
- **connected account:** an OAuth-authorized provider resource with bounded
  background refresh.

The shared A05
[configuration and durable-state contracts](core-configuration-state-contracts.md)
require hosted adapters to implement these records with the session-derived
workspace on every key, conditional revision writes instead of last-write-wins,
and atomic validated activation. Portable export is one redacted tenant only;
protected backup/restore remains integrity-checked, exact-workspace, and
isolated from current traffic.

A pasted Google file URL or Calendar ID identifies a resource but does not grant
access to it. The application must state whether the resource must be published,
shared with a named Chalkwright identity, uploaded, or selected through OAuth.
Google Classroom has no equivalent share-URL mechanism: its automatic course
and coursework lane requires authorized API access. A manual course and
assignment feed can reproduce the display content, but the teacher owns its
freshness.

### Branding and language

- uploaded school logo and course art;
- bounded raster image types, dimensions, and file sizes;
- configurable interface and translation languages;
- teacher-authored or source-authored translations; and
- a preview for classroom-display and student-device layouts.

The first release should prefer controlled uploads over arbitrary remote image
URLs. If remote linking is added later, the service should fetch and validate
the asset through a tightly constrained background importer, store a safe local
copy, and never load an arbitrary customer URL directly from a server or
student browser.

## Recommended architecture

### Application-owned identity and provider authorization

Chalkwright will own its account, session, authorization, and provider-token
lifecycles rather than delegate them to WorkOS or another managed identity or
integration broker. A maintained authentication library may provide protocol
and session primitives, but Chalkwright remains the application of record for
users, organizations, memberships, roles, sessions, and authorization.

Google login and Google data authorization are separate grants. Signing in with
Google proves account identity; connecting Classroom, Calendar, Drive, Docs, or
Sheets is an explicit later action that requests only the read scopes required
by the selected connector. A user may instead sign in with Microsoft or an
application account and connect a different Google identity for classroom data.

For connected Google data, Chalkwright will use its own development and
production Google Cloud projects, OAuth clients, consent configuration,
verified domains, callbacks, encrypted refresh-token storage, revocation flow,
and official Google API clients. It will preserve the existing read-only Google
Classroom boundary. Course discovery does not imply roster access; roster and
student-submission scopes remain absent until an approved feature demonstrates
a need for them.

Future connected Microsoft sources should follow the same direct, incremental,
least-privilege model through Microsoft Entra and Graph. Neither Google nor
Microsoft connection is required when an adequate application-managed, shared,
or uploaded source has been configured.

Each customer should receive a **logical hosted instance**, not a separate
operating-system process, web server, database, or deployment. One multi-tenant
application can safely serve hundreds of screen URLs when every record and
operation is explicitly scoped to a tenant, organization, room, and screen.

```text
Account application  Classroom display     Student devices
       \                    |                    /
        +---------- HTTPS public ingress -------+
                    TLS, WAF, rate limits
                              |
                 Hosted web application / API
       account | control | connections | class-code | display
                              |
            Tenant-aware Chalkwright application
                  /           |             \
        relational DB   object storage   job queue/cache
          metadata       approved media    snapshots
                  \           |             /
                 background refresh workers
                              |
              approved provider APIs and files
```

### Control plane and display plane

Separate the service conceptually into two surfaces:

- The **account and control plane** is the signed-in application. It handles
  account security, organization membership, billing, subscriptions,
  configuration, provider authorization, previews, code rotation, audit
  history, exports, deletion, and support diagnostics. It always requires a
  fully authenticated account and role-based authorization.
- The **display plane** serves classroom and student views from a previously
  committed display snapshot. It accepts only a screen URL plus a validated
  viewer session and never exposes settings, secrets, provider responses, or
  another tenant's data.

Provider calls, schedule normalization, art processing, translation imports,
and snapshot generation run in bounded background jobs. A page request reads a
last-known-good snapshot; it does not call Google Classroom, open a spreadsheet,
or start a browser session while a class is waiting for the page.

### Suggested logical components

- **Public ingress:** HTTPS termination, canonical host routing, request-size
  limits, basic web-application firewall rules, and denial-of-service controls.
- **Web/API service:** stateless account, configuration, class-code, display, and
  billing-webhook handlers that may later run as multiple replicas.
- **Worker service:** provider refresh, normalization, snapshot creation, image
  validation, scheduled cleanup, and retry processing outside request paths.
- **Relational database:** organizations, memberships, screens, configuration
  versions, source references, class-code hashes, sessions, billing state, job
  history, and audit events. PostgreSQL is a more natural hosted multi-tenant
  target than creating one SQLite database per customer.
- **Object storage:** validated logos, art, exported configuration backups, and
  immutable display assets, all stored under tenant-scoped opaque keys.
- **Secret storage:** envelope-encrypted OAuth refresh tokens and provider
  credentials with a separate encryption key and access policy. Secrets are not
  stored in ordinary configuration records, logs, support exports, or Git.
- **Queue and cache:** deduplicated refresh jobs and short-lived display
  snapshots/session data. This can begin with a durable database-backed queue
  and add dedicated infrastructure only when measured load requires it.
- **Billing adapter:** a payment provider owns card handling; signed,
  idempotently processed webhooks update the application's subscription state.
- **Observability:** tenant-safe metrics, structured redacted logs, audit
  events, alerts, backup checks, and per-screen readiness without raw student or
  provider content.

### Core tenancy model

Likely first-class records are:

- `organization`;
- `user` and `organization_membership` with owner/admin/support roles;
- `room` and `screen`;
- `provider_connection` and `content_source`;
- versioned `display_configuration`;
- immutable or versioned `display_snapshot`;
- `class_code` and `viewer_session`;
- `screen_subscription`; and
- `audit_event` and bounded `job_run`.

Every tenant-owned row carries an organization identifier. Every query and
object-store key is constrained by the authenticated organization derived from
the server-side session, never merely trusted from a URL or request body.
Automated tests must attempt cross-tenant reads and writes for every relevant
resource type.

## URLs and class-code behavior

A screen URL should use a cryptographically random, non-sequential identifier,
for example:

```text
https://screen.example/s/7fmK2...opaque...
```

The final public hostname is intentionally not assumed until the domain and
brand decision is complete.

On first load, the page asks for the class code. A successful code entry issues a
short-lived, secure, HTTP-only viewer-session cookie scoped to that screen.
Subsequent refreshes use the session until it expires, the teacher rotates the
code, or the viewer is revoked.

The class code is a convenience gate for low-privilege display content, not a
password and not authorization to settings or provider data. It should be
chosen or regenerated by the authenticated operator, stored only as a slow
password hash, compared in constant time, and protected by per-IP, per-screen,
and per-code throttling. Error messages must not reveal whether a screen
identifier or code was valid. The same URL-and-class-code flow applies to the
classroom display and student devices; no additional device-pairing credential
is required.

## Student-view content policy

The student view must not blindly mirror every classroom-display component.
Each card or field needs an explicit audience classification:

- safe for classroom and class-code-admitted student devices;
- classroom display only;
- authenticated teacher only; or
- never exposed outside a provider-processing job.

The initial student surface should exclude rosters, student names, private
provider links, raw Classroom payloads, operator diagnostics, account details,
and any attendance artifact whose broader distribution has not been reviewed.
The service should render a bounded display projection, not return the internal
canonical plan or configuration object to the browser.

Static interface labels can be maintained as reviewed translation catalogs.
Teacher-authored translations already present in approved sources may be shown
directly. Automatic translation of objectives or assignment text should remain
a separately designed capability: its provider, data processing, accuracy,
retention, cost, and school privacy implications must be approved before any
classroom text is transmitted.

## Security and privacy baseline

The authoritative [Core and hosted threat model](core-and-hosted-threat-model.md)
turns this baseline into stable threats, security invariants, residual-risk
dispositions, and downstream negative-test obligations. In particular, hosted
account authorization, class-code viewer admission, Core operator reachability,
and provider consent are independent authorities; no one of them establishes
another.

### Account and session security

- Use a well-supported local authentication library while retaining
  application-owned users and sessions; verify email ownership and support
  multi-factor authentication for owners and administrators.
- Keep administrator sessions separate from low-privilege viewer sessions.
- Use secure, HTTP-only, same-site cookies, session rotation, CSRF protection,
  short inactivity limits for sensitive consoles, and explicit sign-out and
  revocation.
- Require reauthentication for provider reconnection, billing changes,
  organization deletion, and other high-risk operations.

### Authorization and tenant isolation

- Deny by default and check organization, role, room, and screen ownership on
  every resource access, including support tooling and background jobs.
- Use opaque public identifiers, but never treat opacity as authorization.
- Namespace database records, cache keys, object keys, queues, metrics, and
  audit events by tenant and test for cross-tenant leakage.
- Prevent customer-provided markup, scripts, styles, URLs, or configuration from
  becoming executable server or browser content.

### Google and other provider connections

- Request the smallest available scopes and request additional scopes only when
  the user activates the related feature.
- Preserve the existing read-only Google Classroom boundary.
- Encrypt refresh tokens at rest, restrict the token store from public network
  access, redact tokens from every log and export, and revoke/delete them when a
  connection is removed.
- Handle partial consent, expiration, revocation, quota limits, and provider
  outages without erasing the last-known-good display.
- Plan for Google's production OAuth verification, verified-domain, privacy
  policy, terms, and separate development/production project requirements
  before accepting external customers.

The current self-hosted PowerSchool browser-profile approach should not simply
be copied into a multi-tenant public service. A commercial PowerSchool adapter
needs a district-approved, bounded integration and credential model. Until that
exists, an uploaded schedule or supported read-only API should be the hosted
MVP path.

### Uploaded and remote media

- Allowlist file types and reject active formats in the first release; validate
  actual content independently of the filename and browser-supplied media type.
- Enforce small size and dimension limits, generate new server-owned filenames,
  scan or re-encode images, and serve them from a separate media origin with a
  restrictive content security policy.
- If remote imports are later accepted, reject private, loopback, link-local,
  metadata-service, non-HTTPS, redirecting, and non-allowlisted destinations to
  prevent server-side request forgery.
- Never reveal filesystem paths or storage keys to customers.

### Operations

- Run the public service as an unprivileged identity with a read-only
  application image, minimal writable volumes, outbound-network restrictions,
  prompt security updates, and no access to the existing production Chalkwright
  database, browser profiles, secrets, or service controls.
- Back up the database and configuration off-host; regularly test restoration
  and tenant deletion.
- Rate-limit class-code attempts, logins, previews, provider refreshes, uploads,
  exports, and billing webhooks. Bound job duration, retries, concurrency, and
  payload sizes.
- Define retention and deletion for accounts, sessions, snapshots, audit events,
  uploaded media, provider tokens, and backups.
- Complete a threat model, dependency review, penetration test, incident plan,
  privacy policy, terms, and school-data legal review before general
  availability. This document does not claim FERPA, COPPA, GDPR, or other legal
  compliance.

## Hosting on the existing Ubuntu machine

The current Ubuntu machine can host a controlled pilot, but the commercial
service must be isolated from the existing private classroom application and
public landing page.

The minimum acceptable pilot shape is:

1. a dedicated virtual machine or comparably strong container boundary;
2. a dedicated unprivileged service account and network;
3. only the public TLS ingress reachable from the Internet;
4. the app, worker, database, and cache bound to private or loopback addresses;
5. no mounts or credentials shared with the existing Chalkwright service;
6. separate deployment, backup, monitoring, and rollback paths; and
7. off-host encrypted backups plus a tested restore.

The reverse proxy or public ingress should route only the hosted-service
hostname to the isolated origin. It should never make the existing private
classroom route publicly reachable. No route, firewall, tunnel, DNS, service, or
deployment change is authorized by this roadmap entry. The hosted product
itself has no Tailscale dependency.

A single physical host remains a single point of failure for power, storage,
network, and maintenance. That can be an explicit pilot risk, not an unstated
production promise. Before paid usage grows beyond a bounded pilot, move the
database and backups to a failure-isolated design and make stateless web and
worker processes reproducibly deployable on replacement capacity.

## Scaling model

The display workload is favorable when requests read cached snapshots rather
than provider APIs. As a simple planning example, 100 classroom screens polling
every 30 seconds create only about 3.3 routine requests per second. The larger
burst comes from admitted student devices: 100 simultaneous classes with 30
viewers each would create roughly 100 requests per second at the same interval,
before assets and reconnections.

Prepare for that growth by:

- serving immutable art and static assets through cacheable object storage or a
  CDN;
- returning compact display snapshots with ETags and conditional requests;
- using controlled polling first, then considering server-sent updates only if
  measurements justify the operational complexity;
- precomputing and caching tenant-safe screen projections;
- deduplicating provider refreshes and applying provider-specific concurrency
  and quota limits;
- keeping web processes stateless so replicas can be added behind the ingress;
- using a pooled, backed-up relational database and explicit migrations; and
- measuring active screens, admitted viewers, snapshot latency, queue age,
  provider errors, cache hit rate, and per-tenant resource use.

Do not create one container or website per screen unless a later compliance or
large-customer isolation requirement justifies the operational cost.

## Billing behavior

The product unit is one active screen subscription at **$9.99 per month**.
Billing should be attached to a stable screen record, not inferred from page
views or viewer sessions.

The billing design must define:

- trial length, if any;
- when adding, pausing, deleting, or transferring a screen changes billing;
- proration, failed-payment grace, cancellation, refunds, taxes, and invoices;
- what a classroom display shows during a billing problem;
- idempotent signed webhook handling and reconciliation; and
- how an account exports or deletes its data after cancellation.

Payment-card data should be handled entirely by the billing provider. A failed
webhook or temporary billing outage must not corrupt configuration or leak
another customer's status.

## Proposed delivery stages

The detailed Codex-sized tasks, prerequisites, completion evidence, and live
authorization gates for these stages are maintained in the
[Core and Hosted Service Implementation Work Breakdown](core-and-hosted-implementation-work-breakdown.md).

### Stage 0: product and risk decisions

- confirm brand/domain ownership and the relationship to Chalkwright;
- define the hosted MVP's allowed schedule and content sources;
- define the audience-safe display projection and student privacy model;
- choose the maintained local authentication library and the separate billing
  provider, plus hosting, support, and data-retention models;
- complete an initial threat model and provider-policy review; and
- specify the pilot's capacity, recovery objective, and exit criteria.

### Stage 1: tenant-safe account application

- account registration, login, profile, security, sessions, recovery, export,
  and deletion;
- organizations, invitations, roles, rooms, screens, and subscription records;
- versioned non-secret configuration;
- synthetic preview and readiness checks;
- isolated upload pipeline; and
- audit events, backups, and cross-tenant authorization tests.

### Stage 2: hosted display plane

- background snapshot generation from synthetic and uploaded sources;
- opaque screen URLs, class codes, throttling, and viewer sessions;
- responsive classroom and student-device rendering; and
- last-known-good behavior under worker or provider failure.

### Stage 3: approved Google integration

- application-owned development and production OAuth projects, verification,
  policies, callbacks, and secure token storage;
- incremental least-privilege Google Classroom and file authorization;
- direct official Google API clients without a managed integration broker;
- bounded provider jobs with revocation and quota handling; and
- tenant-isolated course/source mapping and diagnostics.

### Stage 4: personalization and billing pilot

- reviewed interface translation catalogs and per-viewer language preferences;
- explicit policy for any automatic content translation;
- per-screen billing and lifecycle handling; and
- a small, supportable paid pilot with recovery and security evidence.

### Stage 5: scale and general availability

- measured capacity tests for screens and student-device bursts;
- failure-isolated database, off-host recovery, reproducible replicas, and
  monitored deployment;
- external security and privacy review; and
- documented support, incident, deletion, and service-availability policies.

## MVP boundary

The smallest credible hosted MVP includes account registration, login, profile,
security and recovery; one organization; one or more paid screens; uploaded or
approved read-only schedule/content sources; branding; a preview; a generated
URL; code-gated viewer sessions; cached last-known-good display snapshots; and
tenant-safe operations.

It does not initially require:

- one deployment per customer;
- roster import or student accounts;
- automatic translation of classroom content;
- PowerSchool browser-profile hosting;
- Calendar writes;
- arbitrary remote art URLs;
- custom customer code, CSS, HTML, or scripts; or
- a guarantee that a single Ubuntu host can provide general-availability
  redundancy.

## Acceptance criteria for a pilot

- A new teacher can configure and preview a screen without editing files or
  receiving server access.
- Activating a screen creates exactly one billable screen and produces a stable
  opaque URL plus an operator-configured, revocable class code.
- The classroom display and class-code-admitted student devices show the same
  current state; per-device language preferences do not mutate shared state.
- Provider and worker failures preserve an explicitly marked last-known-good
  display and produce tenant-safe diagnostics.
- Automated negative tests prove that accounts, viewer sessions, URLs, object
  keys, background jobs, and support actions cannot cross tenant boundaries.
- Brute-force, upload, SSRF, XSS, CSRF, session, and billing-webhook controls are
  tested at the relevant boundaries.
- Backups restore successfully in an isolated environment, and account/token
  deletion is demonstrated.
- The public pilot has current terms, privacy disclosures, provider approval,
  incident ownership, monitoring, and a documented rollback path.

## Open decisions

- Is `ChalkWrite.com` the final service/domain spelling, and is it owned and
  available for this use?
- Which schedule source is safe and simple enough for the hosted MVP?
- What class-code length and character set best balance easy classroom sharing
  with effective throttling against guessing?
- Is one class code shared indefinitely or changed by the teacher on a regular
  cadence?
- Which display fields are safe for student devices, especially attendance and
  provider-linked content?
- Are student preferences entirely local, or is there a justified need for
  durable anonymous profiles?
- Which languages ship first, and are learning-objective translations
  teacher-authored, automated, or both?
- Which maintained local authentication library best fits Chalkwright's native
  Node HTTP server and intended SQLite/PostgreSQL storage boundaries?
- Which provider handles billing, and what are the failure and grace semantics?
- Which manual source schemas and connected Google scopes belong in the first
  hosted pilot?
- What uptime and support promise is appropriate at $9.99 per screen?
- What measured customer or load threshold triggers migration away from a
  single physical host?

## Security references

These sources inform the baseline and should be rechecked against their current
versions during implementation:

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [OWASP Server-Side Request Forgery Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP API Security Top 10 — 2023](https://owasp.org/API-Security/editions/2023/en/0x11-t10/)
- [Google OAuth 2.0 policies](https://developers.google.com/identity/protocols/oauth2/policies)
- [Google OAuth 2.0 best practices](https://developers.google.com/identity/protocols/oauth2/resources/best-practices)
