import assert from 'node:assert/strict';
import test from 'node:test';

import { PresentationProfileService } from '../../../src/application/operator-panel/presentation-profile-service.js';
import { coreGoal1Workspace } from '../../fixtures/core-goal1.js';

test('presentation profiles are versioned, reversible, and never change content truth', () => {
  const service = new PresentationProfileService(coreGoal1Workspace);
  const initial = service.project();
  const saved = service.save({
    theme: 'daylight',
    transition: 'snappy',
    dwellSeconds: '8',
    language: 'vi',
    reducedMotion: 'always',
  });
  assert.equal(saved.status, 'saved');
  if (saved.status !== 'saved') return;
  assert.equal(saved.projection.revision, initial.revision + 1);
  assert.equal(saved.projection.profile.transition, 'snappy');
  assert.equal(saved.projection.contentTruthUnchanged, true);
  assert.equal(saved.projection.previewOnly, true);
  assert.equal(saved.projection.persistence, 'in-memory-synthetic');

  const reset = service.reset();
  assert.equal(reset.revision, initial.revision + 2);
  assert.deepEqual(reset.profile, initial.profile);
});

test('presentation profiles reject unsupported values without a revision change', () => {
  const service = new PresentationProfileService(coreGoal1Workspace);
  const before = service.project();
  assert.deepEqual(
    service.save({
      theme: 'unsafe',
      transition: 'snappy',
      dwellSeconds: '2',
      language: 'fr',
      reducedMotion: 'never',
    }),
    { status: 'rejected', reason: 'invalid-presentation-profile' },
  );
  assert.deepEqual(service.project(), before);
});
