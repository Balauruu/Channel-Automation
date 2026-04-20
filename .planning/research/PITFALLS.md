# Domain Pitfalls

**Domain:** Agent memory, observability, and learning systems (file-based, AI coding assistant pipeline)
**Researched:** 2026-04-20

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or system-wide failures.

---

### Pitfall 1: JSONL Concurrent Write Corruption

**What goes wrong:** Multiple hook invocations append to the same JSONL file simultaneously. Node.js `fs.appendFileSync` and Python's `open(f, 'a').write()` are NOT atomic on Windows. One process's write gets interleaved with another's, producing lines like `"timestamp":"2026-01-07T15:15:13.309Z"pbi/gUEKpQ...` -- a truncated JSON object fused with the middle of another. On next read, the parser hits invalid JSON and either crashes (Claude Code issue #20992: `RangeError: Maximum call stack size exceeded`) or silently drops the corrupted line.

**Why it happens:** The `async: true` flag on PreToolUse/PostToolUse hooks means multiple hook processes run concurrently. Two agents dispatched in parallel produce interleaved tool events. The OS does not guarantee that `write()` calls below the pipe buffer size (~4KB on Linux, ~4KB on Windows MSYS2) are atomic, especially for strings near or exceeding that boundary. The current `pipeline-observe.sh` writes JSON objects that can exceed 5KB (tool inputs/outputs capped at 5000 chars plus metadata).

**Consequences:** Corrupted obs.jsonl makes the observer subagent parse garbage. If the observer blindly trusts the file, it extracts nonsense learnings and writes them to memory. Cascading corruption: bad observation data produces bad memory entries.

**Warning signs:**
- `jq` or `json.loads()` errors when reading obs.jsonl
- Out-of-order timestamps within a single file
- Lines containing fragments of base64 or truncated text without proper JSON delimiters
- Observer subagent producing nonsensical or empty analysis

**Prevention:**
1. Validate every line before processing: `try: json.loads(line)` with skip-on-error, never crash
2. Keep individual JSON lines under 4KB (the POSIX pipe buffer atomic write threshold) by truncating tool inputs/outputs to ~3KB instead of 5KB
3. Use write-then-rename for the subagent_stop batch: write dispatch+assistant+complete events to a temp file, then `mv` (atomic on same filesystem) to append via `cat tmp >> obs.jsonl`
4. Add a JSONL health check at observer startup: count valid vs invalid lines, abort if corruption rate exceeds 5%

**Detection:** Add a periodic integrity check: `python -c "import json; lines=open('obs.jsonl').readlines(); bad=[i for i,l in enumerate(lines) if not l.strip()]; [json.loads(l) for l in lines if l.strip()]"` -- count exceptions.

**Phase:** Phase 1 (capture hook hardening) -- this must be solved before any observer consumes the data.

**Confidence:** HIGH -- documented in Claude Code issue #20992 and #29198, reproduced in production.

---

### Pitfall 2: Direct-Write Memory Corruption (No Staging Buffer)

**What goes wrong:** The observer writes directly to `insights.md`, `MEMORY.md`, or `PLAYBOOK.md` without a staging step. If the observer hallucinates, misclassifies scope, or gets interrupted mid-write, the memory file is permanently corrupted. There is no rollback mechanism. The agent using that memory on the next session inherits the bad entry and may change its behavior based on fabricated learnings.

**Why it happens:** Staging was explicitly removed from the design ("Eliminates directory tree and YAML frontmatter overhead"). The tradeoff was simplicity over safety. But the observer is an LLM -- it has a nonzero hallucination rate. Without a buffer between "observer thinks this is a learning" and "this learning is now in production memory," every observer error becomes a permanent memory corruption.

**Consequences:**
- A misclassified entry in `insights.md` (should have been in `MEMORY.md`) causes a skill to behave differently for all agents
- An entry with fabricated evidence ("this pattern worked in project X" when it didn't) persists indefinitely
- Memory pollution compounds: bad entries influence future observer analysis, creating a feedback loop
- The `/evolve` review step only catches errors if the human reads carefully -- at scale, rubber-stamping is likely

**Warning signs:**
- Memory entries that don't cite specific sessions or tool events
- Entries contradicting each other within the same file
- Rapid growth of memory files after a single `/evolve` run
- Agent behavior changes that nobody intended

**Prevention:**
1. Even without a staging directory, write new entries to a `## Pending Review` section at the bottom of each memory file, visually separated from confirmed entries
2. Require the observer to cite the specific obs.jsonl line numbers (or timestamps) that motivated each entry
3. Add a `confidence: 0.X` tag to each entry; entries below 0.5 require explicit human confirmation
4. Implement a "memory diff" output in `/evolve` that shows exactly what changed, similar to `git diff`

**Phase:** Phase 2 (observer implementation) -- must be part of the observer's output format design.

**Confidence:** MEDIUM -- the risk is theoretical (system not yet built) but grounded in documented problems with LLM hallucination in analysis tasks and the explicit design choice to skip staging.

---

### Pitfall 3: Information Bleeding Between Memory Layers

**What goes wrong:** Agent-specific knowledge ends up in `PLAYBOOK.md` (orchestration layer). Skill-specific patterns end up in `MEMORY.md` (agent layer). The scope-test questions ("Does this change how the skill/method runs?" / "Would a fresh instance need this?" / "Does this change how agents hand off?") are clear in theory but ambiguous in practice for an LLM classifier.

**Why it happens:** Many real learnings are genuinely cross-cutting. "The researcher agent should use Wikipedia API instead of crawl4ai" -- is this a skill insight (how the research method runs), an agent memory (what the researcher needs to know), or orchestration knowledge (affects what tools the researcher dispatches)? The scope test has gray zones, and LLMs are bad at drawing sharp lines in gray zones. They tend toward over-classification (putting entries in multiple layers) or misclassification (wrong layer consistently).

**Consequences:** This is the current top problem, per PROJECT.md: "Information bleeds between layers: agent-specific knowledge ends up in PLAYBOOK.md." When bleeding occurs:
- Agents load irrelevant context, wasting tokens
- Conflicting instructions from different layers cause unpredictable behavior
- Memory files grow with duplicated information, hitting size limits faster
- The 200-line MEMORY.md limit (check-memory-limit.js) triggers sooner due to misplaced entries

**Warning signs:**
- Same concept expressed differently in two memory layers
- PLAYBOOK.md growing faster than MEMORY.md files
- Agent behavior inconsistency when the same agent handles similar tasks
- Memory files containing entries that reference specific agents by name in the wrong layer

**Prevention:**
1. The observer must output its scope-test reasoning explicitly: "This candidate passes scope test 2 (agent memory) because [reason], fails test 1 (skill) because [reason], fails test 3 (orchestration) because [reason]"
2. Hard rule: if a candidate arguably passes two scope tests, reject it -- ambiguous entries are worse than missing entries
3. Add a layer-validation check: periodically scan each memory file for cross-references that suggest misplacement (e.g., `PLAYBOOK.md` containing a specific agent name that isn't about coordination)
4. Include negative examples in the observer's prompt: "This looks like it belongs in PLAYBOOK.md but it actually belongs in MEMORY.md because..."

**Phase:** Phase 2 (observer implementation) -- the scope-test enforcement is the observer's core classification logic.

**Confidence:** HIGH -- this is the documented current failure mode and the primary motivation for the system redesign.

---

### Pitfall 4: Confidence Score Inflation and Runaway Scores

**What goes wrong:** Confidence scores drift upward over time. Every time a learning "seems confirmed" by a new session, its score increases. But confirmation bias in the scoring model means that scores almost never decrease. After a few months, every entry has confidence 0.8+ and the scoring system provides no signal -- it cannot distinguish genuinely validated patterns from entries that were merely never contradicted.

**Why it happens:** The planned confidence scoring (0.3-0.9 weighted, borrowed from CLv2) likely uses reinforcement logic: "if this pattern appeared again, increase confidence." But absence of contradiction is not evidence of correctness. An entry about a rare edge case might never be contradicted because it's never tested, inflating to high confidence despite being unvalidated. Additionally, LLMs are biased toward agreement -- an observer reviewing its own prior entries is predisposed to confirm them.

**Consequences:**
- The confidence system becomes meaningless noise that humans learn to ignore
- High-confidence entries that are actually wrong persist indefinitely
- Memory triage (if implemented) cannot distinguish valuable from useless entries
- Research shows ~57% of memories older than 30 days fall below retention thresholds when properly scored, but with inflation this cleanup never triggers

**Warning signs:**
- Average confidence across all entries trending monotonically upward
- No entries ever being demoted or removed by the scoring system
- New entries starting at confidence 0.5+ instead of 0.3
- All entries in a memory file having the same confidence level

**Prevention:**
1. Implement time decay: confidence -= 0.05 per 30 days without access. This forces re-validation
2. Track both confirmations AND contradictions explicitly; require evidence for both
3. Set a hard ceiling: confidence can never exceed 0.8 without human confirmation
4. Add a "last_validated" timestamp; entries not validated in 60 days automatically drop to 0.3
5. The observer must be able to decrease confidence, not just increase it
6. Monitor the confidence distribution: alert if median confidence exceeds 0.6

**Phase:** Phase 3 (confidence scoring implementation) -- but the data model for tracking must be designed in Phase 2.

**Confidence:** MEDIUM -- grounded in research on memory decay systems (fazm.ai, sparkco.ai) and the documented behavior of LLM self-evaluation bias, but the specific CLv2 0.3-0.9 system hasn't been tested in this codebase.

---

## Moderate Pitfalls

---

### Pitfall 5: TOCTOU Race in File Rotation

**What goes wrong:** The rotation check (`du -m "$OBS_FILE"` then `mv`) has a time-of-check-to-time-of-use window. Between measuring the file size and executing the move, another hook invocation appends data. Worse: two hook invocations can both see size >= 10MB, both attempt `mv`, and the second `mv` fails silently (file already moved). The append after the first `mv` writes to a new (empty) `obs.jsonl`, losing the data that was supposed to go to the rotated file.

**Why it happens:** The hooks run with `async: true` on PreToolUse/PostToolUse. Rotation and append are not atomic.

**Prevention:**
1. Use a lockfile (`mkdir "$OBS_FILE.lock"` -- atomic on all platforms) around the rotate-then-append sequence
2. Or: use a size check that's tolerant of overshoot -- only rotate if size > 10MB, and accept that the file may briefly be 10.1MB. Don't try to be precise about the boundary
3. Or: move the rotation to the subagent_stop handler only (synchronous, runs once per agent lifecycle), not on every tool event

**Warning signs:** Empty or very small obs.jsonl files after rotation; archive files with truncated last lines; gap in timestamps between the last entry in an archive and the first entry in the current file.

**Phase:** Phase 1 (capture hook hardening).

**Confidence:** MEDIUM -- the race is structurally present in the code but may be hard to trigger in practice due to the 5-second hook timeout.

---

### Pitfall 6: Observer Self-Loop (Observer Observing Itself)

**What goes wrong:** The observer is a subagent. Subagents trigger hooks. If the observer dispatches tool calls (Read, Write, Bash), those generate tool_pre/tool_post events in obs.jsonl. When the observer runs again, it sees its own events and may try to extract learnings from its own analysis -- creating a recursive feedback loop where the observer "learns" from its own output.

**Why it happens:** The current hook has agent_id gating but no agent_type filtering. If the observer subagent has an agent_id (which it will, since it's a dispatched subagent), all its tool events are captured. The observer's next run then processes those events alongside real agent events.

**Prevention:**
1. Filter observer events at capture time: add the observer's agent_type to a skip list in pipeline-observe.sh (similar to how obs.js had `BUILTIN_AGENT_TYPES`)
2. Or: filter at analysis time: the observer's prompt must explicitly exclude events from its own agent_type
3. Or: write observer events to a separate file (e.g., `observer.jsonl`) that the observer never reads
4. Best approach: all three -- defense in depth against self-referential loops

**Warning signs:**
- Memory entries that reference "the observer analyzed..." or cite the observer's own session
- Exponential growth in memory entries after successive `/evolve` runs
- Observer taking longer each run (processing its own growing output)

**Phase:** Phase 2 (observer implementation) -- must be part of the observer's event filtering logic.

**Confidence:** HIGH -- this is a known pattern in observer systems. The old obs.js had explicit `BUILTIN_AGENT_TYPES` filtering for exactly this reason.

---

### Pitfall 7: Windows/Git Bash Path Mangling

**What goes wrong:** Git Bash (MSYS2) automatically converts POSIX-style paths to Windows paths, but the conversion is inconsistent and can corrupt paths passed to Python or other Windows executables. Paths like `/d/Youtube/...` get converted to `D:\Youtube\...` for some tools but not others. The `CLAUDE_PROJECT_DIR` environment variable may arrive in either format depending on whether Claude Code or Git Bash set it.

**Why it happens:** MSYS2's path translation layer (`cygpath`) activates automatically for arguments that look like POSIX paths. But it has edge cases:
- Paths with spaces are sometimes split into multiple arguments
- Paths with special characters (parentheses, brackets) may be mangled
- The `$()` command substitution in bash may double-convert paths
- `du -m` path argument handling differs between MSYS2's `du` and Windows `du`
- Claude Code issue #2602 documents Git Bash path conversion failures specifically
- Claude Code issue #29346 documents multiple recurring path-related bugs on Windows

**Consequences:** The hook silently fails to write to the correct obs.jsonl location. Events are lost. The observer reads an empty or wrong file. No error is surfaced because `set -e` only catches nonzero exit codes, not wrong-path writes.

**Prevention:**
1. Always use forward slashes in all path constructions within the script
2. Quote all path variables: `"$OBS_FILE"` not `$OBS_FILE`
3. Normalize `CLAUDE_PROJECT_DIR` at script start: `PROJECT_ROOT=$(cd "$CLAUDE_PROJECT_DIR" && pwd)` to get a consistent MSYS2 path
4. Set `MSYS_NO_PATHCONV=1` before calling Python to prevent MSYS2 from mangling Python's arguments
5. Test with paths containing spaces and parentheses (the actual project path contains both: `D. Mysteries Channel` and `(1.2 Agents)`)
6. Use Python's `os.path.abspath()` for all path operations inside the embedded Python blocks

**Warning signs:**
- obs.jsonl appearing in unexpected directories
- `FileNotFoundError` in stderr from the Python blocks
- Empty observations directory despite agents running
- Paths in obs.jsonl containing mixed forward/backward slashes or doubled drive letters

**Phase:** Phase 1 (capture hook hardening) -- the current script path `$CLAUDE_PROJECT_DIR` usage must be validated.

**Confidence:** HIGH -- documented in Claude Code issues #2602 and #29346, and the actual project path contains spaces.

---

### Pitfall 8: Stale Memory Entries Polluting Agent Context

**What goes wrong:** An agent loads its MEMORY.md at session start. Entries from months-old projects, deprecated patterns, or one-time corrections persist indefinitely. The agent wastes tokens processing irrelevant context and may follow outdated instructions. Example from actual MEMORY.md: the researcher still carries an entry about `crawl4ai` installation from April 10 that's been superseded by the April 16 adaptive loop entry.

**Why it happens:** No automated garbage collection exists for memory files. The check-memory-limit.js hook warns at 200 lines but doesn't remove anything. Manual cleanup is recommended but never done. Entries accumulate monotonically.

**Consequences:**
- Token waste: every session loads dead entries
- Confusion: contradictory entries from different time periods (e.g., "use 3-pass pipeline" alongside "replaced 3-pass with adaptive loop")
- The 200-line limit triggers warning fatigue -- users start ignoring the warning
- Research shows naive retention "actually degrades task completion scores compared to structured forgetting policies"

**Prevention:**
1. Tag every memory entry with a creation date and optional `expires_after` field
2. The `/evolve` command should review existing entries, not just add new ones -- mark obsolete entries for removal
3. Implement LRU-style decay: entries not referenced in 60 days get demoted to an archive section
4. Conflicting entries must be resolved: when a new entry contradicts an old one, the old one should be explicitly superseded, not left alongside

**Warning signs:**
- MEMORY.md growing beyond 100 lines without cleanup
- Contradictory entries in the same file (check for "replaced" / "use X instead of Y" / date-gapped entries on the same topic)
- check-memory-limit.js firing on multiple agents

**Phase:** Phase 3 (memory lifecycle management) -- but the entry format (including date tags) must be designed in Phase 2.

**Confidence:** HIGH -- the current MEMORY.md files demonstrate this problem directly (visible contradictions in researcher/MEMORY.md).

---

### Pitfall 9: Transcript Parse Failures in subagent_stop

**What goes wrong:** The subagent_stop handler reads the agent's transcript file (a JSONL stream of conversation turns). If the transcript is incomplete (agent timed out), malformed (Claude Code bug), or encoded differently than expected, the parse loop silently produces empty results. The dispatch and complete events are still written, but with empty prompts, zero turns, and `outcome: errored` -- losing all the useful data.

**Why it happens:** The transcript path comes from `hook.get('agent_transcript_path')`. Several failure modes:
- The file may not exist yet (race between hook firing and transcript finalization)
- The file may be UTF-16 encoded on Windows (Python defaults to system encoding, not UTF-8)
- Large transcripts with thinking blocks can exceed available memory for in-line parsing
- The `try/except` around transcript parsing catches ALL exceptions and writes to stderr, but stderr from hook scripts is often invisible

**Prevention:**
1. Validate transcript file existence and readability before parsing
2. Force `encoding='utf-8'` explicitly (already done in the current script -- good)
3. Add a fallback: if transcript parsing fails, still write what we have (agent_id, session_id, tool counts from obs.jsonl scan)
4. Log parse failures to a separate error file that the observer can surface
5. Set a max transcript size for in-memory parsing; for transcripts over 10MB, process in streaming fashion

**Warning signs:**
- `complete` events with `outcome: errored` and zero `total_output_tokens`
- `dispatch` events with empty `prompt` field despite the agent having received a prompt
- Missing `assistant_message` events between `dispatch` and `complete`

**Phase:** Phase 1 (capture hook hardening).

**Confidence:** MEDIUM -- the current code handles this case, but edge cases around encoding and file availability are untested on Windows.

---

## Minor Pitfalls

---

### Pitfall 10: Secret Leakage Through Observation Logs

**What goes wrong:** The secret-scrub regex in pipeline-observe.sh catches common patterns (`api_key`, `token`, `secret`) but misses:
- Inline credentials in URLs (`https://user:pass@host.com`)
- Environment variable dumps from Bash tool output
- SSH private keys or PEM certificates in tool output
- Base64-encoded credentials that don't match the 8+ character alphanumeric pattern
- Secrets assigned to non-obvious variable names

**Prevention:**
1. Add URL credential scrubbing: `re.sub(r'://[^:]+:[^@]+@', '://[REDACTED]@', text)`
2. Truncate Bash tool output more aggressively (current 5KB limit is generous for secret exposure)
3. Add a negative pattern: detect and redact base64 strings over 40 characters that appear in credential contexts
4. Never include obs.jsonl files in git commits (add to `.gitignore`)

**Phase:** Phase 1 (capture hook hardening).

**Confidence:** MEDIUM -- the existing regex is reasonable but not comprehensive.

---

### Pitfall 11: Archive Purge Race with `find -mtime`

**What goes wrong:** The 30-day archive purge uses `find "$PROJECT_DIR/obs.archive" -name "obs-*.jsonl" -mtime +30 -delete`. On Windows/MSYS2, `find` uses the MSYS2 `find` binary, not Windows `find.exe`. The `-mtime` flag measures modification time, but NTFS timestamps can have 2-second resolution in some configurations, and cross-timezone issues can cause files to be purged early or retained too long.

**Prevention:**
1. Use a filename-based date check instead of filesystem timestamps: the archive files are named `obs-YYYYMMDD-HHMMSS-PID.jsonl`, so parse the date from the filename
2. The purge-once-per-day guard (`PURGE_MARK` with `-mtime +1`) is good but also affected by NTFS timestamp resolution -- use a file containing a date string instead of relying on mtime

**Phase:** Phase 1 (capture hook hardening) -- low priority within Phase 1.

**Confidence:** LOW -- NTFS timestamp issues are real but may not manifest with daily granularity checks.

---

### Pitfall 12: PLAYBOOK.md as Message Bus Without Delivery Guarantees

**What goes wrong:** Using PLAYBOOK.md as a cross-agent message bus means messages are appended to a markdown file. There is no acknowledgment mechanism, no message ordering guarantee, and no way to know if the recipient agent actually read the message. Messages accumulate indefinitely. The file becomes a dump of unactionable historical cross-agent notes.

**Why it happens:** Markdown files are not message buses. They have no consumer offsets, no delivery tracking, no TTL. Using them as such conflates "persistent knowledge" with "transient communication."

**Prevention:**
1. Define a clear lifecycle for PLAYBOOK.md entries: `pending -> acknowledged -> resolved -> archived`
2. Each entry must have a target agent, a creation date, and an expiration date
3. The observer should track whether entries were consumed (did the target agent's next run produce behavior consistent with the playbook entry?)
4. Consider PLAYBOOK.md as a "bulletin board" (persistent, read-many) rather than a "message queue" (transient, consume-once)
5. This is flagged as "research needed for optimal shape" in PROJECT.md -- that research must happen before implementation

**Phase:** Phase 2/3 -- design in Phase 2, implement lifecycle management in Phase 3.

**Confidence:** MEDIUM -- the project explicitly flags this as needing research. The pitfall is structural, not speculative.

---

### Pitfall 13: Observer Context Window Exhaustion

**What goes wrong:** The observer subagent (Sonnet 4.6, 1M context) is designed to read full event detail including thinking blocks. For a busy session with 10 agents, each producing 50+ tool events with 10KB thinking blocks, the total observation data can exceed 5MB of text. While 1M tokens (~750K words) is large, a single busy project week could approach this limit, causing the observer to truncate or miss late events.

**Prevention:**
1. Implement progressive summarization: for sessions older than 7 days, compress events to summaries before feeding to the observer
2. Prioritize: feed the observer the most recent session first, then older sessions if context remains
3. Add a token budget estimate before dispatching the observer: count total event bytes and warn if approaching 500K tokens
4. The observer should process events in batches (per-session or per-agent) rather than all-at-once

**Phase:** Phase 3 (observer optimization) -- the initial Phase 2 implementation can assume small volumes.

**Confidence:** LOW -- depends on actual usage volume, which is unknown until the system is running.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Phase 1: Capture hook hardening | JSONL corruption from concurrent writes (Pitfall 1) | Keep lines under 4KB; validate on read; write-then-rename for batch events |
| Phase 1: Capture hook hardening | Windows path mangling (Pitfall 7) | Normalize paths at script start; set MSYS_NO_PATHCONV=1; test with actual project path |
| Phase 1: Capture hook hardening | TOCTOU in rotation (Pitfall 5) | Move rotation to subagent_stop only; use lockfile for critical section |
| Phase 2: Observer implementation | Memory layer bleeding (Pitfall 3) | Require explicit scope-test reasoning; reject ambiguous candidates |
| Phase 2: Observer implementation | Direct write corruption (Pitfall 2) | Use `## Pending Review` section; require citation of source events |
| Phase 2: Observer implementation | Self-loop (Pitfall 6) | Filter observer's agent_type at capture AND analysis time |
| Phase 3: Confidence + lifecycle | Score inflation (Pitfall 4) | Time decay; hard ceiling at 0.8; track contradictions |
| Phase 3: Confidence + lifecycle | Stale entries (Pitfall 8) | LRU decay; explicit supersession; `/evolve` reviews existing entries |
| Phase 3: Confidence + lifecycle | PLAYBOOK lifecycle (Pitfall 12) | Design entry lifecycle before implementation; don't treat as message queue |

## Sources

- [Claude Code JSONL corruption issue #20992](https://github.com/anthropics/claude-code/issues/20992) -- concurrent write corruption documented with reproduction steps
- [Claude Code .claude.json corruption issue #29198](https://github.com/anthropics/claude-code/issues/29198) -- Windows-specific JSON corruption from concurrent sessions
- [Claude Code Git Bash path conversion issue #2602](https://github.com/anthropics/claude-code/issues/2602) -- POSIX path conversion failures on Windows
- [Claude Code Windows Git Bash recurring issues #29346](https://github.com/anthropics/claude-code/issues/29346) -- multiple path, encoding, and flag issues
- [Memory Triage for AI Agents (fazm.ai)](https://fazm.ai/blog/ai-agent-memory-triage-retention-decay) -- retention decay strategies, 57% entry expiration rate
- [Memory Consistency in AI Agents (sparkco.ai)](https://sparkco.ai/blog/mastering-memory-consistency-in-ai-agents-2025-insights) -- inflation, degradation, staleness
- [Confidence Scoring in AI Agents (sparkco.ai)](https://sparkco.ai/blog/mastering-confidence-scoring-in-ai-agents) -- scoring calibration challenges
- [Race Conditions in Multi-Agent Orchestration (MLM)](https://machinelearningmastery.com/handling-race-conditions-in-multi-agent-orchestration/) -- shared state write conflicts
- [File-based Agent Memory Architecture (The New Stack)](https://thenewstack.io/ai-agent-memory-architecture/) -- filesystem vs database tradeoffs
- [Multi-Agent Memory Architecture (arxiv)](https://arxiv.org/html/2603.10062v1) -- topology-induced knowledge leakage
- [Memory Poisoning Attack on LLM-Agents (arxiv)](https://arxiv.org/html/2601.05504v2) -- memory poisoning risks
- [Docker json-file rotation hangs on Windows (moby #39274)](https://github.com/moby/moby/issues/39274) -- file rotation race conditions on Windows
- [BashFAQ/045 (wooledge.org)](https://mywiki.wooledge.org/BashFAQ/045) -- atomic file locking alternatives for bash (mkdir, noclobber)
- [concurrent-log-handler (PyPI)](https://pypi.org/project/concurrent-log-handler/) -- process-safe logging with rotation
