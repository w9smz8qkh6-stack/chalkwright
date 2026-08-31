# Core source registry and manual setup

Status: C04 implementation slice. This document describes the private,
synthetic Core operator-panel registry introduced after C03. It is a bounded
teacher-entered setup path, not an acquisition or provider feature.

## What the Sources page can do

The explicit-loopback, no-login Sources page renders ordinary HTML forms that
let an operator record one application-managed source definition with:

- an A06 first-release data stream;
- a bounded course/source label; and
- an optional mapping to an already configured C03 screen.

The record is written to the C01 configuration draft, never directly to the
active last-known-good revision. Its registry projection explicitly identifies
teacher-entered provenance, `managed-revision` freshness, and
`definition-recorded` validation. A source is therefore useful for planning
manual setup without pretending that Chalkwright has read its content.

## Deliberate C04 boundary

The page explains the A06 modes and makes the manual application-managed lane
useful without a Workspace connection. It does not accept files, parse data,
dereference a URL, make an outbound request, store bytes, create a protected
credential reference, begin OAuth, or expose a display/viewer route. Uploads,
shared-resource acquisition, provider enrollment, and connected sources remain
C05, C06, C07, and C08 respectively.

The mapping/provenance projection is in-memory synthetic fixture state. A
later durable composition task must bind it to production persistence before
any self-hosted production claim can be made.

## Safety and verification

Mutations retain C02's exact loopback Host/Origin, same-origin URL-encoded
form, content-type, and bounded-form-body controls. Unknown stream IDs,
invalid labels, and nonexistent screen mappings reject without saving a draft.
Focused service, HTTP, browser/no-JavaScript, and full repository checks cover
the manual source path; no provider or live service interaction is required.
