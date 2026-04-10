---
name: compile
description: >-
  Compile the DaVinci Resolve edit sheet from script, shotlist, and scored
  assets. Dispatches the compiler agent.
disable-model-invocation: true
---

# Compile Pipeline

Compile the DaVinci Resolve edit sheet for a project.

## Instructions

1. Verify `projects/$ARGUMENTS/assets/asset_manifest.json` exists. If not, tell the user: "Asset manifest not found. Run `/process-assets $ARGUMENTS` first."

2. Dispatch @compiler with the following task:

   "Compile the edit sheet for project '$ARGUMENTS'. Read the script at `projects/$ARGUMENTS/script/Script.md`. Read the shotlist at `projects/$ARGUMENTS/visuals/shotlist.json`. Read the asset manifest at `projects/$ARGUMENTS/assets/asset_manifest.json`. Generate the DaVinci Resolve edit sheet at `projects/$ARGUMENTS/compilation/edit_sheet.json`. Generate the asset organization report at `projects/$ARGUMENTS/compilation/asset_report.md`."

3. Present compilation summary (total shots, asset coverage percentage, timeline duration estimate).

4. Guide the user: "Compilation complete. The edit sheet is ready for DaVinci Resolve import at `projects/$ARGUMENTS/compilation/edit_sheet.json`."
