<!-- Generated from docs/core-and-hosted-implementation-work-breakdown.md and docs/core-and-hosted-work-queue.json by scripts/codex/wbs-queue.mjs. Do not edit. -->

# Chalkwright Core Operator-First Task and Execution Ledger

- Authoritative WBS: [docs/core-and-hosted-implementation-work-breakdown.md](core-and-hosted-implementation-work-breakdown.md)
- Task status overlay: [docs/core-and-hosted-work-queue.json](core-and-hosted-work-queue.json)
- WBS fingerprint: `76667001ed5619110ce7860b931d69926dcf2cfe91cdfa37cbc1bfb368b22afe`
- Tasks: 51; ready 4; gated 0; waiting 17; in progress 2; review 0; blocked 0; complete 28; reconciliation 0.

## Goal 1 dispatch lane

Only the next incomplete row is dispatchable before **C10**. After that acceptance gate, ordinary WBS dependency scheduling resumes; B01 Core hardening and D00 commercial architecture selection can become ready independently.

| Order | Task | Outcome | Dispatch state |
| --- | --- | --- | --- |
| 1 | A07 | Specify operator-panel information architecture | complete |
| 2 | A08 | Establish Core Goal 1 synthetic fixtures | complete |
| 3 | C01 | Implement versioned configuration services | complete |
| 4 | C02 | Implement the unauthenticated Core operator shell | complete |
| 5 | C03 | Implement rooms, screens, and class codes | complete |
| 6 | C04 | Implement the source registry and forms | complete |
| 7 | C09 | Implement planned-display projection | complete |
| 8 | C10 | Qualify the first Core operator-panel goal | complete |

## Orchestration contract

The WBS owns task definitions, ordering policy, dependencies, and completion
criteria. The JSON overlay owns execution status, accountable owner, executor,
branch, worktree, blockers, evidence, and notes. This generated ledger combines
them without copying mutable task definitions into the overlay.

Run `npm run wbs:sync` after changing the WBS or status overlay. New WBS tasks
enter as pending. Untouched pending definition changes synchronize
automatically. Changes to assigned, blocked, reviewed, or completed tasks create
a mandatory reconciliation finding. Removed tasks remain in the JSON archive;
worked or evidenced removals require explicit review.

At dispatch, the orchestrator updates the
`configuration-panel-planning` workstream in
`docs/project-knowledge.json`, assigns one isolated `codex/` branch and
worktree, and generates an executor packet with `npm run wbs:packet -- <ID>`.
The orchestrator reviews the handoff and evidence before changing task status or
allowing dependent work.

## Ready to dispatch

- **B07:** Produce an installable Core artifact
- **C05:** Implement bounded uploads and imports
- **C06:** Implement shared-resource acquisition
- **C07:** Implement direct Google enrollment for Core

## Reconciliation required

- None.

## Phase A — decisions, contracts, and safety

| Task | Outcome | Dispatch state | Dependencies | Owner | Branch | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| A01 | Freeze the feature and acceptance matrix | complete | — | — | — | [docs/core-and-hosted-feature-acceptance-matrix.md](../docs/core-and-hosted-feature-acceptance-matrix.md) |
| A02 | Threat-model the new surfaces | complete | A01 | — | — | [docs/core-and-hosted-threat-model.md](../docs/core-and-hosted-threat-model.md) |
| A03 | Resolve ADR-0026 implementation choices | complete | A01, A02 | — | — | [docs/decisions/0026-public-core-and-hosted-shell.md](../docs/decisions/0026-public-core-and-hosted-shell.md) |
| A04 | Define workspace and actor contracts | complete | A02, A03 | — | — | [docs/core-workspace-actor-contracts.md](../docs/core-workspace-actor-contracts.md), [test/contracts/v1/workspace.test.ts](../test/contracts/v1/workspace.test.ts) |
| A05 | Define configuration, persistence, and migrations | complete | A04 | — | — | [docs/core-configuration-state-contracts.md](../docs/core-configuration-state-contracts.md), [test/contracts/v1/configuration-state.test.ts](../test/contracts/v1/configuration-state.test.ts) |
| A06 | Define source modes and first-release formats | complete | A01, A02, A05 | — | — | [docs/core-source-mode-contracts.md](../docs/core-source-mode-contracts.md), [test/contracts/v1/source-contracts.test.ts](../test/contracts/v1/source-contracts.test.ts) |
| A07 | Specify operator-panel information architecture | complete | A01, A04, A06 | orchestrator:/root | codex/config-panel-a07-operator-ia | `docs/core-operator-panel-information-architecture.md`, `src/contracts/v1/operator-panel.ts`, `test/contracts/v1/operator-panel.test.ts`, `test/presentation/operator-panel-reference-browser.test.ts`, `docs/ui-references/a07-code-native-reference/evidence/manifest.json` |
| A08 | Establish Core Goal 1 synthetic fixtures | complete | A04, A05, A06 | orchestrator:/root | codex/config-panel-a08-goal1-fixtures | `docs/core-goal1-fixture-contract-suite.md`, `src/contracts/v1/core-goal1-contract-suite.ts`, `test/fixtures/core-goal1.ts`, `test/contracts/v1/core-goal1-contract-suite.test.ts` |

## Phase B — Core package and runtime hardening after Goal 1

| Task | Outcome | Dispatch state | Dependencies | Owner | Branch | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| B01 | Enforce internal dependency direction | complete | A03, A04, C10 | orchestrator:/root | codex/b01-dependency-direction | `commit:dd7f0db`, `remote:dd7f0db9052401421a690a6db5e9756ecbbf9445`, `npm run check (documentation, fixtures, operations verification, formatting, types, client, tests, build, smoke, and rehearsals)`, `architecture acceptance: full layer scan plus a reversed application-to-infrastructure negative` |
| B02 | Introduce deliberate Core exports | complete | B01 | orchestrator:/root | codex/b02-core-exports | `commit:5c1dc5b`, `remote:5c1dc5bbf78797dbd3a4f2ded8daaf1b05feb345`, `npm run check (documentation, fixtures, operations verification, formatting, types, client, tests, build, smoke, and rehearsals)`, `package acceptance: approved public exports resolve and self-hosted/deep paths fail package-export resolution` |
| B03 | Make workspace scope explicit | complete | A04, A08, B02 | orchestrator:/root | codex/b03-workspace-scope | `commit:bbf968e`, `remote:bbf968e52496e6016c2b61e6cd8a01fdafeeddd0`, `npm run check (documentation, fixtures, operations verification, formatting, types, client, tests, build, smoke, and rehearsals)`, `isolation acceptance: same workspace ID with a different installation identity cannot read display-access state` |
| B04 | Extract the self-hosted composition shell | complete | A05, B02, B03 | orchestrator:/root | codex/b04-self-hosted-composition | `commit:4d34df5`, `remote:4d34df5e1d83c99cd2e3fcfdc761e94e9ee1ef9d`, `npm run check (documentation, fixtures, operations verification, formatting, types, client, tests, build, smoke, and rehearsals)`, `composition acceptance: private Core controller composes from deliberate Core exports while listener binding remains separate` |
| B05 | Harden operator and display runtime isolation | complete | A02, A03, B04, C02 | orchestrator:/root | codex/b05-ingress-isolation | `commit:64cb597`, `remote:64cb597f6f02da8aaec99d6a6844d7b83dfc68a9`, `B05 increment: docs check, formatting, typecheck, compiled focused class-code display-ingress tests, and diff check`, `npm run check (documentation, fixtures, operations verification, formatting, types, client, tests, build, smoke, and rehearsals)`, `ingress acceptance: loopback defaults never publish the operator listener; display ingress has a disjoint route table and cannot resolve operator behavior` |
| B06 | Build the shared contract-test kit | complete | A08, B02, B03 | orchestrator:/root | codex/b06-contract-test-kit | `commit:b52df4e`, `remote:b52df4e0de482a1d30c06b651059a0a98daaa0cd`, `commit:600f77b`, `remote:600f77bf92dcb49f4afd99d7d8a7fae6e1d71b5d`, `npm run check (documentation, fixtures, operations verification, formatting, types, client, tests, build, smoke, and rehearsals)`, `conformance acceptance: generic redacted runner plus configuration-state and protected display-access suites accept in-memory adapters and reject deliberately aliasing adapters` |
| B07 | Produce an installable Core artifact | ready | B04, B05, B06 | — | — | — |

## Phase C — Goal 1 Core operator panel, then connected capabilities

| Task | Outcome | Dispatch state | Dependencies | Owner | Branch | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| C01 | Implement versioned configuration services | complete | A05, A08 | orchestrator:/root | codex/config-panel-c01-configuration-services | `src/application/configuration/versioned-configuration-service.ts`, `src/ports/configuration-state.ts`, `src/infrastructure/memory/configuration-state.ts`, `test/application/configuration/versioned-configuration-service.test.ts`, `test/architecture/c01-configuration-boundaries.test.ts` |
| C02 | Implement the unauthenticated Core operator shell | complete | A02, A03, A07, C01 | orchestrator:/root | codex/config-panel-c02-operator-shell | `docs/core-operator-shell.md`, `src/application/operator-panel/core-operator-shell-service.ts`, `src/infrastructure/operator-http/server.ts`, `src/presentation/core-operator-shell.ts`, `test/infrastructure/operator-http/server.test.ts`, `test/presentation/core-operator-shell-browser.test.ts`, `test/architecture/c02-operator-boundaries.test.ts` |
| C03 | Implement rooms, screens, and class codes | complete | C01, C02 | orchestrator:/root | codex/config-panel-c03-room-screen-class-code | `commit:70e4dc1`, `npm run check (1003/1003 tests, build, smoke, and rehearsals)`, `C03 no-JavaScript/reflow browser contract` |
| C04 | Implement the source registry and forms | complete | A06, C01, C02 | orchestrator:/root | codex/config-panel-c04-source-registry-forms | `commit:564fc7060dab7ff827016a71c0fa2fbd38207b3d`, `npm run check (1007/1007 tests, build, smoke, and rehearsals)` |
| C05 | Implement bounded uploads and imports | ready | A02, A06, C04 | — | — | — |
| C06 | Implement shared-resource acquisition | ready | A02, A06, C04 | — | — | — |
| C07 | Implement direct Google enrollment for Core | ready | A02, A06, B05, C04 | — | — | — |
| C08 | Implement connected Google sources and mappings | waiting | B06, C04, C07 | — | — | — |
| C09 | Implement planned-display projection | complete | A08, C01, C03, C04 | orchestrator:/root | codex/config-panel-c09-planned-display | `commit:609abd5`, `commit:bbd6392a077d0a9bc4d231a58b261b05da05ec6d`, `npm run check (1009/1009 tests, build, smoke, and rehearsals)` |
| C10 | Qualify the first Core operator-panel goal | complete | A07, A08, C01, C02, C03, C04, C09 | orchestrator:/root | codex/config-panel-c10-non-creator-acceptance | `commit:8060793`, `commit:b3edda8`, `npm run check (1011/1011 tests, build, smoke, and rehearsals)` |
| C11 | Implement the contact sheet and carousel | complete | A07, C09 | orchestrator:/root | codex/config-panel-c11-contact-sheet-carousel | `commit:cebcc13`, `remote:cebcc13c28d2b7d6b4ec76af2a07498d1a914dcb`, `npm run check (documentation, fixtures, operational verification, formatting, types, client, tests, build, smoke, and rehearsals)`, `browser acceptance: ordinary POST selection, no-JavaScript reflow, keyboard carousel/dialog controls, reduced motion, and console/page-error checks` |
| C12 | Implement presentation profiles | complete | A07, C01, C09 | orchestrator:/root | codex/config-panel-c12-presentation-profiles | `commit:4bb2154`, `remote:4bb215443df1ee9f3e67b2d843fc2f600735f79d`, `C12 increment: npm run docs:check, npm run typecheck, Prettier scoped check, and 2 focused profile-service tests`, `commit:ba889f6`, `remote:ba889f6ef03693e286a5ad00636a11f34159ff49`, `npm run check (documentation, fixtures, operations verification, formatting, types, client, tests, build, smoke, and rehearsals)`, `browser acceptance: ordinary save/reset forms, 683x384 reflow, Vietnamese reviewed-catalog preview, reduced-motion override, and console/page-error checks` |
| C13 | Complete Core diagnostics and distribution | waiting | B07, C03, C04, C05, C06, C07, C08, C09, C10, C11, C12 | — | — | — |

## Phase D — commercial architecture and hosted account application

| Task | Outcome | Dispatch state | Dependencies | Owner | Branch | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| D00 | Select the commercial application architecture | complete | C10 | orchestrator:/root | codex/core-operator-first-plan | [docs/decisions/0027-django-hosted-core-service-boundary.md](../docs/decisions/0027-django-hosted-core-service-boundary.md), `user decision: Django plus private versioned Core service/worker boundary (2026-09-01)` |
| D01 | Create the hosted repository and bind the selected Core boundary | complete | D00 | orchestrator:/root | codex/d01-hosted-repository-boundary | `repository:https://github.com/w9smz8qkh6-stack/chalkwright-hosted`, `commit:09c018e`, `pip install + synthetic Core-service boundary tests` |
| D02 | Select the hosted authentication implementation | complete | A02, D00, D01 | orchestrator:/root | codex/d02-hosted-auth-selection | `docs/decisions/0001-django-authentication.md (hosted D02 worktree)`, `commit:3a15bf8`, `pip install + unittest authentication-selection verification` |
| D03 | Implement account registration and security | complete | D02 | orchestrator:/root | codex/d03-hosted-account-security | `commit:ca6b9c8`, `pip install + Django checks, migration check, 3 boundary tests, and 7 account-security tests` |
| D04 | Implement Google and Microsoft sign-in | in_progress | D03 | orchestrator:/root | codex/d04-hosted-provider-sign-in | `commit:b1a790f`, `pip install + Django checks, migration check, 3 boundary tests, and 9 account/provider tests` |
| D05 | Implement organizations and roles | complete | A04, D03 | orchestrator:/root | codex/d05-hosted-organizations | `commit:5d19658`, `pip install + Django checks, migration check, 3 boundary tests, 7 account-security tests, and 5 organization-role transition tests` |
| D06 | Implement hosted persistence and authorization | complete | A05, D00, D05 | orchestrator:/root | codex/d06-hosted-persistence-authorization | `commit:1ee1e4b`, `commit:d74518d`, `pip install + Django checks, migration check, 3 boundary tests, 12 account/organization tests, and 4 tenant-scope/adapter tests` |
| D07 | Implement the hosted account and control UI | in_progress | C10, D00, D05, D06 | orchestrator:/root | codex/d07-hosted-control-ui | `commit:45fae29`, `commit:5456886`, `commit:0b3ca66`, `remote:0b3ca661b89eb6b5d4f03cc4dd3e5c0603948720`, `commit:e912686`, `remote:e91268687b2c22f8619a34b4175ee71836fb0d6d`, `commit:659bd84`, `remote:659bd848863ec54d270cca97124f3a15c7d48576`, `commit:242fcde`, `remote:242fcde4c21c72bfc22021b1bbc986cbd58daa01`, `Django system check, migration check, and 27-test suite` |
| D08 | Implement hosted Google data connections | waiting | C07, C08, D06 | — | — | — |
| D09 | Implement hosted non-connected sources | waiting | C04, C05, C06, D06, D07 | — | — | — |
| D10 | Implement hosted screens and viewers | waiting | C03, C09, D06, D07 | — | — | — |
| D11 | Select and implement billing | waiting | D05, D10 | — | — | — |
| D12 | Implement lifecycle, support, and compatibility gates | waiting | D06, D07, D08, D09, D10, D11 | — | — | — |

## Phase E — student experience and later providers

| Task | Outcome | Dispatch state | Dependencies | Owner | Branch | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| E01 | Enforce the student-safe projection | waiting | A02, C09, D10 | — | — | — |
| E02 | Implement per-viewer language preferences | waiting | C12, D10, E01 | — | — | — |
| E03 | Qualify Microsoft data connectors | waiting | A06, D04, D08 | — | — | — |
| E04 | Automate Core-to-hosted upgrades | waiting | D00, D12, B07 | — | — | — |

## Phase F — bounded paid-pilot readiness

| Task | Outcome | Dispatch state | Dependencies | Owner | Branch | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F01 | Complete privacy and provider-policy readiness | waiting | A02, D08, D09, D10, D11, D12, E01 | — | — | — |
| F02 | Build isolated pilot infrastructure as code | waiting | A02, D12 | — | — | — |
| F03 | Prove observability, backup, and restore | waiting | D12, F02 | — | — | — |
| F04 | Run security, abuse, and capacity qualification | waiting | E01, E02, F01, F02, F03 | — | — | — |
| F05 | Prepare pilot operations and support | waiting | F03, F04 | — | — | — |
| F06 | Conduct an explicitly authorized pilot deployment | waiting | F01, F02, F03, F04, F05 | — | — | — |
