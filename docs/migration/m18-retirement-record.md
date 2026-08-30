# M-18 legacy-retirement record

## Status

**Approved; execution is fail-closed at the final production-readiness gate.**

On 2026-08-30, Bren approved the end of stabilization and the bounded
retirement actions recorded in the retirement decision log. This record
distinguishes approval from completed live effects.

## Approved boundary

The retirement covers exactly two historical layers:

1. the original OpenClaw-hosted Classroom Screen source repository, standalone
   user service, and dedicated Tailnet `/classroom-screen` handler; and
2. the migration-era Classroom Hub shadow service and its elapsed refresh
   timer.

It does not delete either local repository, runtime state, SQLite data, backups,
unit definitions, route snapshots, or rollback instructions. It does not remove
or restart unrelated OpenClaw services, change provider authority, broaden
Calendar ownership, or delete provider events.

## Preserved source history

The private `classroom-screen` repository passed its complete 100-test gate.
Commit `9e5c5b7` preserves the final uncommitted recovery and display-stability
work, and commit `b157c0b` marks the project retired in favor of Chalkwright.
Both commits were pushed to its `main` branch before archival.

The isolated Chalkwright retirement branch passed the complete repository gate:
891 tests, strict types, formatting, documentation and fixture checks,
production build/startup smoke, the six-job offline rehearsal, and the M-16
cutover/rollback rehearsal with zero external mutations.

## Live gate evidence

At the first approved execution attempt:

- `chalkwright.service` was active on its production loopback listener;
- the most recent plan, Classroom, glossary, Calendar, integrity, backup, and
  deployment unit results were successful;
- the original Classroom Screen and migration shadow remained active and
  unchanged;
- the dedicated legacy Tailnet handler still targeted the original standalone
  listener; and
- Chalkwright health was reachable but degraded and readiness returned `503`
  because the current Sunday plan was absent.

The constrained `start-all` recovery command then failed closed with
`production-activate-server-unready` before starting its refresh/reconciliation
sequence or changing the route. No retirement action followed. The next natural
Sunday plan-refresh timer remains the required observation before execution can
resume.

## Execution checklist

- [x] Preserve and verify the final original-source changes.
- [x] Push the original repository's final source and retirement record.
- [x] Record explicit retirement approvals in Chalkwright.
- [ ] Observe a successful natural Sunday plan refresh and ready production
      display.
- [ ] Complete the constrained recovery/restart gate.
- [ ] Snapshot and remove the dedicated original Classroom Screen route.
- [ ] Stop and disable `classroom-screen.service`.
- [ ] Stop and disable the migration shadow service and refresh timer.
- [ ] Verify the Chalkwright route, health, readiness, timers, and single-writer
      posture after retirement.
- [ ] Archive the private `classroom-screen` GitHub repository.
- [ ] Refresh host topology and the final operational documentation.

## Recovery posture

Until every unchecked item is completed, the active fallback remains available.
After completion, recovery requires explicit approval to restore only the
retained route snapshot and named legacy service. Chalkwright remains the
canonical source, and the legacy path must be disabled again after the bounded
incident window.
