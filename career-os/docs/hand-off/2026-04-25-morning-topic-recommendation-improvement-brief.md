# Morning topic recommendation improvement brief

This document is meant for another agent (for example Claude) to pick up the same workstream quickly.

## Goal

Improve the `career-os` morning recommendation / live-coding pipeline so it stays broad, keeps generating useful suggestions, and does not stall whenever the primary topic pool is exhausted.

## Confirmed current findings

### 1. Primary curated study-pack pool is effectively exhausted

- `config/study-pack-topics.json` currently has no uncovered primary topic left versus `data/generated-artifacts.json`
- this explains why recommendation became narrow and conservative

### 2. Primary live-coding seed pool was exhausted

- `config/live-coding-seed-pool.json` had 5 seeds
- all 5 were already covered in generated artifacts
- this caused `run_morning_live_coding.sh` to stop with a "seed pool 보강 필요" message

### 3. The old recommendation behavior was overly prompt-driven

- it relied too much on what the agent could infer from a small config set
- there was no explicit reservoir-health file or candidate backlog

## Changes already introduced

### New files

- `config/study-topic-candidates.json`
- `config/live-coding-seed-candidates.json`
- `skills/cj-oliveyoung-java-backend-prep/scripts/refresh_topic_inventory.py`
- `skills/cj-oliveyoung-java-backend-prep/scripts/run_morning_topic_recommendation.sh`
- `skills/cj-oliveyoung-java-backend-prep/scripts/promote_candidate_topics.py`
- `docs/adr.md` (ADR-009: Morning topic reservoir + recommendation pipeline)

### Behavior changes

- morning recommendation now has a runtime inventory step
- live-coding generation can fall back to candidate seeds when the primary seed pool is empty
- cron recommendation flow now points to the new script-based workflow instead of relying only on a freeform prompt

## What still deserves another agent pass

### A. Recommendation quality tuning

Check whether the new recommendation selection logic should weight these more intelligently:

- recent domain over-concentration
- interview timeline urgency
- candidate profile weak areas
- previously recommended but not yet generated topics

### B. Candidate promotion workflow

Review whether candidate promotion should stay manual-only or support a safer semi-automatic path such as:

- generate candidates into candidate files automatically
- require explicit promotion into canonical configs

### C. Candidate topic quality

Review the newly added candidate topics and seed candidates:

- remove weak or overlapping items
- improve prompts/output paths
- rebalance domains if too architecture-heavy or too interview-heavy

## Suggested review checklist for another agent

1. Read ADR-009 first
2. Read the two candidate config files
3. Run `refresh_topic_inventory.py` and inspect runtime output
4. Run `run_morning_topic_recommendation.sh` and inspect the recommendation text
5. Review whether the five-topic mix feels broad enough
6. Review whether live-coding fallback from candidate seeds is acceptable as-is
7. Propose any promotion or scoring refinements

## Important implementation intent

Do **not** collapse the system back into a single-prompt solution.

The key idea is:

- recommendation quality depends on reservoir quality
- reservoir quality should be explicit in files
- prompt tuning should sit on top of that, not replace it
