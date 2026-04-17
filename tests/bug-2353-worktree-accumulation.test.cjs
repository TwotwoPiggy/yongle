/**
 * Regression tests for #2353: Check 11 worktree enhancements
 *
 * Two new behaviours are added to Check 11 in verify.cjs:
 *   1. Detect worktrees in detached HEAD state and emit W018.
 *   2. Warn when the count of non-main worktrees exceeds 10, emit W019.
 */

'use strict';

const { describe, test, before, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const { runGsdTools, createTempGitProject, cleanup } = require('./helpers.cjs');

// ─── Project-level helpers ────────────────────────────────────────────────────

function writeMinimalProjectMd(tmpDir) {
  const sections = ['## What This Is', '## Core Value', '## Requirements'];
  const content = sections.map(s => `${s}\n\nContent here.\n`).join('\n');
  fs.writeFileSync(
    path.join(tmpDir, '.planning', 'PROJECT.md'),
    `# Project\n\n${content}`
  );
}

function writeMinimalRoadmap(tmpDir) {
  fs.writeFileSync(
    path.join(tmpDir, '.planning', 'ROADMAP.md'),
    '# Roadmap\n\n### Phase 1: Setup\n'
  );
}

function writeMinimalStateMd(tmpDir) {
  fs.writeFileSync(
    path.join(tmpDir, '.planning', 'STATE.md'),
    '# Session State\n\n## Current Position\n\nPhase: 1\n'
  );
}

function writeValidConfigJson(tmpDir) {
  fs.writeFileSync(
    path.join(tmpDir, '.planning', 'config.json'),
    JSON.stringify({
      model_profile: 'balanced',
      commit_docs: true,
      workflow: { nyquist_validation: true, ai_integration_phase: true },
    }, null, 2)
  );
}

function setupHealthyProject(tmpDir) {
  writeMinimalProjectMd(tmpDir);
  writeMinimalRoadmap(tmpDir);
  writeMinimalStateMd(tmpDir);
  writeValidConfigJson(tmpDir);
  fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '01-setup'), { recursive: true });
}

// ─── Structural tests ─────────────────────────────────────────────────────────

describe('bug-2353: structural — verify.cjs contains new warning codes', () => {
  const verifyPath = path.join(__dirname, '..', 'get-shit-done', 'bin', 'lib', 'verify.cjs');
  let source;

  before(() => {
    source = fs.readFileSync(verifyPath, 'utf-8');
  });

  test('verify.cjs contains W018 code for detached HEAD worktrees', () => {
    assert.ok(
      source.includes("'W018'"),
      'verify.cjs must contain W018 warning code for detached HEAD worktrees'
    );
  });

  test('verify.cjs contains W019 code for worktree count threshold', () => {
    assert.ok(
      source.includes("'W019'"),
      'verify.cjs must contain W019 warning code for excessive worktree count'
    );
  });

  test('verify.cjs checks for detached marker in porcelain output', () => {
    assert.ok(
      source.includes('detached'),
      'verify.cjs must parse the "detached" marker from git worktree porcelain output'
    );
  });

  test('verify.cjs checks worktree count against a threshold of 10', () => {
    assert.ok(
      source.includes('10'),
      'verify.cjs must compare worktree count against threshold 10'
    );
  });
});

// ─── Detached HEAD detection ──────────────────────────────────────────────────

describe('bug-2353: W018 — detached HEAD worktree detection', () => {
  let tmpDir;
  let detachedWtDir;

  beforeEach(() => {
    tmpDir = createTempGitProject();
    setupHealthyProject(tmpDir);

    // Create a second commit so we can checkout a specific hash (detached HEAD)
    fs.writeFileSync(path.join(tmpDir, 'file2.txt'), 'second commit\n');
    execSync('git add file2.txt', { cwd: tmpDir, stdio: 'pipe' });
    execSync('git commit -m "second commit"', { cwd: tmpDir, stdio: 'pipe' });

    // Get the first commit hash for the detached-HEAD checkout
    const logOut = execSync('git log --oneline', { cwd: tmpDir, encoding: 'utf-8', stdio: 'pipe' }).trim();
    const firstHash = logOut.split('\n').pop().split(' ')[0];

    // Add a linked worktree in detached HEAD state
    detachedWtDir = path.join(os.tmpdir(), `gsd-detached-wt-${Date.now()}`);
    execSync(`git worktree add --detach "${detachedWtDir}" ${firstHash}`, {
      cwd: tmpDir,
      stdio: 'pipe',
    });
  });

  afterEach(() => {
    try {
      execSync(`git worktree remove "${detachedWtDir}" --force`, { cwd: tmpDir, stdio: 'pipe' });
    } catch { /* already gone */ }
    cleanup(tmpDir);
  });

  test('W018 is emitted when a linked worktree is in detached HEAD state', () => {
    const result = runGsdTools('validate health --raw', tmpDir);
    assert.ok(result.success, `validate health should succeed: ${result.error || ''}`);
    const parsed = JSON.parse(result.output);

    const w018s = (parsed.warnings || []).filter(w => w.code === 'W018');
    assert.ok(
      w018s.length > 0,
      `Expected W018 for detached HEAD worktree, warnings: ${JSON.stringify(parsed.warnings)}`
    );
  });

  test('W018 message includes the worktree path', () => {
    const result = runGsdTools('validate health --raw', tmpDir);
    assert.ok(result.success, `validate health should succeed: ${result.error || ''}`);
    const parsed = JSON.parse(result.output);

    const w018 = (parsed.warnings || []).find(w => w.code === 'W018');
    assert.ok(w018, `Expected W018 in warnings: ${JSON.stringify(parsed.warnings)}`);
    assert.ok(
      w018.message.includes(detachedWtDir),
      `W018 message should include worktree path, got: "${w018.message}"`
    );
  });

  test('W018 is NOT emitted for normal branch-tracked worktrees', () => {
    const normalWtDir = path.join(os.tmpdir(), `gsd-normal-wt-${Date.now()}`);
    try {
      execSync(`git worktree add "${normalWtDir}" -b test-normal-branch`, { cwd: tmpDir, stdio: 'pipe' });

      const result = runGsdTools('validate health --raw', tmpDir);
      assert.ok(result.success, `validate health should succeed: ${result.error || ''}`);
      const parsed = JSON.parse(result.output);

      // W018 should only refer to the detached worktree, not the normal one
      const w018s = (parsed.warnings || []).filter(w => w.code === 'W018');
      const normalW018 = w018s.find(w => w.message.includes(normalWtDir));
      assert.ok(
        !normalW018,
        `W018 must NOT fire for normal branch-tracked worktree, warnings: ${JSON.stringify(w018s)}`
      );
    } finally {
      try { execSync(`git worktree remove "${normalWtDir}" --force`, { cwd: tmpDir, stdio: 'pipe' }); } catch { /* ok */ }
    }
  });
});

// ─── Worktree count threshold ─────────────────────────────────────────────────

describe('bug-2353: W019 — excessive non-main worktree count', () => {
  let tmpDir;
  const extraWtDirs = [];

  beforeEach(() => {
    tmpDir = createTempGitProject();
    setupHealthyProject(tmpDir);
    extraWtDirs.length = 0;
  });

  afterEach(() => {
    for (const wtDir of extraWtDirs) {
      try {
        execSync(`git worktree remove "${wtDir}" --force`, { cwd: tmpDir, stdio: 'pipe' });
      } catch { /* already removed */ }
    }
    cleanup(tmpDir);
  });

  function addWorktrees(count) {
    for (let i = 0; i < count; i++) {
      const wtDir = path.join(os.tmpdir(), `gsd-wt-count-${Date.now()}-${i}`);
      execSync(`git worktree add "${wtDir}" -b test-branch-${Date.now()}-${i}`, {
        cwd: tmpDir,
        stdio: 'pipe',
      });
      extraWtDirs.push(wtDir);
    }
  }

  test('W019 is NOT emitted when non-main worktree count is exactly 10', () => {
    addWorktrees(10);

    const result = runGsdTools('validate health --raw', tmpDir);
    assert.ok(result.success, `validate health should succeed: ${result.error || ''}`);
    const parsed = JSON.parse(result.output);

    const w019s = (parsed.warnings || []).filter(w => w.code === 'W019');
    assert.ok(
      w019s.length === 0,
      `W019 must NOT fire for exactly 10 non-main worktrees, warnings: ${JSON.stringify(w019s)}`
    );
  });

  test('W019 is emitted when non-main worktree count exceeds 10', () => {
    addWorktrees(11);

    const result = runGsdTools('validate health --raw', tmpDir);
    assert.ok(result.success, `validate health should succeed: ${result.error || ''}`);
    const parsed = JSON.parse(result.output);

    const w019s = (parsed.warnings || []).filter(w => w.code === 'W019');
    assert.ok(
      w019s.length > 0,
      `Expected W019 for 11 non-main worktrees, warnings: ${JSON.stringify(parsed.warnings)}`
    );
  });

  test('W019 message includes the count and mentions pruning', () => {
    addWorktrees(11);

    const result = runGsdTools('validate health --raw', tmpDir);
    assert.ok(result.success, `validate health should succeed: ${result.error || ''}`);
    const parsed = JSON.parse(result.output);

    const w019 = (parsed.warnings || []).find(w => w.code === 'W019');
    assert.ok(w019, `Expected W019 in warnings: ${JSON.stringify(parsed.warnings)}`);
    assert.ok(
      w019.message.includes('11'),
      `W019 message should include count "11", got: "${w019.message}"`
    );
    const mentionsPruning = (w019.message && w019.message.toLowerCase().includes('prun')) ||
      (w019.hint && w019.hint.toLowerCase().includes('prun'));
    assert.ok(
      mentionsPruning,
      `W019 message or hint should mention pruning, got message: "${w019.message}", hint: "${w019.hint}"`
    );
  });

  test('W019 is NOT emitted when project has no linked worktrees', () => {
    const result = runGsdTools('validate health --raw', tmpDir);
    assert.ok(result.success, `validate health should succeed: ${result.error || ''}`);
    const parsed = JSON.parse(result.output);

    const w019s = (parsed.warnings || []).filter(w => w.code === 'W019');
    assert.ok(
      w019s.length === 0,
      `W019 must not fire when no non-main worktrees exist, warnings: ${JSON.stringify(w019s)}`
    );
  });
});
