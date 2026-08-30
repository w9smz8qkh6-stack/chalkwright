# Documentation maintenance system

Chalkwright treats documentation as part of every implementation change. Codex
is the default documentation maintainer: it must update the relevant durable
reference and the Unreleased changelog in the same working tree as source,
test, script, configuration, dependency, deployment, operational, or
user-visible changes. A task is incomplete until that semantic review and
update are finished.

Facts and indexes that can be derived safely are automated. Explanatory prose
is maintained by the model because generation can prove that a dependency
version, command, or file list matches its source, but it cannot determine the
meaning of a behavioral change. The model must compare prose with the final
implementation; it may not use a passing generator or link check as a reason
to skip that work.

## Sources of truth

1. `AGENTS.md` is Codex's mandatory repository contract and routes work to the
   appropriate documents.
2. `.codex/environment.md` combines a generated project manifest summary with
   curated topology and safety boundaries.
3. `/home/bren/.codex/ENVIRONMENT.md` is the generated, redacted Codex execution
   reference; `/home/bren/.codex/HOST.md` is its underlying machine companion.
4. `docs/README.md` contains both curated routing and an exhaustive generated
   Markdown inventory.
5. `docs/project-knowledge.json` is the structured semantic source for the
   current phase, milestone, deployment claim, capabilities, limits,
   workstreams, and next decisions. `docs/project-state.md` is its generated,
   readable view and is the first project-status document Codex should read.
6. `docs/decisions/` preserves consequential architectural choices; accepted
   decisions are superseded, not rewritten.
7. `CHANGELOG.md` records consequential unreleased behavior and operational
   effects.

The manifest, lockfile, implementation, and live host remain authoritative over
a generated summary if an interrupted refresh ever leaves a mismatch.

## Automatic refresh

The repository-scoped Codex hooks run the context generator:

- at startup, resume, clear, and post-compaction continuation, injecting the
  complete semantic digest; and
- before every user prompt, injecting only a compact freshness,
  documentation-gate, and worktree-isolation signal.

The hook updates generated sections atomically. The session-boundary digest
includes the phase,
milestone, documented deployment basis, capability maturity groups, current
priorities and limits, active workstreams, their working-tree change counts,
and an explicit current-or-review-required verdict. The per-prompt signal avoids
repeating that stable body while keeping volatile state current throughout a
long task. Project hooks require repository trust and changed definitions must
be reviewed again.

The global host hook shows the user-facing Session Ready report only for a new
or cleared session. Resume and post-compaction events still refresh the private
host references, but restore only concise runtime context without repeating the
readiness presentation.

The canonical checkout is the integration workspace. Distinct or concurrent
write outcomes use isolated `codex/<task>` worktrees; the Git-root-resolved
project hooks follow the active worktree, while the user-level watcher remains
the eventual-consistency backstop for the canonical checkout.

On the canonical Linux host, the user-level
`chalkwright-documentation-sync.path` unit reacts to common repository input
changes. The companion timer runs every five minutes as a recursive-change and
missed-event backstop. Both call the same network-free generator. Install or
repair them with:

```sh
npm run environment:install-automation
```

The generated `.codex/project-context.generated.md` is Git-ignored because it
describes current branch and working-tree state. `docs/project-state.md`, the
environment facts, and the documentation inventory are tracked generated
views. The tracked project-state view deliberately excludes dirty-worktree
counts so a clean commit cannot invalidate itself; those volatile counts remain
available in hook context and gate output. Generated files remain reviewable
changes and are never committed automatically.

## Semantic state workflow

Every task that changes the repository must have an active entry in
`docs/project-knowledge.json`. Its scope patterns make the current working tree
classifiable without injecting potentially sensitive path names into the
prompt. The entry records the intended outcome, honest present state, affected
capabilities, evidence, and next steps. Capability entries connect a maturity
claim to representative implementation, tests, documentation, and an explicit
safety boundary.

The knowledge review also stores a SHA-256 fingerprint over every repository
implementation file under `src/`, `test/`, `scripts/`, and `systemd/`, plus the
package, TypeScript, and repository Codex configuration files. Any change to
that surface invalidates the review even after it is committed. After comparing
the final behavior and relevant documentation semantically, obtain the new
value with:

```sh
npm run knowledge:fingerprint
```

Record it in `docs/project-knowledge.json`, update the review date and statement
when appropriate, then run `npm run docs:sync`. The fingerprint is an
acknowledgement trigger, not evidence that the prose is correct. The review
also expires after seven days by default, forcing a periodic reread even when
implementation bytes do not change.

## Accuracy gates

`npm run docs:sync` refreshes the host-version tooling index, project facts,
complete documentation inventory, generated project-state view, and volatile
Codex context. `npm run docs:check` fails when a generated view or tooling index
is stale, a local Markdown link is broken, the changelog structure is invalid,
the semantic review fingerprint or review age is stale, evidence paths are
missing, a working-tree change is outside every active workstream, or
source/configuration changes lack both a durable documentation-reference change
and an Unreleased changelog change. `npm run
environment:verify-automation` additionally checks the canonical host's live
watcher, timer, and last refresh result.

The generated context detects documentation drift in the working tree, and the
normal documentation check turns missing coverage into a hard handoff failure.
For every change, Codex must compare the relevant runbook, ADR, contract,
public-interface comment, project/environment reference, and changelog with the
implementation. A clean signal is evidence that the required files changed,
not proof of semantic accuracy; that accuracy remains an explicit model
responsibility. Uncertainty must be reported as incomplete work rather than
converted into unsupported prose.

## Recovery

If hooks are disabled or the user manager is unavailable, run:

```sh
npm run docs:sync
npm run docs:check
```

If host facts are stale, run `codex-host-facts-sync --apply --check-urls`.
Neither recovery path reads credentials, protected provider state, classroom
records, or private configuration.
