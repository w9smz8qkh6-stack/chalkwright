import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);

export const knowledgeSourceRelativePath = 'docs/project-knowledge.json';
export const projectStateRelativePath = 'docs/project-state.md';

const capabilityStatuses = new Set([
  'documented-production',
  'implemented',
  'fixture-supported',
  'planned',
  'deferred',
]);
const workstreamStatuses = new Set(['active', 'blocked', 'paused', 'complete']);
const liveWorkstreamStatuses = new Set(['active', 'blocked', 'paused']);

function command(root, executable, args) {
  return spawnSync(executable, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    timeout: 5_000,
  });
}

function repositoryFiles(root) {
  const result = command(root, 'git', [
    'ls-files',
    '-z',
    '--cached',
    '--others',
    '--exclude-standard',
  ]);
  if (result.status === 0) {
    return result.stdout.split('\0').filter(Boolean).sort();
  }

  const walk = (directory) =>
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      if (['.git', 'dist', 'node_modules', '.test-dist'].includes(entry.name)) {
        return [];
      }
      const path = join(directory, entry.name);
      return entry.isDirectory()
        ? walk(path)
        : [relative(root, path).replaceAll('\\', '/')];
    });
  return walk(root).sort();
}

export function isImplementationPath(path) {
  return (
    /^(?:src|test|scripts|systemd)\//u.test(path) ||
    /^(?:package(?:-lock)?\.json|tsconfig[^/]*\.json|\.codex\/config\.toml)$/u.test(
      path,
    )
  );
}

export function collectImplementationFingerprint(root = defaultRoot) {
  const hash = createHash('sha256');
  const files = repositoryFiles(root).filter(isImplementationPath);
  for (const path of files) {
    const absolute = join(root, path);
    const stat = lstatSync(absolute);
    hash.update(path);
    hash.update('\0');
    if (stat.isSymbolicLink()) {
      hash.update(`symlink:${readFileSync(absolute, 'utf8')}`);
    } else {
      hash.update(readFileSync(absolute));
    }
    hash.update('\0');
  }
  return { fingerprint: hash.digest('hex'), files: files.length };
}

export function loadProjectKnowledge(root = defaultRoot) {
  return JSON.parse(
    readFileSync(join(root, knowledgeSourceRelativePath), 'utf8'),
  );
}

function requiredString(value, label, failures) {
  if (typeof value !== 'string' || value.trim() === '') {
    failures.push(`${label} must be a non-empty string.`);
  }
}

function requiredStrings(value, label, failures) {
  if (!Array.isArray(value) || value.length === 0) {
    failures.push(`${label} must be a non-empty array.`);
    return;
  }
  value.forEach((entry, index) =>
    requiredString(entry, `${label}[${index}]`, failures),
  );
}

function validateEvidencePaths(root, paths, label, failures) {
  requiredStrings(paths, label, failures);
  if (!Array.isArray(paths)) return;
  for (const path of paths) {
    if (typeof path === 'string' && !existsSync(join(root, path))) {
      failures.push(`${label} references missing path: ${path}`);
    }
  }
}

function reviewAge(reviewedOn, now = new Date()) {
  const reviewed = new Date(`${reviewedOn}T00:00:00Z`);
  if (Number.isNaN(reviewed.valueOf())) return Number.POSITIVE_INFINITY;
  return Math.floor((now.valueOf() - reviewed.valueOf()) / 86_400_000);
}

export function validateProjectKnowledge(
  knowledge,
  { root = defaultRoot, now = new Date(), checkFingerprint = true } = {},
) {
  const failures = [];
  if (knowledge.schemaVersion !== 1) {
    failures.push('schemaVersion must be 1.');
  }
  requiredString(knowledge.review?.reviewedOn, 'review.reviewedOn', failures);
  requiredString(
    knowledge.review?.implementationFingerprint,
    'review.implementationFingerprint',
    failures,
  );
  requiredString(knowledge.review?.statement, 'review.statement', failures);
  if (
    !Number.isInteger(knowledge.review?.maximumAgeDays) ||
    knowledge.review.maximumAgeDays < 1
  ) {
    failures.push('review.maximumAgeDays must be a positive integer.');
  }
  requiredString(knowledge.project?.phase, 'project.phase', failures);
  requiredString(knowledge.project?.milestone, 'project.milestone', failures);
  requiredString(knowledge.project?.summary, 'project.summary', failures);
  requiredString(knowledge.deployment?.status, 'deployment.status', failures);
  requiredString(knowledge.deployment?.summary, 'deployment.summary', failures);
  requiredString(
    knowledge.deployment?.evidenceBasis,
    'deployment.evidenceBasis',
    failures,
  );
  validateEvidencePaths(
    root,
    knowledge.deployment?.evidence,
    'deployment.evidence',
    failures,
  );
  requiredStrings(knowledge.priorities, 'priorities', failures);
  requiredStrings(knowledge.knownLimits, 'knownLimits', failures);
  requiredStrings(knowledge.nextDecisions, 'nextDecisions', failures);

  const capabilityIds = new Set();
  if (
    !Array.isArray(knowledge.capabilities) ||
    knowledge.capabilities.length === 0
  ) {
    failures.push('capabilities must be a non-empty array.');
  } else {
    for (const [index, capability] of knowledge.capabilities.entries()) {
      const label = `capabilities[${index}]`;
      requiredString(capability.id, `${label}.id`, failures);
      requiredString(capability.name, `${label}.name`, failures);
      requiredString(capability.summary, `${label}.summary`, failures);
      requiredString(capability.safety, `${label}.safety`, failures);
      if (!capabilityStatuses.has(capability.status)) {
        failures.push(
          `${label}.status is not recognized: ${capability.status}`,
        );
      }
      if (capabilityIds.has(capability.id)) {
        failures.push(`Duplicate capability id: ${capability.id}`);
      }
      capabilityIds.add(capability.id);
      validateEvidencePaths(
        root,
        capability.implementation,
        `${label}.implementation`,
        failures,
      );
      validateEvidencePaths(root, capability.tests, `${label}.tests`, failures);
      validateEvidencePaths(
        root,
        capability.documentation,
        `${label}.documentation`,
        failures,
      );
    }
  }

  const workstreamIds = new Set();
  if (
    !Array.isArray(knowledge.workstreams) ||
    knowledge.workstreams.length === 0
  ) {
    failures.push('workstreams must be a non-empty array.');
  } else {
    for (const [index, workstream] of knowledge.workstreams.entries()) {
      const label = `workstreams[${index}]`;
      requiredString(workstream.id, `${label}.id`, failures);
      requiredString(workstream.name, `${label}.name`, failures);
      requiredString(workstream.outcome, `${label}.outcome`, failures);
      requiredString(
        workstream.currentState,
        `${label}.currentState`,
        failures,
      );
      requiredStrings(workstream.nextSteps, `${label}.nextSteps`, failures);
      requiredStrings(workstream.scope, `${label}.scope`, failures);
      validateEvidencePaths(
        root,
        workstream.documentation,
        `${label}.documentation`,
        failures,
      );
      if (!workstreamStatuses.has(workstream.status)) {
        failures.push(
          `${label}.status is not recognized: ${workstream.status}`,
        );
      }
      if (workstreamIds.has(workstream.id)) {
        failures.push(`Duplicate workstream id: ${workstream.id}`);
      }
      workstreamIds.add(workstream.id);
      for (const id of workstream.capabilities ?? []) {
        if (!capabilityIds.has(id)) {
          failures.push(`${label} references unknown capability: ${id}`);
        }
      }
    }
  }

  const ageDays = reviewAge(knowledge.review?.reviewedOn, now);
  if (ageDays > (knowledge.review?.maximumAgeDays ?? 0)) {
    failures.push(
      `Project knowledge review is ${ageDays} days old; maximum is ${knowledge.review?.maximumAgeDays}.`,
    );
  }

  const implementation = collectImplementationFingerprint(root);
  const fingerprintCurrent =
    knowledge.review?.implementationFingerprint === implementation.fingerprint;
  if (checkFingerprint && !fingerprintCurrent) {
    failures.push(
      `Implementation fingerprint changed (${implementation.fingerprint}); review docs/project-knowledge.json semantically and record the new fingerprint.`,
    );
  }

  return {
    failures,
    implementation,
    fingerprintCurrent,
    reviewAgeDays: ageDays,
  };
}

function globRegex(pattern) {
  let output = '^';
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (character === '*' && pattern[index + 1] === '*') {
      output += '.*';
      index += 1;
    } else if (character === '*') {
      output += '[^/]*';
    } else if (character === '?') {
      output += '[^/]';
    } else {
      output += character.replace(/[|\\{}()[\]^$+?.]/gu, '\\$&');
    }
  }
  return new RegExp(`${output}$`, 'u');
}

export function scopeMatches(path, patterns) {
  return patterns.some((pattern) => globRegex(pattern).test(path));
}

export function collectWorkingTreePaths(root = defaultRoot) {
  const result = command(root, 'git', [
    'status',
    '--short',
    '--untracked-files=normal',
  ]);
  if (result.status !== 0) return [];
  return result.stdout
    .trimEnd()
    .split('\n')
    .filter(Boolean)
    .map((line) => line.slice(3).split(' -> ').at(-1))
    .filter(Boolean);
}

export function analyzeWorkstreams(
  knowledge,
  paths = collectWorkingTreePaths(defaultRoot),
) {
  const live = knowledge.workstreams.filter(({ status }) =>
    liveWorkstreamStatuses.has(status),
  );
  const governed = paths.filter(
    (path) =>
      !path.startsWith('output/') &&
      path !== projectStateRelativePath &&
      path !== '.codex/project-context.generated.md',
  );
  const workstreams = live.map((workstream) => ({
    ...workstream,
    changedEntries: governed.filter((path) =>
      scopeMatches(path, workstream.scope),
    ).length,
  }));
  const unclassified = governed.filter(
    (path) => !live.some(({ scope }) => scopeMatches(path, scope)),
  );
  return {
    workstreams,
    governedEntries: governed.length,
    localArtifactEntries: paths.length - governed.length,
    unclassifiedEntries: unclassified.length,
    unclassified,
  };
}

function markdownLink(path) {
  return `[\`${path}\`](${encodeURI(path.replace(/^docs\//u, ''))})`;
}

function rootLink(path) {
  return path.startsWith('docs/')
    ? markdownLink(path)
    : `[\`${path}\`](../${encodeURI(path)})`;
}

function text(value) {
  return value.replaceAll('|', '\\|');
}

export function renderProjectState(knowledge, validation) {
  const capabilities = knowledge.capabilities
    .map(
      (capability) =>
        `| \`${capability.id}\` | ${text(capability.name)} | \`${capability.status}\` | ${text(capability.summary)} | ${capability.documentation.map(rootLink).join(', ')} |`,
    )
    .join('\n');
  const workstreams = knowledge.workstreams
    .filter(({ status }) => liveWorkstreamStatuses.has(status))
    .map(
      (workstream) => `### ${workstream.name}

- Status: \`${workstream.status}\`
- Outcome: ${workstream.outcome}
- Present state: ${workstream.currentState}
- Capabilities: ${workstream.capabilities.map((id) => `\`${id}\``).join(', ')}
- Next: ${workstream.nextSteps.join(' ')}
- Documentation: ${workstream.documentation.map(rootLink).join(', ')}
`,
    )
    .join('\n');
  const bullets = (values) => values.map((value) => `- ${value}`).join('\n');

  return `<!-- Generated from docs/project-knowledge.json by scripts/codex/project-knowledge.mjs. Do not edit. -->

<!-- prettier-ignore-start -->

# Current Chalkwright project state

This is the canonical, compact semantic state of the repository. Edit
\`docs/project-knowledge.json\`, review it against implementation and operating
evidence, record the new implementation fingerprint, and run \`npm run
docs:sync\`. Repository documentation is not a live-service probe.

## Freshness contract

- Reviewed: \`${knowledge.review.reviewedOn}\` (${validation.reviewAgeDays} days ago; maximum ${knowledge.review.maximumAgeDays})
- Implementation files covered: ${validation.implementation.files}
- Implementation fingerprint: \`${validation.implementation.fingerprint}\`
- Semantic review: ${validation.fingerprintCurrent ? '**CURRENT**' : '**STALE — review required**'}
- Review statement: ${knowledge.review.statement}
- Working-tree classification is evaluated live by hooks and documentation gates; volatile change counts are intentionally excluded from this tracked view.

## Development position

- Phase: **${knowledge.project.phase}**
- Milestone: **${knowledge.project.milestone}**
- Release: \`${knowledge.project.release}\`
- Summary: ${knowledge.project.summary}

## Documented deployment state

- Status: \`${knowledge.deployment.status}\`
- Summary: ${knowledge.deployment.summary}
- Evidence basis: ${knowledge.deployment.evidenceBasis}
- Evidence: ${knowledge.deployment.evidence.map(rootLink).join(', ')}

## Current priorities

${bullets(knowledge.priorities)}

## Capability registry

Statuses are deliberately explicit: \`documented-production\` is a reviewed
repository claim, not a fresh service probe; \`implemented\` may still require
separate activation authority; \`fixture-supported\`, \`planned\`, and
\`deferred\` describe narrower maturity.

| ID | Capability | Status | Present behavior | Primary documentation |
| --- | --- | --- | --- | --- |
${capabilities}

## Active workstreams

${workstreams}
## Known limits

${bullets(knowledge.knownLimits)}

## Next decisions

${bullets(knowledge.nextDecisions)}
<!-- prettier-ignore-end -->
`;
}

export function renderKnowledgeDigest(knowledge, validation, analysis) {
  const groupedCapabilities = Object.groupBy(
    knowledge.capabilities,
    ({ status }) => status,
  );
  const capabilitySummary = Object.entries(groupedCapabilities)
    .map(
      ([status, capabilities]) =>
        `${status}=${capabilities.map(({ id }) => id).join(',')}`,
    )
    .join('; ');
  const workstreamSummary = analysis.workstreams
    .map(
      ({ id, status, changedEntries, currentState }) =>
        `${id}[${status},changes=${changedEntries}]: ${currentState}`,
    )
    .join(' | ');
  const freshness =
    validation.failures.length === 0 && analysis.unclassifiedEntries === 0
      ? 'CURRENT'
      : `REVIEW_REQUIRED (${validation.failures.length} validation issue(s), ${analysis.unclassifiedEntries} unclassified change(s))`;

  return `CHALKWRIGHT_PROJECT_STATE
freshness=${freshness}; reviewed=${knowledge.review.reviewedOn}; implementation_files=${validation.implementation.files}
phase=${knowledge.project.phase}; milestone=${knowledge.project.milestone}; release=${knowledge.project.release}
deployment=${knowledge.deployment.status}: ${knowledge.deployment.summary} Evidence basis: ${knowledge.deployment.evidenceBasis}
priorities=${knowledge.priorities.join(' | ')}
capabilities=${capabilitySummary}
workstreams=${workstreamSummary || 'none'}
limits=${knowledge.knownLimits.join(' | ')}
Use docs/project-state.md for the readable state and docs/project-knowledge.json for structured evidence. Treat documented deployment claims as unverified unless the current task performed an authorized live probe.
END_CHALKWRIGHT_PROJECT_STATE`;
}

function main() {
  if (process.argv.includes('--fingerprint')) {
    const implementation = collectImplementationFingerprint(defaultRoot);
    process.stdout.write(
      `${implementation.fingerprint} (${implementation.files} implementation files)\n`,
    );
    return;
  }

  const knowledge = loadProjectKnowledge(defaultRoot);
  const validation = validateProjectKnowledge(knowledge, {
    root: defaultRoot,
    checkFingerprint: true,
  });
  const analysis = analyzeWorkstreams(
    knowledge,
    collectWorkingTreePaths(defaultRoot),
  );
  for (const failure of validation.failures) {
    process.stderr.write(`${failure}\n`);
  }
  if (analysis.unclassifiedEntries > 0) {
    process.stderr.write(
      `${analysis.unclassifiedEntries} working-tree change(s) are not assigned to an active project workstream.\n`,
    );
  }
  if (validation.failures.length > 0 || analysis.unclassifiedEntries > 0) {
    process.exitCode = 1;
    return;
  }
  process.stdout.write('Project knowledge is current and fully classified.\n');
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) main();
