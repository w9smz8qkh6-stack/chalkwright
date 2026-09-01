# Core contract-test kit

Status: B06 in progress. This package-level utility is the shared runner for
adapter conformance scenarios. Individual suites own their fixtures and exact
domain expectations; the runner supplies deterministic ordering, unique case
identifiers, finite pass/fail diagnostics, and error redaction.

`runCoreConformanceSuite` is exported from the supported Core package surface.
It accepts an adapter and a finite list of named cases. A thrown case becomes
only `case-failed`; it never returns an adapter exception or private payload.
This lets configuration, persistence, connector, renderer, snapshot, and
migration suites prove both a conforming adapter and an intentionally
nonconforming adapter using the same shell.

The first B06 increment proves this contract with synthetic adapters only. It
does not add provider access, persistence schemas, live services, or change the
existing classroom application.
