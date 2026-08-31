import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import test from 'node:test';

import packageJson from '../../package.json' with { type: 'json' };

import {
  checkArchitectureDependencies,
  importSpecifiers,
} from '../../scripts/check-architecture-dependencies.mjs';

function fixture(files, tsconfig = '{}') {
  const root = mkdtempSync(resolve(tmpdir(), 'chalkwright-b01-'));
  for (const [path, contents] of Object.entries(files)) {
    const file = resolve(root, path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, contents);
  }
  writeFileSync(resolve(root, 'tsconfig.json'), tsconfig);
  return root;
}

function errorsFor(files, tsconfig) {
  const root = fixture(files, tsconfig);
  try {
    return checkArchitectureDependencies({ repositoryRoot: root });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('reads syntax-aware normal, type-only, re-export, import-type, dynamic, and require dependency forms', () => {
  assert.deepEqual(
    importSpecifiers(`
      import {
        type T,
      } from './types.js';
      export { value } from './value.js';
      import module = require('./equals.js');
      type Imported = import('./import-type.js').Imported;
      await import(/* loader annotation */ \`./dynamic.js\`);
      require('./legacy.js');
  `),
    [
      './types.js',
      './value.js',
      './equals.js',
      './import-type.js',
      './dynamic.js',
      './legacy.js',
    ],
  );
});

test('does not treat comment or ordinary string text as a dependency', () => {
  const errors = errorsFor({
    'src/domain/value.ts': `
      // import('../infrastructure/adapter.js')
      const note = "require('../infrastructure/adapter.js')";
      export const value = note;
    `,
  });
  assert.deepEqual(errors, []);
});

test('reports a deterministic forbidden reverse dependency', () => {
  const errors = errorsFor({
    'src/domain/value.ts':
      "import { adapter } from '../infrastructure/adapter.js';\nexport const value = adapter;\n",
    'src/infrastructure/adapter.ts': 'export const adapter = 1;\n',
  });

  assert.deepEqual(errors, [
    {
      code: 'forbidden-layer-dependency',
      message:
        'B01: forbidden dependency domain -> infrastructure: domain/value.ts imports infrastructure/adapter.ts via ../infrastructure/adapter.js',
    },
  ]);
});

test('rejects unclassified files and targets inside the governed source tree', () => {
  const errors = errorsFor({
    'src/domain/value.ts':
      "import { thing } from '../unknown/thing.js';\nexport const value = thing;\n",
    'src/unknown/thing.ts': 'export const thing = 1;\n',
  });

  assert.deepEqual(errors, [
    {
      code: 'unclassified-import-target',
      message:
        'B01: domain/value.ts imports unclassified in-scope target unknown/thing.ts via ../unknown/thing.js',
    },
    {
      code: 'unclassified-source-file',
      message: 'B01: unclassified in-scope source file: unknown/thing.ts',
    },
  ]);
});

test('resolves configured path aliases so they cannot bypass dependency direction', () => {
  const errors = errorsFor(
    {
      'src/domain/value.ts':
        "import { adapter } from '@app/infrastructure/adapter.js';\nexport const value = adapter;\n",
      'src/infrastructure/adapter.ts': 'export const adapter = 1;\n',
    },
    JSON.stringify({
      compilerOptions: { baseUrl: '.', paths: { '@app/*': ['src/*'] } },
    }),
  );

  assert.equal(errors.length, 1);
  assert.equal(errors[0]?.code, 'forbidden-layer-dependency');
  assert.match(errors[0]?.message ?? '', /domain -> infrastructure/);
});

test('permits a standard inward port dependency', () => {
  const errors = errorsFor({
    'src/application/use-case.ts':
      "import type { Plan } from '../ports/plan.js';\nexport type Result = Plan;\n",
    'src/ports/plan.ts': 'export interface Plan { readonly id: string; }\n',
  });
  assert.deepEqual(errors, []);
});

test('detects a no-substitution dynamic template literal reverse dependency', () => {
  const errors = errorsFor({
    'src/domain/value.ts':
      'await import(/* cannot bypass */ `../infrastructure/adapter.js`);\n',
    'src/infrastructure/adapter.ts': 'export const adapter = 1;\n',
  });

  assert.equal(errors.length, 1);
  assert.equal(errors[0]?.code, 'forbidden-layer-dependency');
  assert.match(errors[0]?.message ?? '', /domain -> infrastructure/);
});

test('fails closed for a non-static dynamic import or require', () => {
  const errors = errorsFor({
    'src/domain/value.ts': `
      const suffix = 'adapter.js';
      await import('../infrastructure/' + suffix);
      require(suffix);
    `,
  });

  assert.deepEqual(errors, [
    {
      code: 'non-static-module-specifier',
      message:
        'B01: non-static module specifier in domain/value.ts via dynamic-import',
    },
    {
      code: 'non-static-module-specifier',
      message:
        'B01: non-static module specifier in domain/value.ts via require',
    },
  ]);
});

test('runs the architecture guard in both normal and portable handoff paths', () => {
  assert.match(packageJson.scripts.check, /npm run architecture:check/);
  assert.match(
    packageJson.scripts['check:portable'],
    /npm run architecture:check/,
  );
});
