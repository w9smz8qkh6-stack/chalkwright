# Chalkwright project guidance

## Orientation and sources of truth

- The canonical product name is **Chalkwright**.
- This repository is the current application source and the primary Codex
  project folder. Never edit an immutable release under `/opt/chalkwright`.
- `/home/bren/src/classroom-hub` is the historical fixture/legacy project, not
  the current application. Do not start or edit it for Chalkwright requests.
- B407 is a synthetic fixture. C509 is the current production-validation
  classroom. The server clock is UTC; school-day logic uses
  `Asia/Ho_Chi_Minh`.
- Before host, deployment, or live-service work,
  read `/home/bren/.codex/ENVIRONMENT.md` for Codex/runtime facts,
  `/home/bren/.codex/HOST.md` for the underlying machine, and
  `.codex/environment.md` for project facts and operating context. If the
  tracked project facts or documentation inventory are stale, run
  `npm run docs:sync`.
- `docs/README.md` is the complete documentation router. Repository hooks
  refresh generated facts and inject this routing before every user prompt and
  after session compaction. If hooks are unavailable, run `npm run docs:sync`
  before relying on generated context.
- Read `docs/project-state.md` before planning repository work. It is the
  generated human-readable view of `docs/project-knowledge.json` and records
  the current phase, milestone, documented deployment claim, capabilities,
  limits, active workstreams, and next decisions. Treat `REVIEW_REQUIRED`, an
  expired review, or unclassified working-tree changes as a blocking knowledge
  gap, not as optional documentation cleanup.

## Working agreements

- Keep the Node.js/TypeScript application modular, with clear boundaries
  between configuration, orchestration, entry points, and tests.
- Make focused changes that preserve existing behavior unless a behavior
  change is requested.
- Start by checking the branch, working-tree state, active worktrees, and free
  disk. Preserve every existing change. Treat the canonical checkout as the
  integration workspace: read-only tasks and the task that already owns its
  active workstream may remain there, but every distinct or concurrent
  repository-writing outcome must use an isolated `codex/<task>` worktree
  before editing. Never combine another task's dirty state with new work merely
  because the files do not appear to overlap.
- Keep one outcome per Codex task and branch. Do not let a landing-page change,
  application feature, provider-authentication repair, or production incident
  absorb an unrelated outcome.
- Use `npm ci` for dependency installation. Add or upgrade dependencies only
  when the task needs them.
- Prefer direct local artifact generation with installed tools before
  proposing a new API, subscription, plugin, or credential.
- Documentation is part of the implementation, not a follow-up. Every task
  that changes source, tests, scripts, configuration, dependencies, deployment,
  operations, or user-visible output must update the relevant durable
  documentation and the `CHANGELOG.md` Unreleased section in the same working
  tree. This includes behavior-neutral maintenance: record it in the most
  appropriate engineering or operational reference rather than leaving the
  documentation corpus unaware of the change.
- Before handing off any repository change, identify the documents governing
  the changed area, compare their claims with the final implementation, and
  update them. Do not declare a task complete or claim "no documentation
  impact" merely because generated facts, links, tests, or formatting pass.
  If accurate documentation cannot be completed, stop and report the task as
  incomplete with the exact unresolved documentation gap.
- Every repository task must be represented by an active workstream in
  `docs/project-knowledge.json`. Keep its outcome, present state, scoped paths,
  related capabilities, evidence, and next steps accurate as the work changes.
  Add or update capability entries when behavior or maturity changes. After
  semantic review, run `npm run knowledge:fingerprint`, record that exact value
  in the knowledge source, and regenerate `docs/project-state.md`; never update
  the fingerprint as a substitute for reviewing the meaning of the changes.
- Treat generated freshness as evidence about facts and file discovery only.
  Review explanatory prose, ADRs, runbooks, public-interface comments, and the
  changelog semantically against every consequential implementation change.
  Never claim that generation or link checks prove prose accuracy.
- When behavior may vary by version, identify the installed or target version
  and consult version-matched official documentation or installed help. Do not
  guess.

## Safety and publication boundaries

- Never commit credentials, access tokens, protected configuration, browser
  profiles, client or student data, private provider values, logs, databases,
  backups, or generated runtime artifacts.
- PowerSchool and Google Classroom are read-only. Do not broaden that boundary.
- Calendar writes, provider-authentication repair, service or route changes,
  Cloudflare changes, Git pushes, pull requests, merges, and deployments
  require explicit authorization in the current task.
- A request to change code or content authorizes local implementation and
  verification, not publication. Treat `publish`, `live`, `merge`, and
  `deploy` as explicit effects.
- Merging application `main` is a production action because the permanent
  deploy timer follows protected `origin/main`.
- Use synthetic data for captures unless the user supplies and approves real
  media. Confirm that public media contains no students or private data and
  has appropriate provenance.
- Never clean disk, prune worktrees, remove containers/images, or delete media
  automatically. Stop and report when free space is below 10 GiB before a
  dependency install, container build, browser capture, or media render.

## Verification

- Add or update focused tests in proportion to the change while iterating.
- Before handing off application changes, run `npm run check` and
  `git diff --check`. Use `npm run check:portable` for a fresh clone or CI-like
  environment whose host-tool index is intentionally different.
- `npm run docs:check` is a handoff gate. It must fail when source or
  configuration changes are present without both a durable documentation
  reference change and an Unreleased changelog change. Passing the gate does
  not replace the required semantic review.
- The same gate must fail when the implementation fingerprint differs from the
  reviewed fingerprint, the project-state review is older than its configured
  maximum age, a capability loses its implementation/test/documentation
  evidence, generated `docs/project-state.md` is stale, or a working-tree
  change is not classified under an active workstream.
- When documentation automation changes, also run
  `npm run environment:verify-automation` on the canonical host.
- For display changes, verify the accepted 3840x2160, 1920x1080, and 1366x768
  viewport envelope plus reduced motion, keyboard focus, overflow, browser
  console/page errors, and rendered visual evidence.
- Do not report a live result from stale browser state. Refresh or open a new
  page and verify the served release independently.

## Operational references

- Application deployment: `docs/permanent-production-deployment.md`
- Version inventory: `docs/tooling.md`
- Documentation maintenance: `docs/documentation-system.md`
- Current semantic state and capabilities: `docs/project-state.md`
- Architecture and safety: `docs/architecture-principles.md`, `SECURITY.md`
