#!/usr/bin/env python3
"""
Select the most overdue weak spot topic from data/study-progress.json.

Priority:
  1. weak_spots with last_studied = null (never studied), alphabetical tiebreak
  2. weak_spots with the oldest last_studied date

Prints the selected topic name to stdout.
Falls back to 'jpa-n+1' if the progress file is missing, empty, or invalid.

Usage:
    python3 select_topic.py <path-to-study-progress.json>
"""
import json
import sys
from pathlib import Path

FALLBACK_TOPIC = "jpa-n+1"


def main():
    if len(sys.argv) < 2:
        print(FALLBACK_TOPIC)
        return

    progress_path = Path(sys.argv[1])
    if not progress_path.exists():
        print(FALLBACK_TOPIC, file=sys.stderr)
        print(FALLBACK_TOPIC)
        return

    try:
        progress = json.loads(progress_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as e:
        print(f"Warning: could not read progress file: {e}", file=sys.stderr)
        print(FALLBACK_TOPIC)
        return

    weak_spots = progress.get("weak_spots", {})
    if not weak_spots:
        print(FALLBACK_TOPIC)
        return

    def sort_key(item):
        name, data = item
        last = data.get("last_studied")
        if last is None:
            return (0, "", name)   # Never studied → highest priority
        return (1, last, name)     # ISO date string sorts correctly chronologically

    sorted_spots = sorted(weak_spots.items(), key=sort_key)
    selected = sorted_spots[0][0]
    print(f"Auto-selected topic: {selected}", file=sys.stderr)
    print(selected)


if __name__ == "__main__":
    main()
