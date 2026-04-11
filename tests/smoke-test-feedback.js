// tests/smoke-test-feedback.js
// Phase 5 Feedback Propagation validation -- checks AGNT-14, MEMO-08, MEMO-09, MEMO-10, SKIL-13
// Run: node tests/smoke-test-feedback.js
// Full suite: node tests/smoke-test-paths.js && node tests/smoke-test-skills.js && node tests/smoke-test-agents.js && node tests/smoke-test-pipeline.js && node tests/smoke-test-feedback.js

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const testCases = [];

// --- Signal system checks (MEMO-08) ---

// 1. feedback/ directory exists
testCases.push({
  name: 'feedback/directory_exists',
  check: () => fs.existsSync(path.join(projectRoot, 'feedback'))
});

// 2. feedback/signals.yaml exists
testCases.push({
  name: 'feedback/signals.yaml_exists',
  check: () => fs.existsSync(path.join(projectRoot, 'feedback', 'signals.yaml'))
});

// 3. signals.yaml has top-level signals: key
testCases.push({
  name: 'feedback/signals.yaml_has_signals_key',
  check: () => {
    const content = fs.readFileSync(path.join(projectRoot, 'feedback', 'signals.yaml'), 'utf8');
    return content.includes('signals:');
  }
});

// 4. signals.yaml has all required fields in at least one entry
testCases.push({
  name: 'feedback/signals.yaml_has_required_fields',
  check: () => {
    const content = fs.readFileSync(path.join(projectRoot, 'feedback', 'signals.yaml'), 'utf8');
    return content.includes('id:') &&
           content.includes('date:') &&
           content.includes('source_agent:') &&
           content.includes('domain:') &&
           content.includes('type:') &&
           content.includes('promotion:') &&
           content.includes('resolved:') &&
           content.includes('insight:');
  }
});

// 5. signals.yaml dates do not use ISO timestamps with time component (no colons in date values)
testCases.push({
  name: 'feedback/signals.yaml_no_colons_in_dates',
  check: () => {
    const content = fs.readFileSync(path.join(projectRoot, 'feedback', 'signals.yaml'), 'utf8');
    return !/date: "\d{4}-\d{2}-\d{2}T/.test(content);
  }
});

// --- Agent-protocols upgrade checks (AGNT-14, MEMO-09, MEMO-10) ---

// 6. agent-protocols references signals.yaml (not old SIGNALS.md)
testCases.push({
  name: 'agent-protocols/references_signals_yaml',
  check: () => {
    const content = fs.readFileSync(
      path.join(projectRoot, '.claude', 'skills', 'agent-protocols', 'SKILL.md'), 'utf8'
    );
    return content.includes('signals.yaml');
  }
});

// 7. agent-protocols does NOT reference old SIGNALS.md stub
testCases.push({
  name: 'agent-protocols/no_old_signals_md_reference',
  check: () => {
    const content = fs.readFileSync(
      path.join(projectRoot, '.claude', 'skills', 'agent-protocols', 'SKILL.md'), 'utf8'
    );
    return !content.includes('SIGNALS.md');
  }
});

// 8. agent-protocols has Domain Mapping with all four domains
testCases.push({
  name: 'agent-protocols/has_domain_mapping',
  check: () => {
    const content = fs.readFileSync(
      path.join(projectRoot, '.claude', 'skills', 'agent-protocols', 'SKILL.md'), 'utf8'
    );
    return content.includes('editorial') &&
           content.includes('visual') &&
           content.includes('strategy') &&
           content.includes('meta');
  }
});

// 9. agent-protocols has At Task Start subsection
testCases.push({
  name: 'agent-protocols/has_at_task_start',
  check: () => {
    const content = fs.readFileSync(
      path.join(projectRoot, '.claude', 'skills', 'agent-protocols', 'SKILL.md'), 'utf8'
    );
    return content.includes('At Task Start');
  }
});

// 10. agent-protocols has At Task End subsection
testCases.push({
  name: 'agent-protocols/has_at_task_end',
  check: () => {
    const content = fs.readFileSync(
      path.join(projectRoot, '.claude', 'skills', 'agent-protocols', 'SKILL.md'), 'utf8'
    );
    return content.includes('At Task End');
  }
});

// 11. agent-protocols has promotion: memory instruction
testCases.push({
  name: 'agent-protocols/has_promotion_memory',
  check: () => {
    const content = fs.readFileSync(
      path.join(projectRoot, '.claude', 'skills', 'agent-protocols', 'SKILL.md'), 'utf8'
    );
    return content.includes('promotion: memory');
  }
});

// 12. agent-protocols has promotion: definition instruction
testCases.push({
  name: 'agent-protocols/has_promotion_definition',
  check: () => {
    const content = fs.readFileSync(
      path.join(projectRoot, '.claude', 'skills', 'agent-protocols', 'SKILL.md'), 'utf8'
    );
    return content.includes('promotion: definition');
  }
});

// 13. agent-protocols has resolve lifecycle (resolved: true and resolved_by)
testCases.push({
  name: 'agent-protocols/has_resolve_lifecycle',
  check: () => {
    const content = fs.readFileSync(
      path.join(projectRoot, '.claude', 'skills', 'agent-protocols', 'SKILL.md'), 'utf8'
    );
    return content.includes('resolved: true') && content.includes('resolved_by');
  }
});

// 14. agent-protocols has pruning guidance (references 50-entry threshold)
testCases.push({
  name: 'agent-protocols/has_pruning_guidance',
  check: () => {
    const content = fs.readFileSync(
      path.join(projectRoot, '.claude', 'skills', 'agent-protocols', 'SKILL.md'), 'utf8'
    );
    return content.includes('50');
  }
});

// 15. agent-protocols does NOT use old to_agent targeting
testCases.push({
  name: 'agent-protocols/no_to_agent_targeting',
  check: () => {
    const content = fs.readFileSync(
      path.join(projectRoot, '.claude', 'skills', 'agent-protocols', 'SKILL.md'), 'utf8'
    );
    return !content.includes('to_agent');
  }
});

// --- Verification gate checks (SKIL-13) ---

// 16. write-script has Verification Gate heading
testCases.push({
  name: 'write-script/has_verification_gate',
  check: () => {
    const content = fs.readFileSync(
      path.join(projectRoot, '.claude', 'skills', 'write-script', 'SKILL.md'), 'utf8'
    );
    return content.includes('Verification Gate');
  }
});

// 17. write-script checks entity_index.json
testCases.push({
  name: 'write-script/checks_entity_index',
  check: () => {
    const content = fs.readFileSync(
      path.join(projectRoot, '.claude', 'skills', 'write-script', 'SKILL.md'), 'utf8'
    );
    return content.includes('entity_index.json');
  }
});

// 18. write-script checks source_manifest.json
testCases.push({
  name: 'write-script/checks_source_manifest',
  check: () => {
    const content = fs.readFileSync(
      path.join(projectRoot, '.claude', 'skills', 'write-script', 'SKILL.md'), 'utf8'
    );
    return content.includes('source_manifest.json');
  }
});

// 19. write-script checks Executive Summary heading
testCases.push({
  name: 'write-script/checks_executive_summary',
  check: () => {
    const content = fs.readFileSync(
      path.join(projectRoot, '.claude', 'skills', 'write-script', 'SKILL.md'), 'utf8'
    );
    return content.includes('Executive Summary');
  }
});

// 20. visual-plan has Verification Gate heading
testCases.push({
  name: 'visual-plan/has_verification_gate',
  check: () => {
    const content = fs.readFileSync(
      path.join(projectRoot, '.claude', 'skills', 'visual-plan', 'SKILL.md'), 'utf8'
    );
    return content.includes('Verification Gate');
  }
});

// 21. visual-plan checks metadata.json
testCases.push({
  name: 'visual-plan/checks_metadata_json',
  check: () => {
    const content = fs.readFileSync(
      path.join(projectRoot, '.claude', 'skills', 'visual-plan', 'SKILL.md'), 'utf8'
    );
    return content.includes('metadata.json');
  }
});

// 22. visual-plan checks Hook section
testCases.push({
  name: 'visual-plan/checks_hook_section',
  check: () => {
    const content = fs.readFileSync(
      path.join(projectRoot, '.claude', 'skills', 'visual-plan', 'SKILL.md'), 'utf8'
    );
    return content.includes('Hook');
  }
});

// 23. process-assets has Verification Gate heading
testCases.push({
  name: 'process-assets/has_verification_gate',
  check: () => {
    const content = fs.readFileSync(
      path.join(projectRoot, '.claude', 'skills', 'process-assets', 'SKILL.md'), 'utf8'
    );
    return content.includes('Verification Gate');
  }
});

// 24. process-assets checks visual_brief.json
testCases.push({
  name: 'process-assets/checks_visual_brief',
  check: () => {
    const content = fs.readFileSync(
      path.join(projectRoot, '.claude', 'skills', 'process-assets', 'SKILL.md'), 'utf8'
    );
    return content.includes('visual_brief.json');
  }
});

// 25. process-assets checks media_leads.json
testCases.push({
  name: 'process-assets/checks_media_leads',
  check: () => {
    const content = fs.readFileSync(
      path.join(projectRoot, '.claude', 'skills', 'process-assets', 'SKILL.md'), 'utf8'
    );
    return content.includes('media_leads.json');
  }
});

// --- Run all tests ---
let passed = 0;
const total = testCases.length;

for (const tc of testCases) {
  try {
    const ok = tc.check();
    console.log(ok ? 'PASS' : 'FAIL', tc.name);
    if (ok) passed++;
    else console.log('  Expected: true, Got: false');
  } catch (e) {
    console.log('FAIL', tc.name);
    console.log('  Error:', e.message);
  }
}

console.log(`\n${passed}/${total} passed`);
process.exit(passed === total ? 0 : 1);
