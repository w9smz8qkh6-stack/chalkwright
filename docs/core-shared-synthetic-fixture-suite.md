# Core shared synthetic fixture suite

Status: A08 complete. The versioned catalog in
[`test/fixtures/shared-fixture-suite.ts`](../test/fixtures/shared-fixture-suite.ts)
and adapter-free runner in
[`shared-fixture-suite.ts`](../src/contracts/v1/shared-fixture-suite.ts) give
later Core and hosted work one deterministic conformance input without
introducing runtime routes, storage, providers, authentication, or mutations.

## Catalog and conformance boundary

Catalog version `1.0.0` consists entirely of fixed, JSON-safe synthetic data.
It uses reserved `.invalid` domains where a URL-shaped value is needed and has
no clock reads, random values, credentials, real people, private filesystem
paths, provider payloads, or runtime side effects. The catalog is byte-stable
under `JSON.stringify`; a committed SHA-256 digest detects byte drift, and the runner canonicalizes and clones each fixture before
passing it to a consumer.

`SharedFixtureSuiteConsumer` is deliberately the complete reusable seam:

```ts
evaluate(scenario: SharedFixtureScenario): SharedFixtureExpectation
```

The consumer receives only a detached scenario (`fixtureId`, family, workspace,
and input), never the catalog expectation. The suite alone compares the
returned disposition, no-effect declaration, reason code, and threat IDs with
that expectation. It imports neither an
adapter nor a route, persistence store, provider client, authentication
framework, account, or secret resolver. Invalid catalog shapes, thrown
consumers, malformed results, and non-identical expected results fail closed in
the report. B06 may add implementation-specific adapters around this seam; A08
does not.

## Versioned fixture coverage

Each family has one accepted and one denied case. The positive cases declare
`fixture-only-no-effect`; the negative cases declare `denied-no-effect`.

| Family                              | Accepted evidence                                                                                | Required denial coverage                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Installation                        | self-hosted installation and hosted organization identity                                        | hosted organization substituted into private-installation scope                            |
| Scope                               | A04 actor, capacity, room, screen, date, and resource in one workspace                           | independently wrong actor, workspace, room, screen, and resource                           |
| Configuration                       | A05 draft, validation, activation, last-known-good, export, backup, import, and restore sequence | independently conflict, foreign rollback, and cross-workspace export/import/backup/restore |
| Source                              | all four A06 modes plus verified preflight and fresh normalized projection                       | partial/cross-workspace grant, wrong provider grant, and stale/unverified replacement      |
| Course, schedule, vocabulary, media | synthetic course, schedule, vocabulary, and inspected media reference                            | unclassified vocabulary or private link                                                    |
| OAuth                               | fixed consent lifecycle and protected references only                                            | independently wrong, replayed, and expired transaction plus foreign grant workspace        |
| Preview                             | fixed before/after digest proves a preview is mutation-free                                      | independently wrong-scope, replayed, stale, and attempted-mutating preview                 |
| Cross-tenant                        | actor, room, screen, resource, grant, and preview share one workspace                            | bundled defense-in-depth case plus independently malformed scope and unsafe privacy field  |

The catalog explicitly references `NT-03`, `NT-04`, `NT-09`, `NT-10`,
`NT-11`, `NT-14`, and `NT-18`. It complements rather than replaces the focused
A04-A06 tests: those contracts still validate exact workspace identity,
optimistic lifecycle behavior, acquisition/freshness state, and protected
references in detail.

## Privacy release inventory

The catalog has no implicit projection. Every field released to a display or
student audience appears as a scalar `name`, `classification`, and `value` in
`projections`. Version 1.0.0 releases only these fields:

| Audience | Enumerated released fields                                                                           |
| -------- | ---------------------------------------------------------------------------------------------------- |
| Display  | `screen-label`, `active-revision-status`, `source-freshness`, `source-label`, `projection-freshness` |
| Student  | `course-label`, `schedule-label`, `vocabulary-term`, `media-alt-text`                                |

The versioned field registry is an exact allowlist: each listed field has one
audience and one classification. The validator rejects arbitrary names,
misclassification, registry omissions/duplicates, duplicate projection fields,
unknown keys, and nested values. It also rejects `raw-provider`, `account`,
`diagnostic`, `internal-plan`, `secret-like`, `private-link`, `restricted`, and
`unclassified` as classifications regardless of field name. Consequently a
later consumer cannot treat an unspecified field as safe merely because its
value is present in a synthetic fixture.

## Verification and non-effects

`test/contracts/v1/shared-fixture-suite.test.ts` proves the catalog is
versioned, digest-stable, JSON-safe, complete in both dispositions for each
family, threat-mapped, projection-complete, and fail-closed for malformed
objects, accessors, missing negative coverage, unsafe privacy fields, nested
raw values, and a deliberately nonconforming consumer. It proves a consumer
cannot inspect an `expected` property and that consumer mutation cannot alter
catalog input.

This is planning and conformance evidence only. It changes no production
route, listener, persistence schema or adapter, parser/fetcher, OAuth client,
provider enrollment, account flow, live UI, deployment, or classroom data.
