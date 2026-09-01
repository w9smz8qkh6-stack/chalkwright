import { createHash } from 'node:crypto';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const wbsRelativePath =
  'docs/core-and-hosted-implementation-work-breakdown.md';
export const queueRelativePath = 'docs/core-and-hosted-work-queue.json';
export const ledgerRelativePath = 'docs/core-and-hosted-work-queue.md';

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);

const taskStatuses = new Set([
  'pending',
  'in_progress',
  'review',
  'blocked',
  'complete',
  'superseded',
]);

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

function normalize(value) {
  return value.replaceAll('\r\n', '\n');
}

function extractParagraph(block, label) {
  const match = block.match(
    new RegExp(`(?:^|\\n)${label}: ([\\s\\S]*?)(?=\\n\\n|$)`, 'u'),
  );
  return match?.[1].replaceAll('\n', ' ').trim() ?? '';
}

export function expandTaskReferences(value) {
  const expanded = value.replace(
    /\b([A-Z])(\d{2})[–-]([A-Z]?)(\d{2})\b/gu,
    (range, startPrefix, startNumber, endPrefix, endNumber) => {
      const finalPrefix = endPrefix || startPrefix;
      if (startPrefix !== finalPrefix) return range;
      const start = Number.parseInt(startNumber, 10);
      const end = Number.parseInt(endNumber, 10);
      if (end < start || end - start > 99) return range;
      return Array.from(
        { length: end - start + 1 },
        (_, offset) =>
          `${startPrefix}${String(start + offset).padStart(2, '0')}`,
      ).join(', ');
    },
  );
  return [...new Set(expanded.match(/\b[A-Z]\d{2}\b/gu) ?? [])];
}

function parseSchedulingPolicy(source, failures) {
  const section = source.match(
    /^## Queue scheduling policy[\s\S]*?(?=^## .+$)/mu,
  )?.[0];
  if (!section) {
    failures.push('WBS does not define a Queue scheduling policy section.');
    return { goal1Sequence: [], acceptanceGate: '' };
  }

  const sequenceParagraph = section.match(
    /^\s*- \*\*Goal 1 sequence:\*\* ([^\n]+)$/mu,
  )?.[1];
  const gate = section.match(
    /^\s*- \*\*Goal 1 acceptance gate:\*\* ([A-Z]\d{2})\.?$/mu,
  )?.[1];
  const goal1Sequence = expandTaskReferences(sequenceParagraph ?? '');
  if (goal1Sequence.length === 0) {
    failures.push('Queue scheduling policy has no Goal 1 sequence.');
  }
  if (!gate) {
    failures.push('Queue scheduling policy has no Goal 1 acceptance gate.');
  }
  return { goal1Sequence, acceptanceGate: gate ?? '' };
}

export function parseWbs(markdown) {
  const source = normalize(markdown);
  const failures = [];
  const taskMatches = [...source.matchAll(/^### ([A-Z]\d{2}) — (.+)$/gmu)];
  const phaseMatches = [...source.matchAll(/^## (Phase .+)$/gmu)];
  const seen = new Set();

  const tasks = taskMatches.map((match, index) => {
    const id = match[1];
    if (seen.has(id)) failures.push(`Duplicate WBS task id: ${id}`);
    seen.add(id);

    const start = match.index;
    const nextTask = taskMatches[index + 1]?.index ?? source.length;
    const nextSectionOffset = source
      .slice(start + match[0].length)
      .search(/^## .+$/mu);
    const nextSection =
      nextSectionOffset === -1
        ? source.length
        : start + match[0].length + nextSectionOffset;
    const block = source
      .slice(start, Math.min(nextTask, nextSection))
      .trimEnd();
    const phase = [...phaseMatches]
      .reverse()
      .find((candidate) => candidate.index < start)?.[1];
    const body = block.slice(block.indexOf('\n') + 1).trim();
    const dependsOn = extractParagraph(body, 'Depends on');
    const completeWhen = extractParagraph(body, 'Complete when');
    const objective = body
      .split('\n\nDepends on:')[0]
      .replaceAll('\n', ' ')
      .trim();

    if (!phase) failures.push(`${id} is not contained in a WBS phase.`);
    if (!dependsOn) failures.push(`${id} does not define Depends on.`);
    if (!completeWhen) failures.push(`${id} does not define Complete when.`);

    return {
      id,
      title: match[2].trim(),
      phase: phase ?? 'Unassigned phase',
      objective,
      dependencies:
        dependsOn.toLowerCase() === 'none'
          ? []
          : expandTaskReferences(dependsOn),
      completeWhen,
      definitionFingerprint: hash(`${block}\n`),
      order: index,
    };
  });

  const ids = new Set(tasks.map(({ id }) => id));
  for (const task of tasks) {
    for (const dependency of task.dependencies) {
      if (!ids.has(dependency)) {
        failures.push(
          `${task.id} references unknown dependency ${dependency}.`,
        );
      }
      if (dependency === task.id)
        failures.push(`${task.id} depends on itself.`);
    }
  }

  const visiting = new Set();
  const visited = new Set();
  const byId = new Map(tasks.map((task) => [task.id, task]));
  function visit(id, path = []) {
    if (visiting.has(id)) {
      failures.push(`WBS dependency cycle: ${[...path, id].join(' -> ')}`);
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of byId.get(id)?.dependencies ?? []) {
      if (byId.has(dependency)) visit(dependency, [...path, id]);
    }
    visiting.delete(id);
    visited.add(id);
  }
  for (const task of tasks) visit(task.id);

  const schedulingPolicy = parseSchedulingPolicy(source, failures);
  for (const id of schedulingPolicy.goal1Sequence) {
    if (!ids.has(id)) failures.push(`Goal 1 references unknown task ${id}.`);
  }
  if (!ids.has(schedulingPolicy.acceptanceGate)) {
    failures.push(
      `Goal 1 acceptance gate references unknown task ${schedulingPolicy.acceptanceGate}.`,
    );
  }
  if (
    schedulingPolicy.goal1Sequence.at(-1) !== schedulingPolicy.acceptanceGate
  ) {
    failures.push('Goal 1 acceptance gate must be the final sequence task.');
  }

  return {
    source,
    fingerprint: hash(source),
    tasks,
    schedulingPolicy,
    failures,
  };
}

function defaultTaskState(task) {
  return {
    definitionFingerprint: task.definitionFingerprint,
    status: 'pending',
    owner: null,
    executor: null,
    branch: null,
    worktree: null,
    startedOn: null,
    completedOn: null,
    blockers: [],
    evidence: [],
    notes: [],
    supersededBy: [],
  };
}

function isPristinePending(state) {
  return (
    state.status === 'pending' &&
    state.owner === null &&
    state.executor === null &&
    state.branch === null &&
    state.worktree === null &&
    state.startedOn === null &&
    state.completedOn === null &&
    (state.blockers?.length ?? 0) === 0 &&
    (state.evidence?.length ?? 0) === 0 &&
    (state.notes?.length ?? 0) === 0
  );
}

export function createQueue(parsed) {
  return {
    schemaVersion: 2,
    wbsPath: wbsRelativePath,
    wbsFingerprint: parsed.fingerprint,
    schedulingPolicy: structuredClone(parsed.schedulingPolicy),
    projectKnowledge: {
      source: 'docs/project-knowledge.json',
      workstreamId: 'configuration-panel-planning',
    },
    tasks: Object.fromEntries(
      parsed.tasks.map((task) => [task.id, defaultTaskState(task)]),
    ),
    retiredTasks: {},
  };
}

export function reconcileQueue(parsed, current) {
  const queue = structuredClone(current ?? createQueue(parsed));
  queue.schemaVersion = 2;
  queue.wbsPath = wbsRelativePath;
  queue.wbsFingerprint = parsed.fingerprint;
  queue.schedulingPolicy = structuredClone(parsed.schedulingPolicy);
  queue.projectKnowledge = {
    source: 'docs/project-knowledge.json',
    workstreamId: 'configuration-panel-planning',
  };
  queue.tasks ??= {};
  queue.retiredTasks ??= {};

  const currentIds = new Set(parsed.tasks.map(({ id }) => id));
  for (const task of parsed.tasks) {
    if (!queue.tasks[task.id] && queue.retiredTasks[task.id]) {
      queue.tasks[task.id] = queue.retiredTasks[task.id];
      delete queue.retiredTasks[task.id];
    }
    const state = queue.tasks[task.id];
    if (!state) {
      queue.tasks[task.id] = defaultTaskState(task);
      continue;
    }
    if (state.definitionFingerprint !== task.definitionFingerprint) {
      if (isPristinePending(state)) {
        state.definitionFingerprint = task.definitionFingerprint;
        delete state.reconciliation;
      } else {
        state.reconciliation = {
          reason: 'wbs-definition-changed',
          acceptedDefinitionFingerprint: state.definitionFingerprint,
          currentDefinitionFingerprint: task.definitionFingerprint,
        };
      }
    } else {
      delete state.reconciliation;
    }
  }

  for (const [id, state] of Object.entries(queue.tasks)) {
    if (currentIds.has(id)) continue;
    queue.retiredTasks[id] = {
      ...state,
      retiredBecause: 'removed-from-wbs',
      reconciliationRequired: !isPristinePending(state),
    };
    delete queue.tasks[id];
  }

  queue.tasks = Object.fromEntries(
    parsed.tasks.map(({ id }) => [id, queue.tasks[id]]),
  );
  queue.retiredTasks = Object.fromEntries(
    Object.entries(queue.retiredTasks).sort(([left], [right]) =>
      left.localeCompare(right),
    ),
  );
  return queue;
}

function validIsoDate(value) {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z)?$/u.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

function requiredStrings(value, label, failures) {
  if (
    !Array.isArray(value) ||
    value.some((entry) => typeof entry !== 'string' || entry.trim() === '')
  ) {
    failures.push(`${label} must be an array of non-empty strings.`);
  }
}

export function validateQueue(parsed, queue) {
  const failures = [...parsed.failures];
  if (queue.schemaVersion !== 2)
    failures.push('Queue schemaVersion must be 2.');
  if (queue.wbsPath !== wbsRelativePath) {
    failures.push(`Queue wbsPath must be ${wbsRelativePath}.`);
  }
  if (queue.wbsFingerprint !== parsed.fingerprint) {
    failures.push(
      'Queue is not synchronized with the current WBS fingerprint.',
    );
  }
  if (
    JSON.stringify(queue.schedulingPolicy) !==
    JSON.stringify(parsed.schedulingPolicy)
  ) {
    failures.push('Queue scheduling policy is not synchronized with the WBS.');
  }

  const taskIds = new Set(parsed.tasks.map(({ id }) => id));
  for (const task of parsed.tasks) {
    const state = queue.tasks?.[task.id];
    const label = `tasks.${task.id}`;
    if (!state) {
      failures.push(`Queue is missing ${task.id}.`);
      continue;
    }
    if (!taskStatuses.has(state.status)) {
      failures.push(`${label}.status is not recognized: ${state.status}`);
    }
    if (state.reconciliation) {
      failures.push(
        `${task.id} changed in the WBS after assignment or evidence; reconcile its scope and status explicitly.`,
      );
    }
    requiredStrings(state.blockers, `${label}.blockers`, failures);
    requiredStrings(state.evidence, `${label}.evidence`, failures);
    requiredStrings(state.notes, `${label}.notes`, failures);
    requiredStrings(state.supersededBy, `${label}.supersededBy`, failures);

    if (['in_progress', 'review'].includes(state.status)) {
      for (const field of ['owner', 'executor', 'branch', 'worktree']) {
        if (typeof state[field] !== 'string' || state[field].trim() === '') {
          failures.push(`${label}.${field} is required for ${state.status}.`);
        }
      }
      if (
        typeof state.branch === 'string' &&
        !state.branch.startsWith('codex/')
      ) {
        failures.push(`${label}.branch must use the codex/ prefix.`);
      }
      if (typeof state.worktree === 'string' && !isAbsolute(state.worktree)) {
        failures.push(`${label}.worktree must be an absolute path.`);
      }
      if (!validIsoDate(state.startedOn)) {
        failures.push(`${label}.startedOn must be an ISO date or timestamp.`);
      }
    }
    if (state.status === 'blocked' && state.blockers.length === 0) {
      failures.push(`${label}.blockers is required for blocked status.`);
    }
    if (state.status === 'complete') {
      if (state.evidence.length === 0) {
        failures.push(`${label}.evidence is required for complete status.`);
      }
      if (!validIsoDate(state.completedOn)) {
        failures.push(`${label}.completedOn must be an ISO date or timestamp.`);
      }
    }
    if (state.status === 'superseded') {
      if (state.supersededBy.length === 0) {
        failures.push(
          `${label}.supersededBy is required for superseded status.`,
        );
      }
      for (const replacement of state.supersededBy) {
        if (!taskIds.has(replacement)) {
          failures.push(
            `${label} references unknown replacement ${replacement}.`,
          );
        }
      }
    }
  }

  for (const id of Object.keys(queue.tasks ?? {})) {
    if (!taskIds.has(id))
      failures.push(`Queue contains unknown active task ${id}.`);
  }
  for (const [id, state] of Object.entries(queue.retiredTasks ?? {})) {
    if (state.reconciliationRequired) {
      failures.push(
        `Retired task ${id} had assignment, evidence, or changed state; reconcile its history explicitly.`,
      );
    }
  }
  return failures;
}

function replacementSatisfied(state, queue) {
  return (
    state.status === 'superseded' &&
    state.supersededBy.length > 0 &&
    state.supersededBy.every((id) => queue.tasks[id]?.status === 'complete')
  );
}

function completed(id, queue) {
  const state = queue.tasks[id];
  return state?.status === 'complete' || replacementSatisfied(state, queue);
}

function dependenciesSatisfied(task, queue) {
  return task.dependencies.every((id) => completed(id, queue));
}

export function dispatchState(task, queue) {
  const state = queue.tasks[task.id];
  if (state.reconciliation) return 'reconcile';
  if (state.status !== 'pending') return state.status;

  const { acceptanceGate, goal1Sequence } = queue.schedulingPolicy;
  if (!completed(acceptanceGate, queue)) {
    const nextGoalTask = goal1Sequence.find((id) => !completed(id, queue));
    if (task.id !== nextGoalTask) {
      return goal1Sequence.includes(task.id) ? 'waiting' : 'gated';
    }
  }
  return dependenciesSatisfied(task, queue) ? 'ready' : 'waiting';
}

function markdownCell(value) {
  return String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function rootLink(value) {
  if (/^https?:\/\//u.test(value)) return `[link](${value})`;
  // Completed work can live on an accepted isolated branch that has not been
  // integrated into this planning worktree yet. Preserve that evidence path
  // without emitting a broken local-document link.
  if (!existsSync(resolve(repositoryRoot, value))) return `\`${value}\``;
  return `[${value}](../${value})`;
}

export function renderLedger(parsed, queue) {
  const states = parsed.tasks.map((task) => ({
    task,
    state: queue.tasks[task.id],
    dispatch: dispatchState(task, queue),
  }));
  const counts = Object.groupBy(states, ({ dispatch }) => dispatch);
  const count = (name) => counts[name]?.length ?? 0;
  const ready = states.filter(({ dispatch }) => dispatch === 'ready');
  const reconcile = states.filter(({ dispatch }) => dispatch === 'reconcile');
  const phases = [...new Set(parsed.tasks.map(({ phase }) => phase))];
  const goalRows = queue.schedulingPolicy.goal1Sequence
    .map((id, index) => {
      const task = parsed.tasks.find((candidate) => candidate.id === id);
      return `| ${index + 1} | ${id} | ${markdownCell(task.title)} | ${dispatchState(task, queue)} |`;
    })
    .join('\n');
  const tables = phases
    .map((phase) => {
      const rows = states
        .filter(({ task }) => task.phase === phase)
        .map(({ task, state, dispatch }) => {
          const evidence = state.evidence.length
            ? state.evidence.map(rootLink).join(', ')
            : '—';
          return `| ${task.id} | ${markdownCell(task.title)} | ${dispatch} | ${task.dependencies.join(', ') || '—'} | ${markdownCell(state.owner ?? '—')} | ${markdownCell(state.branch ?? '—')} | ${evidence} |`;
        })
        .join('\n');
      return `## ${phase}\n\n| Task | Outcome | Dispatch state | Dependencies | Owner | Branch | Evidence |\n| --- | --- | --- | --- | --- | --- | --- |\n${rows}`;
    })
    .join('\n\n');

  return `<!-- Generated from ${wbsRelativePath} and ${queueRelativePath} by scripts/codex/wbs-queue.mjs. Do not edit. -->

# Chalkwright Core Operator-First Task and Execution Ledger

- Authoritative WBS: [${wbsRelativePath}](${wbsRelativePath.replace(/^docs\//u, '')})
- Task status overlay: [${queueRelativePath}](${queueRelativePath.replace(/^docs\//u, '')})
- WBS fingerprint: \`${parsed.fingerprint}\`
- Tasks: ${parsed.tasks.length}; ready ${count('ready')}; gated ${count('gated')}; waiting ${count('waiting')}; in progress ${count('in_progress')}; review ${count('review')}; blocked ${count('blocked')}; complete ${count('complete')}; reconciliation ${count('reconcile')}.

## Goal 1 dispatch lane

Only the next incomplete row is dispatchable before **${queue.schedulingPolicy.acceptanceGate}**. After that acceptance gate, ordinary WBS dependency scheduling resumes; B01 Core hardening and D00 commercial architecture selection can become ready independently.

| Order | Task | Outcome | Dispatch state |
| --- | --- | --- | --- |
${goalRows}

## Orchestration contract

The WBS owns task definitions, ordering policy, dependencies, and completion
criteria. The JSON overlay owns execution status, accountable owner, executor,
branch, worktree, blockers, evidence, and notes. This generated ledger combines
them without copying mutable task definitions into the overlay.

Run \`npm run wbs:sync\` after changing the WBS or status overlay. New WBS tasks
enter as pending. Untouched pending definition changes synchronize
automatically. Changes to assigned, blocked, reviewed, or completed tasks create
a mandatory reconciliation finding. Removed tasks remain in the JSON archive;
worked or evidenced removals require explicit review.

At dispatch, the orchestrator updates the
\`${queue.projectKnowledge.workstreamId}\` workstream in
\`${queue.projectKnowledge.source}\`, assigns one isolated \`codex/\` branch and
worktree, and generates an executor packet with \`npm run wbs:packet -- <ID>\`.
The orchestrator reviews the handoff and evidence before changing task status or
allowing dependent work.

## Ready to dispatch

${ready.length ? ready.map(({ task }) => `- **${task.id}:** ${task.title}`).join('\n') : '- None.'}

## Reconciliation required

${reconcile.length ? reconcile.map(({ task }) => `- **${task.id}:** definition changed after work or assignment.`).join('\n') : '- None.'}

${tables}
`;
}

export function renderExecutorPacket(parsed, queue, taskId) {
  const task = parsed.tasks.find(({ id }) => id === taskId);
  if (!task) throw new Error(`Unknown WBS task: ${taskId}`);
  const state = queue.tasks[taskId];
  const dispatch = dispatchState(task, queue);
  const dependencies = task.dependencies.length
    ? task.dependencies
        .map((id) => {
          const dependency = parsed.tasks.find(
            (candidate) => candidate.id === id,
          );
          const dependencyState = queue.tasks[id];
          const evidence = dependencyState.evidence.length
            ? dependencyState.evidence.join(', ')
            : 'none recorded';
          return `- **${id}: ${dependency.title}** — ${dispatchState(dependency, queue)}; evidence: ${evidence}`;
        })
        .join('\n')
    : '- None.';

  return `# Executor Packet — ${task.id}: ${task.title}

## Dispatch state

- Eligibility: **${dispatch}**
- Goal 1 acceptance gate: **${queue.schedulingPolicy.acceptanceGate}**
- WBS definition fingerprint: \`${task.definitionFingerprint}\`
- Phase: ${task.phase}
- Owner: ${state.owner ?? 'unassigned'}
- Executor: ${state.executor ?? 'unassigned'}
- Branch: ${state.branch ?? 'unassigned'}
- Worktree: ${state.worktree ?? 'unassigned'}

## Objective

${task.objective}

## Dependencies and inherited evidence

${dependencies}

## Completion contract

${task.completeWhen}

## Executor instructions

1. Read the applicable AGENTS.md, current project state and knowledge, the WBS,
   this ledger, and governing product and architecture documents.
2. Confirm the assigned isolated \`codex/\` branch and worktree before editing.
3. Implement only this task's outcome. Do not bypass the Goal 1/C10 gate or
   introduce commercial account, authentication, framework, or Core-boundary
   work before D00 is eligible and accepted.
4. Add focused evidence, run the required checks, and review the final diff for
   scope, security, privacy, and documentation accuracy.
5. Update governing documentation, the Unreleased changelog, and the active
   project-knowledge workstream in the same task.
6. Return the handoff below. The executor recommends a transition; the
   orchestrator alone records acceptance in the queue.

## Required handoff

- **Outcome:** what now works.
- **Changed files and contracts:** concise list.
- **Verification:** exact commands and results.
- **Evidence:** repository paths or approved external links.
- **Documentation:** references reviewed and updated.
- **Risks or uncertainty:** residual issues and unverified areas.
- **Recommended queue transition:** review, blocked, or ready for orchestrator
  acceptance.
`;
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function atomicWrite(path, content) {
  const temporary = `${path}.tmp`;
  writeFileSync(temporary, content);
  renameSync(temporary, path);
}

function loadRepository() {
  const queuePath = resolve(repositoryRoot, queueRelativePath);
  const parsed = parseWbs(
    readFileSync(resolve(repositoryRoot, wbsRelativePath), 'utf8'),
  );
  const current = existsSync(queuePath)
    ? JSON.parse(readFileSync(queuePath, 'utf8'))
    : undefined;
  return {
    parsed,
    queue: reconcileQueue(parsed, current),
    queuePath,
    ledgerPath: resolve(repositoryRoot, ledgerRelativePath),
  };
}

function printFailures(failures) {
  failures.forEach((failure) => process.stderr.write(`${failure}\n`));
  process.exitCode = 1;
}

function main() {
  const argumentsList = process.argv.slice(2);
  const { parsed, queue, queuePath, ledgerPath } = loadRepository();
  const failures = validateQueue(parsed, queue);

  if (argumentsList[0] === '--packet') {
    if (!argumentsList[1]) throw new Error('Usage: --packet <TASK_ID>');
    if (failures.length) return printFailures(failures);
    process.stdout.write(renderExecutorPacket(parsed, queue, argumentsList[1]));
    return;
  }

  const expectedQueue = stableJson(queue);
  const expectedLedger = renderLedger(parsed, queue);
  if (argumentsList.includes('--write')) {
    atomicWrite(queuePath, expectedQueue);
    atomicWrite(ledgerPath, expectedLedger);
    if (failures.length) return printFailures(failures);
    const ready = parsed.tasks.filter(
      (task) => dispatchState(task, queue) === 'ready',
    );
    process.stdout.write(
      `Synchronized ${parsed.tasks.length} WBS tasks; ready: ${ready.map(({ id }) => id).join(', ') || 'none'}.\n`,
    );
    return;
  }

  const storedQueue = existsSync(queuePath)
    ? readFileSync(queuePath, 'utf8')
    : '';
  const storedLedger = existsSync(ledgerPath)
    ? readFileSync(ledgerPath, 'utf8')
    : '';
  if (storedQueue !== expectedQueue) {
    failures.push(`${queueRelativePath} is stale; run npm run wbs:sync.`);
  }
  if (storedLedger !== expectedLedger) {
    failures.push(`${ledgerRelativePath} is stale; run npm run wbs:sync.`);
  }
  if (failures.length) return printFailures(failures);
  const ready = parsed.tasks.filter(
    (task) => dispatchState(task, queue) === 'ready',
  );
  process.stdout.write(
    `WBS queue is current: ${parsed.tasks.length} tasks; ready: ${ready.map(({ id }) => id).join(', ') || 'none'}.\n`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
    process.exitCode = 1;
  }
}
