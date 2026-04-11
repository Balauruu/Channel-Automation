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

1. **Verification Gate: Research Completeness**

   Before dispatching the writer, verify the research stage is complete. Check each item in order -- if ANY check fails, STOP and show the failure message. Do not dispatch the writer.

   a. Check `projects/$ARGUMENTS/research/Research.md` exists.
      If not: "Research dossier not found. Run `/research $ARGUMENTS` first."

   b. Check `projects/$ARGUMENTS/research/entity_index.json` exists.
      If not: "Entity index not found at `projects/$ARGUMENTS/research/entity_index.json`. Re-run `/research $ARGUMENTS`."

   c. Check `projects/$ARGUMENTS/research/source_manifest.json` exists.
      If not: "Source manifest not found at `projects/$ARGUMENTS/research/source_manifest.json`. Re-run `/research $ARGUMENTS`. Note: script will have limited source attribution without this file."

   d. Read Research.md and verify it contains a `## Executive Summary` heading.
      If not: "Research dossier is missing the Executive Summary section. The research may be incomplete. Re-run `/research $ARGUMENTS`."

   e. Verify Research.md is at least 500 words long (rough count).
      If not: "Research dossier appears too short (under 500 words). The research may be incomplete."

   If ALL checks pass, proceed to step 2.

2. Dispatch @writer with the following task:

   "Generate a documentary script for project '$ARGUMENTS'. Read the research dossier at `projects/$ARGUMENTS/research/Research.md`. Read the entity index at `projects/$ARGUMENTS/research/entity_index.json`. Read the voice profile at `channel/voice-profile.md`. Write the script to `projects/$ARGUMENTS/script/Script.md`. Write script metadata to `projects/$ARGUMENTS/script/metadata.json`."

3. Present script summary (word count, act count, estimated duration at 150 words/min).

4. Guide the user: "Script complete. Run `/visual-plan $ARGUMENTS` to generate the visual plan and shotlist."
