# ADR-0027: Django hosted application and private Core service boundary

- Status: Accepted
- Date: 2026-09-01
- Supersedes in part: ADR-0026's deferred commercial-framework and direct-package-consumer candidate

## Context

Goal 1 proved the Core TypeScript operator workflow without adding accounts,
application authentication, or a public operator route. The hosted product
needs a conventional SaaS application while preserving Core behavior without
mounting its unauthenticated self-hosted server or rewriting a working Core.

## Decision

Use **Django** for the commercial hosted application. Django owns hosted
accounts, sessions, organizations, authorization, billing, hosted persistence,
background-work orchestration, and the signed-in control UI.

Keep Core in TypeScript behind a **private, versioned Core service/worker
boundary**. Django communicates only through its declared, versioned contract;
it does not import Core source files, mount or proxy the Core operator server,
or rely on Tailnet reachability as hosted authorization. Core remains the
self-hosted product with a Tailnet-only, no-login operator panel.

## Consequences

- No Python port or duplicate commercial implementation of Core behavior is
  authorized.
- The service boundary must have explicit contract versions, compatibility,
  provenance, tenant-scoped authorization inputs, conformance tests, timeout
  and failure behavior, and rollback evidence before it handles hosted data.
- Django authentication and authorization are follow-on work; this decision
  does not select an authentication library, provider scopes, billing provider,
  repository, deployment, or a live service.
- D01 may now plan the separate Django repository and bind the service
  contract, subject to separate authorization for repository creation.

## Alternatives considered

- **Direct TypeScript package consumption:** rejected because Django cannot
  consume the running Core TypeScript behavior as an in-process package without
  introducing a cross-runtime integration and release coupling problem.
- **Incremental Python port:** deferred; it would duplicate a proven Core path
  before conformance evidence justifies the cost and drift risk.
- **Mounting the Core operator server in Django:** rejected because Core's
  Tailnet-only, reachability-based authority is not hosted account
  authorization.

## Verification implications

Before hosted behavior is accepted, contract conformance must prove tenant
isolation, no unauthorized Core route exposure, version compatibility,
redaction, bounded worker failure, and safe rollback. No live effect is
authorized by this record.
