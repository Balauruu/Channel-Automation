---
phase: 2
slug: skills-library
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-10
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node (built-in assert) + custom smoke test |
| **Config file** | tests/smoke-test-skills.js (Wave 0 creates) |
| **Quick run command** | `node tests/smoke-test-skills.js` |
| **Full suite command** | `node tests/smoke-test-skills.js --full` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node tests/smoke-test-skills.js`
- **After every plan wave:** Run `node tests/smoke-test-skills.js --full`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | SKIL-01 | T-02-01 | N/A | structural | `node -e "const fs=require('fs'),p=require('path');const r=p.resolve('D:/Youtube/D. Mysteries Channel/1.2 Agents/Channel-Automation V0.6');const s=fs.readFileSync(p.join(r,'.claude/skills/documentary-research/SKILL.md'),'utf8');const i=fs.existsSync(p.join(r,'.claude/skills/documentary-research/insights.md'));const ok=s.length>0&&i&&s.includes('user-invocable: true')&&s.includes('Phase 0')&&s.includes('Reflection Phase')&&s.includes('[HEURISTIC]')&&s.includes('[DETERMINISTIC]');process.exit(ok?0:1)"` | Yes (inline) | pending |
| 02-01-02 | 01 | 1 | SKIL-02 | T-02-01 | N/A | structural | `node -e "const fs=require('fs'),p=require('path');const r=p.resolve('D:/Youtube/D. Mysteries Channel/1.2 Agents/Channel-Automation V0.6');const s=fs.readFileSync(p.join(r,'.claude/skills/archive-search/SKILL.md'),'utf8');const i=fs.existsSync(p.join(r,'.claude/skills/archive-search/insights.md'));const ok=s.length>0&&i&&s.includes('user-invocable: true')&&s.includes('Phase 0')&&s.includes('Reflection Phase')&&s.includes('[HEURISTIC]')&&s.includes('[DETERMINISTIC]');process.exit(ok?0:1)"` | Yes (inline) | pending |
| 02-01-03 | 01 | 1 | SKIL-05 | T-02-01 | N/A | structural | `node -e "const fs=require('fs'),p=require('path');const r=p.resolve('D:/Youtube/D. Mysteries Channel/1.2 Agents/Channel-Automation V0.6');const s=fs.readFileSync(p.join(r,'.claude/skills/crawl4ai-scraping/SKILL.md'),'utf8');const i=fs.existsSync(p.join(r,'.claude/skills/crawl4ai-scraping/insights.md'));const ok=s.length>0&&i&&s.includes('user-invocable: true')&&s.includes('Phase 0')&&s.includes('Reflection Phase')&&s.includes('[HEURISTIC]')&&s.includes('[DETERMINISTIC]');process.exit(ok?0:1)"` | Yes (inline) | pending |
| 02-02-01 | 02 | 1 | SKIL-03 | T-02-01 | N/A | structural | `node -e "const fs=require('fs'),p=require('path');const r=p.resolve('D:/Youtube/D. Mysteries Channel/1.2 Agents/Channel-Automation V0.6');const s=fs.readFileSync(p.join(r,'.claude/skills/visual-narrative/SKILL.md'),'utf8');const i=fs.existsSync(p.join(r,'.claude/skills/visual-narrative/insights.md'));const ok=s.length>0&&i&&s.includes('user-invocable: true')&&s.includes('Phase 0')&&s.includes('Reflection Phase')&&s.includes('[HEURISTIC]')&&s.includes('[DETERMINISTIC]');process.exit(ok?0:1)"` | Yes (inline) | pending |
| 02-02-02 | 02 | 1 | SKIL-04 | T-02-01 | N/A | structural | `node -e "const fs=require('fs'),p=require('path');const r=p.resolve('D:/Youtube/D. Mysteries Channel/1.2 Agents/Channel-Automation V0.6');const s=fs.readFileSync(p.join(r,'.claude/skills/media-evaluation/SKILL.md'),'utf8');const i=fs.existsSync(p.join(r,'.claude/skills/media-evaluation/insights.md'));const ok=s.length>0&&i&&s.includes('user-invocable: true')&&s.includes('Phase 0')&&s.includes('Reflection Phase')&&s.includes('[HEURISTIC]')&&s.includes('[DETERMINISTIC]');process.exit(ok?0:1)"` | Yes (inline) | pending |
| 02-02-03 | 02 | 1 | SKIL-06 | T-02-01 | N/A | structural | `node -e "const fs=require('fs'),p=require('path');const r=p.resolve('D:/Youtube/D. Mysteries Channel/1.2 Agents/Channel-Automation V0.6');const s=fs.readFileSync(p.join(r,'.claude/skills/data-analysis/SKILL.md'),'utf8');const i=fs.existsSync(p.join(r,'.claude/skills/data-analysis/insights.md'));const ok=s.length>0&&i&&s.includes('user-invocable: true')&&s.includes('Phase 0')&&s.includes('Reflection Phase')&&s.includes('[HEURISTIC]')&&s.includes('[DETERMINISTIC]');process.exit(ok?0:1)"` | Yes (inline) | pending |
| 02-03-01 | 03 | 1 | SKIL-07 | T-02-01 | N/A | structural | `node -e "const fs=require('fs'),p=require('path');const r=p.resolve('D:/Youtube/D. Mysteries Channel/1.2 Agents/Channel-Automation V0.6');const s=fs.readFileSync(p.join(r,'.claude/skills/autoresearch/SKILL.md'),'utf8');const i=fs.existsSync(p.join(r,'.claude/skills/autoresearch/insights.md'));const ok=s.length>0&&i&&s.includes('user-invocable: true')&&s.includes('Phase 0')&&s.includes('Reflection Phase')&&s.includes('[HEURISTIC]')&&s.includes('[DETERMINISTIC]');process.exit(ok?0:1)"` | Yes (inline) | pending |
| 02-03-02 | 03 | 1 | SKIL-08 | T-02-01 | N/A | structural | `node -e "const fs=require('fs'),p=require('path');const r=p.resolve('D:/Youtube/D. Mysteries Channel/1.2 Agents/Channel-Automation V0.6');const s=fs.readFileSync(p.join(r,'.claude/skills/structured-output/SKILL.md'),'utf8');const i=fs.existsSync(p.join(r,'.claude/skills/structured-output/insights.md'));const ok=s.length>0&&i&&s.includes('user-invocable: true')&&s.includes('Phase 0')&&s.includes('Reflection Phase')&&s.includes('[HEURISTIC]')&&s.includes('[DETERMINISTIC]');process.exit(ok?0:1)"` | Yes (inline) | pending |
| 02-04-01 | 04 | 2 | SKIL-09, SKIL-10, SKIL-11, SKIL-12 | T-02-02 | N/A | smoke | `node tests/smoke-test-skills.js` | No (Wave 0) | pending |
| 02-04-02 | 04 | 2 | SKIL-09 | T-02-01 | N/A | structural | `node -e "const fs=require('fs'),p=require('path');const r=p.resolve('D:/Youtube/D. Mysteries Channel/1.2 Agents/Channel-Automation V0.6');const g=fs.readFileSync(p.join(r,'.claude/references/skill-crafting-guide.md'),'utf8');const q=fs.readFileSync(p.join(r,'.planning/REQUIREMENTS.md'),'utf8');const ok=!g.includes('under 200 lines')&&(g.includes('OPTIONAL')||g.includes('optional'))&&q.includes('no line cap')&&q.includes('optional per D-13');process.exit(ok?0:1)"` | Yes (inline) | pending |
| 02-04-03 | 04 | 2 | SKIL-09 | T-02-01 | N/A | structural | `node -e "const c=JSON.parse(require('fs').readFileSync(require('path').resolve('D:/Youtube/D. Mysteries Channel/1.2 Agents/Channel-Automation V0.6','.planning/config.json'),'utf8'));const a=c.agent_skills;const ok=a&&a.researcher&&a.researcher.includes('documentary-research')&&a.writer&&a.writer.includes('structured-output')&&a.strategy&&a.strategy.includes('data-analysis')&&a.meta&&a.meta.includes('autoresearch');process.exit(ok?0:1)"` | Yes (inline) | pending |

*Status: pending · green · red · flaky*

---

## Wave 0 Requirements

- [ ] `tests/smoke-test-skills.js` -- structural validation for all 8 skill directories
- [ ] Validates: SKILL.md presence, valid frontmatter, insights.md existence, required sections (Phase 0, Reflection Phase, H/D tags)

*Pattern: same as Phase 1's `smoke-test-paths.js`*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Skill produces domain-specific output | SKIL-01 through SKIL-08 | Requires invoking skill via Claude Code | Invoke each `/skill-name` and verify output matches domain |
| insights.md appended after run | SKIL-11 | Requires real skill execution | Run skill, check insights.md has new entry |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 2s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
