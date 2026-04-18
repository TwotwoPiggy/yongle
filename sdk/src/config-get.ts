import { loadConfig } from './config.js';
import { resolve } from 'node:path';

async function main() {
  const args = process.argv.slice(2);
  const key = args[0];
  const projectDir = process.cwd();

  try {
    const config = await loadConfig(projectDir);
    
    // Resolve nested keys like 'yongle.sync.mode'
    let current: any = config;
    const parts = key.split('.');
    
    for (const part of parts) {
      if (current[part] === undefined) {
        process.exit(1);
      }
      current = current[part];
    }
    
    process.stdout.write(String(current));
  } catch {
    process.exit(1);
  }
}

main();
