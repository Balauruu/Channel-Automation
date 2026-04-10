---
name: strategy
description: >-
  Run the full strategy pipeline: competitor scraping, trend analysis,
  and topic generation. For individual operations, use /strategy-scrape,
  /strategy-analyze, or /strategy-topics.
disable-model-invocation: true
---

# Strategy Pipeline

Run the complete strategy pipeline for the documentary channel.

## Instructions

1. If `$ARGUMENTS` is provided and looks like a project name, set PROJECT = $ARGUMENTS. Otherwise proceed without a project context.

2. Dispatch @strategy with the following task:

   "Run the complete strategy pipeline for the documentary channel.
   a) Use WebSearch to research competitor channels for latest video data on dark mysteries/true crime documentaries.
   b) Analyze competitor data for trends, gaps, and opportunities.
   c) Generate 5 scored topic candidates with scores for obscurity, complexity, shock_factor, verifiability, pillar_fit.
   Write competitor data to `projects/strategy/competitor_data.md`.
   Write analysis to `projects/strategy/analysis.md`.
   Write topics to `projects/strategy/topics.md`."

3. **CHECKPOINT**: Present the generated topics to the user. Display each topic with its individual scores and total score in a table format.

4. **STOP HERE. Do not continue. Wait for the user to select a topic.**

5. After user selects a topic: Dispatch @strategy with task:
   "Create project directory `projects/<selected-topic-slug>/` with subdirectories: `research/`, `script/`, `visuals/`, `assets/`, `compilation/`. Write a `metadata.md` with topic name, selection date, scores."

6. Guide the user: "Project initialized. Run `/research <project-name>` to start the documentary research pipeline."
