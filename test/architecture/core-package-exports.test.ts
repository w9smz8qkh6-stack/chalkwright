import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const packageManifest = JSON.parse(readFileSync('package.json', 'utf8')) as {
  readonly exports?: Readonly<Record<string, unknown>>;
};

test('Core package exports only reviewed consumer surfaces', () => {
  assert.deepEqual(Object.keys(packageManifest.exports ?? {}).sort(), [
    '.',
    './configuration',
    './contracts',
    './domain',
    './operator-panel',
    './presentation',
  ]);
});

test('self-hosted composition and arbitrary deep imports are not package exports', () => {
  for (const target of [
    'chalkwright/dist/app/core-operator-server.js',
    'chalkwright/dist/entrypoints/core-operator-server.js',
    'chalkwright/src/infrastructure/sqlite/repository.js',
  ]) {
    assert.throws(
      () => require.resolve(target),
      (error: unknown) =>
        error instanceof Error &&
        'code' in error &&
        error.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED',
      target,
    );
  }
});
