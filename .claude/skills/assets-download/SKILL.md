---
name: assets-download
description: >-
  Download candidate assets for a project's shotlist. Granular sub-command
  of /process-assets.
disable-model-invocation: true
---

# Assets Download

Download candidate assets for a project's visual requirements.

## Instructions

1. Dispatch @asset-processor with the following task:

   "Download candidate assets for project '$ARGUMENTS'. Read the shotlist at `projects/$ARGUMENTS/visuals/shotlist.json`. Download candidates to `projects/$ARGUMENTS/assets/raw/`. Write download log to `projects/$ARGUMENTS/assets/download_log.json`."

2. Present a summary of downloaded assets (total files, formats, total size).
