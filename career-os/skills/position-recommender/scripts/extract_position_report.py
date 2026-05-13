#!/usr/bin/env python3
import json
import re
import sys
from pathlib import Path


def strip_to_markdown(raw_text: str) -> str:
    content = raw_text.strip()
    content = re.sub(r"\n```\s*$", "", content)
    lines = content.splitlines()
    for i, line in enumerate(lines):
        if line.lstrip().startswith("#"):
            return "\n".join(lines[i:]).strip()
    return content


def main(argv: list[str]) -> int:
    if len(argv) != 3:
        print("usage: extract_position_report.py <raw-json> <output-md>", file=sys.stderr)
        return 1
    raw_path = Path(argv[1])
    out_path = Path(argv[2])
    payload = json.loads(raw_path.read_text(encoding="utf-8", errors="replace"))
    content = strip_to_markdown(payload.get("result", ""))
    if not content.startswith("#"):
        raise SystemExit("position report validation failed: output does not start with #")
    if len([line for line in content.splitlines() if line.strip()]) < 30:
        raise SystemExit("position report validation failed: output is too short")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(content.rstrip() + "\n", encoding="utf-8")
    print(f"Wrote position recommendation: {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
