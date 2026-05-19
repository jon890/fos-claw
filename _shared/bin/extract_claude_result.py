#!/usr/bin/env python3
"""Compatibility wrapper: Claude --output-format json -> markdown extractor.

Kept for legacy apartment/stock runners that still invoke the old Python path.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path


def main() -> int:
    if len(sys.argv) < 3:
        sys.stderr.write("usage: extract_claude_result.py <claude_json> <output_md> [usage_json]\n")
        return 2

    src = Path(sys.argv[1])
    out = Path(sys.argv[2])
    usage_out = Path(sys.argv[3]) if len(sys.argv) >= 4 and sys.argv[3] else None

    data = json.loads(src.read_text(encoding="utf-8"))
    result = data.get("result")
    if not isinstance(result, str) or not result.strip():
        sys.stderr.write(f"Claude result JSON has no non-empty string 'result': {src}\n")
        return 1

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(result.rstrip() + "\n", encoding="utf-8")

    if usage_out is not None:
        usage_out.parent.mkdir(parents=True, exist_ok=True)
        usage_out.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
