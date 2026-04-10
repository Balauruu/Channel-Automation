---
name: research
description: >-
  Run the documentary research pipeline for a project. Dispatches the
  researcher agent to conduct 3-pass research (survey, deepen, synthesize).
disable-model-invocation: true
---

# Research Pipeline

Run the full documentary research pipeline for a project.

## Instructions

1. Verify `projects/$ARGUMENTS/` exists. If not, tell the user: "Project not found. Run `/strategy` first to initialize a project."

2. Dispatch @researcher with the following task:

   "Research the documentary topic for project '$ARGUMENTS'. Read the project metadata at `projects/$ARGUMENTS/metadata.md`. Conduct your 3-pass research process (survey, deepen, synthesize). Write the research dossier to `projects/$ARGUMENTS/research/Research.md`. Write the entity index to `projects/$ARGUMENTS/research/entity_index.json`."

3. Present a summary of key findings (topic overview, source count, key entities discovered).

4. Guide the user: "Research complete. Run `/write-script $ARGUMENTS` to generate a documentary script from this research."
