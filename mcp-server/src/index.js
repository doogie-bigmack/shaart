// Copyright (C) 2025 Keygraph, Inc.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License version 3
// as published by the Free Software Foundation.

/**
 * Shaart Helper MCP Server
 *
 * In-process MCP server providing save_deliverable and generate_totp tools
 * for Shaart penetration testing agents.
 *
 * Replaces bash script invocations with native tool access.
 */

import { createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';
import { saveDeliverableTool } from './tools/save-deliverable.js';
import { generateTotpTool } from './tools/generate-totp.js';
import { queryExploitMemoryTool } from './tools/query-exploit-memory.js';
import { saveExploitResultTool } from './tools/save-exploit-result.js';
import { verifyRemediationTool } from './tools/verify-remediation.js';

/**
 * Create Shaart Helper MCP Server with target directory context
 *
 * @param {string} targetDir - The target repository directory where deliverables should be saved
 * @param {Object} exploitMemoryConfig - Exploit memory configuration
 * @returns {Object} MCP server instance
 */
export function createShaartHelperServer(targetDir, exploitMemoryConfig = {}) {
  // Store target directory for tool access
  global.__SHAART_TARGET_DIR = targetDir;

  // Store exploit memory configuration for tool access
  global.__SHAART_EXPLOIT_MEMORY_CONFIG = {
    enabled: exploitMemoryConfig.enabled !== false,
    deduplication_strategy: exploitMemoryConfig.deduplication_strategy || 'strict',
    max_age_days: exploitMemoryConfig.max_age_days || 90,
    trigger_infrastructure: exploitMemoryConfig.trigger_infrastructure !== false
  };

  return createSdkMcpServer({
    name: 'shaart-helper',
    version: '1.0.0',
    tools: [
      saveDeliverableTool,
      generateTotpTool,
      queryExploitMemoryTool,
      saveExploitResultTool,
      verifyRemediationTool
    ],
  });
}

// Export tools for direct usage if needed
export {
  saveDeliverableTool,
  generateTotpTool,
  queryExploitMemoryTool,
  saveExploitResultTool,
  verifyRemediationTool
};

// Export types for external use
export * from './types/index.js';
