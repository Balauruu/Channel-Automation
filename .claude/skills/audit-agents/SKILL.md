---
name: audit-agents
description: >-
  Validate all agent definitions for required fields, valid tool scoping,
  skill references, and memory setup. Produces a structured report with
  fix suggestions and offers to auto-fix approved changes.
disable-model-invocation: true
---

# Agent Audit

Validate all 12 agent definitions in the Channel-Automation pipeline.

## Steps

1. Run the audit script:

   Use Bash to execute: `node .claude/scripts/audit-agents.js`

2. Read the output carefully. The script checks:
   - **Dimension 1**: Required frontmatter fields (name, description, model, memory, skills)
   - **Dimension 2**: Tool scoping validity (all tools: values are valid Claude Code tools)
   - **Dimension 3**: Skill references (every skills: entry has a matching directory)
   - **Dimension 4**: Memory setup (every memory: project agent has MEMORY.md)
   - **Cross-consistency**: CLAUDE.md table, config.json mapping, orphan detection

3. Present the report to the user. For each failure, show the fix suggestion.

4. If there are failures, ask the user: "Would you like me to auto-fix these issues? I can apply the suggested fixes automatically."

5. If the user approves auto-fix:
   - Run `node .claude/scripts/audit-agents.js --fix`
   - Then re-run `node .claude/scripts/audit-agents.js` to verify fixes
   - Present the updated report

6. If all checks pass: "All 12 agents pass validation across all dimensions. System is healthy."
