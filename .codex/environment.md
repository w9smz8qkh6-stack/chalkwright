# Chalkwright working environment

Last curated review: 2026-08-30

This is the durable, human-reviewed environment contract for Chalkwright. It
contains stable topology and operating boundaries, not credentials or a
historical activity log.

<!-- BEGIN GENERATED PROJECT ENVIRONMENT -->
## Generated project facts

This section is generated deterministically from `package.json` and
`package-lock.json`. Do not edit it by hand. Run `npm run environment:sync`
after an intentional manifest or lockfile change; `npm run environment:check`
fails when it is stale.

- Package: `chalkwright` `0.1.0` (private)
- Package manager: `npm@11.12.1`
- Required Node.js: `>=24.15.0`
- Required npm: `>=10`
- npm lockfile format: `3`

### Direct production dependencies

| Package | Declared | Locked |
| --- | --- | --- |
| `@googleapis/calendar` | `16.0.0` | `16.0.0` |
| `@googleapis/classroom` | `14.0.0` | `14.0.0` |
| `@googleapis/drive` | `21.0.0` | `21.0.0` |
| `playwright-core` | `1.62.0` | `1.62.0` |
| `tldts` | `7.4.9` | `7.4.9` |

### Direct development dependencies

| Package | Declared | Locked |
| --- | --- | --- |
| `@types/node` | `^24.0.0` | `24.13.3` |
| `prettier` | `^3.6.2` | `3.9.6` |
| `typescript` | `^5.8.3` | `5.9.3` |

### Primary commands

- `npm run check`: `npm run docs:check && npm run fixtures:check && npm run ops:verify && npm run architecture:check && npm run format:check && npm run typecheck && npm run client:check && npm test && npm run build && npm run smoke && node dist/entrypoints/rehearsal.js && node dist/entrypoints/m16-rehearsal.js`
- `npm run check:portable`: `npm run docs:check:portable && npm run fixtures:check && npm run ops:verify && npm run architecture:check && npm run format:check && npm run typecheck && npm run client:check && npm test && npm run build && npm run smoke && node dist/entrypoints/rehearsal.js && node dist/entrypoints/m16-rehearsal.js`
- `npm run docs:check`: `npm run environment:check --silent && node scripts/update-tooling-index.mjs --check && node scripts/check-local-doc-links.mjs && node scripts/check-changelog.mjs`
- `npm run docs:sync`: `node scripts/update-tooling-index.mjs --write && npm run environment:sync --silent`
- `npm run build`: `tsc -p tsconfig.build.json && npm run client:build`
- `npm run start`: `node dist/index.js`
<!-- END GENERATED PROJECT ENVIRONMENT -->

## How this file works

This tracked file deliberately has two kinds of content. The generated project
facts above come from the repository's `package.json` and `package-lock.json`;
the remaining sections are human-reviewed operating context. The manifests and
lockfile are authoritative if this summary ever disagrees with them.
The exhaustive runtime-variable and protected-reference contract remains in
`docs/configuration.md`; this file intentionally keeps only the stable topology
and operating boundaries needed for project orientation.

Two machine-level references live outside every repository.
`/home/bren/.codex/ENVIRONMENT.md` records the Codex execution boundary,
selected non-secret Codex settings, and available toolchain;
`/home/bren/.codex/HOST.md` records the underlying OS, kernel, hardware, and
virtualization. Read the relevant file for current capabilities and do not copy
its current values into this repository.

The project generator updates the marked section above, the generated inventory
in `docs/README.md`, the readable semantic state in `docs/project-state.md`, and
a Git-ignored current-context summary. Repository hooks refresh them on
startup, resume, clear, compaction, and before every user prompt. The hook
injects the current phase, capability maturity, active workstreams, limits, and
knowledge-review verdict directly into Codex context. A user-level systemd path
unit reacts to common project changes, and a five-minute timer is the
recursive-change and missed-event backstop. The normal documentation check
fails if a tracked generated view, implementation fingerprint, periodic review,
evidence link, or workstream classification is stale, so CI and `npm run check`
detect missed updates.

To refresh manually:

```sh
npm run docs:sync
```

The host-level files share a path watcher, daily timer, and global Codex
`SessionStart` hook. Project hooks require repository trust. Generated facts,
inventories, and semantic views update automatically from their sources, but
prose always requires semantic review. The reviewed implementation fingerprint
and review-age limit prevent automatic generation from silently labeling stale
meaning as current; automatic writes remain reviewable Git changes and never
commit themselves.

See `docs/documentation-system.md` for the exact automation, accuracy limits,
verification commands, and recovery procedure.

## Source topology

- Canonical Codex/application integration checkout:
  `/home/bren/src/chalkwright-m17-canary`. Read-only work and the task that
  owns the active workstream may use it; distinct or concurrent write outcomes
  use isolated `codex/<task>` worktrees.
- Canonical Git remote:
  `https://github.com/w9smz8qkh6-stack/chalkwright.git`
- Protected release branch: `main`
- Additional checkout `/home/bren/src/chalkwright` may be used as a clean
  mirror, but it is not the current Codex working copy. Never assume changes in
  one checkout exist in the other.
- Historical `/home/bren/src/classroom-hub` is not a current Chalkwright source
  or service target.
- Immutable application releases live below `/opt/chalkwright/releases`; the
  `/opt/chalkwright/current` selection is deployed output, never source.

## Application runtime

- Linux host: `len`
- Runtime: host-native Node.js/TypeScript managed by systemd
- Local application listener: `127.0.0.1:4317`
- Health/readiness routes exist, but production may conceal or authenticate
  them. An unauthenticated HTTP probe is diagnostic only; use the controlled
  deployment checks for an authoritative verdict.
- Production service: `chalkwright.service`
- Deployment poller: `chalkwright-deploy.timer`
- Boot coordinator: `chalkwright-production-start.service`
- School-day timezone: `Asia/Ho_Chi_Minh`
- Host/system service timezone: UTC

The permanent deployment controller follows protected `origin/main`, builds an
immutable release, verifies it, switches the current release, and rolls back a
failed local readiness check. Therefore merging `main` is a live production
effect even when the source change appears documentation-only.

PowerSchool and Google Classroom are read-only. Calendar is a separately
guarded output limited to verified Chalkwright-owned events. Provider repair,
Calendar reconciliation, systemd changes, and routing changes are never routine
development steps.

## Capacity and generated media

The root filesystem carries application state, Docker data, dependencies,
browser artifacts, and media renders. Before dependency installation,
container builds, screenshots, or video/audio rendering, inspect current disk
space directly. If free space is below 10 GiB, stop and report the condition;
do not choose cleanup targets without explicit approval.

Repository demo captures and final video inputs must be synthetic or explicitly
approved, privacy-safe real media. Keep intermediate renders in designated
ignored or Codex visualization directories. Commit only intentional,
reviewed source assets and reproducibility metadata.
