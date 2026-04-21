#!/usr/bin/env node
// .claude/scripts/memory/evolve.js
// Deterministic file operations for /evolve command: scan, promote, revert,
// decay, decay-remove, decay-upgrade.
// Usage:
//   node .claude/scripts/memory/evolve.js scan
//   node .claude/scripts/memory/evolve.js promote
//   node .claude/scripts/memory/evolve.js revert <global_index> [<global_index> ...]
//   node .claude/scripts/memory/evolve.js decay
//   node .claude/scripts/memory/evolve.js decay-remove <global_index> [<global_index> ...]
//   node .claude/scripts/memory/evolve.js decay-upgrade <global_index> [<global_index> ...]

'use strict';

const fs = require('fs');
const path = require('path');

// -- Constants ---------------------------------------------------------------

function getProjectRoot() {
  return process.env.CLAUDE_PROJECT_DIR || process.cwd();
}

function getClaudeDir() {
  return path.join(getProjectRoot(), '.claude');
}

// -- Evidence pointer stripping regexes --------------------------------------

const memoryPointerRe = / \(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?Z?\)$/;
const insightPointerRe = / \(from: [a-z][a-z0-9-]*, \d{4}-\d{2}-\d{2}T\d{2}:\d{2}\)$/;

// -- Decay timestamp and confidence extraction regexes -----------------------

const memoryTimestampRe = /\((\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?Z?)\)$/;
const insightsTimestampRe = /\(from: [a-z][a-z0-9-]*, (\d{4}-\d{2}-\d{2}T\d{2}:\d{2})\)$/;
const legacyDateRe = /^- \[(\d{4}-\d{2}-\d{2})\]/;
const confidenceRe = /\[(HIGH|MED|LOW)\]/;

// -- Core functions ----------------------------------------------------------

/**
 * Discover all target memory files ordered by type:
 * insights (skills) -> memory (agent-memory) -> playbook
 */
function discoverTargetFiles() {
  const files = [];

  // 1. insights.md files (skills layer)
  const skillsDir = path.join(getClaudeDir(), 'skills');
  if (fs.existsSync(skillsDir)) {
    for (const skill of fs.readdirSync(skillsDir).sort()) {
      const skillPath = path.join(skillsDir, skill);
      if (!fs.statSync(skillPath).isDirectory()) continue;
      const insightsPath = path.join(skillPath, 'insights.md');
      if (fs.existsSync(insightsPath)) {
        files.push({ path: insightsPath, type: 'insights' });
      }
    }
  }

  // 2. MEMORY.md files (agent layer)
  const agentMemDir = path.join(getClaudeDir(), 'agent-memory');
  if (fs.existsSync(agentMemDir)) {
    for (const agent of fs.readdirSync(agentMemDir).sort()) {
      const agentPath = path.join(agentMemDir, agent);
      if (!fs.statSync(agentPath).isDirectory()) continue;
      const memPath = path.join(agentPath, 'MEMORY.md');
      if (fs.existsSync(memPath)) {
        files.push({ path: memPath, type: 'memory' });
      }
    }
  }

  // 3. PLAYBOOK.md (orchestration layer)
  const playbookPath = path.join(getClaudeDir(), 'PLAYBOOK.md');
  if (fs.existsSync(playbookPath)) {
    files.push({ path: playbookPath, type: 'playbook' });
  }

  return files;
}

/**
 * Parse markdown content into sections by ## heading.
 * Returns array of {heading, startLine, endLine, entries}
 * where entries are {line, text} for lines starting with "- ".
 * Line numbers are 0-based.
 */
function parseSections(content) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const sections = [];
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) {
      if (current) current.endLine = i - 1;
      current = {
        heading: lines[i].replace(/^## /, '').trim(),
        startLine: i,
        endLine: lines.length - 1,
        entries: []
      };
      sections.push(current);
    } else if (current && lines[i].startsWith('- ')) {
      current.entries.push({ line: i, text: lines[i] });
    }
  }

  return sections;
}

/**
 * Strip evidence pointer from entry text.
 * MEMORY.md/PLAYBOOK.md: strip trailing " (YYYY-MM-DDThh:mm)"
 * insights.md: strip trailing " (from: agent-name, YYYY-MM-DDThh:mm)"
 */
function stripPointer(entry) {
  if (memoryPointerRe.test(entry)) return entry.replace(memoryPointerRe, '');
  if (insightPointerRe.test(entry)) return entry.replace(insightPointerRe, '');
  return entry;
}

/**
 * Normalize a file path to forward slashes relative to PROJECT_ROOT.
 */
function relativePath(absPath) {
  return path.relative(getProjectRoot(), absPath).split(path.sep).join('/');
}

/**
 * Extract a Date from an entry's trailing timestamp pointer.
 * For insights files: tries insightsTimestampRe, then legacyDateRe fallback.
 * For memory/playbook files: tries memoryTimestampRe.
 * Returns a Date on match, null if no timestamp found.
 */
function extractTimestamp(entryText, fileType) {
  if (fileType === 'insights') {
    const m = insightsTimestampRe.exec(entryText);
    if (m) return new Date(m[1]);
    const legacy = legacyDateRe.exec(entryText);
    if (legacy) return new Date(legacy[1]);
    return null;
  }
  // memory or playbook
  const m = memoryTimestampRe.exec(entryText);
  if (m) return new Date(m[1]);
  return null;
}

/**
 * Extract the confidence level (HIGH, MED, or LOW) from an entry.
 * Returns the matched string or null if none found.
 */
function extractConfidence(entryText) {
  const m = confidenceRe.exec(entryText);
  return m ? m[1] : null;
}

/**
 * Scan all target files for ## Pending Review entries.
 * Returns structured JSON with files, entries, and total count.
 */
function scan() {
  const targetFiles = discoverTargetFiles();
  const result = {
    command: 'scan',
    files: [],
    total: 0
  };

  for (const target of targetFiles) {
    const content = fs.readFileSync(target.path, 'utf8').replace(/\r\n/g, '\n');
    const sections = parseSections(content);
    const pendingSection = sections.find(s => s.heading === 'Pending Review');

    if (pendingSection && pendingSection.entries.length > 0) {
      const fileResult = {
        path: relativePath(target.path),
        type: target.type,
        entries: pendingSection.entries.map((e, idx) => ({
          index: idx,
          line: e.line,
          text: e.text
        }))
      };
      result.files.push(fileResult);
      result.total += fileResult.entries.length;
    }
  }

  return result;
}

/**
 * Promote all Pending Review entries to Permanent sections.
 * Creates ## Permanent if absent. Strips evidence pointers.
 * Returns structured JSON with promoted entries and global indices.
 */
function promote() {
  const targetFiles = discoverTargetFiles();
  const result = {
    command: 'promote',
    promoted: [],
    total: 0,
    permanent_sections_created: 0
  };

  let globalIndex = 1;

  for (const target of targetFiles) {
    const rawContent = fs.readFileSync(target.path, 'utf8');
    const content = rawContent.replace(/\r\n/g, '\n');
    const lines = content.split('\n');
    const sections = parseSections(content);
    const pendingSection = sections.find(s => s.heading === 'Pending Review');

    if (!pendingSection || pendingSection.entries.length === 0) continue;

    const permanentSection = sections.find(s => s.heading === 'Permanent');
    const fileEntries = [];

    // Collect entries to promote (with stripped pointers)
    for (const entry of pendingSection.entries) {
      const promoted = stripPointer(entry.text);
      fileEntries.push({
        global_index: globalIndex,
        original: entry.text,
        promoted: promoted
      });
      globalIndex++;
    }

    // Rebuild file content
    let newLines = [...lines];

    if (!permanentSection) {
      // Create ## Permanent section immediately before ## Pending Review
      const pendingLineIdx = pendingSection.startLine;
      const insertLines = ['## Permanent', ''];
      // Add promoted entries
      for (const fe of fileEntries) {
        insertLines.push(fe.promoted);
      }
      insertLines.push('');
      // Insert before ## Pending Review
      newLines.splice(pendingLineIdx, 0, ...insertLines);
      result.permanent_sections_created++;

      // Now clear entries from ## Pending Review (which shifted down)
      // Recalculate positions after insertion
      const shift = insertLines.length;
      // Remove entry lines from Pending Review section
      // Find the entries in the new array (they shifted by `shift`)
      const entryLinesToRemove = pendingSection.entries
        .map(e => e.line + shift)
        .sort((a, b) => b - a); // Remove from bottom up
      for (const lineIdx of entryLinesToRemove) {
        newLines.splice(lineIdx, 1);
      }
    } else {
      // ## Permanent exists - append promoted entries to end of it
      // Find the last line of the Permanent section (before next ## or EOF)
      let insertAt = permanentSection.endLine + 1;
      // Actually insert after last entry or after heading + blank line
      // Find the insertion point: end of permanent section entries
      if (permanentSection.entries.length > 0) {
        insertAt = permanentSection.entries[permanentSection.entries.length - 1].line + 1;
      } else {
        // No entries yet, insert after heading + blank line
        insertAt = permanentSection.startLine + 1;
        // If there's already a blank line after heading, insert after it
        if (insertAt < newLines.length && newLines[insertAt].trim() === '') {
          insertAt++;
        }
      }

      // Insert promoted entries
      const insertLines = fileEntries.map(fe => fe.promoted);
      newLines.splice(insertAt, 0, ...insertLines);

      // Re-parse after insertion to get fresh line positions for Pending Review
      const updatedContent = newLines.join('\n');
      const updatedSections = parseSections(updatedContent);
      const updatedPending = updatedSections.find(s => s.heading === 'Pending Review');
      if (updatedPending) {
        updatedPending.entries
          .map(e => e.line)
          .sort((a, b) => b - a)
          .forEach(lineIdx => newLines.splice(lineIdx, 1));
      }
    }

    // Write updated content
    fs.writeFileSync(target.path, newLines.join('\n'), 'utf8');

    result.promoted.push({
      path: relativePath(target.path),
      type: target.type,
      entries: fileEntries
    });
    result.total += fileEntries.length;
  }

  return result;
}

/**
 * Revert specific entries from ## Permanent sections by global index.
 * Re-scans all files for Permanent entries and removes those matching
 * the requested indices.
 */
function revert(indices) {
  // Validate and parse indices
  const parsedIndices = [];
  const errors = [];

  for (const idx of indices) {
    const parsed = parseInt(idx, 10);
    if (isNaN(parsed) || parsed < 1) {
      errors.push({ index: idx, error: 'Invalid index: must be a positive integer' });
    } else {
      parsedIndices.push(parsed);
    }
  }

  // Discover files and assign global indices to Permanent entries
  const targetFiles = discoverTargetFiles();
  const indexMap = []; // [{globalIndex, filePath, lineInFile, entry}]
  let globalIndex = 1;

  for (const target of targetFiles) {
    const content = fs.readFileSync(target.path, 'utf8').replace(/\r\n/g, '\n');
    const sections = parseSections(content);
    const permanentSection = sections.find(s => s.heading === 'Permanent');

    if (!permanentSection || permanentSection.entries.length === 0) continue;

    for (const entry of permanentSection.entries) {
      indexMap.push({
        globalIndex: globalIndex,
        filePath: target.path,
        line: entry.line,
        entry: entry.text
      });
      globalIndex++;
    }
  }

  // Check for out-of-range indices
  const maxIndex = indexMap.length;
  for (const idx of parsedIndices) {
    if (idx > maxIndex) {
      errors.push({ index: String(idx), error: `Index ${idx} out of range (max: ${maxIndex})` });
    }
  }

  // Collect entries to revert (only valid, in-range ones)
  const toRevert = parsedIndices
    .filter(idx => idx <= maxIndex)
    .map(idx => indexMap[idx - 1]);

  // Group by file path
  const byFile = new Map();
  for (const item of toRevert) {
    if (!byFile.has(item.filePath)) byFile.set(item.filePath, []);
    byFile.get(item.filePath).push(item);
  }

  const reverted = [];

  // Process each file (remove lines in descending order to avoid offset corruption)
  for (const [filePath, items] of byFile) {
    const content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
    const lines = content.split('\n');

    // Sort by line number descending (highest first per Pitfall 3)
    items.sort((a, b) => b.line - a.line);

    for (const item of items) {
      lines.splice(item.line, 1);
      reverted.push({
        global_index: item.globalIndex,
        path: relativePath(item.filePath),
        entry: item.entry
      });
    }

    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  }

  // Sort reverted by global_index for consistent output
  reverted.sort((a, b) => a.global_index - b.global_index);

  const result = {
    command: 'revert',
    reverted: reverted,
    total: reverted.length
  };

  if (errors.length > 0) {
    result.errors = errors;
  }

  return result;
}

/**
 * Scan all target files (excluding PLAYBOOK.md) for expired ## Permanent entries.
 * LOW entries expire after 14 days, MED entries after 30 days.
 * HIGH entries and entries without timestamps are never flagged.
 * Also reports capacity warnings for files at 180+ lines.
 * Returns structured JSON with expired entries and capacity warnings.
 */
function decay() {
  const targetFiles = discoverTargetFiles();
  const result = {
    command: 'decay',
    expired: [],
    capacity_warnings: [],
    total_expired: 0
  };

  let globalIndex = 1;

  for (const target of targetFiles) {
    // Skip PLAYBOOK.md — it uses Open/Resolved lifecycle, not Permanent (D-03, Pitfall 4)
    if (target.type === 'playbook') continue;

    const content = fs.readFileSync(target.path, 'utf8').replace(/\r\n/g, '\n');
    const lines = content.split('\n');

    // Capacity check: warn at 180+ lines (D-08)
    if (lines.length >= 180) {
      result.capacity_warnings.push({
        path: relativePath(target.path),
        type: target.type,
        lines: lines.length
      });
    }

    const sections = parseSections(content);
    const permanentSection = sections.find(s => s.heading === 'Permanent');

    if (!permanentSection || permanentSection.entries.length === 0) continue;

    for (const entry of permanentSection.entries) {
      const conf = extractConfidence(entry.text);

      // HIGH never decays; null confidence = legacy entry treated as non-decayable (Pitfall 5)
      if (conf === 'HIGH' || !conf) {
        globalIndex++;
        continue;
      }

      const ts = extractTimestamp(entry.text, target.type);

      // No timestamp = cannot compute age, skip
      if (!ts) {
        globalIndex++;
        continue;
      }

      const ageDays = (Date.now() - ts.getTime()) / (1000 * 60 * 60 * 24);
      const ttl = conf === 'LOW' ? 14 : 30; // MEML-02

      if (ageDays >= ttl) {
        result.expired.push({
          global_index: globalIndex,
          path: relativePath(target.path),
          type: target.type,
          line: entry.line,
          text: entry.text,
          confidence: conf,
          age_days: Math.floor(ageDays),
          ttl_days: ttl
        });
      }

      globalIndex++;
    }
  }

  result.total_expired = result.expired.length;
  return result;
}

/**
 * Remove specific ## Permanent entries by global index (decay confirmed).
 * Re-scans all target files (excluding PLAYBOOK.md) for Permanent entries,
 * then removes those matching the requested indices.
 * Removes in descending line order to avoid index corruption.
 */
function decayRemove(indices) {
  // Validate and parse indices
  const parsedIndices = [];
  const errors = [];

  for (const idx of indices) {
    const parsed = parseInt(idx, 10);
    if (isNaN(parsed) || parsed < 1) {
      errors.push({ index: idx, error: 'Invalid index: must be a positive integer' });
    } else {
      parsedIndices.push(parsed);
    }
  }

  // Discover files and assign global indices to Permanent entries (skip playbook)
  const targetFiles = discoverTargetFiles();
  const indexMap = [];
  let globalIndex = 1;

  for (const target of targetFiles) {
    if (target.type === 'playbook') continue;

    const content = fs.readFileSync(target.path, 'utf8').replace(/\r\n/g, '\n');
    const sections = parseSections(content);
    const permanentSection = sections.find(s => s.heading === 'Permanent');

    if (!permanentSection || permanentSection.entries.length === 0) continue;

    for (const entry of permanentSection.entries) {
      indexMap.push({
        globalIndex: globalIndex,
        filePath: target.path,
        line: entry.line,
        entry: entry.text
      });
      globalIndex++;
    }
  }

  // Check for out-of-range indices
  const maxIndex = indexMap.length;
  for (const idx of parsedIndices) {
    if (idx > maxIndex) {
      errors.push({ index: String(idx), error: `Index ${idx} out of range (max: ${maxIndex})` });
    }
  }

  // Collect entries to remove (only valid, in-range ones)
  const toRemove = parsedIndices
    .filter(idx => idx <= maxIndex)
    .map(idx => indexMap[idx - 1]);

  // Group by file path
  const byFile = new Map();
  for (const item of toRemove) {
    if (!byFile.has(item.filePath)) byFile.set(item.filePath, []);
    byFile.get(item.filePath).push(item);
  }

  const removed = [];

  // Process each file (remove lines in descending order to avoid offset corruption)
  for (const [filePath, items] of byFile) {
    const content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
    const lines = content.split('\n');

    // Sort by line number descending (highest first)
    items.sort((a, b) => b.line - a.line);

    for (const item of items) {
      lines.splice(item.line, 1);
      removed.push({
        global_index: item.globalIndex,
        path: relativePath(item.filePath),
        entry: item.entry
      });
    }

    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  }

  // Sort removed by global_index for consistent output
  removed.sort((a, b) => a.global_index - b.global_index);

  const result = {
    command: 'decay-remove',
    removed: removed,
    total: removed.length
  };

  if (errors.length > 0) {
    result.errors = errors;
  }

  return result;
}

/**
 * Upgrade specific ## Permanent entries from [LOW] or [MED] to [HIGH] confidence.
 * Re-scans all target files (excluding PLAYBOOK.md) for Permanent entries,
 * then upgrades confidence tags for those matching the requested indices.
 */
function decayUpgrade(indices) {
  // Validate and parse indices
  const parsedIndices = [];
  const errors = [];

  for (const idx of indices) {
    const parsed = parseInt(idx, 10);
    if (isNaN(parsed) || parsed < 1) {
      errors.push({ index: idx, error: 'Invalid index: must be a positive integer' });
    } else {
      parsedIndices.push(parsed);
    }
  }

  // Discover files and assign global indices to Permanent entries (skip playbook)
  const targetFiles = discoverTargetFiles();
  const indexMap = [];
  let globalIndex = 1;

  for (const target of targetFiles) {
    if (target.type === 'playbook') continue;

    const content = fs.readFileSync(target.path, 'utf8').replace(/\r\n/g, '\n');
    const sections = parseSections(content);
    const permanentSection = sections.find(s => s.heading === 'Permanent');

    if (!permanentSection || permanentSection.entries.length === 0) continue;

    for (const entry of permanentSection.entries) {
      indexMap.push({
        globalIndex: globalIndex,
        filePath: target.path,
        line: entry.line,
        entry: entry.text
      });
      globalIndex++;
    }
  }

  // Check for out-of-range indices
  const maxIndex = indexMap.length;
  for (const idx of parsedIndices) {
    if (idx > maxIndex) {
      errors.push({ index: String(idx), error: `Index ${idx} out of range (max: ${maxIndex})` });
    }
  }

  // Collect entries to upgrade (only valid, in-range ones)
  const toUpgrade = parsedIndices
    .filter(idx => idx <= maxIndex)
    .map(idx => indexMap[idx - 1]);

  // Group by file path
  const byFile = new Map();
  for (const item of toUpgrade) {
    if (!byFile.has(item.filePath)) byFile.set(item.filePath, []);
    byFile.get(item.filePath).push(item);
  }

  const upgraded = [];

  // Process each file — replace [LOW] or [MED] with [HIGH] in-place
  for (const [filePath, items] of byFile) {
    const content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
    const lines = content.split('\n');

    for (const item of items) {
      lines[item.line] = lines[item.line].replace(/\[LOW\]/, '[HIGH]').replace(/\[MED\]/, '[HIGH]');
      upgraded.push({
        global_index: item.globalIndex,
        path: relativePath(item.filePath),
        entry: lines[item.line]
      });
    }

    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  }

  // Sort upgraded by global_index for consistent output
  upgraded.sort((a, b) => a.global_index - b.global_index);

  const result = {
    command: 'decay-upgrade',
    upgraded: upgraded,
    total: upgraded.length
  };

  if (errors.length > 0) {
    result.errors = errors;
  }

  return result;
}

// -- CLI dispatch ------------------------------------------------------------

if (require.main === module) {
  const COMMAND = process.argv[2];
  try {
    let result;
    switch (COMMAND) {
      case 'scan':          result = scan(); break;
      case 'promote':       result = promote(); break;
      case 'revert':        result = revert(process.argv.slice(3)); break;
      case 'decay':         result = decay(); break;
      case 'decay-remove':  result = decayRemove(process.argv.slice(3)); break;
      case 'decay-upgrade': result = decayUpgrade(process.argv.slice(3)); break;
      default:
        process.stderr.write('Usage: node evolve.js <scan|promote|revert|decay|decay-remove|decay-upgrade> [args]\n');
        process.exit(1);
    }
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } catch (err) {
    process.stderr.write('evolve: ' + err.message + '\n');
    process.exit(1);
  }
}

module.exports = { scan, promote, revert, decay, decayRemove, decayUpgrade, extractTimestamp, extractConfidence, discoverTargetFiles, parseSections, stripPointer };
