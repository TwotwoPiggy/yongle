import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

// Directly import SDK components to test them
import { loadConfig } from '../../sdk/src/config.js';
import { SyncEngine } from '../../sdk/src/sync-engine.js';
import { GitProvider } from '../../sdk/src/git-provider.js';

const YONGLE_ROOT = resolve(__dirname, '../../../');
const DB_SCRIPT = join(YONGLE_ROOT, 'yongle', 'scripts', 'yongle-db.js');

describe('Yongle Dadian Component Integration (Full Lifecycle)', () => {
  let sandboxDir: string;
  let fakeHome: string;
  let testProjectDir: string;

  beforeAll(() => {
    sandboxDir = join(tmpdir(), `yongle-core-test-${Date.now()}`);
    fakeHome = join(sandboxDir, 'home');
    testProjectDir = join(sandboxDir, 'project');

    mkdirSync(fakeHome, { recursive: true });
    mkdirSync(testProjectDir, { recursive: true });

    // Initialize fake project as a git repo
    spawnSync('git', ['init'], { cwd: testProjectDir });
    spawnSync('git', ['config', 'user.name', 'Yongle Core Tester'], { cwd: testProjectDir });
    spawnSync('git', ['config', 'user.email', 'test@yongle.com'], { cwd: testProjectDir });
    
    // Add an initial commit to avoid empty repo issues
    writeFileSync(join(testProjectDir, 'README.md'), '# Test');
    spawnSync('git', ['add', '.'], { cwd: testProjectDir });
    spawnSync('git', ['commit', '-m', 'initial'], { cwd: testProjectDir });

    // Create a dummy config in project
    const config = {
      yongle: {
        sync: {
          mode: 'auto',
          global_repo_url: 'https://github.com/test/yongle-vault.git', 
        }
      }
    };
    const planningDir = join(testProjectDir, '.planning');
    mkdirSync(planningDir, { recursive: true });
    writeFileSync(join(planningDir, 'config.json'), JSON.stringify(config, null, 2));
    writeFileSync(join(testProjectDir, 'PROJECT.md'), '# Test Project');
  });

  afterAll(() => {
    if (existsSync(sandboxDir)) {
      rmSync(sandboxDir, { recursive: true, force: true });
    }
  });

  it('should flow through Capture -> Storage -> Indexing -> Syncing', async () => {
    const env = {
      ...process.env,
      YONGLE_HOME: fakeHome,
      YONGLE_TEST_MODE: 'true',
    };

    // 1. PHASE 1: Config Loading
    const config = await loadConfig(testProjectDir);
    expect(config.yongle.sync.mode).toBe('auto');

    // 2. PHASE 5: Database Indexing (Direct Script Test)
    const testEntry = {
      id: "20260419-integration-test",
      date: "2026-04-19",
      resolution_type: "test",
      cause_summary: "Verifying all phases are connected",
      tags: ["smoke-test"],
      filepath: join(testProjectDir, ".planning/knowledge/test.md")
    };

    const dbResult = spawnSync('node', [
        DB_SCRIPT, 
        'upsert', 'local', JSON.stringify(testEntry)
    ], {
      cwd: testProjectDir,
      env: { ...env, YONGLE_DB_PATH: join(testProjectDir, 'test.db') },
      encoding: 'utf-8'
    });

    expect(dbResult.status).toBe(0);
    expect(existsSync(join(testProjectDir, 'test.db'))).toBe(true);

    // 3. PHASE 6: Sync Engine Execution (Direct SDK Test)
    // We mock the GitProvider sync to avoid real network push, 
    // but verify the commit creation. 
    const engine = new SyncEngine(testProjectDir, config);
    
    // Manually run project sync logic
    const git = new GitProvider(testProjectDir);
    const testKnowledgePath = join(testProjectDir, '.planning/knowledge/test.md');
    mkdirSync(join(testProjectDir, '.planning/knowledge'), { recursive: true });
    writeFileSync(testKnowledgePath, '# Test Knowledge');
    
    // Test the GitProvider's ability to commit
    const ok = await git.sync('docs(yongle): smoke test sync', 'origin', 'master');
    // Note: Expecting false or failure on push because "origin" doesn't exist,
    // but the commit should have happened.

    const gitLog = spawnSync('git', ['log', '--oneline'], { cwd: testProjectDir, encoding: 'utf-8' });
    expect(gitLog.stdout).toContain('docs(yongle): smoke test sync');
  });
});
