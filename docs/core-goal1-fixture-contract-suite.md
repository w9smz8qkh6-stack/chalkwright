# Core Goal 1 fixture contract suite

Status: A08 complete. This is the versioned, executable acceptance spine for
the first non-creator Core operator-panel goal. It deliberately models one
self-hosted installation and no commercial account application.

The public contract and runner are version `1.0.0` in
[`core-goal1-contract-suite.ts`](../src/contracts/v1/core-goal1-contract-suite.ts).
The privacy-safe catalog is
[`core-goal1.ts`](../test/fixtures/core-goal1.ts), and focused executable
evidence is in
[`core-goal1-contract-suite.test.ts`](../test/contracts/v1/core-goal1-contract-suite.test.ts).

## Catalog boundary

The catalog fixes one coherent school day for one synthetic self-hosted
installation:

- two rooms, two screens, active and revoked reference-only class-code states,
  and two courses;
- one application-managed manual schedule with two meetings;
- two vocabulary records with synthetic pronunciation and Spanish/Vietnamese
  translations;
- two bounded PNG metadata records and four ordered planned-display frames;
- fresh, first-active, second-active, and rolled-back configuration snapshots;
- a ready, mutation-free preview of the second revision;
- a canonical portable export of the rolled-back active revision, with no
  verifier, protected reference, connected-account reference, or plaintext
  class code; and
- an exact-workspace protected-backup manifest for recovery preflight.

Identifiers use the stable `synthetic` marker and the school date is fixed at
`2035-03-18`. No current classroom, operator, student, account, provider, or
customer data is represented.

## Executable acceptance map

Each scenario has a stable ID, operation key, normalized input, exact canonical
JSON result, and one or more downstream acceptance tasks. The runner gives a
future implementation a cloned scenario and cloned catalog, compares its
normalized observation exactly, applies the privacy rules, and returns only
finite diagnostics. It never copies an observed payload or thrown error into
the report.

| Required task | Versioned expected results                                                                                                                                                                                                                                  |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C01           | Save a new draft with exact versions; create a ready preview without changing effective state; activate the first revision; roll back from the second revision to the first; produce a redacted portable export; accept exact-workspace recovery preflight. |
| C02           | Render the Core operator shell under private-reachability authority without an account or JavaScript requirement.                                                                                                                                           |
| C03           | Project the two rooms, two screens, and active/revoked class-code lifecycle without exposing plaintext codes.                                                                                                                                               |
| C04           | Project manual course, schedule, vocabulary, and media sources entirely through the application-managed mode without provider enrollment.                                                                                                                   |
| C09           | Project four ordered frames for an exact date/screen against an immutable revision basis without mutation.                                                                                                                                                  |
| C10           | Qualify the complete self-hosted Goal 1 path with no connected-provider, commercial-framework, or live-effect dependency.                                                                                                                                   |

`runCoreGoal1ContractSuite` is intentionally a normalization boundary rather
than a service implementation. C01-C04 and C09 can wrap their real use cases in
small test adapters and return the specified result summaries. C10 must run the
same catalog through the integrated non-creator Core panel. B06 may later
package this already-established interface as a broader shared contract-test
kit; A08 does not perform that package work.

## Privacy and scope rules

`isCoreGoal1FixtureCatalog` fails closed unless all of these invariants hold:

- the sole workspace is a self-hosted installation and every state, preview,
  export, backup, class-code state, room, screen, course, and frame stays in its
  exact scope;
- every source in every configuration lifecycle snapshot and the portable
  export is `application-managed`;
- the complete catalog contains no email address, non-reserved URL host, raw
  class code, token, password, cookie, session, account, organization, billing,
  or OAuth field;
- portable configuration additionally contains no class-code verifier or
  connected-account reference;
- identifiers, relationships, lifecycle snapshots, media metadata, schedules,
  planned frames, scenario IDs, task coverage, and JSON shapes validate; and
- every C01-C04, C09, and C10 task has at least one executable expected result.

The active class-code fixture contains only the A05 opaque protected reference;
the portable export excludes even that reference. The recovery manifest names
only an opaque artifact reference and checksum. Contract-suite failures retain
scenario IDs and finite diagnostic codes, not fixture or implementation
payloads.

## Explicit deferrals

A08 adds no route, listener, form, UI, parser, fetcher, database adapter,
schema migration, provider client, provider enrollment, service, deployment,
or live effect. It does not define or fixture hosted organizations, accounts,
sessions, roles, OAuth state, billing, cross-tenant behavior, commercial
framework selection, package hardening, or a hosted/Core integration boundary.

The next Goal 1 task is C01. C01 must consume these lifecycle expectations;
C02-C04 and C09 then consume their own mapped scenarios in order. C10 is the
non-creator Core operator-panel acceptance gate. Phase B Core hardening and D00
commercial architecture selection remain gated until C10 is accepted.
