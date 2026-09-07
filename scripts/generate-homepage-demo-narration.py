#!/usr/bin/env python3
"""Generate scene-aligned homepage-demo narration with Kokoro-82M."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro import KPipeline


SAMPLE_RATE = 24_000
VOICE = "af_heart"
SPEED = 1.02
LEADING_SILENCE_SECONDS = {
    "robotics-vocabulary-zh": 0.4,
}
SCENES = (
    ("opening", "This is ChalkWright: my classroom display that keeps the day moving without needing constant attention."),
    ("overview", "It reads my schedule, brings in the content I've already posted in Google Classroom and automatically chooses the right screen for each moment."),
    ("anatomy", "Every state on my display shares a consistent header: the school logo area, the current class, the date and time and during class a live minutes-to-bell counter."),
    ("tomorrow", "It starts by looking ahead so my next class day is already organized."),
    ("today", "In the morning, the room opens with the day's complete schedule, giving me an at-a-glance view of the day ahead and when the first check-in opens."),
    ("coming-up", "Before my first class, the display shifts to what's coming up, with the class time and a live countdown."),
    ("web-objective", "When my Web Design class begins, the display starts with its objective and continues into the current assignment from Google Classroom."),
    ("web-vocabulary-vi", "And the vocabulary my students need for the lesson. English stays anchored while the translation rotates"),
    ("web-vocabulary-ko", "from Vietnamese to Korean"),
    ("web-vocabulary-zh", "and then Chinese."),
    ("robotics-objective", "And then when my Robotics class begins, the display shifts to a completely different objective."),
    ("robotics-assignment", "Then ChalkWright brings in the Google Classroom assignment."),
    ("robotics-vocabulary-vi", "The supporting vocabulary changes too."),
    ("robotics-vocabulary-ko", "These vocabulary entries come from a spreadsheet I prepared with help from AI.\n\nChalkWright displays any terms and translations it finds there."),
    ("robotics-vocabulary-zh", "These languages fit my classroom. I can configure different languages or no translations at all."),
    ("dismissal", "As the bell approaches, it moves into dismissal mode so I know exactly how much time remains and what needs to happen before my class leaves."),
    ("closing", "The result is simple: less time managing my screen and more time teaching. That's ChalkWright. ChalkWright is free, open-source software released under the Apache two point oh license."),
)


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: generate-homepage-demo-narration.py OUTPUT_DIRECTORY")
    output = Path(sys.argv[1]).resolve()
    output.mkdir(parents=True, exist_ok=True)
    pipeline = KPipeline(lang_code="a", repo_id="hexgrad/Kokoro-82M")
    manifest = []
    for index, (scene, text) in enumerate(SCENES, start=1):
        chunks = []
        paragraphs = text.split("\n\n")
        for paragraph_index, paragraph in enumerate(paragraphs):
            chunks.extend(
                audio for _, _, audio in pipeline(paragraph, voice=VOICE, speed=SPEED)
            )
            if paragraph_index < len(paragraphs) - 1:
                chunks.append(np.zeros(round(SAMPLE_RATE * 0.6), dtype=np.float32))
        if not chunks:
            raise RuntimeError(f"no audio generated for {scene}")
        audio = np.concatenate(chunks).astype(np.float32)
        leading_silence = LEADING_SILENCE_SECONDS.get(scene, 0.0)
        if leading_silence > 0:
            audio = np.concatenate(
                [
                    np.zeros(round(SAMPLE_RATE * leading_silence), dtype=np.float32),
                    audio,
                ]
            )
        active_samples = np.flatnonzero(np.abs(audio) >= 0.002)
        join_padding = round(SAMPLE_RATE * 0.09)
        if active_samples.size > 0 and scene == "web-objective":
            audio = audio[: min(len(audio), int(active_samples[-1]) + join_padding + 1)]
        if active_samples.size > 0 and scene == "web-vocabulary-vi":
            audio = audio[max(0, int(active_samples[0]) - join_padding) :]
        path = output / f"{index:02d}-{scene}.wav"
        sf.write(path, audio, SAMPLE_RATE, subtype="PCM_16")
        manifest.append(
            {
                "scene": scene,
                "file": path.name,
                "text": text,
                "durationSeconds": round(len(audio) / SAMPLE_RATE, 3),
            }
        )
    (output / "manifest.json").write_text(
        json.dumps(
            {
                "model": "hexgrad/Kokoro-82M",
                "kokoroVersion": "0.9.4",
                "voice": VOICE,
                "speed": SPEED,
                "sampleRate": SAMPLE_RATE,
                "scenes": manifest,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
