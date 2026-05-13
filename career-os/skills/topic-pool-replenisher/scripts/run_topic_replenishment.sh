#!/usr/bin/env bash
set -euo pipefail
TASK_ROOT="${TASK_ROOT:-$HOME/ai-nodes/career-os}"
SCRIPT="$TASK_ROOT/skills/topic-pool-replenisher/scripts/replenish_topic_reservoir.py"
python3 "$SCRIPT"
cat "$TASK_ROOT/data/runtime/topic-replenishment.md"
