# ADR-0026: Public Core and separate hosted shell

- Status: Accepted
- Date: 2026-08-30
- Accepted: 2026-08-31

## Context

Chalkwright must support two products without becoming two diverging codebases:

1. a complete public, self-hosted Core application that an outside developer or
   teacher can obtain from GitHub and operate independently; and
2. a commercial hosted service that reuses the same classroom planning,
   configuration, preview, and display behavior inside an authenticated,
   multi-tenant account application.

Core intentionally has an operator-facing panel but no Chalkwright user-account
or login system. The hosted service requires accounts, sessions, organizations,
roles, billing, and tenant authorization. Mounting Core's unauthenticated HTTP
server inside the hosted service would therefore be unsafe, while copying or
forking Core into the commercial repository would cause behavior and security
fixes to drift.

The current repository is one private npm application package compiled as one
NodeNext TypeScript project. It already separates domain rules, versioned
contracts, application workflows, ports, infrastructure adapters,
server-rendered presentation, composition roots, and executable entry points.
Architecture tests already parse imports to preserve several of those
directions. The production build emits declarations, and the current release
controller creates deterministic SHA-256-addressed archives with immutable
release directories and rollback to a retained predecessor. These are useful
seams and release invariants; they do not yet constitute a supported external
Core package.

The [A01 acceptance matrix](../core-and-hosted-feature-acceptance-matrix.md)
fixes product ownership. The [A02 threat model](../core-and-hosted-threat-model.md)
fixes the security invariants, especially private operator ingress, distinct
viewer and account authority, tenant scope, supported package exports,
artifact provenance, and service isolation. This record selects the initial
mechanics that later tasks must implement.

## Decision

Use **one public Core upstream and two composition shells**:

```text
                  public Chalkwright Core repository
       domain + use cases + ports + contracts + presentation
                      /                         \
         self-hosted Core shell          commercial hosted shell
       local adapters and services       accounts/tenancy/billing
       operator + display processes      hosted web + workers
       independent distribution          exact verified Core pin
```

The public repository remains a complete product. It also produces one
restricted, versioned Core package artifact that the separate commercial
repository consumes as an exact dependency. Core is the upstream; the
commercial repository is a downstream consumer.

The commercial application composes Core use cases, contracts, presentation
primitives, and approved provider adapters through declared package exports. It
must not start, proxy, mount, or import the self-hosted Core server, its route
tables, its composition roots, or arbitrary source paths.

### Public Core owns

- canonical classroom domain types, invariants, planning, enrichment, and
  screen-specific projection;
- application use cases and explicit ports for persistence, sources, media,
  jobs, provider grants, and presentation;
- versioned configuration, snapshot, preview, display, and connector contracts;
- operator-panel feature behavior and route-independent view models and
  rendering primitives;
- provider scope policy and read/write capability boundaries;
- self-hosted SQLite, filesystem, direct-provider, and local scheduling
  adapters;
- self-hosted operator and display composition roots, setup and diagnostics,
  migrations, sample configuration, and release packaging; and
- fixtures and contract suites that any shell or adapter must pass.

Core must not contain commercial-account assumptions, billing checks,
organization membership, hosted support impersonation, or a dependency on the
private commercial repository.

### Commercial shell owns

- registration, login, recovery, multi-factor authentication, user sessions,
  organizations, invitations, memberships, and roles;
- tenant authorization and isolation, subscription and billing lifecycle,
  hosted support controls, and account export/deletion;
- hosted persistence, object storage, queues, token encryption, public ingress,
  rate limits, monitoring, backup, and deployment;
- mapping an authenticated organization and actor into an explicit Core
  workspace context before invoking a Core use case; and
- hosted document shells, navigation, page chrome, routes, links, response
  headers, and authorized actions around shared Core presentation features.

The commercial shell may extend Core through documented ports and composition
points. It may not patch internal modules, shadow a Core invariant, or make a
hosted-only behavior appear to be part of Core.

### Scope and authorization contract

Reusable Core operations require explicit workspace, room, screen, date,
resource, actor, capability, and audit scope where relevant. No reusable
operation silently selects a global or default tenant. The self-hosted shell
supplies one installation-owned workspace; the commercial shell derives the
organization workspace from the authenticated server-side session.

Authorization remains a shell responsibility:

- Core's self-hosted shell grants operator authority based on reachability of
  its separately bound private operator process; and
- the commercial shell authenticates the actor, checks organization membership
  and role, fixes the workspace scope server-side, and only then invokes Core.

Core use cases still validate ownership and scope invariants. They must not
accept a customer-supplied organization identifier as proof of authorization.
This choice controls `T-TENANT-01`, `T-TENANT-02`, and `NT-10`; A04's accepted
[workspace and actor contracts](../core-workspace-actor-contracts.md) define
the concrete versioned scope shapes. Applying them throughout current use cases
remains B03 work.

## Selected implementation choices

### 1. TypeScript project references first; npm workspaces deferred

The first enforceable boundary is a TypeScript solution/project-reference graph
over the current source layers, backed by architecture tests. Referenced
projects will be composite and declaration-emitting, with the dependency order
Core contracts -> domain -> ports -> application, with presentation and
infrastructure adapters depending only on the inward contracts they implement
or render, and self-hosted composition roots depending on those projects.
Entry-point projects remain endpoints and may depend inward; no Core project
may import a shell entry point or commercial code.

The distributable library surface is one Core package with an explicit Node
`exports` map and declaration targets. Its initial public subpaths are limited
to reviewed contracts, use cases/ports, presentation, and the conformance kit.
Self-hosted entry points, route tables, configuration loaders, filesystem and
SQLite implementations, provider credential stores, and unrestricted adapter
internals are not exports. Architecture and package-consumer tests must reject
reverse dependencies, undeclared subpaths, direct `src/` or `dist/` imports,
and self-hosted entry-point imports.

npm workspaces are **deferred**, not rejected. The repository presently has one
root application manifest and no independently versioned sibling packages;
adding workspace linking now would add install/lockfile behavior without
strengthening the selected boundary and could let local symlinks hide missing
artifact contents. A later task may introduce workspaces only when at least two
real package manifests need coordinated local installation. That change must
retain packed-artifact consumer tests and, if it changes release or dependency
semantics materially, supersede this ADR.

This is the smallest mechanism that extends existing import-direction tests
without immediately moving every directory or changing runtime behavior. It
addresses `T-CORE-02`, `T-SUPPLY-01`, and `NT-15`.

### 2. Local packed artifact, then immutable GitHub Release assets

Local and CI development of the future hosted consumer uses the output of
`npm pack` for the single Core package, never a source-directory link, Git
submodule, workspace symlink, or arbitrary Git checkout import. The local
tarball is installed into a disposable hosted test checkout and must pass the
same exports, conformance, migration, and presentation tests as a downloaded
artifact. The root Chalkwright application remains `private: true`; this
decision does not authorize npm publication or change that safeguard.

The initial distributable channel is an **immutable GitHub Release**, not the
public npm registry. Each Core release contains:

- a complete independently installable self-hosted runtime archive;
- the npm-compatible Core package tarball consumed by hosted builds;
- a machine-readable release manifest binding semantic version, Git commit,
  exact filenames, byte lengths, SHA-256 digests, exported-contract version,
  configuration/schema version, migration range, and supported Node version;
- an artifact-provenance attestation for both archives; and
- release notes naming breaking exports/contracts, migrations, security fixes,
  and rollback constraints.

The release is made immutable after verification. Consumers verify the release,
attestation identity/repository/commit, manifest, filename, byte length, and
SHA-256 before installation. GitHub's generated source archives are not the
dependency because their bytes are produced on demand and are not the
repository-built assets verified by this gate.

Every hosted release pins one exact Core artifact URL/version and records the
package-lock `resolved`/`integrity` evidence plus a hosted release manifest
containing the Core version, artifact SHA-256, source commit, contract/schema
versions, and attestation identity. SemVer ranges, branches, tags such as
`latest`, mutable URLs, and unverified local directories are forbidden. Public
npm publication is excluded from the initial `0.x` channel and requires a new
explicit publication decision; the package format remains npm-compatible so a
later registry decision does not change the public exports.

This choice extends the existing deterministic archive/digest/immutable-release
and rollback patterns while addressing `T-SUPPLY-01`, `T-CFG-01`, `NT-11`, and
`NT-15`.

### 3. Separate operator and display processes

The self-hosted edition uses **two separate Node processes and service units**,
not one process with two listeners:

- the operator process owns only the operator route table, defaults to an
  explicit IPv4/IPv6 loopback address or Unix socket, handles configuration,
  provider enrollment, diagnostics, and operator previews, and fails startup if
  its bind target is omitted or not explicitly approved; and
- the display process owns only display/viewer admission, committed
  projections, public presentation assets, and display health/readiness. It
  cannot construct operator routes, provider credentials, configuration-write
  capabilities, or the operator document shell.

Installed service examples use distinct unprivileged identities and filesystem
allowlists. Protected references and writable configuration remain unavailable
to the display identity. `A05` determines the exact persistence split, but it
must preserve that OS-level property; a shared database file may not grant the
display process general configuration, provider-token, or operator-audit
authority. Viewer/session state and committed projections may use a separately
scoped store or adapter.

The processes have different ports or sockets, route tables, cookie names and
paths, in-memory caches, persistent cache namespaces, readiness endpoints, and
systemd hardening. No reverse-proxy rule, redirect, forwarded host, or service
template may wildcard both. The operator process validates Host and Origin,
trusts forwarded headers only from an explicitly configured proxy, and rejects
cross-site mutation. The display process never receives operator cookies. Both
TCP listeners require an explicit host; no code path may rely on Node's omitted-
host behavior, which otherwise binds an unspecified address.

Failure is isolated: the display continues serving its last-known-good
projection while the operator process restarts or is unavailable; operator
readiness does not make display readiness healthy; either unit can be stopped
or rolled back without silently starting the other. Repository-supplied
defaults bind both privately and never publish the operator surface. Making the
display listener reachable is a separate explicit deployment choice and still
requires viewer admission.

This choice reduces `T-CORE-01` through `T-CORE-04` without claiming zero risk
and supplies the required shape for `NT-01`, `NT-02`, and `NT-17`. The remaining
Moderate risk is the deliberate no-login reachability boundary documented in
the threat model.

### 4. One exact Core/hosted pairing throughout 0.x

While Core is `0.x`, each hosted release supports **exactly one Core artifact**.
There is no runtime range and no promise that a hosted build works with another
Core patch or minor version until that exact pairing has passed the complete
gate. This compatibility statement is separate from `SECURITY.md`: only the
latest supported Core line receives fixes, so a hosted release pinned to a
superseded vulnerable artifact must upgrade or stop promotion.

Chalkwright applies this 0.x version convention:

- a breaking deliberate export, public contract, configuration/schema, or
  migration requirement increments the Core minor version;
- a backward-compatible addition or fix increments the patch version; and
- any artifact-content change creates a new version and digest; release assets
  are never replaced in place.

The public Core manifest records its contract/schema/migration requirements but
does not name or depend on private commercial code. The private hosted
compatibility manifest records the hosted version and exact Core version/digest
and therefore provides the minimum hosted version known to support that Core
release. CI blocks a missing or mismatched pairing before migration, build
promotion, or traffic.

Rollback retains the exact prior hosted and Core artifacts plus pre-migration
backup evidence. Code rollback is allowed only when the manifest says the
current persisted schema is readable by the predecessor. Otherwise rollback
restores the verified pre-migration backup in isolation before selecting the
prior pair. A failed migration or compatibility preflight leaves current state
and traffic unchanged.

The window may broaden only after `1.0.0`, or after at least two consecutive
minor lines have demonstrated backward-compatible contracts and reversible or
dual-readable migrations in both shells. Broadening the window, supporting
multiple simultaneous Core lines, or changing the rollback contract requires a
superseding ADR. This choice addresses `T-CFG-01`, `T-SUPPLY-01`, `NT-11`, and
`NT-15`.

### 5. Typed feature-region presentation below shell-owned documents

The shared server-rendered seam consists of route-independent, audience-
classified TypeScript view models plus pure escaping/rendering primitives for
Core feature regions. Core models contain semantic action descriptors and
opaque scoped resource identities, not hosted URLs, cookies, navigation,
account objects, organization selectors, billing state, raw provider objects,
or arbitrary HTML.

Each shell authenticates/authorizes first, constructs the explicit Core scope,
invokes a use case, maps the result into a Core view model, and then owns:

- the complete HTML document shell, navigation and layout chrome;
- URL generation, forms and action targets;
- account/organization/billing/support context;
- response headers, cookies, CSP, caching, redirects, and error routing; and
- selection of the authorized feature-region renderer and assets.

Core renderers escape untrusted data and may render shared feature-region
markup and edition-neutral client behavior, but they do not emit `<html>`,
`<head>`, shell navigation, hosted links, response headers, or an executable
route table. A shell cannot pass raw markup or executable templates into a Core
renderer. The self-hosted and hosted wrappers are separately tested against the
same view-model fixtures and accessibility/presentation conformance suite.

The current presentation module already has typed display, preview, and
operator models and pure string renderers, but its shared document helper and
base-path link construction remain coupled. `A07` now supplies the exact
route-independent view/action contracts and a conforming pure feature-region
reference; `B02`, `B04`, and `D07` separate production feature regions from the
two shell-owned document wrappers without redesigning presentation behavior in
A03.

This choice prevents hosted presentation reuse from importing the self-hosted
HTTP boundary and addresses `T-CONTENT-01`, `T-CORE-02`, `T-TENANT-01`,
`T-STUDENT-01`, `NT-03`, `NT-10`, and `NT-15`.

## Incremental migration from the current repository

No step below is performed by this ADR:

1. **B01:** add the executable source-layer dependency-direction check around
   the existing directories. Preserve the current single-package build and
   document any exact temporary composition seams as the rollback path.
2. **B02:** add composite TypeScript projects, create the one Core package
   manifest and restricted export map, change internal consumers to supported
   entry points, and prove a packed consumer succeeds while deep and
   self-hosted imports fail.
3. **B03:** apply the `A04` workspace/actor contracts to every shared operation
   and adapter before any hosted consumer exists.
4. **B04:** extract explicit self-hosted composition roots around the supported
   Core exports while preserving current behavior and the existing production
   entry point as a comparison/rollback checkpoint.
5. **B05:** introduce separately privileged operator and display processes,
   route tables, storage capabilities, service templates, and readiness. Do not
   expose either new listener during offline qualification.
6. **B06:** package the `A08` fixtures as the shared conformance kit and run it
   against both the self-hosted composition and a synthetic consumer.
7. **B07:** build the local npm-compatible Core tarball and complete self-hosted
   archive, manifests, checksums, provenance, install/upgrade/rollback tests,
   and private-by-default service examples without publishing anything.

Compatibility checkpoints occur after B02 (exports), B04 (composition), B05
(ingress and privilege separation), and B07 (artifact and rollback). Each
checkpoint retains the last verified current shape until the new shape passes;
no migration advances merely because files were moved. D01 may create the
commercial repository only after the separately authorized repository action
and after B07 supplies a verified artifact.

Changing one Core package into multiple independently versioned packages,
introducing immediate workspace-linked hosted development, using a registry as
the primary channel, returning to one operator/display process, allowing a
compatibility range, or sharing whole document/HTTP renderers requires a
superseding ADR because it changes a security or rollback property. Directory
names, tsconfig filenames, exact export subpath spelling, and internal renderer
function names are implementation details for B01/B02/A07 if they preserve this
decision.

## Alternatives considered

- **Immediate npm workspaces and many Core packages:** deferred because the
  current repository has one manifest and one version. It increases manifests,
  linking, build orchestration, and version surfaces before an independent
  consumer exists; it does not replace export maps or architecture tests.
- **Architecture tests without TypeScript references:** rejected because regex
  import tests alone do not give the compiler a declared project/build graph or
  declaration boundary.
- **One process with two listeners:** rejected because one route registry,
  credential-bearing heap, cache, crash domain, or future middleware mistake
  could cross the operator/display boundary. Separate processes make forbidden
  authority structurally unavailable to display.
- **Publish Core immediately to public npm:** rejected for the initial channel
  because the complete application is still pre-release and intentionally
  private in npm metadata. GitHub Releases can distribute exact verified
  tarballs without adding registry identity, token, takedown, or tag risk.
- **Consume a Git branch, commit checkout, submodule, subtree, or source
  archive:** rejected because these bypass the exact packed contents, exports,
  lockfile integrity, build provenance, and compatibility manifest.
- **Use a local directory/workspace link for hosted development:** rejected as
  the conformance path because it can see files omitted from the artifact and
  can make unsupported deep imports appear to work.
- **Fork or copy Core into the commercial repository:** rejected because fixes,
  provider policy, rendering, and migrations would drift.
- **Put hosted accounts and billing in the public Core composition root:**
  rejected because Core must remain an independent, straightforward self-hosted
  product without commercial-account assumptions.
- **Mount the complete unauthenticated Core server behind hosted middleware:**
  rejected because an overlooked route, job, cookie, or future handler could
  bypass tenant authorization.
- **Share complete HTML documents between editions:** rejected because hosted
  navigation, account context, links, CSP, cookies, and authorization belong to
  the hosted shell; feature-region reuse preserves shared behavior without
  importing that authority.
- **Support a Core SemVer range during 0.x:** rejected because current contracts
  and forward-only migrations have not demonstrated a safe multi-version
  window. Exact pairing is measurable and reversible.
- **Create one hosted process or repository clone per customer:** rejected for
  the initial service because it multiplies deployment and migration cost
  without removing the need for accounts, billing, and operational controls.

## Consequences

- GitHub Core remains useful, complete, inspectable, and independently
  self-hostable rather than functioning as a commercial teaser.
- Hosted reuses actual Core behavior without inheriting Core's unauthenticated
  HTTP boundary.
- Separate processes add service and storage-capability design work but turn
  operator/display route confusion and credential reachability into testable
  structural constraints.
- One package/version and exact hosted pin minimize 0.x compatibility ambiguity;
  every hosted Core upgrade is deliberate work.
- GitHub Release tarballs avoid public npm publication initially while retaining
  an npm-compatible consumer contract.
- Project references, restricted exports, manifests, provenance, and dual-shell
  conformance add release work, but shared fixes and features retain one
  upstream implementation.
- Feature-region rendering requires two document wrappers; it keeps shell
  identity, authorization, links, headers, and navigation in their owning layer.

## Verification implications

- `B01` architecture evidence proves current source dependency direction;
  introducing a reversed dependency, an alias bypass, or an unclassified
  in-tree module fails the focused guard. `B02` adds the compiler/build graph.
- `B02` package tests prove only deliberate Core exports resolve from a packed
  consumer and direct source, deep, route-table, composition-root, and
  self-hosted-entry-point imports fail (`T-SUPPLY-01`, `NT-15`).
- `B05` packaging, service, network, host/origin, route, cookie, cache,
  privilege, readiness, and independent-failure tests prove supplied defaults
  never publish operator ingress and display cannot serve or construct operator
  behavior (`T-CORE-01`-`T-CORE-04`, `NT-01`, `NT-02`, `NT-17`).
- `B06` contract tests execute shared use cases and feature rendering against
  self-hosted and synthetic hosted adapters; `D06`/`D07` add exhaustive wrong-
  tenant and unauthorized-action cases (`T-TENANT-01`, `T-TENANT-02`, `NT-10`).
- `B07` release tests verify exact packed contents, SHA-256, manifest, provenance,
  immutable asset, installation, upgrade, predecessor retention, migration
  preflight, and rollback (`T-CFG-01`, `T-SUPPLY-01`, `NT-11`, `NT-15`).
- `D01` and `D12` prove the hosted package-lock and release manifest name one
  identical Core artifact and block any other version/digest before migration
  or traffic.
- `F02`/`F04` prove the hosted runtime shares no identity, mount, secret,
  database, backup, route wildcard, or service control with the self-hosted
  installation (`T-INFRA-01`, `NT-17`).
- Any failed `must never` invariant or unresolved High residual risk blocks the
  affected release. The complete `NT-01` through `NT-18` catalog remains
  governing even where this ADR names only the directly affected families.

## Version and standards evidence

The decision was checked against the repository's effective Node.js 24.15.0,
npm 11.12.1, lockfile-resolved TypeScript 5.9.3, NodeNext module mode, and
lockfile version 3:

- Node 24's [package entry-point documentation](https://nodejs.org/download/release/v24.15.0/docs/api/packages.html#package-entry-points)
  defines `exports` as the deliberate subpath boundary and notes that unexported
  package subpaths are unavailable to ordinary package consumers.
- The TypeScript [project references handbook](https://www.typescriptlang.org/docs/handbook/project-references.html)
  documents composite declaration projects, explicit dependency graphs, and
  build mode.
- npm 11 documents that [workspaces](https://docs.npmjs.com/cli/v11/using-npm/workspaces/)
  link multiple local packages, while [`npm pack`](https://docs.npmjs.com/cli/v11/commands/npm-pack/)
  and [tarball installation](https://docs.npmjs.com/cli/v11/commands/npm-install/)
  support an installable package without registry publication. Its
  [`package-lock.json` documentation](https://docs.npmjs.com/cli/v11/configuring-npm/package-lock-json/)
  governs the additional resolved/integrity evidence.
- Node's version-matched [`server.listen`](https://nodejs.org/download/release/v24.15.0/docs/api/net.html#serverlisten)
  behavior makes an omitted host unsafe for this boundary because it accepts on
  an unspecified IPv6 or IPv4 address; the selected processes require explicit
  bind targets.
- GitHub documents [immutable release and asset verification](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/verify-release-integrity)
  and [artifact-attestation generation and verification](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations).
  Those mechanisms supplement, rather than replace, the release manifest and
  SHA-256 checks.

This accepted record chooses architecture mechanics only. It does not authorize
package reorganization, repository creation, package or release publication,
provider action, process/listener/service creation, route change, migration,
deployment, or any other live effect.
