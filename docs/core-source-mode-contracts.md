# Core source-mode contracts

Status: A06 complete. The adapter-neutral v1 source contract is split by
responsibility:

- [`source-catalog.ts`](../src/contracts/v1/source-catalog.ts) fixes the source
  streams, four modes, release disposition, allowed logical formats, and
  concrete per-item and transaction budgets;
- [`source-acquisition.ts`](../src/contracts/v1/source-acquisition.ts) defines
  exact source definitions, upload inspection/admission, shared-resource fetch
  evidence, connected grant/consent state, and bounded read requests; and
- [`source-observation.ts`](../src/contracts/v1/source-observation.ts) defines
  verified observations, committed normalized projections, explicit freshness,
  finite diagnostics, and executable last-known-good transitions.

A06 does not parse or fetch a source, persist bytes or projections, implement
OAuth, resolve protected references, change SQLite, add a provider adapter, or
expose an operator route or UI. Those effects remain assigned to later tasks.

## Source-mode release matrix

`first` means required for the first Core operator MVP, `later` means the mode
has a deliberate future lane but no first-release implementation obligation,
and `N/A` means it is not a meaningful source mode for the stream. Every stream
has at least one first-release lane that does not require a connected account.

| Stream                                      | Application-managed | Uploaded snapshot | Shared resource | Connected account |
| ------------------------------------------- | ------------------- | ----------------- | --------------- | ----------------- |
| Identity and presentation                   | first               | later             | N/A             | later             |
| Course catalog and mapping                  | first               | first             | first           | later             |
| Schedule and bells                          | first               | first             | first           | later             |
| Calendar exceptions                         | first               | first             | first           | later             |
| Assignments and links                       | first               | first             | first           | later             |
| Objectives and lessons                      | first               | first             | first           | later             |
| Vocabulary, translations, and pronunciation | first               | first             | first           | later             |
| Branding and display media                  | first               | first             | later           | later             |
| Attendance destination                      | first               | N/A               | N/A             | later             |
| Presentation controls                       | first               | N/A               | N/A             | N/A               |

Google Classroom is the one recorded provider-necessity exception for automatic
course discovery and automatic coursework refresh: it has no publish/share-URL
equivalent. That exception authorizes only a selected read-only coursework
connection. Application-managed courses and uploaded/shared assignment feeds
remain display-equivalent first-release alternatives, with teacher-owned
freshness.

## Closed logical formats and budgets

The catalog is an allowlist, not a promise that arbitrary office or markup
formats will be inferred. Bytes and declared media types are never sufficient:
the actual decoded content and the stream/mode allowlist must also match.

| Logical format                                        | Intended lane                  | Maximum input | Structural/processing budget                      | Required derived artifact  |
| ----------------------------------------------------- | ------------------------------ | ------------: | ------------------------------------------------- | -------------------------- |
| `canonical-records-v1`                                | application-managed            |       256 KiB | 2,000 records; 64 fields/record; 4 KiB/field; 2 s | none                       |
| `utf8-csv-v1`                                         | upload/shared                  |         1 MiB | 5,000 records; 64 fields/record; 4 KiB/field; 3 s | none                       |
| `utf8-icalendar-v1`                                   | upload/shared                  |       512 KiB | 2,000 records; 64 fields/record; 4 KiB/field; 3 s | none                       |
| `reviewed-https-reference-v1`                         | managed attendance destination |         2 KiB | 250 ms validation                                 | none                       |
| `raster-png-v1` / `raster-jpeg-v1` / `raster-webp-v1` | media upload                   |         8 MiB | 8192×8192; 40 MP; one frame; 5 s                  | distinct re-encoded object |
| `display-mp4-v1`                                      | media upload                   |        64 MiB | 3840×2160; 120 s; 60 fps; 10 s                    | distinct transcoded object |
| `provider-projection-v1`                              | connected provider             |         1 MiB | 5,000 records; 64 fields/record; 4 KiB/field; 3 s | none                       |

One configuration transaction admits at most 32 source definitions, 64 MiB of
total input, 10,000 total records, and 15 seconds of processing. Adapters may
choose lower operational limits but must not silently accept more than the
contract.

First-release uploaded data is UTF-8 CSV, iCalendar where the stream allows it,
or the listed raster/MP4 media. DOCX, XLSX, Markdown, HTML, archives, formulas,
active content, and external references are not accepted source formats. A
future format requires a contract version/review, explicit parser isolation and
budgets, fixtures, negative tests, and documentation before it becomes input.

## Definition and acquisition invariants

Every definition carries the complete A04 workspace, a nominal definition ID,
positive revision, stream, mode, allowed format, enabled state, and revision
time. Mode-specific data is narrowly typed:

| Mode                | Definition owns                                                                              | It never owns                                                                       |
| ------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Application-managed | Opaque reference to versioned canonical content                                              | A server path, provider object, or secret                                           |
| Uploaded snapshot   | Opaque storage-object and admission references                                               | Client path authority or uninspected bytes                                          |
| Shared resource     | Opaque locator reference, public/service-identity access class, and fixed refresh policy     | A credential in a URL or an ambient network capability                              |
| Connected account   | Nominal grant ID, selected resource reference, and exact read capability/consent requirement | Token values, account login authority, broad provider access, or mutation authority |

Exact workspace equality includes workspace kind and ID plus installation or
organization identity. Same-ID/different-installation,
same-ID/different-organization, and cross-kind inputs fail before an admission
or projection can replace state. Successful admission results are canonical
JSON clones, so mutating the caller-owned inspection or evidence afterward
cannot change accepted content or identity.

### Upload admission

An upload inspection must bind the exact workspace, source definition/revision,
stream, expected/detected format, server-owned opaque object reference, basename
only, declared and detected media types, digest, measured byte/time budgets,
active-content flags, and format-specific decoded metrics. Admission rejects:

- paths, drive-qualified names, NULs, archives, active content, formulas, and
  external references;
- mismatched declared/actual type or expected/actual logical format;
- invalid UTF-8, failed raster/video decode, record/field/byte/dimension/frame/
  duration/frame-rate/time excess; and
- raster or video input without a distinct normalized derived object.

The contract does not define archive extraction, symlink following, file path
resolution, or direct client-selected server storage.

### Shared-resource acquisition and SSRF boundary

The Core contract accepts sanitized fetch evidence, not a network client. Each
request is HTTPS, has no URL credentials or fragment, uses a hostname rather
than an IP literal, follows at most four redirects, finishes within ten seconds,
and has at most two retries, four fan-out targets, and two concurrent fetches
per workspace under the fixed policy.

Every redirect hop records bounded DNS answers at resolution, the answers held
through connection, and the actual peer. All must be ordinary public
destinations. A dependency-free CIDR policy conservatively denies every
coalesced prefix in the reviewed IANA special-purpose snapshot, IPv4
multicast/future-use space, IPv6 outside the current `2000::/3` global-unicast
envelope, special-purpose prefixes inside that envelope, and the returned
`3ffe::/16` 6bone block. This includes mixed public/private answers, loopback,
private, link-local, carrier-grade NAT, documentation (`192.0.2.0/24`,
`198.51.100.0/24`, `203.0.113.0/24`, `2001:db8::/32`, and `3fff::/20`),
benchmarking, multicast, unspecified, IPv4-mapped, `192.88.99.0/24`, and other
reserved/special destinations. Globally reachable special anycast entries are
also denied deliberately; a shared source has no reason to target
protocol-specific infrastructure.

The table was reviewed on 2026-08-31 against the official
[IANA IPv4 Special-Purpose Address Registry](https://www.iana.org/assignments/iana-ipv4-special-registry/)
(last updated 2025-10-09),
[IPv4 Address Space Registry](https://www.iana.org/assignments/ipv4-address-space/)
(2025-10-10),
[IANA IPv6 Special-Purpose Address Registry](https://www.iana.org/assignments/iana-ipv6-special-registry/)
(2025-10-09), and
[IPv6 Address Space Registry](https://www.iana.org/assignments/ipv6-address-space/)
(2025-10-23). It is a checked-in conservative snapshot, not a dynamically
complete claim about future registry changes. Re-review is required before
shared-resource implementation and whenever any source registry updates.

Changed DNS answers are rebinding, and a peer outside the held answer set is a
peer mismatch. Content type, logical format, byte, record, field, and processing
limits are checked before an observation can exist. UTF-8 and logical structure
must validate, and active content, formulas, and external references are denied.
Accepted evidence omits URLs and addresses from downstream state.

Adapters remain responsible for enforcing the same checks in the actual DNS,
redirect, socket, proxy, and egress path. A validator cannot make an
unconstrained HTTP client safe.

## Connected-account authority

The only v1 capabilities are `classroom-coursework-read`,
`calendar-events-read`, `drive-file-read`, and
`education-coursework-read`. There is no write, roster, grade, submission,
authentication, or general provider capability.

A consent transaction is one short-lived server record bound to the full
workspace, actor, session, provider, issuer, exact redirect, selected
capability/resource, state reference, protected S256 PKCE-verifier reference,
and nonce reference when issued. It has only `pending`, `consumed`, and
`expired` states; consumed/expired records require a chronology-valid closure
instant so one-use completion is explicit. The contract contains no verifier
bytes or OAuth tokens.

Provider grant state is finite: `pending`, `active`, `partial`, `expired`,
`reconnect-required`, or `revoked`. Only an active, exact-workspace grant at or
after `issuedAt` and strictly before `expiresAt`, containing the required
capability and selected resource, admits a connected read. A premature active
grant returns `grant-not-yet-valid`; partial consent, expiry, reconnect, and
revocation also fail with finite statuses. Protected grant material remains an
opaque reference resolved only by a shell-supplied protected-store capability.

Provider data authorization remains independent of self-hosted operator
reachability and hosted account login. It cannot authorize a source mutation,
Calendar write, Chalkwright login, roster, submission, or grade operation.

## Provenance, freshness, and last-known-good state

Definitions, observations, and committed projections have distinct nominal IDs
and static types. A verified observation carries only normalized provenance:
full workspace, source identity/revision, stream/mode/format, observed/imported/
fetched time, content and candidate-projection digests, and a fixed
`whole-input-and-projection` verification result. It contains no raw payload,
URL, path, provider object, token, or arbitrary diagnostic details.

Freshness is mode-specific:

| Mode                | Freshness basis    | Meaning                                                                                                                                            |
| ------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Application-managed | `managed-revision` | Current at the versioned managed observation time                                                                                                  |
| Uploaded snapshot   | `immutable-import` | Current for the immutable accepted import until explicitly replaced                                                                                |
| Shared/connected    | `bounded-refresh`  | `current` before the next due time, `degraded` after a failed attempt while retained data is inside its expiry window, and `stale` at/after expiry |

The executable transition has four outcomes:

1. A complete verified observation atomically becomes the committed projection.
2. A failed refresh with a prior matching projection retains the exact
   projection/observation IDs and digests, records only a finite diagnostic, and
   moves bounded freshness to `degraded` or `stale`.
3. A failed refresh without prior state reports `unavailable`; it cannot
   fabricate a projection.
4. Invalid, cross-workspace, out-of-order, or definition-mismatched input is
   rejected while returning a detached copy of any prior state.

Attempt chronology is strictly increasing once prior state exists. Both an
older attempt and an equal-timestamp replay return `out-of-order-attempt` and
the detached prior projection; neither success nor failure receives a
last-write-wins exception. Structurally accepted committed state must bind
acquisition at/before commit, the verified commit to its attempt, every later
attempt at/after commit, mode-specific provenance to its exact freshness time,
and bounded freshness to the exact last-attempt time. The transition can
therefore trust prior chronology without accepting an internally contradictory
snapshot.

There is no partial commit and no unverified fallback. Display and viewer
consumers receive only a committed normalized projection, never acquisition
authority or source diagnostics containing customer input.

## Responsibility split and deferred boundaries

| Responsibility     | Shared Core contract                                                   | Self-hosted shell/adapter                                            | Hosted shell/adapter                                                |
| ------------------ | ---------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Source policy      | Streams, modes, formats, limits, finite outcomes, provenance/freshness | Compose one installation workspace                                   | Derive organization workspace from authenticated server session     |
| Bytes and network  | Validate supplied inspection/evidence and projection transition        | Owner-only files, bounded local workers, exact egress implementation | Tenant-keyed object storage/jobs, bounded egress workers and quotas |
| Protected material | Opaque exact references only; no resolver/list API                     | Installation-owned protected store                                   | Organization-scoped encrypted store                                 |
| Provider flow      | Consent/grant/capability/read contracts                                | Future direct provider client after authorization                    | Future direct provider client after authorization                   |
| State              | Commit-only-verified and last-known-good semantics                     | Future SQLite adapter transaction                                    | Future tenant-scoped persistence transaction                        |

The following remain deliberately deferred or excluded: roster acquisition or
import; attendance administration; hosted reuse of customer PowerSchool browser
profiles/credentials; automatic translation-provider calls; and any hosted
Calendar write or mutation port. Existing self-hosted owned-Calendar behavior
is not modeled as a source and receives no new authority from A06.

## Fixtures, evidence, and next boundary

[`test/fixtures/source-contracts.ts`](../test/fixtures/source-contracts.ts)
provides privacy-safe self-hosted and hosted definitions for all four modes,
text/media inspections, shared fetch evidence, active/partial grants, a bounded
consent transaction, and verified observation/refresh cases. Focused tests
cover catalog completeness, allowlists/budgets, actual-content admission,
path/active/archive denial, media normalization, SSRF and rebinding negatives,
full-workspace collisions, consent/grant failure states, read-only scope,
commit-only-verified transitions, degraded/stale last-known-good retention,
serialization, nominal separation, and post-validation mutation detachment.

A07 is next and specifies operator-panel information architecture using these
contracts without inventing authentication inside Core. A08 later establishes
the cross-feature shared fixture-suite interface. C04-C08/D08-D09 implement
forms, adapters, storage, acquisition, enrollment, and refresh only after their
dependencies and authorization gates. B03 later threads A04-A06 scope/state
through current use cases. Phase B remains blocked until A07 and A08 complete.
