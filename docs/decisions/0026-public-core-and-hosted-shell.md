# ADR-0026: Public Core and separate hosted shell

- Status: Proposed
- Date: 2026-08-30

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

The current repository already separates domain rules, application workflows,
ports, infrastructure adapters, presentation, and executable entry points. The
future package boundary should strengthen those seams rather than replace the
application wholesale.

## Proposal

Use **one public Core upstream and two composition shells**:

```text
                public Chalkwright Core repository
       domain + use cases + ports + contracts + presentation
                    /                         \
       self-hosted Core shell          commercial hosted shell
       SQLite/files/local jobs         accounts/tenancy/billing
       operator-only listener          hosted authorization
       independent distribution        hosted storage/workers
```

The public repository remains a complete product. It also publishes versioned
Core packages or equivalent release artifacts that the separate commercial
repository consumes as an exact dependency. In dependency terminology, Core is
the upstream; the commercial repository is the downstream consumer.

The commercial application composes Core use cases, contracts, presentation
primitives, and approved provider adapters. It must not start, proxy, or mount
the self-hosted Core server or its unauthenticated operator routes.

### Public Core owns

- canonical classroom domain types, invariants, planning, enrichment, and
  screen-specific projection;
- application use cases and explicit ports for persistence, sources, media,
  jobs, provider grants, and presentation;
- versioned configuration, snapshot, preview, display, and connector contracts;
- the operator-panel feature behavior and route-independent view models or
  rendering primitives;
- provider scope policy and read/write capability boundaries;
- self-hosted SQLite, filesystem, direct-provider, and local scheduling
  adapters;
- a self-hosted composition root, operator panel, display server, setup and
  diagnostics, migrations, sample configuration, and release packaging; and
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
- hosted navigation and page chrome around shared Core operator-panel features.

The commercial shell may extend Core through documented ports and composition
points. It may not patch internal modules, shadow a Core invariant, or make a
hosted-only behavior appear to be part of Core.

### Scope and authorization contract

Reusable Core operations should require explicit workspace, room, screen, date,
and resource scope where relevant. No reusable operation silently selects a
global or default tenant. The self-hosted shell supplies one installation-owned
workspace; the commercial shell supplies the organization workspace derived
from the authenticated server-side session.

Authorization remains a shell responsibility:

- Core's self-hosted shell grants operator authority based on reachability of
  its separately bound operator interface; and
- the commercial shell authenticates the actor, checks organization membership
  and role, fixes the workspace scope server-side, and only then invokes Core.

Core use cases still validate ownership and scope invariants. They must not
accept a customer-supplied organization identifier as proof of authorization.

### Self-hosted network boundary

The self-hosted distribution separates operator and display ingress. The
operator panel defaults to a loopback-only listener or Unix socket. The
class-code-admitted display listener may use a different configured interface.
Repository-owned service and container examples must preserve that separation
and must not publish the operator port by default.

Private-LAN or reverse-proxy access can be documented as an explicit deployment
choice. Tailscale may supply a private route but is not required. The package
must state plainly that anyone who can reach the operator listener can change
configuration and provider connections.

### Source and release shape

The exact directory names remain an implementation decision, but the intended
shape is equivalent to:

```text
public repository
  packages/core-domain
  packages/core-application
  packages/core-contracts
  packages/core-presentation
  packages/core-adapters
  apps/core-self-hosted

private commercial repository
  apps/hosted-web
  apps/hosted-worker
  packages/hosted-identity-tenancy
  packages/hosted-storage
  packages/hosted-billing
```

This may begin as package boundaries inside the existing TypeScript repository.
It does not require publishing every internal module to the public npm registry.
Core releases can provide restricted package exports and signed or checksummed
tarballs through GitHub Releases or an appropriate package registry. The hosted
repository pins an exact Core release and records it in its lockfile and release
manifest.

The public release must remain independently installable. A developer can build
from source, while an ordinary self-hoster receives documented production
artifacts, migrations, safe listener defaults, example configuration, and an
upgrade/rollback path without any commercial credential or service.

### Compatibility rules

- Export only deliberate public package entry points; do not let the commercial
  application import arbitrary Core source paths.
- Version cross-repository contracts semantically and record breaking changes,
  data migrations, and minimum compatible hosted versions.
- Keep storage behind ports. SQLite is the self-hosted adapter; hosted storage
  can use PostgreSQL without changing domain or use-case behavior.
- Keep provider tokens behind a credential-store port. Core may use a
  single-install protected store; hosted uses organization-scoped encryption.
- Run the same behavioral and connector contract suites against both shells.
- Promote a hosted release only after its pinned Core version passes the hosted
  authorization, tenant-isolation, migration, and display compatibility gates.
- Upstream security and correctness fixes land in Core first when they affect
  shared behavior, then the hosted dependency is upgraded deliberately.

## Consequences

- GitHub Core remains useful, complete, inspectable, and independently
  self-hostable rather than functioning as a crippled commercial teaser.
- The hosted product reuses actual Core behavior without inheriting Core's
  unauthenticated HTTP boundary.
- Shared fixes and features have one upstream implementation and one contract
  suite.
- The commercial repository can remain operationally and commercially separate
  while consuming the Apache-2.0 Core under its existing license.
- Package exports, scope contracts, and dual-shell testing add release work, but
  that work makes the trust boundary visible and testable.
- Some UI composition work will be required so hosted pages reuse Core feature
  rendering without embedding the self-hosted server wholesale.

## Rejected alternatives

- **Fork or copy Core into the commercial repository:** rejected because fixes,
  provider policy, rendering, and migrations would drift.
- **Put hosted accounts and billing in the public Core composition root:**
  rejected because Core does not require account management and must remain a
  straightforward independent self-hosted product.
- **Mount the complete unauthenticated Core server behind hosted middleware:**
  rejected because an overlooked route, job, or future handler could bypass
  tenant authorization; the hosted shell must compose use cases below the HTTP
  boundary.
- **Make the commercial repository a Git submodule or subtree of Core:**
  rejected as the primary integration contract because source-tree coupling
  does not provide stable exports, compatibility policy, or release evidence.
- **Create one hosted process or repository clone per customer:** rejected for
  the initial service because it multiplies deployment and migration cost
  without removing the need for account, billing, and operational controls.

## Verification implications

- Dependency checks prove public Core packages never import commercial code and
  the hosted shell never imports the self-hosted entry point or route table.
- Core release tests prove an installation can be configured, refreshed,
  previewed, displayed, backed up, upgraded, and restored without the commercial
  service.
- Packaging tests prove the default operator listener is not publicly published
  and that display and operator ingress remain distinct.
- Contract tests execute shared use cases and rendering against self-hosted and
  hosted adapters.
- Hosted negative tests attempt cross-organization access for every shared Core
  use case and prove workspace scope is derived from the authenticated session.
- Compatibility tests install the exact pinned Core artifact, run migrations,
  and reject an unsupported Core/hosted version combination before deployment.

## Open implementation decisions

- Whether to use npm workspaces in the public repository immediately or first
  enforce the boundaries with TypeScript project references and package
  exports.
- Which Core artifacts are published to GitHub Releases, a package registry, or
  both.
- Whether the self-hosted operator and display listeners run in one process or
  separate processes; they must remain separately bindable either way.
- How shared server-rendered views accept hosted navigation, account context,
  and authorization-safe links without depending on hosted code.
- The first compatibility-support window and deprecation policy for Core
  releases consumed by the hosted service.

This proposed record clarifies product and repository shape. It does not
authorize a package reorganization, repository creation, package publication,
provider action, or deployment.
