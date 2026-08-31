import assert from 'node:assert/strict';
import test from 'node:test';

import { startCoreOperatorApplication } from '../../../src/app/core-operator-server.js';
import { VersionedConfigurationService } from '../../../src/application/configuration/versioned-configuration-service.js';
import { qualifyCoreGoal1NonCreator } from '../../../src/application/operator-panel/core-goal1-qualification.js';
import { InMemoryConfigurationStateRepository } from '../../../src/infrastructure/memory/configuration-state.js';
import { coreGoal1FixtureCatalog } from '../../fixtures/core-goal1.js';

test('C10 qualifies the complete non-creator Core path in disposable synthetic state', async () => {
  const evidence = await qualifyCoreGoal1NonCreator(coreGoal1FixtureCatalog);
  assert.deepEqual(evidence, {
    status: 'qualified',
    selfHostedOnly: true,
    connectedProviderRequired: false,
    commercialFrameworkRequired: false,
    liveEffects: false,
    operatorBoundary: 'private-reachability',
    draft: {
      timezoneRecorded: true,
      roomAndScreenRecorded: true,
      manualSourceMapped: true,
    },
    preview: { status: 'created', mutationFree: true, frameCount: 4 },
    activation: { activated: true, rolledBack: true },
    continuity: {
      portableExportRedacted: true,
      recoveryPreflightAccepted: true,
    },
    displayAccess: { classCodeRotated: true, publicViewerRouteComposed: false },
  });
  assert.doesNotMatch(
    JSON.stringify(evidence),
    /"(?:classCode|token|provider|oauth)"/iu,
  );
});

test('C10 confirms the private operator listener does not compose a display route', async () => {
  const basis = coreGoal1FixtureCatalog.preview.basis;
  const running = await startCoreOperatorApplication({
    host: '127.0.0.1',
    workspace: coreGoal1FixtureCatalog.workspace,
    configuration: new VersionedConfigurationService(
      new InMemoryConfigurationStateRepository([
        coreGoal1FixtureCatalog.configurationStates.rolledBack,
      ]),
    ),
    plannedFrames: coreGoal1FixtureCatalog.plannedFrames,
    ...(basis.kind === 'revision'
      ? { plannedDisplayBasisRevisionId: basis.revisionId }
      : {}),
  });
  try {
    const planned = await fetch(`${running.origin}/planned-display`);
    assert.equal(planned.status, 200);
    const display = await fetch(
      `${running.origin}/screens/${coreGoal1FixtureCatalog.screens[0]!.screenId}`,
    );
    assert.equal(display.status, 404);
    const forwarded = await fetch(`${running.origin}/overview`, {
      headers: { 'x-forwarded-host': 'display.synthetic.invalid' },
    });
    assert.equal(forwarded.status, 400);
  } finally {
    await running.close();
  }
});
