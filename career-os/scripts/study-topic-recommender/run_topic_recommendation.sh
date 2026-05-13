#!/usr/bin/env bash
set -euo pipefail
TASK_ROOT="${TASK_ROOT:-$HOME/ai-nodes/career-os}"
SCRIPT_DIR="$TASK_ROOT/scripts/study-topic-recommender"
python3 "$SCRIPT_DIR/refresh_topic_inventory.py" >/dev/null
cat "$TASK_ROOT/data/runtime/morning-topic-recommendation.md"
