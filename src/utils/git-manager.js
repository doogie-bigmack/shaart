// Copyright (C) 2025 Keygraph, Inc.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License version 3
// as published by the Free Software Foundation.

import { $ } from 'zx';
import chalk from 'chalk';
import { systemMessage, statusLine, COLORS } from '../cli/terminal-ui.js';

// Global git operations semaphore to prevent index.lock conflicts during parallel execution
class GitSemaphore {
  constructor() {
    this.queue = [];
    this.running = false;
  }

  async acquire() {
    return new Promise((resolve) => {
      this.queue.push(resolve);
      this.process();
    });
  }

  release() {
    this.running = false;
    this.process();
  }

  process() {
    if (!this.running && this.queue.length > 0) {
      this.running = true;
      const resolve = this.queue.shift();
      resolve();
    }
  }
}

const gitSemaphore = new GitSemaphore();

// Execute git commands with retry logic for index.lock conflicts
export const executeGitCommandWithRetry = async (commandArgs, sourceDir, description, maxRetries = 5) => {
  await gitSemaphore.acquire();

  try {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Handle both array and string commands
        let result;
        if (Array.isArray(commandArgs)) {
          // For arrays like ['git', 'status', '--porcelain'], execute parts separately
          const [cmd, ...args] = commandArgs;
          result = await $`cd ${sourceDir} && ${cmd} ${args}`;
        } else {
          // For string commands
          result = await $`cd ${sourceDir} && ${commandArgs}`;
        }
        return result;
      } catch (error) {
        const isLockError = error.message.includes('index.lock') ||
                           error.message.includes('unable to lock') ||
                           error.message.includes('Another git process') ||
                           error.message.includes('fatal: Unable to create') ||
                           error.message.includes('fatal: index file');

        if (isLockError && attempt < maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff: 1s, 2s, 4s, 8s, 16s
          console.log(statusLine('!', `Git lock conflict during ${description} (attempt ${attempt}/${maxRetries}). Retrying in ${delay}ms...`, {
            color: COLORS.warning,
            indent: 4
          }));
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        throw error;
      }
    }
  } finally {
    gitSemaphore.release();
  }
};

// Pure functions for Git workspace management
const cleanWorkspace = async (sourceDir, reason = 'clean start') => {
  console.log(statusLine('>', `Cleaning workspace for ${reason}`, {
    color: COLORS.primary,
    indent: 4
  }));
  try {
    // Check for uncommitted changes
    const status = await $`cd ${sourceDir} && git status --porcelain`;
    const hasChanges = status.stdout.trim().length > 0;

    if (hasChanges) {
      // Show what we're about to remove
      const changes = status.stdout.trim().split('\n').filter(line => line.length > 0);
      console.log(statusLine('<', `Rolling back workspace for ${reason}`, {
        color: COLORS.warning,
        indent: 4
      }));

      await $`cd ${sourceDir} && git reset --hard HEAD`;
      await $`cd ${sourceDir} && git clean -fd`;

      console.log(statusLine('+', `Rollback completed - removed ${changes.length} contaminated changes:`, {
        color: COLORS.warning,
        indent: 4
      }));
      changes.slice(0, 3).forEach(change => console.log(chalk.hex(COLORS.dim)(`       ${change}`)));
      if (changes.length > 3) {
        console.log(chalk.hex(COLORS.dim)(`       ... and ${changes.length - 3} more files`));
      }
    } else {
      console.log(statusLine('+', 'Workspace already clean (no changes to remove)', {
        color: COLORS.primary,
        indent: 4
      }));
    }
    return { success: true, hadChanges: hasChanges };
  } catch (error) {
    console.log(statusLine('!', `Workspace cleanup failed: ${error.message}`, {
      color: COLORS.warning,
      indent: 4
    }));
    return { success: false, error };
  }
};

export const createGitCheckpoint = async (sourceDir, description, attempt) => {
  console.log(statusLine('>', `Creating checkpoint for ${description} (attempt ${attempt})`, {
    color: COLORS.primary,
    indent: 4
  }));
  try {
    // Only clean workspace on retry attempts (attempt > 1), not on first attempts
    // This preserves deliverables between agents while still cleaning on actual retries
    if (attempt > 1) {
      const cleanResult = await cleanWorkspace(sourceDir, `${description} (retry cleanup)`);
      if (!cleanResult.success) {
        console.log(statusLine('!', `Workspace cleanup failed, continuing anyway: ${cleanResult.error.message}`, {
          color: COLORS.warning,
          indent: 4
        }));
      }
    }

    // Check for uncommitted changes with retry logic
    const status = await executeGitCommandWithRetry(['git', 'status', '--porcelain'], sourceDir, 'status check');
    const hasChanges = status.stdout.trim().length > 0;

    // Stage changes with retry logic
    await executeGitCommandWithRetry(['git', 'add', '-A'], sourceDir, 'staging changes');

    // Create commit with retry logic
    await executeGitCommandWithRetry(['git', 'commit', '-m', `Checkpoint: ${description} (attempt ${attempt})`, '--allow-empty'], sourceDir, 'creating commit');

    if (hasChanges) {
      console.log(statusLine('+', 'Checkpoint created with uncommitted changes staged', {
        color: COLORS.primary,
        indent: 4
      }));
    } else {
      console.log(statusLine('+', 'Checkpoint created (no workspace changes)', {
        color: COLORS.primary,
        indent: 4
      }));
    }
    return { success: true };
  } catch (error) {
    console.log(statusLine('!', `Checkpoint creation failed after retries: ${error.message}`, {
      color: COLORS.warning,
      indent: 4
    }));
    return { success: false, error };
  }
};

export const commitGitSuccess = async (sourceDir, description) => {
  console.log(statusLine('>', `Committing successful results for ${description}`, {
    color: COLORS.primary,
    indent: 4
  }));
  try {
    // Check what we're about to commit with retry logic
    const status = await executeGitCommandWithRetry(['git', 'status', '--porcelain'], sourceDir, 'status check for success commit');
    const changes = status.stdout.trim().split('\n').filter(line => line.length > 0);

    // Stage changes with retry logic
    await executeGitCommandWithRetry(['git', 'add', '-A'], sourceDir, 'staging changes for success commit');

    // Create success commit with retry logic
    await executeGitCommandWithRetry(['git', 'commit', '-m', `${description}: completed successfully`, '--allow-empty'], sourceDir, 'creating success commit');

    if (changes.length > 0) {
      console.log(statusLine('+', `Success commit created with ${changes.length} file changes:`, {
        color: COLORS.primary,
        indent: 4
      }));
      changes.slice(0, 5).forEach(change => console.log(chalk.hex(COLORS.dim)(`       ${change}`)));
      if (changes.length > 5) {
        console.log(chalk.hex(COLORS.dim)(`       ... and ${changes.length - 5} more files`));
      }
    } else {
      console.log(statusLine('+', 'Empty success commit created (agent made no file changes)', {
        color: COLORS.primary,
        indent: 4
      }));
    }
    return { success: true };
  } catch (error) {
    console.log(statusLine('!', `Success commit failed after retries: ${error.message}`, {
      color: COLORS.warning,
      indent: 4
    }));
    return { success: false, error };
  }
};

export const rollbackGitWorkspace = async (sourceDir, reason = 'retry preparation') => {
  console.log(statusLine('<', `Rolling back workspace for ${reason}`, {
    color: COLORS.warning,
    indent: 4
  }));
  try {
    // Show what we're about to remove with retry logic
    const status = await executeGitCommandWithRetry(['git', 'status', '--porcelain'], sourceDir, 'status check for rollback');
    const changes = status.stdout.trim().split('\n').filter(line => line.length > 0);

    // Reset to HEAD with retry logic
    await executeGitCommandWithRetry(['git', 'reset', '--hard', 'HEAD'], sourceDir, 'hard reset for rollback');

    // Clean untracked files with retry logic
    await executeGitCommandWithRetry(['git', 'clean', '-fd'], sourceDir, 'cleaning untracked files for rollback');

    if (changes.length > 0) {
      console.log(statusLine('+', `Rollback completed - removed ${changes.length} contaminated changes:`, {
        color: COLORS.warning,
        indent: 4
      }));
      changes.slice(0, 3).forEach(change => console.log(chalk.hex(COLORS.dim)(`       ${change}`)));
      if (changes.length > 3) {
        console.log(chalk.hex(COLORS.dim)(`       ... and ${changes.length - 3} more files`));
      }
    } else {
      console.log(statusLine('+', 'Rollback completed - no changes to remove', {
        color: COLORS.warning,
        indent: 4
      }));
    }
    return { success: true };
  } catch (error) {
    console.log(statusLine('-', `Rollback failed after retries: ${error.message}`, {
      color: COLORS.error,
      indent: 4
    }));
    return { success: false, error };
  }
};