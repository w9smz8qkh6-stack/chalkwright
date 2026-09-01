import assert from 'node:assert/strict';
import test from 'node:test';

import { runDisplayAccessRepositoryConformance } from '../../src/core/operator-panel.js';
import { InMemoryDisplayAccessRepository } from '../../src/infrastructure/memory/display-access.js';
import type { DisplayAccessRepository } from '../../src/ports/display-access.js';
import { coreGoal1FixtureCatalog } from '../fixtures/core-goal1.js';

const workspace = coreGoal1FixtureCatalog.workspace;
const screenId = coreGoal1FixtureCatalog.screens[0]!.screenId;
const foreignWorkspace = {
  ...workspace,
  installationId:
    'installation-synthetic-foreign' as typeof workspace.installationId,
};

test('display-access conformance accepts detached exact-workspace storage', async () => {
  const report = await runDisplayAccessRepositoryConformance(
    new InMemoryDisplayAccessRepository([
      {
        workspace,
        screenId,
        state: {
          classCodeState: coreGoal1FixtureCatalog.screens[0]!.classCodeState,
          verifier: null,
          viewerSessions: [],
          admissionFailures: [],
        },
      },
    ]),
    workspace,
    screenId,
    foreignWorkspace,
  );
  assert.equal(report.status, 'passed');
});

test('display-access conformance rejects an adapter that aliases cross-workspace state', async () => {
  const shared = {
    classCodeState: coreGoal1FixtureCatalog.screens[0]!.classCodeState,
    verifier: null,
    viewerSessions: [],
    admissionFailures: [],
  };
  const aliasing: DisplayAccessRepository = {
    read: async () => shared,
    transact: async () => {
      throw new Error('not-needed');
    },
  };
  const report = await runDisplayAccessRepositoryConformance(
    aliasing,
    workspace,
    screenId,
    foreignWorkspace,
  );
  assert.equal(report.status, 'failed');
  assert.equal(report.results[0]!.status, 'failed');
  assert.equal(report.results[1]!.status, 'failed');
});
