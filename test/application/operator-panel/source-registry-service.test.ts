import assert from 'node:assert/strict';
import test from 'node:test';

import { VersionedConfigurationService } from '../../../src/application/configuration/versioned-configuration-service.js';
import { SourceRegistryService } from '../../../src/application/operator-panel/source-registry-service.js';
import { InMemoryConfigurationStateRepository } from '../../../src/infrastructure/memory/configuration-state.js';
import { coreGoal1FixtureCatalog } from '../../fixtures/core-goal1.js';

function createRegistry(): SourceRegistryService {
  return new SourceRegistryService(
    coreGoal1FixtureCatalog.workspace,
    new VersionedConfigurationService(
      new InMemoryConfigurationStateRepository([
        coreGoal1FixtureCatalog.configurationStates.rolledBack,
      ]),
    ),
    () => new Date('2035-03-18T10:00:00.000Z'),
  );
}

test('C04 records a bounded manual source draft with provenance, freshness, and screen mapping', async () => {
  const registry = createRegistry();
  const screenId = coreGoal1FixtureCatalog.screens[0]!.screenId;
  const saved = await registry.saveManualSource({
    stream: 'vocabulary-translations-pronunciation',
    courseLabel: 'Web Design',
    screenId,
  });
  assert.equal(saved.status, 'saved');
  const projection = await registry.project();
  assert.equal(projection.status, 'ready');
  assert.deepEqual(projection.entries, [
    {
      sourceId: 'source-c04-web-design-1',
      stream: 'vocabulary-translations-pronunciation',
      mode: 'application-managed',
      courseLabel: 'Web Design',
      screenId,
      provenance: 'teacher-entered',
      freshness: 'managed-revision',
      validation: 'definition-recorded',
    },
  ]);
});

test('C04 rejects unknown streams and mappings without adding a source', async () => {
  const registry = createRegistry();
  assert.deepEqual(
    await registry.saveManualSource({
      stream: 'unknown',
      courseLabel: 'Web Design',
    }),
    { status: 'rejected', reason: 'stream-invalid' },
  );
  assert.deepEqual(
    await registry.saveManualSource({
      stream: 'schedule-bells',
      courseLabel: 'Web Design',
      screenId: 'screen-not-real',
    }),
    { status: 'rejected', reason: 'screen-not-found' },
  );
  assert.equal((await registry.project()).entries.length, 0);
});
