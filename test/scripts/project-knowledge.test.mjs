import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

import {
  analyzeWorkstreams,
  collectImplementationFingerprint,
  loadProjectKnowledge,
  renderKnowledgeDigest,
  renderProjectState,
  scopeMatches,
  validateProjectKnowledge,
} from '../../scripts/codex/project-knowledge.mjs';

const repositoryRoot = resolve(import.meta.dirname, '..', '..');

test('implementation fingerprint changes for code but not documentation prose', () => {
  const root = mkdtempSync(join(tmpdir(), 'chalkwright-knowledge-'));
  mkdirSync(join(root, 'src'), { recursive: true });
  mkdirSync(join(root, 'docs'), { recursive: true });
  writeFileSync(join(root, 'src', 'feature.ts'), 'export const value = 1;\n');
  writeFileSync(join(root, 'docs', 'note.md'), '# Note\n');

  const initial = collectImplementationFingerprint(root);
  writeFileSync(join(root, 'docs', 'note.md'), '# Revised note\n');
  assert.deepEqual(collectImplementationFingerprint(root), initial);

  writeFileSync(join(root, 'src', 'feature.ts'), 'export const value = 2;\n');
  assert.notEqual(
    collectImplementationFingerprint(root).fingerprint,
    initial.fingerprint,
  );
});

test('workstream scope supports exact, single-level, and recursive patterns', () => {
  assert.equal(scopeMatches('package.json', ['package.json']), true);
  assert.equal(
    scopeMatches('scripts/capture-homepage-demo.mjs', [
      'scripts/capture-homepage-demo*.mjs',
    ]),
    true,
  );
  assert.equal(
    scopeMatches('docs/assets/homepage-demo/animations/example.webm', [
      'docs/assets/homepage-demo/**',
    ]),
    true,
  );
  assert.equal(scopeMatches('src/domain/plans.ts', ['src/app/*']), false);
});

test('repository capability and workstream evidence is structurally valid', () => {
  const knowledge = loadProjectKnowledge(repositoryRoot);
  const validation = validateProjectKnowledge(knowledge, {
    root: repositoryRoot,
    now: new Date('2026-08-29T12:00:00Z'),
    checkFingerprint: false,
  });

  assert.deepEqual(validation.failures, []);
  assert.ok(knowledge.capabilities.length >= 12);
  assert.ok(knowledge.workstreams.some(({ status }) => status === 'active'));
});

test('working-tree analysis exposes counts without requiring paths in the digest', () => {
  const knowledge = loadProjectKnowledge(repositoryRoot);
  const analysis = analyzeWorkstreams(knowledge, [
    'scripts/codex/project-knowledge.mjs',
    'src/unclassified.ts',
    'output/local-artifact.txt',
  ]);
  const validation = validateProjectKnowledge(knowledge, {
    root: repositoryRoot,
    now: new Date('2026-08-29T12:00:00Z'),
    checkFingerprint: false,
  });
  const digest = renderKnowledgeDigest(knowledge, validation, analysis);

  assert.equal(analysis.unclassifiedEntries, 1);
  assert.equal(analysis.localArtifactEntries, 1);
  assert.match(digest, /REVIEW_REQUIRED/);
  assert.match(digest, /self-documenting-development/);
  assert.doesNotMatch(digest, /src\/unclassified\.ts/);
});

test('tracked project state excludes volatile working-tree counts', () => {
  const knowledge = loadProjectKnowledge(repositoryRoot);
  const validation = validateProjectKnowledge(knowledge, {
    root: repositoryRoot,
    now: new Date('2026-08-29T12:00:00Z'),
    checkFingerprint: false,
  });
  const clean = renderProjectState(
    knowledge,
    validation,
    analyzeWorkstreams(knowledge, []),
  );
  const dirty = renderProjectState(
    knowledge,
    validation,
    analyzeWorkstreams(knowledge, [
      'scripts/codex/project-knowledge.mjs',
      'output/local-artifact.txt',
    ]),
  );

  assert.equal(dirty, clean);
  assert.doesNotMatch(dirty, /Current working-tree entries in scope/u);
  assert.match(dirty, /volatile change counts are intentionally excluded/u);
});
