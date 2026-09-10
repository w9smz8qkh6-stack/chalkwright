# Chalkwright landing-page workflow

The public marketing site is a separate application from the classroom display.
This runbook defines its source, verification, publication, and rollback
boundaries so `.openai/hosting.json`, the domain registrar, and the live origin
are not mistaken for one another.

## Topology

- Source repository: `/home/bren/chalkwright-site`
- Canonical Git remote:
  `https://github.com/w9smz8qkh6-stack/chalkwright-site.git` (private)
- Default branch: `main`
- Product landing URL: `https://chalkwright.com`
- FOSS project URL: `https://chalkwright.org`
- Local Docker Compose service/container: `chalkwright-site`
- Loopback origin: `127.0.0.1:18083` to container port 3000
- Public transport: Cloudflare Tunnel

The Lenovo server is the live origin. `.openai/hosting.json` is retained for
the site's build tooling; it does not authorize or describe a Sites deployment.
Registrar, authoritative DNS, Cloudflare, and origin configuration are separate
control planes and must be verified separately when a task touches them.

## Scope and Git workflow

Read `/home/bren/chalkwright-site/AGENTS.md` before editing. Use a focused
`codex/<task>` branch, preserve existing work, and keep one landing-page outcome
per branch. Push landing-page history only to its own canonical remote; never
place it in the Chalkwright application repository. Git publication and live
site publication are independent effects: pushing `main` preserves source
history but does not rebuild the Lenovo-hosted container.

Changing source does not authorize rebuilding the live container. Publishing,
Cloudflare changes, and cache invalidation require explicit current-task
approval.

## Automatic documentation handoff

Landing-page documentation is part of the landing-page task, not a later
request. Any change to source, media or player behavior, dependencies, Git
topology, hosting, publication state, runtime security, or verified live state
must update the landing repository's durable documentation and Unreleased
changelog and review this application repository in the same task.

Update this runbook and the application Unreleased changelog whenever their
claims change. Update `docs/homepage-demo-video.md` for media or player changes,
`.codex/environment.md` for stable topology or runtime facts, and
`docs/project-knowledge.json` plus its generated state for semantic status,
workstream, capability, limit, or decision changes. Mechanical refresh does not
replace semantic review. If a conflicting checkout or unavailable repository
prevents an accurate update, the work remains incomplete and the handoff must
name the missing documentation explicitly.

## Install, preview, and verify

From `/home/bren/chalkwright-site`:

```sh
npm ci
npm run check
```

For local interactive development:

```sh
npm run dev
```

Before publication, visually inspect at least a wide desktop, a laptop, and a
mobile viewport. Verify:

- keyboard navigation and visible focus;
- no horizontal overflow;
- readable type and controls;
- reduced-motion behavior;
- canonical metadata and social preview;
- native video controls and English captions;
- the dedicated CC control remains visible and captions begin enabled;
- no console, page, asset, or unexpected network errors; and
- only approved, privacy-safe media is present.

## Publication preflight

The root filesystem must have at least 10 GiB free before a dependency install
or container build. Stop and request an approved cleanup plan below that
threshold.

Before replacing the live container:

1. Confirm the source branch and a clean intended diff.
2. Run `npm run check`.
3. Record the currently running container image ID as the rollback target.
4. Build the candidate without altering Cloudflare configuration.
5. Start the candidate through the declared Compose service only after explicit
   publication approval.

Use the installed Docker Compose command surface (`docker compose --help`) for
the exact host version. Do not restart `cloudflared` merely to publish content;
its restart belongs only to an explicitly approved hostname or tunnel change.

## Independent live verification

Refresh or open a new browser page so success is not inferred from stale state.
At minimum, verify:

```sh
curl --fail --silent --show-error --output /dev/null https://chalkwright.org/
curl --fail --silent --show-error --head https://chalkwright.org/chalkwright-homepage-demo.en.vtt
curl --fail --silent --show-error --range 0-99 --dump-header - --output /dev/null https://chalkwright.org/chalkwright-homepage-demo.mp4
```

Expected results:

- homepage: HTTP 200 with `text/html`;
- captions: HTTP 200 with `text/vtt`;
- ranged video: HTTP 206 with `video/mp4`, a valid `Content-Range`, and exactly
  the requested bounded response;
- the dedicated CC control is visible without opening the native overflow menu,
  with accurate English captions enabled by default; and
- product-landing metadata uses `https://chalkwright.com` as canonical origin.

Cloudflare may serve cached media independently of the origin. When headers or
media bytes change, compare loopback and public responses and use an explicitly
approved cache action or versioned URL instead of repeatedly rebuilding the
same container.

## Rollback

Rollback means restoring the recorded prior image/container configuration,
then repeating the loopback and public checks. Never use a source-tree deletion
or broad Docker cleanup as rollback. Preserve the failed candidate and logs
until the cause is understood, unless they contain protected material.

## Current publication record

On 2026-09-10, landing-page source commit
`20c89ae` was built into container image
`sha256:01751440b9e3073f8cfbdcd7cab60a55eb040384d6aa06439245e411e1df8e3c`
and published through the Lenovo-hosted `chalkwright-site` service. The
product landing at `chalkwright.com` now uses a neutral wordmark, leads with a
screen-first explanation, and directs existing users to `/accounts/login/`
without advertising a reservation or self-service enrollment flow. The FOSS
project page remains at `chalkwright.org`. Fresh public requests confirmed the
new product-page copy, FOSS-page host split, login response, `text/vtt`
captions, and a 100-byte MP4 range response with HTTP 206. The prior image is
retained locally as `chalkwright-site:rollback-20260910-screen-content`.

On 2026-08-31, landing-page source commit
`ef120516f84fc31c9c59b29a9b09e4b3aeaa6d1c` was built into container image
`sha256:97d770ec7b4d34c652c2ba5d0dc18328b9daf0884451686b5507ec5d71fbf8f2`
and published through the Lenovo-hosted `chalkwright-site` service. The source
is maintained in the private canonical repository and its default `main`
branch.

The published v15 demonstration precisely synchronizes the early callouts,
counts the Robotics coming-up state from `10:00` to `0:00` before its objective
transition and gives the second vocabulary explanation a deliberate sentence
break. Accurate English captions remain enabled by default with a dedicated
visible CC toggle, and release token `20260831a` bypasses predecessor browser
and edge-cache entries. Loopback and public verification returned HTTP 200 for
the page and captions, exact video SHA-256
`4dd0b26064bbb528304dcc7e646e30fb320402d862c0ff74217fdc4294cab1d6`,
exact caption SHA-256
`7601e65b72f972931c372c773917c5100d7fed230c6cefdfee77804f4d7bdd94`,
`text/vtt` caption delivery and HTTP 206 with an exact 100-byte bounded MP4
range. The page markup independently confirmed the canonical origin, new media
token, default caption track and visible CC control. The container's production
dependency audit reported zero vulnerabilities; four moderate findings remain
only in the optional development toolchain excluded from the runtime image.

The fresh interactive browser surface was unavailable during this publication,
so wide/laptop/mobile live visual, keyboard-focus and console checks could not
be rerun. The player interface and landing layout were unchanged from the prior
verified release, and v15 itself had already passed local visual and audiovisual
review. This is a recorded verification limitation, not evidence of a detected
live defect.

Before replacement, the prior running image was temporarily retained as
`chalkwright-site:rollback-20260831-v13`. After v15 verification, the user
explicitly requested removal of latent obsolete production video copies, so
that unused image was deleted, recovering about 208 MB of unique Docker data.
Authorized cleanup also removed the superseded v13/v14 local render packages,
v8/v9 narration sets and 4.0 GiB of reproducible Docker build cache; no running
service, application data or v15 source media was removed. Prior releases remain
recoverable from canonical Git history, but no predecessor Docker image is
retained locally.
