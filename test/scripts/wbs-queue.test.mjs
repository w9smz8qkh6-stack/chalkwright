import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import {
  createQueue,
  dispatchState,
  parseWbs,
  reconcileQueue,
  renderExecutorPacket,
  renderLedger,
  validateQueue,
} from '../../scripts/codex/wbs-queue.mjs';

const repositoryRoot = resolve(import.meta.dirname, '..', '..');
const repositoryWbs = readFileSync(
  resolve(
    repositoryRoot,
    'docs/core-and-hosted-implementation-work-breakdown.md',
  ),
  'utf8',
);

function complete(queue, id) {
  Object.assign(queue.tasks[id], {
    status: 'complete',
    completedOn: '2026-08-31',
    evidence: [`docs/${id.toLowerCase()}-evidence.md`],
  });
}

function sampleWbs({ firstObjective = 'Perform first.', extra = '' } = {}) {
  return `# Sample

## Queue scheduling policy

- **Goal 1 sequence:** A01 → A02.
- **Goal 1 acceptance gate:** A02.

## Phase A — sample

### A01 — First task

${firstObjective}

Depends on: none.

Complete when: first evidence exists.

### A02 — Second task

Perform second.

Depends on: A01.

Complete when: second evidence exists.

### B01 — Later task

Perform later.

Depends on: A02.

Complete when: later evidence exists.
${extra}`;
}

test('authoritative WBS has 51 valid tasks and the exact Goal 1 lane', () => {
  const parsed = parseWbs(repositoryWbs);

  assert.deepEqual(parsed.failures, []);
  assert.equal(parsed.tasks.length, 51);
  assert.equal(new Set(parsed.tasks.map(({ id }) => id)).size, 51);
  assert.deepEqual(parsed.schedulingPolicy, {
    goal1Sequence: ['A07', 'A08', 'C01', 'C02', 'C03', 'C04', 'C09', 'C10'],
    acceptanceGate: 'C10',
  });
  assert.ok(
    parsed.tasks.find(({ id }) => id === 'B01').dependencies.includes('C10'),
  );
  assert.deepEqual(parsed.tasks.find(({ id }) => id === 'D00').dependencies, [
    'C10',
  ]);
  assert.ok(
    parsed.tasks.find(({ id }) => id === 'D02').dependencies.includes('D00'),
  );
});

test('A07 is the sole ready task when accepted A01-A06 history is loaded', () => {
  const parsed = parseWbs(repositoryWbs);
  const queue = createQueue(parsed);
  for (const id of ['A01', 'A02', 'A03', 'A04', 'A05', 'A06']) {
    complete(queue, id);
  }

  const states = Object.fromEntries(
    parsed.tasks.map((task) => [task.id, dispatchState(task, queue)]),
  );
  assert.equal(states.A07, 'ready');
  assert.equal(states.A08, 'waiting');
  assert.equal(states.C01, 'waiting');
  assert.equal(states.B01, 'gated');
  assert.equal(states.D00, 'gated');
  assert.equal(states.D02, 'gated');
  assert.deepEqual(validateQueue(parsed, queue), []);
});

test('Goal 1 advances exactly one task at a time', () => {
  const parsed = parseWbs(repositoryWbs);
  const queue = createQueue(parsed);
  for (const id of ['A01', 'A02', 'A03', 'A04', 'A05', 'A06'])
    complete(queue, id);

  for (const id of parsed.schedulingPolicy.goal1Sequence) {
    const task = parsed.tasks.find((candidate) => candidate.id === id);
    assert.equal(dispatchState(task, queue), 'ready', `${id} should be ready`);
    const otherReady = parsed.tasks.filter(
      (candidate) => dispatchState(candidate, queue) === 'ready',
    );
    assert.deepEqual(
      otherReady.map(({ id: readyId }) => readyId),
      [id],
    );
    complete(queue, id);
  }
});

test('C10 completion releases B01 and D00 according to WBS dependencies', () => {
  const parsed = parseWbs(repositoryWbs);
  const queue = createQueue(parsed);
  for (const id of [
    'A01',
    'A02',
    'A03',
    'A04',
    'A05',
    'A06',
    ...parsed.schedulingPolicy.goal1Sequence,
  ]) {
    complete(queue, id);
  }

  assert.equal(
    dispatchState(
      parsed.tasks.find(({ id }) => id === 'B01'),
      queue,
    ),
    'ready',
  );
  assert.equal(
    dispatchState(
      parsed.tasks.find(({ id }) => id === 'D00'),
      queue,
    ),
    'ready',
  );
  assert.equal(
    dispatchState(
      parsed.tasks.find(({ id }) => id === 'D02'),
      queue,
    ),
    'waiting',
  );
});

test('sync adopts pristine revisions and flags worked definition drift', () => {
  const original = parseWbs(sampleWbs());
  const revised = parseWbs(
    sampleWbs({ firstObjective: 'Perform revised first.' }),
  );

  const pristine = reconcileQueue(revised, createQueue(original));
  assert.equal(pristine.tasks.A01.reconciliation, undefined);
  assert.equal(
    pristine.tasks.A01.definitionFingerprint,
    revised.tasks[0].definitionFingerprint,
  );

  const worked = createQueue(original);
  Object.assign(worked.tasks.A01, {
    status: 'in_progress',
    owner: 'orchestrator',
    executor: 'executor-a',
    branch: 'codex/a01',
    worktree: '/tmp/chalkwright-a01',
    startedOn: '2026-08-31',
  });
  const reconciled = reconcileQueue(revised, worked);
  assert.equal(
    reconciled.tasks.A01.reconciliation.reason,
    'wbs-definition-changed',
  );
  assert.match(validateQueue(revised, reconciled).join('\n'), /reconcile/u);
});

test('removed worked tasks remain archived for explicit review', () => {
  const original = parseWbs(sampleWbs());
  const queue = createQueue(original);
  complete(queue, 'B01');
  const withoutLater = parseWbs(sampleWbs().replace(/\n### B01[\s\S]*$/u, ''));
  const reconciled = reconcileQueue(withoutLater, queue);

  assert.equal(reconciled.tasks.B01, undefined);
  assert.equal(reconciled.retiredTasks.B01.status, 'complete');
  assert.equal(reconciled.retiredTasks.B01.reconciliationRequired, true);
});

test('ledger and executor packet expose the C10 gate and assignment context', () => {
  const parsed = parseWbs(repositoryWbs);
  const queue = createQueue(parsed);
  for (const id of ['A01', 'A02', 'A03', 'A04', 'A05', 'A06'])
    complete(queue, id);
  const ledger = renderLedger(parsed, queue);
  const packet = renderExecutorPacket(parsed, queue, 'A07');

  assert.match(ledger, /Goal 1 dispatch lane/u);
  assert.match(ledger, /\| 1 \| A07 .*\| ready \|/u);
  assert.match(ledger, /configuration-panel-planning/u);
  assert.match(packet, /Eligibility: \*\*ready\*\*/u);
  assert.match(packet, /Goal 1 acceptance gate: \*\*C10\*\*/u);
  assert.match(packet, /commercial account, authentication, framework/u);
});

test('ledger links local evidence and preserves unintegrated branch evidence without broken links', () => {
  const parsed = parseWbs(sampleWbs());
  const queue = createQueue(parsed);
  complete(queue, 'A01');
  queue.tasks.A01.evidence = [
    'docs/core-and-hosted-implementation-work-breakdown.md',
    'src/application/configuration/branch-only-evidence.ts',
  ];

  const ledger = renderLedger(parsed, queue);
  assert.match(
    ledger,
    /\[docs\/core-and-hosted-implementation-work-breakdown\.md\]\(\.\.\/docs\/core-and-hosted-implementation-work-breakdown\.md\)/u,
  );
  assert.match(
    ledger,
    /`src\/application\/configuration\/branch-only-evidence\.ts`/u,
  );
  assert.doesNotMatch(
    ledger,
    /\(\.\.\/src\/application\/configuration\/branch-only-evidence\.ts\)/u,
  );
});

test('active assignment metadata and completion evidence are mandatory', () => {
  const parsed = parseWbs(sampleWbs());
  const queue = createQueue(parsed);
  queue.tasks.A01.status = 'in_progress';

  const failures = validateQueue(parsed, queue).join('\n');
  assert.match(failures, /owner is required/u);
  assert.match(failures, /executor is required/u);
  assert.match(failures, /branch is required/u);
  assert.match(failures, /worktree is required/u);
  assert.match(failures, /startedOn/u);
});
