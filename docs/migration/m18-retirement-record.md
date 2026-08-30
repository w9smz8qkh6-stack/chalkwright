# M-18 legacy-retirement record

## Status

**Completed 2026-08-30; retained artifacts provide cold recovery only.**

On 2026-08-30, Bren approved the end of stabilization and the bounded
retirement actions recorded in the retirement decision log. Every named live
effect below was then completed and independently checked.

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

The private repository was archived after those commits were verified on its
`main` branch. The local source and recovery artifacts were not deleted.

## Live gate evidence

The first approved execution attempt failed closed because the current Sunday
plan was absent. No route or legacy-service change occurred during that
attempt. The completed sequence then established:

- the operator-present PowerSchool repair and plan refresh succeeded, storing
  the next verified class day;
- the deployed bounded-lookahead correction served that stored plan as a
  Sunday morning overview, with direct health and readiness both returning
  `200`;
- the exact private `/classroom-screen` handler was snapshotted and moved from
  the historical listener to the mounted Chalkwright target; the routed page
  and all ten local display assets returned `200`;
- `classroom-screen.service`, `classroom-hub-shadow.service`, and
  `classroom-hub-shadow-refresh.timer` are inactive and disabled, and the
  shadow refresh service is inactive;
- only Chalkwright's production listener remains open among the three
  application, shadow, and legacy loopback ports; and
- the Chalkwright service and all seven permanent timers are active, with host
  topology refreshed after the retirement.

## Execution checklist

- [x] Preserve and verify the final original-source changes.
- [x] Push the original repository's final source and retirement record.
- [x] Record explicit retirement approvals in Chalkwright.
- [x] Complete a successful Sunday plan refresh and ready production display.
- [x] Complete the protected deployment and direct-readiness gate.
- [x] Snapshot and replace the dedicated original Classroom Screen route.
- [x] Stop and disable `classroom-screen.service`.
- [x] Stop and disable the migration shadow service and refresh timer.
- [x] Verify the Chalkwright route, health, readiness, timers, and single-writer
      posture after retirement.
- [x] Archive the private `classroom-screen` GitHub repository.
- [x] Refresh host topology and the final operational documentation.

## Recovery posture

The legacy app and migration shadow are no longer active fallbacks. Recovery
requires explicit approval to restore only the retained route snapshot and
named legacy service or timer from the preserved local source, state, backups,
and unit definitions. Chalkwright remains canonical, and any bounded recovery
window must end by restoring the retired services to inactive and disabled.
