import { loadConfig } from './config.js';
import { SyncEngine } from './sync-engine.js';
import { logger } from './logger.js';
import { resolve } from 'node:path';

async function main() {
  const args = process.argv.slice(2);
  const scopeArg = args.find(a => a.startsWith('--scope='))?.split('=')[1] || 'all';
  const projectDir = process.cwd();

  try {
    const config = await loadConfig(projectDir);
    const engine = new SyncEngine(projectDir, config);

    if (scopeArg === 'all' || scopeArg === 'project') {
      await engine.syncProject();
    }

    if (scopeArg === 'all' || scopeArg === 'global') {
      await engine.syncGlobal();
    }

  } catch (err) {
    logger.error(`Sync failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

main();
