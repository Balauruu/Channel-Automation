---
name: write-script
description: >-
  Generate a documentary script from research. Dispatches the writer
  agent with the research dossier and voice profile context.
disable-model-invocation: true
---

# Write Script Pipeline

Generate a documentary script from completed research.

## Instructions

1. Verify `projects/$ARGUMENTS/research/Research.md` exists. If not, tell the user: "Research not found. Run `/research $ARGUMENTS` first."

2. Dispatch @writer with the following task:

   "Generate a documentary script for project '$ARGUMENTS'. Read the research dossier at `projects/$ARGUMENTS/research/Research.md`. Read the entity index at `projects/$ARGUMENTS/research/entity_index.json`. Read the voice profile at `channel/voice-profile.md`. Write the script to `projects/$ARGUMENTS/script/Script.md`. Write script metadata to `projects/$ARGUMENTS/script/metadata.json`."

3. Present script summary (word count, act count, estimated duration at 150 words/min).

4. Guide the user: "Script complete. Run `/visual-plan $ARGUMENTS` to generate the visual plan and shotlist."
