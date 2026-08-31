# Core planned-display projection

Status: C09 implementation slice. This document describes the private,
synthetic projection layer used by the Core operator panel before the C10
contact-sheet and carousel review controls exist.

## What C09 projects

The projection service accepts an explicit school date and configured screen,
then reads only the effective C01 configuration and an injected normalized
frame catalog. It returns the selected date, configuration-basis revision,
ordered same-day frames, a deterministic SHA-256 input fingerprint, freshness,
and whether the result came from the seven-day rolling window or an on-demand
distant-date request.

Identical inputs return the same projection fingerprint and detached frame
values. Cache retention is capped at sixteen date/screen views. Frames remain
synthetic and application-supplied: C09 does not infer schedule content,
acquire a source, or manufacture a display state.

## Deliberate boundary

C09 is read-only and mutation-free. It constructs no provider client, OAuth
flow, Calendar operation, fetcher, parser, upload path, public viewer route,
or configuration command. An injected preview basis may differ from the
currently active revision; that difference is explicit in the returned basis
revision and fingerprint, and never activates or replaces configuration.

The private shell now exposes a bounded projection summary and ordered frame
metadata. C10 owns date-picker controls, thumbnails, enlarged review, modal
carousel behavior, keyboard interaction, and responsive visual acceptance.

## Verification

The C09 adapter satisfies the exact A08 planned-display scenario: its synthetic
date returns four ordered frames, the explicit preview basis revision, and a
`mutationFree` result. Focused coverage proves deterministic rolling-window
and on-demand projections, missing-screen rejection, private-shell rendering,
and no-JavaScript baseline behavior. No live provider or service interaction is
part of this slice.
