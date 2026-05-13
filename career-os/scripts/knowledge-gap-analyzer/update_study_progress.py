#!/usr/bin/env python3
"""Append a daily-run session into study-progress.json.

Usage: update_study_progress.py <progress-file> <topic> <target-list-file>

- Creates <progress-file> with an empty skeleton if it does not exist.
- Appends a session entry (date, topic, files read, source='daily-run').
- Bumps the per-topic weak_spots counter if the topic is tracked there.
"""
import json
import sys
from datetime import date
from pathlib import Path


def main(argv: list[str]) -> int:
    if len(argv) != 4:
        print(
            "usage: update_study_progress.py <progress-file> <topic> <target-list-file>",
            file=sys.stderr,
        )
        return 1

    progress_file = Path(argv[1])
    topic = argv[2]
    target_list_file = Path(argv[3])

    files = [
        line.strip()
        for line in target_list_file.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    today = date.today().isoformat()

    if progress_file.exists():
        progress = json.loads(progress_file.read_text(encoding="utf-8"))
    else:
        progress = {"sessions": [], "weak_spots": {}}

    progress["sessions"].append(
        {"date": today, "topics": [topic], "files": files, "source": "daily-run"}
    )

    weak_spots = progress.get("weak_spots", {})
    if topic in weak_spots:
        ws = weak_spots[topic]
        ws["last_studied"] = today
        ws["study_count"] = ws.get("study_count", 0) + 1

    progress_file.parent.mkdir(parents=True, exist_ok=True)
    progress_file.write_text(
        json.dumps(progress, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"Updated study progress: topic={topic}, date={today}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
