import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDirectory = 'src';

/**
 * These are source-layer boundaries, not a build/package graph. B02 owns the
 * composite-project and public-export work; B01 deliberately leaves runtime
 * layout intact while preventing additional architectural drift.
 */
export const layerDefinitions = Object.freeze([
  ['domain', 'domain'],
  ['contracts', 'contracts/v1'],
  ['ports', 'ports'],
  ['application', 'application'],
  ['infrastructure', 'infrastructure'],
  ['presentation', 'presentation'],
  ['entrypoints', 'entrypoints'],
  ['composition', 'app'],
  ['configuration', 'config'],
]);

const allowedDependencies = Object.freeze({
  domain: new Set(['domain', 'contracts']),
  contracts: new Set(['contracts']),
  ports: new Set(['domain', 'contracts', 'ports']),
  application: new Set([
    'domain',
    'contracts',
    'ports',
    'application',
    'configuration',
  ]),
  infrastructure: new Set([
    'domain',
    'contracts',
    'ports',
    'application',
    'infrastructure',
    'configuration',
  ]),
  presentation: new Set(['contracts', 'presentation']),
  configuration: new Set([
    'domain',
    'contracts',
    'ports',
    'application',
    'infrastructure',
    'presentation',
    'configuration',
  ]),
  composition: new Set([
    'domain',
    'contracts',
    'ports',
    'application',
    'infrastructure',
    'presentation',
    'configuration',
    'composition',
  ]),
  entrypoints: new Set([
    'domain',
    'contracts',
    'ports',
    'application',
    'infrastructure',
    'presentation',
    'configuration',
    'composition',
    'entrypoints',
  ]),
});

// Pre-B02/B04 composition seams. Each is deliberately exact so another
// application module cannot acquire adapter ownership by copying the pattern.
const compatibilityEdges = new Set([
  'application/calendar/canary-sync.ts -> infrastructure/google-calendar/adapter.ts',
  'application/calendar/canary-sync.ts -> infrastructure/google-calendar/contracts.ts',
  'application/calendar/production-trial.ts -> infrastructure/google-calendar/adapter.ts',
  'application/calendar/production-trial.ts -> infrastructure/google-calendar/contracts.ts',
  'application/glossary/import-drive.ts -> infrastructure/google-drive/contracts.ts',
  'application/glossary/select-vocabulary.ts -> infrastructure/sqlite/classroom-cache.ts',
  'application/glossary/select-vocabulary.ts -> infrastructure/sqlite/repository.ts',
  'application/objectives/import-drive.ts -> infrastructure/google-drive/contracts.ts',
  'application/operations/handlers.ts -> infrastructure/operations/fake-alert-transport.ts',
  'application/operations/handlers.ts -> infrastructure/operations/sqlite-maintenance.ts',
  'application/persistence/attendance-continuity.ts -> infrastructure/sqlite/continuity-import.ts',
  'application/persistence/legacy-plan-state-migration.ts -> infrastructure/sqlite/database.ts',
  'application/persistence/legacy-plan-state-migration.ts -> infrastructure/sqlite/repository.ts',
]);

function isDirectory(path) {
  return existsSync(path) && statSync(path).isDirectory();
}

function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return filesUnder(path);
    return entry.isFile() && /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

function normalizePath(path) {
  return path.split(sep).join('/');
}

function relativeSourcePath(sourceRoot, path) {
  return normalizePath(relative(sourceRoot, path));
}

export function classifySourceFile(sourceRoot, path) {
  const sourceRelative = relativeSourcePath(sourceRoot, path);
  if (sourceRelative === 'index.ts') return 'composition';

  for (const [layer, directory] of layerDefinitions) {
    if (
      sourceRelative === directory ||
      sourceRelative.startsWith(`${directory}/`)
    ) {
      return layer;
    }
  }

  return undefined;
}

function literalSpecifier(node) {
  return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)
    ? node.text
    : undefined;
}

/**
 * Parse source with the installed compiler API instead of pattern matching.
 * This prevents a comment/string from inventing an edge and makes every module
 * form that can reach an in-tree file visible to the guard.
 */
export function moduleSpecifiers(source, fileName = 'source.ts') {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  const results = [];

  const addStatic = (node, kind) => {
    const specifier = literalSpecifier(node);
    results.push({ kind, specifier });
  };
  const addCall = (node, kind) => {
    const argument = node.arguments[0];
    results.push({
      kind,
      specifier: argument ? literalSpecifier(argument) : undefined,
    });
  };
  const visit = (node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier)
        addStatic(node.moduleSpecifier, 'import/export');
    } else if (ts.isImportEqualsDeclaration(node)) {
      const reference = node.moduleReference;
      if (ts.isExternalModuleReference(reference) && reference.expression) {
        addStatic(reference.expression, 'import-equals');
      }
    } else if (ts.isImportTypeNode(node)) {
      const argument = node.argument;
      if (ts.isLiteralTypeNode(argument))
        addStatic(argument.literal, 'import-type');
    } else if (ts.isCallExpression(node)) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        addCall(node, 'dynamic-import');
      } else if (
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'require'
      ) {
        addCall(node, 'require');
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return results;
}

export function importSpecifiers(source, fileName) {
  return [
    ...new Set(
      moduleSpecifiers(source, fileName).flatMap(({ specifier }) =>
        specifier === undefined ? [] : [specifier],
      ),
    ),
  ];
}

function readPathAliases(tsconfigPath) {
  if (!tsconfigPath || !existsSync(tsconfigPath)) return [];
  const config = JSON.parse(readFileSync(tsconfigPath, 'utf8'));
  const compilerOptions = config.compilerOptions ?? {};
  const baseDirectory = resolve(
    dirname(tsconfigPath),
    compilerOptions.baseUrl ?? '.',
  );

  return Object.entries(compilerOptions.paths ?? {}).flatMap(
    ([pattern, targets]) => {
      if (!Array.isArray(targets)) return [];
      return targets.map((target) => ({ pattern, target, baseDirectory }));
    },
  );
}

function aliasCandidates(specifier, aliases) {
  return aliases.flatMap(({ pattern, target, baseDirectory }) => {
    const starIndex = pattern.indexOf('*');
    if (starIndex === -1) {
      return pattern === specifier ? [resolve(baseDirectory, target)] : [];
    }

    const prefix = pattern.slice(0, starIndex);
    const suffix = pattern.slice(starIndex + 1);
    if (!specifier.startsWith(prefix) || !specifier.endsWith(suffix)) return [];
    const matched = specifier.slice(
      prefix.length,
      specifier.length - suffix.length,
    );
    return [resolve(baseDirectory, target.replace('*', matched))];
  });
}

function existingTypeScriptPath(candidate) {
  const candidates = [candidate];
  if (extname(candidate) === '.js')
    candidates.push(`${candidate.slice(0, -3)}.ts`);
  if (!extname(candidate))
    candidates.push(`${candidate}.ts`, `${candidate}.tsx`);
  candidates.push(
    resolve(candidate, 'index.ts'),
    resolve(candidate, 'index.tsx'),
  );
  return candidates.find((path) => existsSync(path) && statSync(path).isFile());
}

function resolveInternalImport(file, specifier, aliases) {
  const candidates = specifier.startsWith('.')
    ? [resolve(dirname(file), specifier)]
    : aliasCandidates(specifier, aliases);
  return candidates.map(existingTypeScriptPath).find(Boolean);
}

function isWithin(path, directory) {
  return path === directory || path.startsWith(`${directory}${sep}`);
}

function sourceRoots(options) {
  const root = resolve(options.repositoryRoot ?? repositoryRoot);
  const sourceRoot = resolve(root, options.sourceDirectory ?? sourceDirectory);
  return { root, sourceRoot };
}

export function checkArchitectureDependencies(options = {}) {
  const { root, sourceRoot } = sourceRoots(options);
  if (!isDirectory(sourceRoot)) {
    return [
      {
        code: 'missing-source-root',
        message: `B01: source root does not exist: ${sourceRoot}`,
      },
    ];
  }

  const aliases = readPathAliases(
    options.tsconfigPath ?? resolve(root, 'tsconfig.json'),
  );
  const errors = [];
  const files = filesUnder(sourceRoot);

  for (const file of files) {
    const sourceLayer = classifySourceFile(sourceRoot, file);
    if (!sourceLayer) {
      errors.push({
        code: 'unclassified-source-file',
        message: `B01: unclassified in-scope source file: ${relativeSourcePath(sourceRoot, file)}`,
      });
      continue;
    }

    const from = relativeSourcePath(sourceRoot, file);
    for (const { kind, specifier } of moduleSpecifiers(
      readFileSync(file, 'utf8'),
      file,
    )) {
      if (specifier === undefined) {
        errors.push({
          code: 'non-static-module-specifier',
          message: `B01: non-static module specifier in ${from} via ${kind}`,
        });
        continue;
      }
      const imported = resolveInternalImport(file, specifier, aliases);
      if (!imported || !isWithin(imported, sourceRoot)) continue;

      const targetLayer = classifySourceFile(sourceRoot, imported);
      const to = relativeSourcePath(sourceRoot, imported);
      if (!targetLayer) {
        errors.push({
          code: 'unclassified-import-target',
          message: `B01: ${from} imports unclassified in-scope target ${to} via ${specifier}`,
        });
        continue;
      }

      const edge = `${from} -> ${to}`;
      if (
        allowedDependencies[sourceLayer].has(targetLayer) ||
        compatibilityEdges.has(edge)
      ) {
        continue;
      }

      errors.push({
        code: 'forbidden-layer-dependency',
        message: `B01: forbidden dependency ${sourceLayer} -> ${targetLayer}: ${from} imports ${to} via ${specifier}`,
      });
    }
  }

  return errors;
}

export function assertArchitectureDependencies(options = {}) {
  const errors = checkArchitectureDependencies(options);
  if (errors.length > 0) {
    throw new Error(errors.map((error) => error.message).join('\n'));
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    assertArchitectureDependencies();
    process.stdout.write('Architecture dependency direction: passed.\n');
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  }
}
