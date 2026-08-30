import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  analyzeWorkstreams,
  collectWorkingTreePaths,
  loadProjectKnowledge,
  projectStateRelativePath,
  renderKnowledgeDigest,
  renderProjectState,
  validateProjectKnowledge,
} from './project-knowledge.mjs';

export const generatedStart = '<!-- BEGIN GENERATED PROJECT ENVIRONMENT -->';
export const generatedEnd = '<!-- END GENERATED PROJECT ENVIRONMENT -->';
export const inventoryStart =
  '<!-- BEGIN GENERATED DOCUMENTATION INVENTORY -->';
export const inventoryEnd = '<!-- END GENERATED DOCUMENTATION INVENTORY -->';

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);
const environmentPath = join(repositoryRoot, '.codex', 'environment.md');
const documentationIndexPath = join(repositoryRoot, 'docs', 'README.md');
const generatedContextPath = join(
  repositoryRoot,
  '.codex',
  'project-context.generated.md',
);
const projectStatePath = join(repositoryRoot, projectStateRelativePath);

function lockedVersion(packageLock, name) {
  return packageLock.packages?.[`node_modules/${name}`]?.version ?? 'missing';
}

function directDependencies(declared = {}, packageLock) {
  return Object.entries(declared)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, requirement]) => ({
      name,
      requirement,
      locked: lockedVersion(packageLock, name),
    }));
}

function dependencyTable(dependencies) {
  if (dependencies.length === 0) return '_None._';

  return [
    '| Package | Declared | Locked |',
    '| --- | --- | --- |',
    ...dependencies.map(
      ({ name, requirement, locked }) =>
        `| \`${name}\` | \`${requirement}\` | \`${locked}\` |`,
    ),
  ].join('\n');
}

export function collectProjectFacts(root = repositoryRoot) {
  const packageJson = JSON.parse(
    readFileSync(join(root, 'package.json'), 'utf8'),
  );
  const packageLock = JSON.parse(
    readFileSync(join(root, 'package-lock.json'), 'utf8'),
  );
  const lockRoot = packageLock.packages?.[''] ?? {};

  return {
    name: packageJson.name,
    version: packageJson.version,
    private: packageJson.private === true,
    packageManager: packageJson.packageManager ?? 'not declared',
    nodeEngine: packageJson.engines?.node ?? 'not declared',
    npmEngine: packageJson.engines?.npm ?? 'not declared',
    lockfileVersion: packageLock.lockfileVersion ?? 'unknown',
    productionDependencies: directDependencies(
      lockRoot.dependencies ?? packageJson.dependencies,
      packageLock,
    ),
    developmentDependencies: directDependencies(
      lockRoot.devDependencies ?? packageJson.devDependencies,
      packageLock,
    ),
    scripts: packageJson.scripts ?? {},
  };
}

export function renderProjectFacts(facts) {
  const command = (name) =>
    facts.scripts[name]
      ? `- \`npm run ${name}\`: \`${facts.scripts[name]}\``
      : null;
  const commands = [
    command('check'),
    command('check:portable'),
    command('docs:check'),
    command('docs:sync'),
    command('build'),
    command('start'),
  ].filter(Boolean);

  return `${generatedStart}
## Generated project facts

This section is generated deterministically from \`package.json\` and
\`package-lock.json\`. Do not edit it by hand. Run \`npm run environment:sync\`
after an intentional manifest or lockfile change; \`npm run environment:check\`
fails when it is stale.

- Package: \`${facts.name}\` \`${facts.version}\`${facts.private ? ' (private)' : ''}
- Package manager: \`${facts.packageManager}\`
- Required Node.js: \`${facts.nodeEngine}\`
- Required npm: \`${facts.npmEngine}\`
- npm lockfile format: \`${facts.lockfileVersion}\`

### Direct production dependencies

${dependencyTable(facts.productionDependencies)}

### Direct development dependencies

${dependencyTable(facts.developmentDependencies)}

### Primary commands

${commands.join('\n')}
${generatedEnd}`;
}

function markdownFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(path);
    return entry.isFile() && extname(entry.name).toLowerCase() === '.md'
      ? [path]
      : [];
  });
}

function markdownTitle(path) {
  const contents = readFileSync(path, 'utf8');
  return contents.match(/^#\s+(.+?)\s*$/m)?.[1]?.trim() ?? 'Untitled document';
}

export function collectDocumentation(root = repositoryRoot) {
  const docsRoot = join(root, 'docs');
  return markdownFiles(docsRoot)
    .filter((path) => resolve(path) !== resolve(join(docsRoot, 'README.md')))
    .map((path) => ({
      path: relative(docsRoot, path).replaceAll('\\', '/'),
      title: markdownTitle(path),
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
}

export function renderDocumentationInventory(documents) {
  const rows = documents.map(
    ({ path, title }) => `- [${title}](${encodeURI(path)}) — \`${path}\``,
  );
  return `${inventoryStart}
## Complete generated inventory

This exhaustive list is generated from every Markdown file under \`docs/\`.
The curated sections above explain authority and routing; this inventory makes
new, renamed, and removed documentation discoverable without manual indexing.

${rows.join('\n')}
${inventoryEnd}`;
}

export function replaceGeneratedSection(
  document,
  generated,
  startMarker = generatedStart,
  endMarker = generatedEnd,
  label = '.codex/environment.md',
) {
  const starts = document.split(startMarker).length - 1;
  const ends = document.split(endMarker).length - 1;
  const start = document.indexOf(startMarker);
  const end = document.indexOf(endMarker);
  if (starts !== 1 || ends !== 1 || start === -1 || end < start) {
    throw new Error(
      `Expected one ${startMarker} / ${endMarker} section in ${label}`,
    );
  }

  const afterEnd = end + endMarker.length;
  return `${document.slice(0, start)}${generated}${document.slice(afterEnd)}`;
}

function atomicWriteIfChanged(path, contents, mode = 0o644) {
  let current;
  try {
    current = readFileSync(path, 'utf8');
  } catch {
    current = undefined;
  }
  if (current === contents) return false;

  mkdirSync(dirname(path), { recursive: true });
  const temporaryPath = join(
    dirname(path),
    `.${path.split('/').at(-1)}.tmp-${process.pid}`,
  );
  writeFileSync(temporaryPath, contents, { encoding: 'utf8', mode });
  renameSync(temporaryPath, path);
  return true;
}

function synchronizeMarkedFile({
  target,
  generated,
  startMarker,
  endMarker,
  label,
  check,
}) {
  const current = readFileSync(target, 'utf8');
  const expected = replaceGeneratedSection(
    current,
    generated,
    startMarker,
    endMarker,
    label,
  );
  const changed = expected !== current;
  if (!check && changed) atomicWriteIfChanged(target, expected);
  return { changed, target };
}

export function synchronizeProjectEnvironment({
  root = repositoryRoot,
  target = environmentPath,
  check = false,
} = {}) {
  return synchronizeMarkedFile({
    target,
    generated: renderProjectFacts(collectProjectFacts(root)),
    startMarker: generatedStart,
    endMarker: generatedEnd,
    label: '.codex/environment.md',
    check,
  });
}

export function synchronizeDocumentationIndex({
  root = repositoryRoot,
  target = documentationIndexPath,
  check = false,
} = {}) {
  return synchronizeMarkedFile({
    target,
    generated: renderDocumentationInventory(collectDocumentation(root)),
    startMarker: inventoryStart,
    endMarker: inventoryEnd,
    label: 'docs/README.md',
    check,
  });
}

export function collectKnowledgeContext(root = repositoryRoot) {
  const knowledge = loadProjectKnowledge(root);
  const validation = validateProjectKnowledge(knowledge, {
    root,
    checkFingerprint: true,
  });
  const analysis = analyzeWorkstreams(knowledge, collectWorkingTreePaths(root));
  return { knowledge, validation, analysis };
}

export function synchronizeProjectState({
  root = repositoryRoot,
  target = projectStatePath,
  check = false,
  context = collectKnowledgeContext(root),
} = {}) {
  const contents = renderProjectState(
    context.knowledge,
    context.validation,
    context.analysis,
  );
  let current;
  try {
    current = readFileSync(target, 'utf8');
  } catch {
    current = undefined;
  }
  const changed = current !== contents;
  if (!check && changed) atomicWriteIfChanged(target, contents);
  return { changed, target, context };
}

function gitStatus(root) {
  const result = spawnSync(
    'git',
    ['status', '--short', '--branch', '--untracked-files=normal'],
    {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 3_000,
    },
  );
  const lines = result.status === 0 ? result.stdout.trimEnd().split('\n') : [];
  const branch = lines[0]?.replace(/^##\s*/, '') ?? 'unavailable';
  const entries = lines
    .slice(1)
    .filter(Boolean)
    .map((line) => line.slice(3));
  const documentationEntry = (path) =>
    /^(?:docs\/|README\.md$|CHANGELOG\.md$|AGENTS\.md$|SECURITY\.md$|\.codex\/)/u.test(
      path,
    );
  const sourceEntry = (path) =>
    /^(?:src\/|test\/|scripts\/|systemd\/|package(?:-lock)?\.json$|tsconfig)/u.test(
      path,
    );
  const documentationReferenceEntry = (path) =>
    documentationEntry(path) &&
    path !== 'CHANGELOG.md' &&
    path !== '.codex/project-context.generated.md';
  return {
    branch,
    dirtyEntries: entries.length,
    documentationEntries: entries.filter(documentationEntry).length,
    documentationReferenceEntries: entries.filter(documentationReferenceEntry)
      .length,
    changelogChanged: entries.includes('CHANGELOG.md'),
    sourceEntries: entries.filter(sourceEntry).length,
  };
}

export function documentationImpactFailures(git) {
  if (git.sourceEntries === 0) return [];

  const failures = [];
  if ((git.documentationReferenceEntries ?? 0) === 0) {
    failures.push(
      'Source/configuration changes require a relevant durable documentation-reference change.',
    );
  }
  if (git.changelogChanged !== true) {
    failures.push(
      'Source/configuration changes require an Unreleased CHANGELOG.md change.',
    );
  }
  return failures;
}

export function renderGeneratedContext({ git, documents, projectKnowledge }) {
  const decisions = documents.filter(({ path }) =>
    path.startsWith('decisions/'),
  );
  const migrationEvidence = documents.filter(({ path }) =>
    path.startsWith('migration/'),
  );
  const impactFailures = documentationImpactFailures(git);
  const documentationReview =
    git.sourceEntries === 0
      ? 'No source/configuration drift detected.'
      : impactFailures.length > 0
        ? `BLOCKED: ${impactFailures.join(' ')}`
        : 'Required documentation files are represented; semantic accuracy still requires model review.';
  const fingerprint = createHash('sha256')
    .update(JSON.stringify({ git, documents, projectKnowledge }))
    .digest('hex')
    .slice(0, 16);
  const semanticContext = projectKnowledge
    ? `\n${renderKnowledgeDigest(
        projectKnowledge.knowledge,
        projectKnowledge.validation,
        projectKnowledge.analysis,
      )}\n`
    : '';

  return `<!-- Generated by scripts/codex/refresh-environment.mjs. Do not edit. -->

# Current Chalkwright project context

- Context fingerprint: \`${fingerprint}\`
- Git: \`${git.branch}\`; ${git.dirtyEntries} changed entries
- Documentation corpus: ${documents.length + 1} files under \`docs/\`
- Architecture decisions: ${decisions.length}
- Migration evidence documents: ${migrationEvidence.length}
- Documentation review: ${documentationReview}
${semanticContext}

## Always-use routing

1. \`AGENTS.md\` is the mandatory operating and safety contract.
2. \`.codex/environment.md\`, \`/home/bren/.codex/ENVIRONMENT.md\`, and \`/home/bren/.codex/HOST.md\` separate project, Codex-runtime, and host facts.
3. \`docs/README.md\` is the curated and exhaustive documentation index.
4. \`CHANGELOG.md\` records consequential unreleased effects.
5. Relevant ADRs, runbooks, migration evidence, and interface documentation must be read and updated with the behavior they govern.

Generated facts and inventories are automatic. Prose is never declared accurate
merely because generation or link checks pass; Codex must review it against the
changed implementation and report unresolved uncertainty.
`;
}

export function synchronizeGeneratedContext({
  root = repositoryRoot,
  target = generatedContextPath,
  projectKnowledge = collectKnowledgeContext(root),
} = {}) {
  const facts = {
    git: gitStatus(root),
    documents: collectDocumentation(root),
    projectKnowledge,
  };
  const contents = renderGeneratedContext(facts);
  return {
    changed: atomicWriteIfChanged(target, contents, 0o600),
    target,
    facts,
  };
}

export function synchronizeAll({ root = repositoryRoot, check = false } = {}) {
  const projectKnowledge = collectKnowledgeContext(root);
  const projectState = synchronizeProjectState({
    root,
    check,
    context: projectKnowledge,
  });
  const environment = synchronizeProjectEnvironment({ root, check });
  const documentation = synchronizeDocumentationIndex({ root, check });
  const context = check
    ? undefined
    : synchronizeGeneratedContext({ root, projectKnowledge });
  return {
    environment,
    documentation,
    projectState,
    projectKnowledge,
    context,
  };
}

export function renderSessionHookSummary(result) {
  const { git, documents } = result.context.facts;
  const impactFailures = documentationImpactFailures(git);
  const review =
    impactFailures.length > 0
      ? ` Documentation handoff is BLOCKED: ${impactFailures.join(' ')}`
      : ' Documentation changes still require semantic model review against the implementation before handoff.';
  const semantic = renderKnowledgeDigest(
    result.projectKnowledge.knowledge,
    result.projectKnowledge.validation,
    result.projectKnowledge.analysis,
  );
  return `${semantic}\nChalkwright context refreshed. Project sources: AGENTS.md, docs/project-state.md, docs/project-knowledge.json, .codex/environment.md, docs/README.md, and CHANGELOG.md. Consult /home/bren/.codex/ENVIRONMENT.md or /home/bren/.codex/HOST.md only when runtime or host facts matter. ${documents.length + 1} documentation files are indexed; ${git.sourceEntries} source/configuration and ${git.documentationEntries} documentation-governance entries are changed.${review}`;
}

export function renderPromptHookSummary(result) {
  const { git } = result.context.facts;
  const validation = result.projectKnowledge.validation;
  const analysis = result.projectKnowledge.analysis;
  const impactFailures = documentationImpactFailures(git);
  const freshness =
    validation.failures.length === 0 && analysis.unclassifiedEntries === 0
      ? 'CURRENT'
      : 'REVIEW_REQUIRED';
  const documentation =
    impactFailures.length === 0
      ? 'represented; semantic review required before handoff'
      : `BLOCKED: ${impactFailures.join(' ')}`;
  const workspace =
    git.dirtyEntries === 0
      ? 'clean; use an isolated codex/<task> worktree for any concurrent write task'
      : 'has existing work; preserve it and use an isolated codex/<task> worktree for a distinct or concurrent write outcome';
  const fingerprint = validation.implementation.fingerprint.slice(0, 16);

  return `CHALKWRIGHT_CONTEXT freshness=${freshness}; implementation=${fingerprint}; changes=source/config:${git.sourceEntries},docs:${git.documentationEntries},unclassified:${analysis.unclassifiedEntries}; documentation=${documentation}; workspace=${workspace}. Use AGENTS.md and docs/project-state.md first; consult external host references only when the task depends on host/runtime facts.`;
}

function main() {
  const check = process.argv.includes('--check');
  const sessionHook =
    process.argv.includes('--hook') || process.argv.includes('--hook-session');
  const promptHook = process.argv.includes('--hook-prompt');
  const result = synchronizeAll({ check });
  const stale = [
    result.environment,
    result.documentation,
    result.projectState,
  ].filter(({ changed }) => changed);

  if (check && result.projectKnowledge.validation.failures.length > 0) {
    result.projectKnowledge.validation.failures.forEach((failure) =>
      process.stderr.write(`${failure}\n`),
    );
    process.exitCode = 1;
  }
  if (check && result.projectKnowledge.analysis.unclassifiedEntries > 0) {
    process.stderr.write(
      `${result.projectKnowledge.analysis.unclassifiedEntries} working-tree change(s) are not assigned to an active project workstream.\n`,
    );
    process.exitCode = 1;
  }

  if (check && stale.length > 0) {
    process.stderr.write(
      `Generated project documentation is stale: ${stale.map(({ target }) => relative(repositoryRoot, target)).join(', ')}. Run npm run docs:sync and review the diff.\n`,
    );
    process.exitCode = 1;
  }

  if (check) {
    const impactFailures = documentationImpactFailures(
      gitStatus(repositoryRoot),
    );
    if (impactFailures.length > 0) {
      impactFailures.forEach((failure) =>
        process.stderr.write(`Documentation handoff gate: ${failure}\n`),
      );
      process.exitCode = 1;
    }
  }

  if (sessionHook) {
    process.stdout.write(`${renderSessionHookSummary(result)}\n`);
    return;
  }

  if (promptHook) {
    process.stdout.write(`${renderPromptHookSummary(result)}\n`);
    return;
  }

  const changed = [
    result.environment,
    result.documentation,
    result.projectState,
    result.context,
  ].filter((entry) => entry?.changed).length;
  process.stdout.write(
    `${changed === 0 ? 'Current' : `Updated ${changed} generated context file(s) in`} ${repositoryRoot}\n`,
  );
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) main();
