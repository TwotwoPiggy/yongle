import { join } from 'node:path';
import { homedir } from 'node:os';
import { existsSync, mkdirSync } from 'node:fs';
import { GitProvider } from './git-provider.js';
import { GSDConfig } from './config.js';
import { logger } from './logger.js';

export interface SyncOptions {
  scope: 'project' | 'global' | 'all';
  interactive?: boolean;
}

/**
 * Handles cross-device synchronization for Yongle Dadian knowledge.
 */
export class SyncEngine {
  private globalHome: string;
  private githubToken: string | null;

  constructor(private projectDir: string, private config: GSDConfig) {
    // Determine global home (heuristic: ~/.yongle or env var)
    this.globalHome = process.env.YONGLE_HOME || join(homedir(), '.yongle');
    this.githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || null;

    if (!existsSync(this.globalHome)) {
      mkdirSync(this.globalHome, { recursive: true });
    }
  }

  /**
   * Sync Project-level knowledge (Git-based).
   */
  async syncProject(): Promise<boolean> {
    logger.info('Syncing project-level knowledge...');
    const git = new GitProvider(this.projectDir);

    if (!git.isRepo()) {
      if (this.config.yongle.sync.non_git_fallback === 'fallback') {
        logger.warn('Current project is not a git repo. Falling back to global sync.');
        return this.syncGlobal();
      }
      logger.info('Project is not a git repo and fallback is disabled. Skipping.');
      return true;
    }

    const ok = await git.sync('docs(yongle): sync knowledge [project]', 'origin');
    if (ok) {
      logger.info('✓ Project sync complete.');
    } else {
      logger.error('✗ Project sync failed. Please check for conflicts manually.');
    }
    return ok;
  }

  /**
   * Sync Global-level knowledge (GitHub-based).
   */
  async syncGlobal(): Promise<boolean> {
    const repoUrl = this.config.yongle.sync.global_repo_url;
    if (!repoUrl) {
      logger.warn('Global repo URL not configured. Use /yongle-sync --setup to initialize.');
      return false;
    }

    logger.info(`Syncing global knowledge to ${repoUrl}...`);
    const git = new GitProvider(this.globalHome, {
      GITHUB_TOKEN: this.githubToken || '',
    });

    if (!git.isRepo()) {
      logger.info('Initializing global repo locally...');
      git.exec(['init']);
      git.exec(['remote', 'add', 'origin', repoUrl]);
      // Set default branch
      git.exec(['checkout', '-b', 'main']);
    }

    const ok = await git.sync('docs(yongle): sync knowledge [global]', 'origin', 'main');
    if (ok) {
      logger.info('✓ Global sync complete.');
    } else {
      logger.error('✗ Global sync failed.');
    }
    return ok;
  }

  /**
   * Ensure a remote repository exists, or guide user to create it.
   */
  async ensureRemoteRepo(): Promise<string | null> {
    if (!this.githubToken) {
      logger.error('Missing GITHUB_TOKEN environment variable. Cannot create remote repository.');
      return null;
    }

    // In a real implementation, we might use Octokit or `gh` CLI here.
    // For now, we guide the user or attempt a simple `gh` command if available.
    logger.info('Attempting to ensure global repository "yongle-vault" exists...');
    
    // We'll implement the actual API call or gh command in a later task.
    // This is a placeholder for Task 6.2.2.
    return null;
  }
}
