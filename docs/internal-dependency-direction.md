# Internal dependency direction

`npm run architecture:check` is the B01 executable guard for the current
single-package source tree. It inspects every TypeScript file beneath `src/`;
build output, test fixtures, and repository scripts are intentionally outside
this source-layer classification. B02 owns TypeScript project references and
public package exports, so this check is a source-graph boundary rather than a
replacement build graph.

## Classified layers and allowed directions

| Source area                  | Layer          | May depend on                                                                     |
| ---------------------------- | -------------- | --------------------------------------------------------------------------------- |
| `src/contracts/v1/**`        | contracts      | contracts                                                                         |
| `src/domain/**`              | domain         | domain, contracts                                                                 |
| `src/ports/**`               | ports          | ports, domain, contracts                                                          |
| `src/application/**`         | application    | application, ports, domain, contracts, configuration                              |
| `src/infrastructure/**`      | infrastructure | infrastructure, application, ports, domain, contracts, configuration              |
| `src/presentation/**`        | presentation   | presentation, contracts                                                           |
| `src/config/**`              | configuration  | configuration plus all inward implementation/rendering layers; never entry points |
| `src/app/**`, `src/index.ts` | composition    | configuration plus inward layers; never entry points                              |
| `src/entrypoints/**`         | entry points   | entry points and every inward/composition layer                                   |

The matrix preserves current runtime behavior while maintaining the important
ownership rules: domain and contracts cannot reach infrastructure, presentation,
configuration, composition, or entry points; ports remain framework- and
adapter-neutral; presentation cannot reach application, infrastructure,
configuration, composition, or entry points; and no inner layer can import an
entry point. Entrypoints are the outer executable owners.

`configuration` is classified separately because this pre-B04 application
loads runtime settings directly. It is an existing compatibility boundary, not
a new general application-to-adapter permission.

## Narrow legacy compatibility seams

Thirteen exact `application -> infrastructure` source-file edges are listed in
the guard. They are existing Google Calendar/Drive and SQLite/operations
composition seams, including type-only contract references. They are not part
of the matrix: a new such edge fails. B02 must move reusable shapes behind
reviewed contracts/ports, and B04 must relocate concrete construction to
self-hosted composition roots before a Core package is claimed reusable.

## Resolution and failure behavior

The guard uses the installed TypeScript compiler API to read ES imports,
type-only imports, re-exports, import-type nodes, import-equals/`require`, and
literal dynamic imports (including no-substitution template literals). Relative
`.js` specifiers are resolved to their TypeScript source targets. It also reads
configured `baseUrl`/`paths` aliases from `tsconfig.json`, so an alias cannot
bypass the matrix. Every TypeScript file and every resolved in-tree target must
be classified; an unknown `src/` directory fails closed. A non-static dynamic
import or `require` fails closed with a deterministic diagnostic instead of
escaping inspection. External static packages remain outside this source graph.

The focused test suite proves a conventional inward port edge passes, while a
domain-to-infrastructure edge, an alias-based bypass, an uncommented dynamic
template import, a non-static module request, and unclassified source
files/targets produce deterministic B01 errors. Comments and ordinary strings
that merely contain import-shaped text create no edge. Both `npm run check` and
`npm run check:portable` invoke the guard as handoff gates.
