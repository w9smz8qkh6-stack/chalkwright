import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  generatedEnd,
  generatedStart,
  inventoryEnd,
  inventoryStart,
  documentationImpactFailures,
  renderDocumentationInventory,
  renderGeneratedContext,
  renderPromptHookSummary,
  renderProjectFacts,
  renderSessionHookSummary,
  replaceGeneratedSection,
  synchronizeDocumentationIndex,
  synchronizeProjectEnvironment,
} from '../../scripts/codex/refresh-environment.mjs';

const facts = {
  name: 'chalkwright',
  version: '0.1.0',
  private: true,
  packageManager: 'npm@11.12.1',
  nodeEngine: '>=24.15.0',
  npmEngine: '>=10',
  lockfileVersion: 3,
  productionDependencies: [
    { name: 'playwright-core', requirement: '1.62.0', locked: '1.62.0' },
  ],
  developmentDependencies: [
    { name: 'typescript', requirement: '^5.8.3', locked: '5.9.2' },
  ],
  scripts: {
    check: 'npm test',
    build: 'tsc',
    start: 'node dist/index.js',
  },
};

test('renders exact declared and locked direct dependency versions', () => {
  const rendered = renderProjectFacts(facts);

  assert.match(rendered, /npm@11\.12\.1/);
  assert.match(rendered, /playwright-core.*1\.62\.0.*1\.62\.0/);
  assert.match(rendered, /typescript.*\^5\.8\.3.*5\.9\.2/);
  assert.match(rendered, /npm run check.*npm test/);
  assert.doesNotMatch(rendered, /Generated:/);
});

test('replaces only the marked generated section', () => {
  const current = `# Environment\n\n${generatedStart}\nold\n${generatedEnd}\n\nKeep me.\n`;
  const generated = renderProjectFacts(facts);

  assert.equal(
    replaceGeneratedSection(current, generated),
    `# Environment\n\n${generated}\n\nKeep me.\n`,
  );
});

test('writes stale project facts and then passes check mode', () => {
  const root = mkdtempSync(join(tmpdir(), 'chalkwright-environment-'));
  const target = join(root, 'environment.md');
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({
      name: 'example',
      version: '1.0.0',
      private: true,
      packageManager: 'npm@11.0.0',
      engines: { node: '>=24', npm: '>=11' },
      dependencies: { alpha: '^1.0.0' },
      devDependencies: {},
      scripts: { check: 'node --test' },
    }),
  );
  writeFileSync(
    join(root, 'package-lock.json'),
    JSON.stringify({
      lockfileVersion: 3,
      packages: {
        '': {
          dependencies: { alpha: '^1.0.0' },
          devDependencies: {},
        },
        'node_modules/alpha': { version: '1.2.3' },
      },
    }),
  );
  writeFileSync(
    target,
    `Before\n${generatedStart}\nstale\n${generatedEnd}\nAfter\n`,
  );

  assert.deepEqual(
    synchronizeProjectEnvironment({ root, target, check: true }),
    {
      changed: true,
      target,
    },
  );
  assert.deepEqual(synchronizeProjectEnvironment({ root, target }), {
    changed: true,
    target,
  });
  assert.deepEqual(
    synchronizeProjectEnvironment({ root, target, check: true }),
    {
      changed: false,
      target,
    },
  );
  assert.match(readFileSync(target, 'utf8'), /alpha.*\^1\.0\.0.*1\.2\.3/);
});

test('rejects an environment document without generated markers', () => {
  assert.throws(
    () => replaceGeneratedSection('# Environment\n', renderProjectFacts(facts)),
    /Expected one/,
  );
});

test('renders a complete documentation inventory inside distinct markers', () => {
  const rendered = renderDocumentationInventory([
    { path: 'decisions/0001-example.md', title: 'Example decision' },
    { path: 'landing page.md', title: 'Landing page' },
  ]);

  assert.match(rendered, new RegExp(`^${inventoryStart}`));
  assert.match(rendered, /Example decision.*decisions\/0001-example\.md/);
  assert.match(rendered, /Landing page.*landing%20page\.md/);
  assert.match(rendered, new RegExp(`${inventoryEnd}$`));
});

test('synchronizes an exhaustive nested documentation inventory', () => {
  const root = mkdtempSync(join(tmpdir(), 'chalkwright-documentation-'));
  const docs = join(root, 'docs');
  const nested = join(docs, 'decisions');
  const target = join(docs, 'README.md');
  mkdirSync(nested, { recursive: true });
  writeFileSync(join(docs, 'guide.md'), '# Guide\n');
  writeFileSync(join(nested, '0001-example.md'), '# Example decision\n');
  writeFileSync(
    target,
    `Before\n${inventoryStart}\nstale\n${inventoryEnd}\nAfter\n`,
  );

  assert.equal(
    synchronizeDocumentationIndex({ root, target, check: true }).changed,
    true,
  );
  assert.equal(synchronizeDocumentationIndex({ root, target }).changed, true);
  assert.equal(
    synchronizeDocumentationIndex({ root, target, check: true }).changed,
    false,
  );
  const contents = readFileSync(target, 'utf8');
  assert.match(contents, /Example decision.*decisions\/0001-example\.md/);
  assert.match(contents, /Guide.*guide\.md/);
});

test('generated context reports counts without listing changed paths', () => {
  const rendered = renderGeneratedContext({
    git: {
      branch: 'main...origin/main',
      dirtyEntries: 2,
      documentationEntries: 0,
      sourceEntries: 2,
    },
    documents: [
      { path: 'decisions/example.md', title: 'Decision' },
      { path: 'migration/example.md', title: 'Migration' },
    ],
  });

  assert.match(rendered, /Documentation corpus: 3 files/);
  assert.match(rendered, /Architecture decisions: 1/);
  assert.match(rendered, /Documentation review: BLOCKED/);
  assert.doesNotMatch(rendered, /secret-looking-file/);
});

test('documentation handoff gate requires a reference and changelog update', () => {
  assert.deepEqual(
    documentationImpactFailures({
      sourceEntries: 2,
      documentationReferenceEntries: 0,
      changelogChanged: false,
    }),
    [
      'Source/configuration changes require a relevant durable documentation-reference change.',
      'Source/configuration changes require an Unreleased CHANGELOG.md change.',
    ],
  );
  assert.deepEqual(
    documentationImpactFailures({
      sourceEntries: 2,
      documentationReferenceEntries: 1,
      changelogChanged: true,
    }),
    [],
  );
  assert.deepEqual(
    documentationImpactFailures({
      sourceEntries: 0,
      documentationReferenceEntries: 0,
      changelogChanged: false,
    }),
    [],
  );
});

test('hook output separates durable session context from compact prompt state', () => {
  const result = {
    context: {
      facts: {
        git: {
          branch: 'main',
          dirtyEntries: 3,
          documentationEntries: 2,
          documentationReferenceEntries: 1,
          changelogChanged: true,
          sourceEntries: 1,
        },
        documents: [{ path: 'operations.md', title: 'Operations' }],
      },
    },
    projectKnowledge: {
      knowledge: {
        review: { reviewedOn: '2026-08-29' },
        project: {
          phase: 'Stabilization',
          milestone: 'M17',
          release: '0.1.0',
        },
        deployment: {
          status: 'documented-production',
          summary: 'Documented only.',
          evidenceBasis: 'Repository evidence.',
        },
        priorities: ['Keep stable.'],
        capabilities: [{ id: 'display', status: 'documented-production' }],
        workstreams: [],
        knownLimits: ['No live probe.'],
      },
      validation: {
        failures: [],
        implementation: {
          files: 1,
          fingerprint: '0123456789abcdef9999',
        },
        fingerprintCurrent: true,
        reviewAgeDays: 0,
      },
      analysis: { workstreams: [], unclassifiedEntries: 0 },
    },
  };

  const session = renderSessionHookSummary(result);
  const prompt = renderPromptHookSummary(result);
  assert.match(session, /CHALKWRIGHT_PROJECT_STATE/);
  assert.match(session, /capabilities=documented-production=display/);
  assert.doesNotMatch(prompt, /capabilities=/);
  assert.match(prompt, /freshness=CURRENT/);
  assert.match(prompt, /isolated codex\/<task> worktree/);
  assert.ok(Buffer.byteLength(prompt) < 1200);
});

test('user automation combines event-driven refresh with a periodic backstop', () => {
  const unit = (name) =>
    readFileSync(
      new URL(`../../systemd/codex/${name}`, import.meta.url),
      'utf8',
    );
  const service = unit('chalkwright-documentation-sync.service');
  const path = unit('chalkwright-documentation-sync.path');
  const timer = unit('chalkwright-documentation-sync.timer');

  assert.match(service, /refresh-environment\.mjs --write/);
  assert.match(service, /NoNewPrivileges=true/);
  assert.match(service, /RestrictAddressFamilies=AF_UNIX/);
  assert.match(path, /PathChanged=.*package-lock\.json/);
  assert.match(path, /PathModified=.*docs/);
  assert.match(path, /PathModified=.*src/);
  assert.match(timer, /OnUnitInactiveSec=5min/);
  assert.match(timer, /Persistent=true/);
});
