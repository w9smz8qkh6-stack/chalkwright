# Chalkwright homepage demo video

This package is a privacy-safe, 16:9 storyboard for a narrated homepage video. The product frames are captured from the real Chalkwright display renderer at deterministic B407 fixture times. Course names and classroom content are synthetic; layout, visual states, timing behavior, artwork, and UI styling are production-representative.

## Recommended edit

The original still-frame edit targeted 95–105 seconds. The current rendered narrated cut runs approximately 123 seconds because it includes the real classroom introduction, live animation, the expanded vocabulary-source explanation and an open-source closing card.

| Time      | Frame                                                                  | Narration                                                                                                                                                                                  |
| --------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0:00–0:07 | `01-opening.png`                                                       | “This is ChalkWright: my classroom display that keeps the day moving without needing constant attention.”                                                                                  |
| 0:07–0:17 | `00-how-it-works-highlight.webm`                                       | “It reads my schedule, brings in the content I’ve already posted in Google Classroom and automatically chooses the right screen for each moment.”                                          |
| 0:17–0:29 | `00-screen-anatomy-tour.webm`                                          | “Every state on my display shares a consistent header: the school logo area, the current class, the date and time and during class a live minutes-to-bell counter.”                        |
| 0:29–0:34 | `03-tomorrow.png`                                                      | “It starts by looking ahead so my next class day is already organized.”                                                                                                                    |
| 0:34–0:44 | `04-todays-schedule.png`                                               | “In the morning, the room opens with the day’s complete schedule, giving me an at-a-glance view of the day ahead and when the first check-in opens.”                                       |
| 0:44–0:51 | `01-coming-up-countdown.webm`                                          | “Before my first class, the display shifts to what’s coming up, with the class time and a live countdown.”                                                                                 |
| 0:51–0:59 | `06a-web-design-objective.png` → `04-classroom-assignment-reveal.webm` | “When my Web Design class begins, the display starts with its objective and continues into the current assignment from Google Classroom.”                                                  |
| 0:59–1:05 | `03-vocabulary-language-rotation.webm`                                 | “And the vocabulary my students need for the lesson. English stays anchored while the translation rotates…”                                                                                |
| 1:05–1:07 | `03-vocabulary-language-rotation.webm`                                 | “…from Vietnamese to Korean…”                                                                                                                                                              |
| 1:07–1:10 | `03-vocabulary-language-rotation.webm`                                 | “…and then Chinese.”                                                                                                                                                                       |
| 1:10–1:16 | `01b-robotics-coming-up-countdown.webm` → `06d-robotics-objective.png` | “And then when my Robotics class begins, the display shifts to a completely different objective.”                                                                                          |
| 1:16–1:21 | `06-robotics-classroom-assignment-reveal.webm`                         | “Then ChalkWright brings in the Google Classroom assignment.”                                                                                                                              |
| 1:21–1:25 | `05-robotics-vocabulary-language-rotation.webm`                        | “The supporting vocabulary changes too.”                                                                                                                                                   |
| 1:25–1:35 | `05-robotics-vocabulary-language-rotation.webm`                        | “These vocabulary entries come from a spreadsheet I prepared with help from AI. ChalkWright displays any terms and translations it finds there.”                                           |
| 1:35–1:41 | `05-robotics-vocabulary-language-rotation.webm`                        | “These languages fit my classroom. I can configure different languages or no translations at all.”                                                                                         |
| 1:41–1:50 | `02-dismissal-countdown.webm`                                          | “As the bell approaches, it moves into dismissal mode so I know exactly how much time remains and what needs to happen before my class leaves.”                                            |
| 1:50–2:03 | `08-closing.png`                                                       | “The result is simple: less time managing my screen and more time teaching. That’s ChalkWright. ChalkWright is free, open-source software released under the Apache two point oh license.” |

## Captions

The final render includes `chalkwright-homepage-demo.en.vtt`, an English
WebVTT track generated directly from the approved narration script and aligned
to the rendered scene timeline. The landing page enables it by default and
provides a dedicated visible CC toggle alongside the native player controls
instead of baking captions into the product UI.

Short visual summaries can still be added in a website layer when useful:

1. Schedule-aware
2. Connected to Google Classroom
3. Automatically timed

## Frame order

1. Opening title
2. System overview
3. Classroom screen anatomy
4. Tomorrow
5. Today’s schedule
6. Web Design coming up
7. Web Design objective
8. Web Design assignment
9. Web Design vocabulary — Vietnamese
10. Web Design vocabulary — Korean
11. Web Design vocabulary — Chinese
12. Robotics coming up
13. Robotics objective
14. Robotics assignment
15. Robotics vocabulary — Vietnamese
16. Robotics vocabulary — Korean
17. Robotics vocabulary — Chinese
18. Robotics dismissal soon
19. Closing frame

The “Tomorrow” frame uses Chalkwright’s authentic next-class-day layout with its valid `Tomorrow` label variant. The manifest records this demo-only date-label selection explicitly.

## Animated inserts

The `docs/assets/homepage-demo/animations` directory contains silent 1920×1080 WebM clips captured from the live Chalkwright browser runtime. The capture pipeline records maximum-quality browser screencast frames and creates screen-content-tuned masters, avoiding the low-bitrate realtime recorder before the final H.264 encode:

1. Narration-timed highlighting of the three “How it works” steps
2. Narration-timed screen-anatomy callouts with element-measured outlines, guided pan, zoom, and final pullback
3. Web Design coming-up countdown entering minute-and-second precision
4. Robotics coming-up countdown accelerating from `10:00` to `0:00` before its objective
5. Robotics dismissal countdown with rapid final timing
6. Vocabulary rotating through Vietnamese, Korean, and Chinese
7. Classroom-derived objective and assignment details revealing in their styled card
8. Robotics vocabulary rotating through Vietnamese, Korean, and Chinese
9. Robotics Google Classroom assignment transitioning from its objective and revealing task and due-date details

Use the countdown clips in place of their corresponding stills. The Robotics introduction preserves the authentic earlier coming-up state while accelerating its runtime-formatted lower-left countdown from `10:00` to `0:00`; it holds at zero before dissolving into the objective. Use each class-specific vocabulary clip for its complete translated-vocabulary passage, use the first Classroom reveal clip for the Web Design assignment passage, and use the Robotics Classroom clip for its assignment narration. The Robotics capture uses a demo-only six-second card interval to reveal the details during the narration while keeping the assignment on screen through the end of the clip; its normal automatic advance begins only after capture stops. Runtime carousel behavior is unchanged. The first vocabulary passage explicitly names each language. The Robotics passage does not repeat that enumeration: its three visual faces change exactly when the narration moves from the vocabulary change, to the spreadsheet source, to classroom-specific language configuration. An explicit 0.4-second leading pause on the final Robotics vocabulary narration segment reinforces the full stop before “These languages fit my classroom.” Each clip includes a representative poster PNG.

Selective explainer, Robotics-splash, or Robotics-Classroom recaptures preserve the complete
existing animation manifest while replacing only their requested entries.

## Rendered cut

The generated MP4 is 1920×1080 H.264 with AAC narration. Its exact scene timeline is recorded in the adjacent `video-manifest.json`; the narration is also exported separately as M4A and WAV files. The rendered cut opens on a real classroom photo, highlights three overview steps, tours the display header with progressive callouts, then follows one coherent day: Web Design appears in the coming-up countdown before its objective, styled Classroom assignment reveal, and vocabulary; later an authentic Robotics coming-up state introduces the second class, accelerates its lower-left counter from `10:00` to `0:00`, holds at zero, and dissolves during the narration pause into its learning objective. The callout visuals lead their matching phrases by approximately 0.2 seconds, then pull back only after the final spoken counter phrase and visibly settle on the complete screen. The Robotics assignment narration no longer redundantly repeats the class name, while its animated card still reveals the task and due-date details before the narration-synchronized vocabulary rotation and dismissal state. The Robotics assignment remains stable through its fade into vocabulary without an unintended outgoing-card animation. The second vocabulary explanation includes a deliberate 1.23-second measured silence across the sentence boundary before “These languages fit my classroom.” Every captured display state uses the ChalkWright logo as the unconfigured school-logo placeholder. The Web Design narration includes a measured 0.37-second clause pause after “begins” and a 0.20-second breath—without a transition fade—between “Google Classroom” and the vocabulary passage. Title, overview, closing-card and caption branding use the displayed `ChalkWright` casing. The closing narration spells out “Apache two point oh license” while captions and the final card retain the conventional “Apache 2.0” form. The final frame links the GitHub-marked official repository at `github.com/w9smz8qkh6-stack/chalkwright`.

## Landing-page delivery

The v15 cut described above is published at `https://chalkwright.org` from the
separate private landing-page repository at
`https://github.com/w9smz8qkh6-stack/chalkwright-site`. The deployed runtime
source is commit `ef120516f84fc31c9c59b29a9b09e4b3aeaa6d1c`, and release token
`20260831a` prevents a stale edge or browser cache from substituting predecessor
media. The Lenovo-hosted Docker origin serves the exact reviewed video SHA-256
`4dd0b26064bbb528304dcc7e646e30fb320402d862c0ff74217fdc4294cab1d6`
with byte-range support and the exact English WebVTT SHA-256
`7601e65b72f972931c372c773917c5100d7fed230c6cefdfee77804f4d7bdd94`
as `text/vtt`. The public player starts with captions enabled and keeps its CC
toggle visible outside the native overflow menu. Loopback and public payloads,
headers, range responses and rendered markup were verified after publication;
the unavailable interactive browser surface prevented a fresh live responsive
visual pass, while the unchanged player UI and v15 media retain their prior
local visual verification.
