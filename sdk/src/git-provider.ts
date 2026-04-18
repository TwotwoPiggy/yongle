import { spawnSync } from 'node:child_process';
import { logger } from './logger.js';

export interface GitResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

/**
 * Lightweight wrapper around git CLI.
 * 
 * Heavily inspired by GSD-1 core.cjs execGit.
 */
export class GitProvider {
  constructor(private cwd: string, private env: Record<string, string> = {}) {}

  /**
   * Run a git command.
   */
  exec(args: string[]): GitResult {
    const result = spawnSync('git', args, {
      cwd: this.cwd,
      env: { ...process.env, ...this.env },
      encoding: 'utf-8',
    });

    const exitCode = result.status ?? 1;
    const stdout = (result.stdout ?? '').toString().trim();
    const stderr = (result.stderr ?? '').toString().trim();

    if (exitCode !== 0) {
      logger.debug(`Git command failed: git ${args.join(' ')} (exit ${exitCode})`);
      if (stderr) logger.debug(`Stderr: ${stderr}`);
    }

    return { exitCode, stdout, stderr };
  }

  /**
   * Check if current directory is a git repository.
   */
  isRepo(): boolean {
    const res = this.exec(['rev-parse', '--is-inside-work-tree']);
    return res.exitCode === 0 && res.stdout === 'true';
  }

  /**
   * Get the current branch name.
   */
  getCurrentBranch(): string | null {
    const res = this.exec(['rev-parse', '--abbrev-ref', 'HEAD']);
    return res.exitCode === 0 ? res.stdout : null;
  }

  /**
   * Check for uncommitted changes.
   */
  isDirty(): boolean {
    const res = this.exec(['status', '--porcelain']);
    return res.exitCode === 0 && res.stdout.length > 0;
  }

  /**
   * Stage, commit and push changes.
   */
  async sync(message: string, remote: string = 'origin', branch?: string): Promise<boolean> {
    const targetBranch = branch || this.getCurrentBranch() || 'main';
    
    // Add & Commit
    this.exec(['add', '.']);
    const commitRes = this.exec(['commit', '-m', message]);
    if (commitRes.exitCode !== 0 && !commitRes.stderr.includes('nothing to commit')) {
      return false;
    }

    // Pull first
    this.exec(['pull', remote, targetBranch, '--rebase']);

    // Push
    const pushRes = this.exec(['push', remote, targetBranch]);
    return pushRes.exitCode === 0;
  }
}
