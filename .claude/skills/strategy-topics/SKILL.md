---
name: strategy-topics
description: >-
  Generate scored topic candidates for the documentary channel. Granular
  sub-command of /strategy.
disable-model-invocation: true
---

# Strategy Topics

Generate and score topic candidates for the documentary channel.

## Instructions

1. Dispatch @strategy with the following task:

   "Generate 5 scored topic candidates based on analysis at `projects/strategy/analysis.md`. Score each on obscurity, complexity, shock_factor, verifiability, pillar_fit (1-5 scale each). Rank by total score descending. Check against `channel/past_topics.md` for near-duplicates. Write topics to `projects/strategy/topics.md`."

2. Present topics to the user in a table with individual scores and total score.

3. **STOP HERE. Do not continue. Wait for the user to select a topic.**
