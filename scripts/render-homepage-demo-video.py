#!/usr/bin/env python3
"""Assemble the Chalkwright homepage demo from captured visuals and narration."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path


CAPTION_CHUNKS = {
    "opening": ["This is ChalkWright:", "my classroom display that keeps the day moving", "without needing constant attention."],
    "overview": ["It reads my schedule,", "brings in the content I've already posted in Google Classroom", "and automatically chooses the right screen for each moment."],
    "anatomy": ["Every state on my display shares a consistent header:", "the school logo area, the current class,", "the date and time", "and during class a live minutes-to-bell counter."],
    "tomorrow": ["It starts by looking ahead", "so my next class day is already organized."],
    "today": ["In the morning, the room opens with the day's complete schedule,", "giving me an at-a-glance view of the day ahead", "and when the first check-in opens."],
    "coming-up": ["Before my first class, the display shifts to what's coming up,", "with the class time and a live countdown."],
    "web-objective": ["When my Web Design class begins,", "the display starts with its objective", "and continues into the current assignment from Google Classroom."],
    "web-vocabulary-vi": ["And the vocabulary my students need for the lesson.", "English stays anchored while the translation rotates"],
    "web-vocabulary-ko": ["from Vietnamese to Korean"],
    "web-vocabulary-zh": ["and then Chinese."],
    "robotics-objective": ["And then when my Robotics class begins,", "the display shifts to a completely different objective."],
    "robotics-assignment": ["Then ChalkWright brings in", "the Google Classroom assignment."],
    "robotics-vocabulary-vi": ["The supporting vocabulary changes too."],
    "robotics-vocabulary-ko": ["These vocabulary entries come from a spreadsheet", "I prepared with help from AI.", "ChalkWright displays any terms and translations it finds there."],
    "robotics-vocabulary-zh": ["These languages fit my classroom.", "I can configure different languages or no translations at all."],
    "dismissal": ["As the bell approaches, it moves into dismissal mode", "so I know exactly how much time remains", "and what needs to happen before my class leaves."],
    "closing": ["The result is simple:", "less time managing my screen and more time teaching.", "That's ChalkWright.", "ChalkWright is free, open-source software released under the Apache 2.0 license."],
}


def run(arguments: list[str]) -> None:
    subprocess.run(arguments, check=True)


def vtt_time(seconds: float) -> str:
    milliseconds = round(seconds * 1000)
    hours, remainder = divmod(milliseconds, 3_600_000)
    minutes, remainder = divmod(remainder, 60_000)
    secs, millis = divmod(remainder, 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millis:03d}"


def write_captions(path: Path, timeline: list[dict], audio: dict) -> None:
    cues: list[tuple[float, float, str]] = []
    for scene in timeline:
        cursor = float(scene["startsAtSeconds"]) + float(scene["narrationLeadInSeconds"])
        for filename in scene["narration"]:
            item = next(value for value in audio.values() if value["file"] == filename)
            duration = float(item["durationSeconds"])
            chunks = CAPTION_CHUNKS[item["scene"]]
            weights = [max(1, len(chunk.split())) for chunk in chunks]
            total = sum(weights)
            for index, (chunk, weight) in enumerate(zip(chunks, weights)):
                end = cursor + duration * weight / total
                if index == len(chunks) - 1:
                    end = float(scene["startsAtSeconds"]) + float(scene["narrationLeadInSeconds"]) + sum(
                        float(next(value for value in audio.values() if value["file"] == prior)["durationSeconds"])
                        for prior in scene["narration"][: scene["narration"].index(filename) + 1]
                    )
                cues.append((cursor, end, chunk))
                cursor = end
    content = ["WEBVTT", "", "NOTE Captions generated from the final approved narration script and scene-aligned audio.", ""]
    for index, (start, end, caption) in enumerate(cues, start=1):
        content.extend([str(index), f"{vtt_time(start)} --> {vtt_time(end)}", caption, ""])
    path.write_text("\n".join(content), encoding="utf-8")


def main() -> None:
    if len(sys.argv) != 5:
        raise SystemExit(
            "usage: render-homepage-demo-video.py FFMPEG NARRATION_DIRECTORY OUTPUT_DIRECTORY INTRO_PHOTO"
        )
    ffmpeg = str(Path(sys.argv[1]).resolve())
    narration = Path(sys.argv[2]).resolve()
    output = Path(sys.argv[3]).resolve()
    intro_photo = Path(sys.argv[4]).resolve()
    output.mkdir(parents=True, exist_ok=True)
    parts = output / "parts"
    parts.mkdir(parents=True, exist_ok=True)
    repository = Path(__file__).resolve().parent.parent
    frames = repository / "docs/assets/homepage-demo"
    animations = frames / "animations"
    manifest = json.loads((narration / "manifest.json").read_text(encoding="utf-8"))
    audio = {item["scene"]: item for item in manifest["scenes"]}
    scenes = [
        ("opening", "opening", frames / "01-opening.png"),
        ("overview", "animation", animations / "00-how-it-works-highlight.webm"),
        ("anatomy", "animation", animations / "00-screen-anatomy-tour.webm"),
        ("tomorrow", "still", frames / "03-tomorrow.png"),
        ("today", "still", frames / "04-todays-schedule.png"),
        ("coming-up", "coming", animations / "01-coming-up-countdown.webm"),
        (
            "web-classroom",
            "classroom-sequence",
            (
                frames / "06a-web-design-objective.png",
                animations / "04-classroom-assignment-reveal.webm",
            ),
        ),
        ("web-vocabulary", "vocabulary", animations / "03-vocabulary-language-rotation.webm"),
        (
            "robotics-objective",
            "splash-objective",
            (
                animations / "01b-robotics-coming-up-countdown.webm",
                frames / "06d-robotics-objective.png",
            ),
        ),
        (
            "robotics-assignment",
            "animation",
            animations / "06-robotics-classroom-assignment-reveal.webm",
        ),
        (
            "robotics-vocabulary",
            "synced-vocabulary",
            animations / "05-robotics-vocabulary-language-rotation.webm",
        ),
        ("dismissal", "animation", animations / "02-dismissal-countdown.webm"),
        ("closing", "still", frames / "08-closing.png"),
    ]
    rendered = []
    timeline = []
    elapsed = 0.0
    for index, (name, kind, visual) in enumerate(scenes, start=1):
        vocabulary_audio = {
            "web-vocabulary": [
                audio["web-vocabulary-vi"],
                audio["web-vocabulary-ko"],
                audio["web-vocabulary-zh"],
            ],
            "robotics-vocabulary": [
                audio["robotics-vocabulary-vi"],
                audio["robotics-vocabulary-ko"],
                audio["robotics-vocabulary-zh"],
            ],
        }
        selected_audio = (
            vocabulary_audio[name]
            if name in vocabulary_audio
            else [audio["web-objective"]]
            if name == "web-classroom"
            else [audio[name]]
        )
        speech_duration = sum(float(item["durationSeconds"]) for item in selected_audio)
        lead_in = 0.0 if name == "web-vocabulary" else 0.4
        tail = 0.0 if name == "web-classroom" else 1.5 if name == "anatomy" else 0.4
        duration = round(speech_duration + lead_in + tail, 3)
        if kind in {"vocabulary", "synced-vocabulary"}:
            duration = max(duration, 10.8)
        target = parts / f"{index:02d}-{name}.mp4"
        audio_inputs: list[str] = []
        for item in selected_audio:
            audio_inputs.extend(["-i", str(narration / item["file"])])
        if kind == "opening":
            visual_input = [
                "-loop",
                "1",
                "-framerate",
                "30",
                "-i",
                str(intro_photo),
                "-loop",
                "1",
                "-framerate",
                "30",
                "-i",
                str(visual),
            ]
            video_filter = (
                f"[{len(selected_audio)}:v]scale=1920:1080:force_original_aspect_ratio=increase,"
                f"crop=1920:1080,trim=duration={duration:.3f},format=yuva420p,"
                "fade=t=out:st=1.8:d=0.6:alpha=1,setpts=PTS-STARTPTS[photo];"
                f"[{len(selected_audio) + 1}:v]scale=1920:1080,trim=duration={duration:.3f},"
                "setpts=PTS-STARTPTS[title];"
                f"[title][photo]overlay=shortest=1:format=auto,format=yuv420p,"
                f"fade=t=out:st={duration - 0.35:.3f}:d=0.35[v]"
            )
        elif kind == "still":
            visual_input = ["-loop", "1", "-framerate", "30", "-i", str(visual)]
            video_filter = (
                f"[{len(selected_audio)}:v]scale=1920:1080,format=yuv420p,"
                f"fade=t=in:st=0:d=0.35,fade=t=out:st={duration - 0.35:.3f}:d=0.35[v]"
            )
        elif kind == "splash-objective":
            splash, objective = visual
            visual_input = [
                "-i",
                str(splash),
                "-loop",
                "1",
                "-framerate",
                "30",
                "-i",
                str(objective),
            ]
            video_filter = (
                f"[{len(selected_audio)}:v]scale=1920:1080,trim=duration=3.100,"
                "format=yuva420p,fade=t=out:st=2.70:d=0.35:alpha=1,"
                "setpts=PTS-STARTPTS[splash];"
                f"[{len(selected_audio) + 1}:v]scale=1920:1080,trim=duration={duration:.3f},"
                "setpts=PTS-STARTPTS[objective];"
                "[objective][splash]overlay=shortest=0:eof_action=pass:format=auto,format=yuv420p,"
                f"fade=t=in:st=0:d=0.25,fade=t=out:st={duration - 0.35:.3f}:d=0.35[v]"
            )
        elif kind == "classroom-sequence":
            objective, assignment = visual
            objective_duration = 2.0
            assignment_duration = duration - objective_duration
            assignment_speed = assignment_duration / 5.0
            visual_input = [
                "-loop",
                "1",
                "-framerate",
                "30",
                "-i",
                str(objective),
                "-ss",
                "4",
                "-i",
                str(assignment),
            ]
            video_filter = (
                f"[{len(selected_audio)}:v]scale=1920:1080,format=yuv420p,"
                f"trim=duration={objective_duration:.3f},setpts=PTS-STARTPTS[objective];"
                f"[{len(selected_audio) + 1}:v]scale=1920:1080,format=yuv420p,"
                f"setpts=(PTS-STARTPTS)*{assignment_speed:.6f},"
                f"trim=duration={assignment_duration:.3f}[assignment];"
                "[objective][assignment]concat=n=2:v=1:a=0,"
                f"fade=t=in:st=0:d=0.35[v]"
            )
        elif kind == "synced-vocabulary":
            visual_input = ["-i", str(visual)]
            phase_durations = [
                0.4 + float(selected_audio[0]["durationSeconds"]),
                float(selected_audio[1]["durationSeconds"]),
                float(selected_audio[2]["durationSeconds"]) + 0.4,
            ]
            source_durations = [10.0, 10.0, 9.0]
            trims = [(0, 10), (10, 20), (20, 29)]
            source_index = len(selected_audio)
            phase_filters = []
            for phase_index, ((start, end), source_duration, phase_duration) in enumerate(
                zip(trims, source_durations, phase_durations)
            ):
                phase_filters.append(
                    f"[phase{phase_index}src]trim=start={start}:end={end},"
                    f"setpts=(PTS-STARTPTS)*{phase_duration / source_duration:.6f}"
                    f"[phase{phase_index}]"
                )
            video_filter = (
                f"[{source_index}:v]scale=1920:1080,format=yuv420p,"
                "split=3[phase0src][phase1src][phase2src];"
                + ";".join(phase_filters)
                + ";[phase0][phase1][phase2]concat=n=3:v=1:a=0,"
                f"fade=t=in:st=0:d=0.35,fade=t=out:st={duration - 0.35:.3f}:d=0.35[v]"
            )
        else:
            seek = ["-ss", "8"] if kind == "coming" else []
            visual_input = seek + ["-stream_loop", "-1", "-i", str(visual)]
            speed_ratio = 29 / duration if kind == "vocabulary" else 1
            speed = f",setpts=PTS/{speed_ratio:.6f}" if kind == "vocabulary" else ""
            fades = (
                f",fade=t=out:st={duration - 0.35:.3f}:d=0.35"
                if name == "web-vocabulary"
                else f",fade=t=in:st=0:d=0.35,fade=t=out:st={duration - 0.35:.3f}:d=0.35"
            )
            video_filter = (
                f"[{len(selected_audio)}:v]scale=1920:1080,format=yuv420p{speed}{fades}[v]"
            )
        audio_fade = (
            ""
            if name == "web-classroom"
            else f",afade=t=out:st={duration - 0.25:.3f}:d=0.25"
        )
        if len(selected_audio) == 1:
            audio_filter = (
                f"[0:a]adelay={round(lead_in * 1000)},apad,atrim=0:{duration:.3f}"
                f"{audio_fade}[a]"
            )
        else:
            labels = "".join(f"[{item}:a]" for item in range(len(selected_audio)))
            audio_filter = (
                f"{labels}concat=n={len(selected_audio)}:v=0:a=1[speech];"
                f"[speech]adelay={round(lead_in * 1000)},apad,atrim=0:{duration:.3f}"
                f"{audio_fade}[a]"
            )
        run(
            [
                ffmpeg,
                "-hide_banner",
                "-loglevel",
                "error",
                "-y",
                *audio_inputs,
                *visual_input,
                "-filter_complex",
                f"{video_filter};{audio_filter}",
                "-map",
                "[v]",
                "-map",
                "[a]",
                "-t",
                f"{duration:.3f}",
                "-r",
                "30",
                "-c:v",
                "libx264",
                "-preset",
                "medium",
                "-crf",
                "18",
                "-c:a",
                "aac",
                "-b:a",
                "192k",
                "-movflags",
                "+faststart",
                str(target),
            ]
        )
        rendered.append(target)
        timeline.append(
            {
                "scene": name,
                "startsAtSeconds": round(elapsed, 3),
                "durationSeconds": duration,
                "visual": (
                    [item.name for item in visual]
                    if isinstance(visual, tuple)
                    else visual.name
                ),
                "narration": [item["file"] for item in selected_audio],
                "narrationLeadInSeconds": lead_in,
            }
        )
        elapsed += duration
    concat = output / "concat.txt"
    concat.write_text(
        "".join(f"file '{path.as_posix()}'\n" for path in rendered), encoding="utf-8"
    )
    raw = output / "chalkwright-homepage-demo-raw.mp4"
    final = output / "chalkwright-homepage-demo.mp4"
    run(
        [
            ffmpeg,
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(concat),
            "-c",
            "copy",
            "-movflags",
            "+faststart",
            str(raw),
        ]
    )
    run(
        [
            ffmpeg,
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(raw),
            "-map",
            "0:v",
            "-map",
            "0:a",
            "-c:v",
            "copy",
            "-af",
            "loudnorm=I=-16:TP=-1.5:LRA=11",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-movflags",
            "+faststart",
            str(final),
        ]
    )
    raw.unlink()
    narration_wav = output / "chalkwright-homepage-demo-narration.wav"
    narration_m4a = output / "chalkwright-homepage-demo-narration.m4a"
    run(
        [
            ffmpeg,
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(final),
            "-vn",
            "-c:a",
            "pcm_s16le",
            str(narration_wav),
        ]
    )
    run(
        [
            ffmpeg,
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(final),
            "-vn",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            str(narration_m4a),
        ]
    )
    (output / "video-manifest.json").write_text(
        json.dumps(
            {
                "file": final.name,
                "narrationFiles": [narration_m4a.name, narration_wav.name],
                "format": "MP4 / H.264 / AAC",
                "resolution": "1920x1080",
                "frameRate": 30,
                "durationSeconds": round(elapsed, 3),
                "narrator": manifest,
                "introPhoto": intro_photo.name,
                "timeline": timeline,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    write_captions(output / "chalkwright-homepage-demo.en.vtt", timeline, audio)


if __name__ == "__main__":
    main()
