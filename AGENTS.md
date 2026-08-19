# Project guidance

- Keep the Node.js/TypeScript application modular, with clear boundaries between configuration, orchestration, entry points, and tests.
- Make focused changes that preserve existing behavior unless a behavior change is requested.
- Do not commit credentials, access tokens, client or student data, browser profiles, or generated runtime artifacts.
- Treat PowerSchool and Google Classroom as read-only unless the user explicitly requests a change to that boundary.
- Use `npm ci` for dependency installation; add or upgrade dependencies only when the task needs them.
- Add or update tests in proportion to the change, and run `npm run check` before handing off code changes.
- Keep relevant documentation and `CHANGELOG.md` current when a change affects behavior, contracts, operations, or users.
- User authorization may include `sudo` access for shell commands needed to develop, test, or operate this repository.
