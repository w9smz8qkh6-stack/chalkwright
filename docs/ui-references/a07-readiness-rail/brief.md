# A07 concept brief — Readiness rail

## Audience and primary task

A self-hosting teacher or installation operator needs to understand whether one
Chalkwright installation is ready, finish setup blockers, and preview a screen
without learning internal configuration files. The same Core feature region
must also compose safely inside a future authenticated hosted shell.

## Target and user state

- Target: route-independent `overview` Core feature region shown inside an
  illustrative self-hosted document shell.
- State: one synthetic installation with an active last-known-good display,
  three setup blockers, one stale shared source, and an unsaved draft.
- This is an exploratory desktop visual direction, not production UI.

## Current problem

The existing operator preview is readable and keyboard-friendly but is a
single long document with route-coupled actions. It does not express global
navigation, workspace/screen scope, setup progression, cross-page readiness,
draft/effective boundaries, or the complete Core operator MVP.

## Required information hierarchy

1. Chalkwright Core identity and explicit installation/screen context.
2. Global navigation with Overview, Displays, Sources, Planned display,
   Presentation, Configuration, and Diagnostics & recovery.
3. Overall readiness and last-known-good availability.
4. Ordered setup blockers with direct, edition-neutral action labels.
5. A compact planned-display snapshot and source freshness summary.
6. Persistent draft/effective configuration status.

## Required UI states

Ready, blocker, warning, information, stale last-known-good, draft changed,
disabled activation, and mutation-free preview must be distinguishable without
color alone.

## Viewport and input constraints

- Primary reference: 1920×1080 desktop.
- Must translate later to 390×844, 768×1024, 1366×768, and 1920×1080 without
  horizontal clipping.
- Keyboard-first order follows navigation, context, status, then page actions.
- Generated small text is illustrative; exact copy belongs to code.

## Existing language to preserve

Dark slate surfaces (`#0f172a`, `#020617`), sky blue (`#38bdf8`), warm orange
(`#fb923c`), yellow (`#facc15`/`#fef08a`), soft slate borders, rounded system
type, strong visible focus, and the existing Chalkwright SVG mark.

## Accessibility and localization

Preserve landmarks, one page heading, descriptive labels, no color-only
meaning, large targets, clear focus, readable contrast, reduced motion, status
announcements, and text expansion without fixed-height copy regions.

## Binding decisions if selected

- A persistent left navigation rail groups the seven Core-global areas.
- A shell-owned context band precedes the Core feature region.
- Readiness is the overview's primary hierarchy, not a decorative score.
- Last-known-good display continuity is visible beside current blockers.
- The active draft/effective boundary remains visible on configuration-bearing
  pages.

## Non-binding details

Generated icon shapes, exact typography metrics, decorative gradients, chart
geometry, small labels, and pixel-level spacing are inspirational only.
