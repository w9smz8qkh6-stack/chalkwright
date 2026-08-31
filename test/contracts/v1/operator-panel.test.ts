import assert from 'node:assert/strict';
import test from 'node:test';

import {
  configurationBoundaries,
  coreMvpFeatureIds,
  forbiddenOperatorFeatureRegionFields,
  isOperatorFeatureRegionModel,
  operatorAccessibilityAcceptance,
  operatorPageCatalog,
  operatorPageKeys,
  operatorRegionStates,
  plannedDisplayKeyboardContract,
  setupProgression,
  type OperatorFeatureRegionModel,
} from '../../../src/contracts/v1/index.js';
import {
  operatorFeatureRegionFixtures,
  operatorStateFixtures,
} from '../../fixtures/operator-panel.js';

function clone<Value>(value: Value): Value {
  return structuredClone(value);
}

test('operator catalog assigns every stable page key and Core MVP feature', () => {
  assert.deepEqual(
    operatorPageCatalog.map((page) => page.key),
    operatorPageKeys,
  );
  assert.equal(new Set(operatorPageKeys).size, operatorPageKeys.length);
  assert.deepEqual(
    [
      ...new Set(operatorPageCatalog.flatMap((page) => page.coreMvpFeatures)),
    ].sort(),
    [...coreMvpFeatureIds].sort(),
  );
  for (const page of operatorPageCatalog) {
    assert.ok(page.purpose.length > 20, `${page.key}:purpose`);
    assert.ok(page.informationHierarchy.length > 1, `${page.key}:hierarchy`);
    assert.ok(page.primaryActions.length > 0, `${page.key}:primary-actions`);
    assert.ok(page.applicableStates.length > 1, `${page.key}:states`);
  }
  assert.deepEqual(
    [
      ...new Set(operatorPageCatalog.flatMap((page) => page.applicableStates)),
    ].sort(),
    [...operatorRegionStates].sort(),
  );
});

test('setup and configuration boundaries keep provider consent optional and mutations explicit', () => {
  assert.deepEqual(
    setupProgression.map((stage) => stage.key),
    [
      'installation',
      'displays',
      'sources',
      'presentation',
      'review',
      'activate',
    ],
  );
  assert.equal(
    JSON.stringify(setupProgression).toLowerCase().includes('provider'),
    false,
  );
  assert.deepEqual(
    configurationBoundaries.map((boundary) => boundary.key),
    [
      'save-draft',
      'preview-draft',
      'validate-draft',
      'activate-revision',
      'roll-back-revision',
      'discard-unsaved-edits',
    ],
  );
  assert.match(
    configurationBoundaries[0]!.rule,
    /effective display state is unchanged/u,
  );
  assert.match(configurationBoundaries[3]!.rule, /prior active revision/u);
  assert.match(configurationBoundaries[5]!.rule, /only unsaved browser edits/u);
});

test('planned-display and accessibility acceptance are finite and testable', () => {
  assert.deepEqual(Object.keys(plannedDisplayKeyboardContract.contactSheet), [
    'ArrowLeft',
    'ArrowRight',
    'Home',
    'End',
    'Enter',
    'Space',
  ]);
  assert.match(
    plannedDisplayKeyboardContract.enlargedReview.Escape,
    /return focus/u,
  );
  assert.match(
    plannedDisplayKeyboardContract.mutationBoundary,
    /preview-only/u,
  );
  assert.deepEqual(operatorAccessibilityAcceptance.viewports, [
    { width: 390, height: 844, label: 'mobile-portrait' },
    { width: 768, height: 1024, label: 'tablet-portrait' },
    { width: 1366, height: 768, label: 'desktop-compact' },
    { width: 1920, height: 1080, label: 'desktop-wide' },
  ]);
  assert.match(operatorAccessibilityAcceptance.zoom, /200%/u);
  assert.match(operatorAccessibilityAcceptance.motion, /Reduced motion/u);
});

test('all page and finite-state fixtures satisfy the exact Core region guard', () => {
  for (const pageKey of operatorPageKeys) {
    assert.equal(
      isOperatorFeatureRegionModel(operatorFeatureRegionFixtures[pageKey]),
      true,
      pageKey,
    );
  }
  for (const state of operatorRegionStates) {
    assert.equal(
      isOperatorFeatureRegionModel(operatorStateFixtures[state]),
      true,
      state,
    );
  }
});

test('Core guard rejects shell authority, wrong scope, malformed arrays, and hostile objects', () => {
  const baseline = operatorFeatureRegionFixtures.overview;
  for (const field of forbiddenOperatorFeatureRegionFields) {
    assert.equal(
      isOperatorFeatureRegionModel({ ...baseline, [field]: 'forbidden' }),
      false,
      field,
    );
  }

  const wrongScope = clone(baseline) as OperatorFeatureRegionModel;
  const mutableTargets = wrongScope.targets as unknown as Array<
    Record<string, unknown>
  >;
  mutableTargets[0]!.workspaceId = 'workspace-synthetic-other';
  assert.equal(isOperatorFeatureRegionModel(wrongScope), false);

  const sparse = clone(baseline) as unknown as Record<string, unknown>;
  const sections = (sparse.sections as unknown[]).slice();
  delete sections[0];
  sparse.sections = sections;
  assert.equal(isOperatorFeatureRegionModel(sparse), false);

  const decorated = clone(baseline) as unknown as Record<string, unknown>;
  const readiness = (decorated.readiness as unknown[]).slice();
  Object.defineProperty(readiness, 'authority', { value: 'hosted' });
  decorated.readiness = readiness;
  assert.equal(isOperatorFeatureRegionModel(decorated), false);

  const hostile = Object.create({ account: 'synthetic' }) as Record<
    string,
    unknown
  >;
  Object.assign(hostile, baseline);
  assert.equal(isOperatorFeatureRegionModel(hostile), false);

  const accessorBacked = clone(baseline) as unknown as Record<string, unknown>;
  Object.defineProperty(accessorBacked, 'title', {
    enumerable: true,
    get: () => 'synthetic accessor',
  });
  assert.equal(isOperatorFeatureRegionModel(accessorBacked), false);
});
