# Documentation-backed learning objectives

Chalkwright can replace an upcoming Google Classroom assignment title with a
teacher-authored learning objective without calling an LLM. A scheduled,
read-only Google Drive job exports explicitly structured Google Docs or reads
plain-text/Markdown files, validates them, and stores their objectives in the
local SQLite catalog. The classroom display reads only SQLite; it never contacts
Drive while rendering a slide.

## Drive folder configuration

The existing protected Drive configuration already binds an academic-year
folder and an exact folder name for every mapped class. Add an
`objectiveFolderPath` to a course entry:

```json
{
  "classId": "web-design-a",
  "subject": "Web Design",
  "courseName": "CodeHS Web Design",
  "defaultLanguage": "en",
  "glossaryFolderPath": ["Glossaries"],
  "objectiveFolderPath": ["Resources", "Learning Objectives"]
}
```

The path is case-sensitive and relative to that course's folder. The complete
example resolves as:

```text
<academic-year folder>/CodeHS Web Design/Resources/Learning Objectives
```

The configured Drive credential retains the existing single
`drive.readonly` scope. The importer performs bounded child listings and reads
only direct-child Google Docs, `.txt`, or Markdown files in the resolved
objective folder. Google Docs are exported as `text/plain`; Drive exports are
supported by the v3 `files.export` method and the configured read-only scope.

## Document contract

Objective extraction is deliberately deterministic. Each entry needs a lesson
identifier and explicit objective wording. One document may contain many
lessons:

```text
Lesson 6.10.2 — Nested conditionals
Learning objectives:
- Students will trace nested conditional branches.
- Students will select conditions that model a stated rule.

Unit 6, Chapter 11, Section 1: Assessment
Objective: Students will demonstrate mastery of nested conditionals.
```

The importer also accepts a single objective block when the filename contains
the lesson identifier, such as `Lesson 2.4.1 notes`:

```text
Learning objective: Students will build a semantic navigation menu.
```

Supported identifiers contain two through four numeric components, such as
`2.4`, `6.10.2`, or `3.2.1.4`. Objective lines may start with `Learning
objective:`, `Learning objectives:`, `Objective:`, or `Students will`. A labeled
plural block may contain bullet or numbered objectives.

## Matching and fallback

For each fresh upcoming Classroom item, Chalkwright searches the assignment
title, description, and material titles for lesson identifiers. It tries the
most specific identifier first. When a publisher restarts lesson numbering
inside named units or uses labels such as `L01`, Chalkwright may instead match
the normalized full lesson title from the objective entry. Title matching
requires at least 12 characters and uses only the longest unique explicit
title, so a generic word such as “Introduction” cannot select an objective.
The objective becomes the featured slide text; the assignment title, compact
directions, Classroom reminder, and due date remain as supporting details.

Unstructured prose is never interpreted, and conflicting identifier or title
entries never win by guessing. When no exact unique match exists—or Drive
refresh is unavailable—the last valid local catalog remains available and an
unmatched assignment keeps the prior assignment-title display.

This is a new documentation-backed enrichment capability. The retained legacy
evidence shows that the old implementation generated objective-shaped slides
but featured the assignment title; it did not establish semantic objective
derivation.
