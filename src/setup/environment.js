// Copyright (C) 2025 Keygraph, Inc.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License version 3
// as published by the Free Software Foundation.

import { $, fs, path } from 'zx';
import chalk from 'chalk';
import { PentestError } from '../error-handling.js';
import { statusLine, COLORS } from '../cli/terminal-ui.js';

// Pure function: Setup local repository for testing
export async function setupLocalRepo(repoPath) {
  try {
    const sourceDir = path.resolve(repoPath);

    // MCP servers are now configured via mcpServers option in claude-executor.js
    // No need for pre-setup with claude CLI

    // Initialize git repository if not already initialized and create checkpoint
    try {
      // Check if it's already a git repository
      const isGitRepo = await fs.pathExists(path.join(sourceDir, '.git'));

      if (!isGitRepo) {
        await $`cd ${sourceDir} && git init`;
        console.log(statusLine('+', 'Git repository initialized', {
          color: COLORS.primary,
          indent: 0
        }));
      }

      // Configure git for pentest agent
      await $`cd ${sourceDir} && git config user.name "Pentest Agent"`;
      await $`cd ${sourceDir} && git config user.email "agent@localhost"`;

      // Create initial checkpoint
      await $`cd ${sourceDir} && git add -A && git commit -m "Initial checkpoint: Local repository setup" --allow-empty`;
      console.log(statusLine('+', 'Initial checkpoint created', {
        color: COLORS.primary,
        indent: 0
      }));
    } catch (gitError) {
      console.log(statusLine('!', `Git setup warning: ${gitError.message}`, {
        color: COLORS.warning,
        indent: 0
      }));
      // Non-fatal - continue without Git setup
    }

    // MCP tools (save_deliverable, generate_totp) are now available natively via shaart-helper MCP server
    // No need to copy bash scripts to target repository

    return sourceDir;
  } catch (error) {
    if (error instanceof PentestError) {
      throw error;
    }
    throw new PentestError(
      `Local repository setup failed: ${error.message}`,
      'filesystem',
      false,
      { repoPath, originalError: error.message }
    );
  }
}