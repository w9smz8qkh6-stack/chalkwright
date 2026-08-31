# Configuration

## Current boundary

Chalkwright currently exposes strict, capability-specific runtime schemas.
They are designed to reject ambiguity and accidental authority; they are not
yet the planned guided setup experience for a general installer.

The fixture-backed local demo needs only the safe defaults copied from
`.env.example`. It binds to loopback, uses synthetic data, and receives no
provider or Calendar capability:

```sh
npm ci
cp .env.example .env
npm run build
npm start
```

## Configuration classes

Keep these classes separate:

1. **Public defaults** — loopback host/port, finite timeouts, request limits,
   and synthetic fixture switches. Safe placeholders belong in `.env.example`.
2. **Site policy** — timezone, room/screen identities, mappings, target names,
   and schedule policy. Current production compositions load validated,
   owner-only external JSON or environment files.
3. **Protected references** — filesystem paths that point to OAuth grants,
   browser session state, operator tokens, or other protected material. Source
   control may contain an empty placeholder or documented path shape, never
   the protected value.
4. **Runtime state** — SQLite databases, backups, journals, leases, browser
   profiles, logs, and evidence. These always remain outside the repository.
5. **Optional site media** — a locally owned or licensed MP4 outside the
   repository, referenced by normalized absolute path, byte length, and
   SHA-256. The public distribution uses its poster fallback when this is
   absent.

An empty provider reference grants no provider capability. Do not replace a
reference field with an inline credential, token, cookie, or OAuth payload.

An optional production-server media reference has this shape:

```json
{
  "dismissalMedia": {
    "path": "/absolute/site-owned/path/dismissal.mp4",
    "byteLength": 1234567,
    "sha256": "64-lowercase-hex-characters"
  }
}
```

The file is never copied into Git. Startup fails closed when a configured file
is missing, linked, malformed, or does not match its size and digest. Omitting
the entire field is supported and leaves the application healthy with the
repository-owned poster fallback.

## School branding and site media

Use JSON, not Markdown, for installation settings. Markdown is useful for
instructions but is ambiguous as an application contract; versioned JSON can
be validated before Chalkwright downloads or changes anything.

A site-media profile may define any combination of a school logo, friendly
course-name-to-cover-art mappings, and one video for the class-ending
countdown:

```json
{
  "version": 1,
  "school": {
    "name": "Example Academy",
    "logoUrl": "https://media.example.invalid/school-logo.webp"
  },
  "courseCoverArtUrls": {
    "Advisory": "https://media.example.invalid/advisory.png",
    "Robotics": "https://media.example.invalid/robotics.jpg"
  },
  "countdownVideoUrl": "https://media.example.invalid/dismissal.mp4"
}
```

The URLs must use HTTPS. Logos and course art may be PNG, JPEG, or WebP; the
countdown video must be MP4. Run the setup command with absolute paths and a
new output directory:

```sh
npm run setup:site-media -- \
  --profile /etc/chalkwright/site-profile.json \
  --output /var/lib/chalkwright/production/site-media
```

The command follows only bounded HTTPS redirects, limits images to 20 MB and
video to 100 MB, checks file signatures, and creates owner-only local copies
plus `manifest.json`. It does not put downloaded media in Git. Add the reported
manifest path to the protected production-server JSON:

```json
{
  "siteMediaManifestReference": "/var/lib/chalkwright/production/site-media/manifest.json"
}
```

On startup, Chalkwright rechecks each local file's type, length, location, and
SHA-256 digest. The browser requests local Chalkwright routes, not the source
websites. A configured school logo replaces the Chalkwright header mark and
follows the legacy responsive width treatment: 204 px at full size, 168 px on
ordinary classroom displays, and 132 px in compact layouts.
The ChalkWright product identity remains visible as a compact lower-right
system credit with the installed version and project website. Course-art keys
match the friendly course title shown on screen. A configured countdown video
takes priority over course art only during the class-ending countdown; other
states continue to use course cover art.

To change URLs, generate a new output directory and then update the manifest
reference. Existing directories are never overwritten by the setup command.

For a migration from an existing local installation, `school.logoFile` may be
used instead of `school.logoUrl`. The path must be absolute and point to one
ordinary, unlinked PNG, JPEG, or WebP file. Production activation accepts one
owner-only request at `/tmp/chalkwright-site-profile.json`, copies the asset
into a new service-owned media directory, retains an owner-only backup of the
previous server configuration, removes the staging request, and restarts the
display. Runtime never depends on continued access to the legacy file.

## Supported public-preview workflow

The supported public-preview workflow is presently the fixture-backed demo and
offline test suite. Provider enrollment, production systemd activation,
Tailnet routing, Calendar writing, and migration/cutover commands remain
maintainer-qualified workflows rather than a general installation interface.
Their existence in source does not make them safe to run against another site.

See `.env.example` for the complete non-secret placeholder inventory and
`docs/operations.md` for the current operational boundaries.

## Connector onboarding roadmap

Site presentation now has the versioned human-authored profile described
above. The remaining guided self-hosted setup layer will cover:

- site timezone and academic calendar;
- rooms, screens, display labels, and browser URL;
- PowerSchool room and schedule mapping;
- Google Classroom course mapping;
- the separately owned Calendar target;
- display timing and optional attendance links; and
- backup, retention, and notification policy.

The intended Chalkwright Core experience is a browser-based operator panel
rather than permanent manual editing of these files. Core does not add a user
account or login system around that panel. Anyone who can reach it has operator
authority, so a self-hosted deployment must bind or route it only through an
operator-controlled local or private boundary and must not publish it openly.
That boundary does not have to be Tailscale.

The operator uses the panel to manage configuration, connections, previews,
readiness, and the class code used by classroom displays and students. The
class code gates only the low-privilege display/viewer surface; it is not a
credential for the operator panel. The commercial hosted edition places this
same control capability inside its authenticated account application.

Every consequential source will have a connected-provider lane and the closest
safe application-managed, shared-resource, or uploaded lane. Chalkwright will
manage Google OAuth, refresh tokens, revocation, and official API calls directly
rather than requiring a managed integration broker. Operator-panel access
remains separate from optional Classroom, Calendar, Drive, Docs, and Sheets
authorization. Provider OAuth is still required for a connected source even
though Core has no Chalkwright account login.

The panel will include planned-display review: a date picker and bounded rolling
window of daily contact sheets, enlarged frame review, and a carousel through
the expected display states. Requests outside the rolling window will refresh
and render the selected date on demand rather than importing an unbounded future
calendar.

The public distribution remains a complete self-hosted application. Its
operator and display listeners are separately bindable, and supplied deployment
examples must not publish the operator listener by default. A separate
commercial repository consumes versioned Core contracts below the HTTP layer
rather than embedding the unauthenticated Core route table; see
[ADR-0026](decisions/0026-public-core-and-hosted-shell.md).

A setup command will validate that file, collect or reference protected values
through separate enrollment steps, and generate least-authority runtime files
and inert service templates. It must support validation and preview without
provider access or service changes. Connector enrollment remains future
roadmap work; the repository does not yet claim a general guided production
installer. Google OAuth grants, PowerSchool browser state, Calendar writer
authority, and operator tokens must remain in separate owner-only files rather
than being embedded in the site profile.

## Safety rules

- Never commit `.env`, credentials, OAuth JSON, browser state, provider
  responses, student data, databases, backups, logs, or private URLs.
- Keep PowerSchool and Google Classroom read-only.
- Use a distinct owned Calendar for parallel evaluation.
- Run `npm run check:portable` before proposing a configuration-contract
  change.
- Treat every service install, activation, route change, provider request, and
  provider mutation as a separately authorized effect.
