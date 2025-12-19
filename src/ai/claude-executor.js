// Copyright (C) 2025 Keygraph, Inc.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License version 3
// as published by the Free Software Foundation.

import { $, fs, path } from 'zx';
import chalk from 'chalk';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import { isRetryableError, getRetryDelay, PentestError } from '../error-handling.js';
import { ProgressIndicator } from '../progress-indicator.js';
import { timingResults, costResults, Timer } from '../utils/metrics.js';
import { formatDuration } from '../audit/utils.js';
import { createGitCheckpoint, commitGitSuccess, rollbackGitWorkspace } from '../utils/git-manager.js';
import { AGENT_VALIDATORS, MCP_AGENT_MAPPING, DEFAULT_MODEL_CONFIG, AGENT_MODEL_PHASES } from '../constants.js';
import { filterJsonToolCalls, getAgentPrefix } from '../utils/output-formatter.js';
import { generateSessionLogPath } from '../session-manager.js';
import { AuditSession } from '../audit/index.js';
import { createShaartHelperServer } from '../../mcp-server/src/index.js';
import {
  completionMessage,
  agentActivity,
  validationResult,
  commitResult,
  checkpointMessage,
  modelIndicator,
  statusLine,
  systemMessage,
  errorMessage,
  COLORS
} from '../cli/terminal-ui.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Select appropriate model based on agent type and user configuration
 * Implements multi-model strategy for cost optimization:
 * - Haiku for analysis (pre-recon, recon, vulnerability) - ~60x cheaper
 * - Sonnet for exploitation and reporting - complex reasoning
 *
 * @param {string} agentName - Agent name (e.g., 'pre-recon', 'xss-vuln', 'injection-exploit')
 * @param {object} modelConfig - User-provided model configuration (optional)
 * @returns {string} Model identifier to use for this agent
 */
function selectModelForAgent(agentName, modelConfig = null) {
  // Get the phase for this agent (analysis, exploitation, or reporting)
  const phase = AGENT_MODEL_PHASES[agentName];

  if (!phase) {
    console.log(chalk.yellow(`    ⚠️  Unknown agent "${agentName}", using default Sonnet model`));
    return 'claude-sonnet-4-5-20250929';
  }

  // Use user-provided model config if available, otherwise use defaults
  const effectiveConfig = modelConfig || DEFAULT_MODEL_CONFIG;
  const selectedModel = effectiveConfig[phase] || DEFAULT_MODEL_CONFIG[phase];

  // Log model selection for transparency
  const modelName = selectedModel.includes('haiku') ? 'Haiku' :
                   selectedModel.includes('sonnet') ? 'Sonnet' :
                   selectedModel.includes('opus') ? 'Opus' : selectedModel;
  console.log(modelIndicator(modelName, phase));

  return selectedModel;
}

/**
 * Convert agent name to prompt name for MCP_AGENT_MAPPING lookup
 *
 * @param {string} agentName - Agent name (e.g., 'xss-vuln', 'injection-exploit')
 * @returns {string} Prompt name (e.g., 'vuln-xss', 'exploit-injection')
 */
function agentNameToPromptName(agentName) {
  // Special cases
  if (agentName === 'pre-recon') return 'pre-recon-code';
  if (agentName === 'report') return 'report-executive';
  if (agentName === 'recon') return 'recon';

  // Pattern: {type}-vuln → vuln-{type}
  const vulnMatch = agentName.match(/^(.+)-vuln$/);
  if (vulnMatch) {
    return `vuln-${vulnMatch[1]}`;
  }

  // Pattern: {type}-exploit → exploit-{type}
  const exploitMatch = agentName.match(/^(.+)-exploit$/);
  if (exploitMatch) {
    return `exploit-${exploitMatch[1]}`;
  }

  // Default: return as-is
  return agentName;
}

// Simplified validation using direct agent name mapping
async function validateAgentOutput(result, agentName, sourceDir) {
  console.log(statusLine('>', `Validating ${agentName} agent output`, {
    color: COLORS.tertiary,
    indent: 4
  }));

  try {
    // Check if agent completed successfully
    if (!result.success || !result.result) {
      console.log(validationResult(false, 'Agent execution was unsuccessful'));
      return false;
    }

    // Get validator function for this agent
    const validator = AGENT_VALIDATORS[agentName];

    if (!validator) {
      console.log(statusLine('!', `No validator found for agent "${agentName}" - assuming success`, {
        color: COLORS.warning,
        indent: 4
      }));
      console.log(validationResult(true, 'Unknown agent with successful result'));
      return true;
    }

    console.log(statusLine('>', `Using validator for agent: ${agentName}`, {
      color: COLORS.dim,
      indent: 4
    }));
    console.log(statusLine('>', `Source directory: ${sourceDir}`, {
      color: COLORS.dim,
      indent: 4
    }));

    // Apply validation function
    const validationPassed = await validator(sourceDir);

    if (validationPassed) {
      console.log(validationResult(true, 'Required files/structure present'));
    } else {
      console.log(validationResult(false, 'Missing required deliverable files'));
    }

    return validationPassed;

  } catch (error) {
    console.log(validationResult(false, `Validation error: ${error.message}`));
    return false; // Assume invalid on validation error
  }
}

// Pure function: Run Claude Code with SDK - Maximum Autonomy
// WARNING: This is a low-level function. Use runClaudePromptWithRetry() for agent execution to ensure:
// - Retry logic and error handling
// - Output validation
// - Prompt snapshotting for debugging
// - Git checkpoint/rollback safety
async function runClaudePrompt(prompt, sourceDir, allowedTools = 'Read', context = '', description = 'Claude analysis', agentName = null, colorFn = chalk.cyan, sessionMetadata = null, auditSession = null, attemptNumber = 1, modelConfig = null, config = null) {
  const timer = new Timer(`agent-${description.toLowerCase().replace(/\s+/g, '-')}`);
  const fullPrompt = context ? `${context}\n\n${prompt}` : prompt;
  let totalCost = 0;
  let partialCost = 0; // Track partial cost for crash safety

  // Auto-detect execution mode to adjust logging behavior
  const isParallelExecution = description.includes('vuln agent') || description.includes('exploit agent');
  const useCleanOutput = description.includes('Pre-recon agent') ||
                         description.includes('Recon agent') ||
                         description.includes('Executive Summary and Report Cleanup') ||
                         description.includes('vuln agent') ||
                         description.includes('exploit agent');

  // Disable status manager - using simple JSON filtering for all agents now
  const statusManager = null;

  // Setup progress indicator for clean output agents (unless disabled via flag)
  // Note: progressIndicator is initialized after options is defined (see below)

  // NOTE: Logging now handled by AuditSession (append-only, crash-safe)
  // Legacy log path generation kept for compatibility
  let logFilePath = null;
  if (sessionMetadata && sessionMetadata.webUrl && sessionMetadata.id) {
    const timestamp = new Date().toISOString().replace(/T/, '_').replace(/[:.]/g, '-').slice(0, 19);
    const agentName = description.toLowerCase().replace(/\s+/g, '-');
    const logDir = generateSessionLogPath(sessionMetadata.webUrl, sessionMetadata.id);
    logFilePath = path.join(logDir, `${timestamp}_${agentName}_attempt-${attemptNumber}.log`);
  } else {
    console.log(systemMessage(`Running Claude Code: ${description}...`, { color: COLORS.dim, prefix: '  ' }));
  }

  // Declare variables that need to be accessible in both try and catch blocks
  let turnCount = 0;
  let progressIndicator = null;

  try {
    // Create MCP server with target directory context and exploit memory config
    const exploitMemoryConfig = config?.exploit_memory || {};
    const shaartHelperServer = createShaartHelperServer(sourceDir, exploitMemoryConfig);

    // Set global hostname and session ID for exploit memory access
    if (sessionMetadata?.webUrl) {
      global.__SHAART_HOSTNAME = new URL(sessionMetadata.webUrl).hostname;
    }
    if (sessionMetadata?.id) {
      global.__SHAART_SESSION_ID = sessionMetadata.id;
    }

    // Look up agent's assigned Playwright MCP server
    // Convert agent name (e.g., 'xss-vuln') to prompt name (e.g., 'vuln-xss')
    let playwrightMcpName = null;
    if (agentName) {
      const promptName = agentNameToPromptName(agentName);
      playwrightMcpName = MCP_AGENT_MAPPING[promptName];

      if (playwrightMcpName) {
        console.log(systemMessage(`Assigned ${agentName} → ${playwrightMcpName}`, {
          color: COLORS.dim,
          prefix: '   '
        }));
      }
    }

    // Configure MCP servers: shaart-helper (SDK) + playwright-agentN (stdio)
    const mcpServers = {
      'shaart-helper': shaartHelperServer,
    };

    // Add Playwright MCP server if this agent needs browser automation
    if (playwrightMcpName) {
      const userDataDir = `/tmp/${playwrightMcpName}`;

      // Detect if running in Docker via explicit environment variable
      const isDocker = process.env.SHAART_DOCKER === 'true';

      // Build args array - conditionally add --executable-path for Docker
      const mcpArgs = [
        '@playwright/mcp@latest',
        '--isolated',
        '--user-data-dir', userDataDir,
      ];

      // Docker: Use system Chromium; Local: Use Playwright's bundled browsers
      if (isDocker) {
        mcpArgs.push('--executable-path', '/usr/bin/chromium-browser');
        mcpArgs.push('--browser', 'chromium');
      }

      mcpServers[playwrightMcpName] = {
        type: 'stdio',
        command: 'npx',
        args: mcpArgs,
        env: {
          ...process.env,
          PLAYWRIGHT_HEADLESS: 'true', // Ensure headless mode for security and CI compatibility
          ...(isDocker && { PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1' }), // Only skip in Docker
        },
      };
    }

    // Select model based on agent type and user configuration
    const selectedModel = agentName ? selectModelForAgent(agentName, modelConfig) : 'claude-sonnet-4-5-20250929';

    const options = {
      model: selectedModel, // Multi-model strategy: Haiku for analysis, Sonnet for exploitation
      maxTurns: 10_000, // Maximum turns for autonomous work
      cwd: sourceDir, // Set working directory using SDK option
      permissionMode: 'bypassPermissions', // Bypass all permission checks for pentesting
      mcpServers,
    };

    // SDK Options only shown for verbose agents (not clean output)
    if (!useCleanOutput) {
      console.log(chalk.gray(`    SDK Options: maxTurns=${options.maxTurns}, cwd=${sourceDir}, permissions=BYPASS`));
    }

    // Initialize progress indicator now that options is defined
    if (useCleanOutput && !global.SHAART_DISABLE_LOADER) {
      const agentType = description.includes('Pre-recon') ? 'pre-reconnaissance' :
                       description.includes('Recon') ? 'reconnaissance' :
                       description.includes('Report') ? 'report generation' : 'analysis';
      progressIndicator = new ProgressIndicator(`Running ${agentType}...`, { maxTurns: options.maxTurns });
    }

    let result = null;
    let messages = [];
    let apiErrorDetected = false;

    // Start progress indicator for clean output agents
    if (progressIndicator) {
      progressIndicator.start();
    }


    let messageCount = 0;
    let lastHeartbeat = Date.now();
    const HEARTBEAT_INTERVAL = 30000; // 30 seconds

    try {
      for await (const message of query({ prompt: fullPrompt, options })) {
        messageCount++;

        // Periodic heartbeat for long-running agents (only when loader is disabled)
        const now = Date.now();
        if (global.SHAART_DISABLE_LOADER && now - lastHeartbeat > HEARTBEAT_INTERVAL) {
          console.log(systemMessage(`[${Math.floor((now - timer.startTime) / 1000)}s] ${description} running... (Turn ${turnCount})`, { color: COLORS.dim, prefix: '    ' }));
          lastHeartbeat = now;
        }

      if (message.type === "assistant") {
        turnCount++;

        const content = Array.isArray(message.message.content)
          ? message.message.content.map(c => c.text || JSON.stringify(c)).join('\n')
          : message.message.content;

        // Update progress indicator every 5 turns with current activity
        if (progressIndicator && turnCount % 5 === 0) {
          // Extract current activity from assistant message
          const activityMatch = content.match(/(?:analyzing|testing|scanning|checking|reviewing|examining)\s+([^\n.!?]+)/i);
          const activity = activityMatch ? activityMatch[0] : '';

          // Extract token usage from message if available
          const tokens = message.message.usage ? {
            input: message.message.usage.input_tokens || 0,
            output: message.message.usage.output_tokens || 0
          } : null;

          progressIndicator.updateProgress(turnCount, activity, tokens);
        }

        if (statusManager) {
          // Smart status updates for parallel execution
          const toolUse = statusManager.parseToolUse(content);
          statusManager.updateAgentStatus(description, {
            tool_use: toolUse,
            assistant_text: content,
            turnCount
          });
        } else if (useCleanOutput) {
          // Clean output for all agents: filter JSON tool calls but show meaningful text
          const cleanedContent = filterJsonToolCalls(content);
          if (cleanedContent.trim()) {
            // Temporarily stop progress indicator to show output
            if (progressIndicator) {
              progressIndicator.stop();
            }

            if (isParallelExecution) {
              // Compact output for parallel agents with prefixes
              const prefix = getAgentPrefix(description);
              console.log(colorFn(`${prefix} ${cleanedContent}`));
            } else {
              // Full turn output for single agents
              console.log(colorFn(`\n    > Turn ${turnCount} (${description}):`))
              console.log(colorFn(`    ${cleanedContent}`));
            }

            // Restart progress indicator after output
            if (progressIndicator) {
              progressIndicator.start();
            }
          }
        } else {
          // Full streaming output - show complete messages with specialist color
          console.log(colorFn(`\n    > Turn ${turnCount} (${description}):`))
          console.log(colorFn(`    ${content}`));
        }

        // Log to audit system (crash-safe, append-only)
        if (auditSession) {
          await auditSession.logEvent('llm_response', {
            turn: turnCount,
            content,
            timestamp: new Date().toISOString()
          });
        }

        messages.push(content);

        // Check for API error patterns in assistant message content
        if (content && typeof content === 'string') {
          const lowerContent = content.toLowerCase();
          if (lowerContent.includes('session limit reached')) {
            throw new PentestError('Session limit reached', 'billing', false);
          }
          if (lowerContent.includes('api error') || lowerContent.includes('terminated')) {
            apiErrorDetected = true;
            console.log(statusLine('!', `API Error detected in assistant response: ${content.trim()}`, { color: COLORS.error, indent: 4 }));
          }
        }

      } else if (message.type === "system" && message.subtype === "init") {
        // Show useful system info only for verbose agents
        if (!useCleanOutput) {
          console.log(systemMessage(`Model: ${message.model}, Permission: ${message.permissionMode}`, { color: COLORS.dim, prefix: '    ' }));
          if (message.mcp_servers && message.mcp_servers.length > 0) {
            const mcpStatus = message.mcp_servers.map(s => `${s.name}(${s.status})`).join(', ');
            console.log(systemMessage(`MCP: ${mcpStatus}`, { color: COLORS.dim, prefix: '    ' }));
          }
        }

      } else if (message.type === "user") {
        // Skip user messages (these are our own inputs echoed back)
        continue;

      } else if (message.type === "tool_use") {
        console.log(statusLine('>', `Using Tool: ${message.name}`, { color: COLORS.warning, indent: 4 }));
        if (message.input && Object.keys(message.input).length > 0) {
          console.log(chalk.hex(COLORS.dim)(`    Input: ${JSON.stringify(message.input, null, 2)}`));
        }

        // Log tool start event
        if (auditSession) {
          await auditSession.logEvent('tool_start', {
            toolName: message.name,
            parameters: message.input,
            timestamp: new Date().toISOString()
          });
        }
      } else if (message.type === "tool_result") {
        console.log(statusLine('+', 'Tool Result:', { color: COLORS.primary, indent: 4 }));
        if (message.content) {
          // Show tool results but truncate if too long
          const resultStr = typeof message.content === 'string' ? message.content : JSON.stringify(message.content, null, 2);
          if (resultStr.length > 500) {
            console.log(chalk.hex(COLORS.dim)(`    ${resultStr.slice(0, 500)}...\n    [Result truncated - ${resultStr.length} total chars]`));
          } else {
            console.log(chalk.hex(COLORS.dim)(`    ${resultStr}`));
          }
        }

        // Log tool end event
        if (auditSession) {
          await auditSession.logEvent('tool_end', {
            result: message.content,
            timestamp: new Date().toISOString()
          });
        }
      } else if (message.type === "result") {
        result = message.result;

        if (!statusManager) {
          const cost = message.total_cost_usd || 0;
          const durationSec = (message.duration_ms/1000).toFixed(1);

          // Use Nostromo-styled completion message
          console.log(completionMessage(agentType, durationSec, cost, {
            turns: turnCount,
            success: message.subtype !== "error_during_execution",
            model: selectedModel.includes('haiku') ? 'Haiku' :
                   selectedModel.includes('sonnet') ? 'Sonnet' : 'Opus'
          }));

          if (message.subtype === "error_max_turns") {
            console.log(statusLine('!', 'Stopped: Hit maximum turns limit', {
              color: COLORS.warning,
              indent: 4
            }));
          } else if (message.subtype === "error_during_execution") {
            console.log(statusLine('-', 'Stopped: Execution error', {
              color: COLORS.error,
              indent: 4
            }));
          }

          if (message.permission_denials && message.permission_denials.length > 0) {
            console.log(statusLine('!', `${message.permission_denials.length} permission denials`, {
              color: COLORS.warning,
              indent: 4
            }));
          }

          // Show result content (if not using clean output)
          if (!useCleanOutput && result && typeof result === 'string') {
            if (result.length > 1000) {
              console.log(chalk.hex(COLORS.dim)(`    > ${result.slice(0, 1000)}... [${result.length} total chars]`));
            } else {
              console.log(chalk.hex(COLORS.dim)(`    > ${result}`));
            }
          }
        }

        // Track cost for all agents
        const cost = message.total_cost_usd || 0;
        const agentKey = description.toLowerCase().replace(/\s+/g, '-');
        costResults.agents[agentKey] = cost;
        costResults.total += cost;

        // Store cost for return value and partial tracking
        totalCost = cost;
        partialCost = cost;

        // Log model and cost information for user transparency
        const modelName = selectedModel.includes('haiku') ? 'Haiku' :
                         selectedModel.includes('sonnet') ? 'Sonnet' :
                         selectedModel.includes('opus') ? 'Opus' : selectedModel;
        // Cost already shown in completionMessage above

        break;
      } else {
        // Log any other message types we might not be handling
        console.log(chalk.hex(COLORS.dim)(`    > ${message.type}: ${JSON.stringify(message, null, 2)}`));
      }
      }
    } catch (queryError) {
      throw queryError; // Re-throw to outer catch
    }

    const duration = timer.stop();
    const agentKey = description.toLowerCase().replace(/\s+/g, '-');
    timingResults.agents[agentKey] = duration;

    // API error detection is logged but not immediately failed
    // Let the retry logic handle validation first
    if (apiErrorDetected) {
      console.log(statusLine('!', `API Error detected in ${description} - will validate deliverables before failing`, { color: COLORS.warning, indent: 2 }));
    }

    // Finish status line for parallel execution
    if (statusManager) {
      statusManager.clearAgentStatus(description);
      statusManager.finishStatusLine();
    }

    // NOTE: Log writing now handled by AuditSession (crash-safe, append-only)
    // Legacy log writing removed - audit system handles this automatically

    // Show completion messages based on agent type
    if (progressIndicator) {
      // Single agents with progress indicator
      const agentType = description.includes('Pre-recon') ? 'Pre-recon analysis' :
                       description.includes('Recon') ? 'Reconnaissance' :
                       description.includes('Report') ? 'Report generation' : 'Analysis';
      progressIndicator.finish(`${agentType} complete! (${turnCount} turns, ${formatDuration(duration)})`);
    } else if (isParallelExecution) {
      // Compact completion for parallel agents
      const prefix = getAgentPrefix(description);
      console.log(statusLine('+', `Complete (${turnCount} turns, ${formatDuration(duration)})`, { color: COLORS.primary, prefix }));
    } else if (!useCleanOutput) {
      // Verbose completion for remaining agents
      console.log(statusLine('+', `Claude Code completed: ${description} (${turnCount} turns) in ${formatDuration(duration)})`, { color: COLORS.primary, indent: 2 }));
    }

    // Return result with log file path for all agents
    const returnData = {
      result,
      success: true,
      duration,
      turns: turnCount,
      cost: totalCost,
      partialCost, // Include partial cost for crash recovery
      apiErrorDetected
    };
    if (logFilePath) {
      returnData.logFile = logFilePath;
    }
    return returnData;

  } catch (error) {
    const duration = timer.stop();
    const agentKey = description.toLowerCase().replace(/\s+/g, '-');
    timingResults.agents[agentKey] = duration;

    // Clear status for parallel execution before showing error
    if (statusManager) {
      statusManager.clearAgentStatus(description);
      statusManager.finishStatusLine();
    }

    // Log error to audit system
    if (auditSession) {
      await auditSession.logEvent('error', {
        message: error.message,
        errorType: error.constructor.name,
        stack: error.stack,
        duration,
        turns: turnCount,
        timestamp: new Date().toISOString()
      });
    }

    // Show error messages based on agent type
    if (progressIndicator) {
      // Single agents with progress indicator
      progressIndicator.stop();
      const agentType = description.includes('Pre-recon') ? 'Pre-recon analysis' :
                       description.includes('Recon') ? 'Reconnaissance' :
                       description.includes('Report') ? 'Report generation' : 'Analysis';
      console.log(statusLine('-', `${agentType} failed (${formatDuration(duration)})`, { color: COLORS.error }));
    } else if (isParallelExecution) {
      // Compact error for parallel agents
      const prefix = getAgentPrefix(description);
      console.log(statusLine('-', `Failed (${formatDuration(duration)})`, { color: COLORS.error, prefix }));
    } else if (!useCleanOutput) {
      // Verbose error for remaining agents
      console.log(statusLine('-', `Claude Code failed: ${description} (${formatDuration(duration)})`, { color: COLORS.error, indent: 2 }));
    }
    console.log(chalk.red(`    Error Type: ${error.constructor.name}`));
    console.log(chalk.red(`    Message: ${error.message}`));
    console.log(chalk.gray(`    Agent: ${description}`));
    console.log(chalk.gray(`    Working Directory: ${sourceDir}`));
    console.log(chalk.gray(`    Retryable: ${isRetryableError(error) ? 'Yes' : 'No'}`));

    // Log additional context if available
    if (error.code) {
      console.log(chalk.gray(`    Error Code: ${error.code}`));
    }
    if (error.status) {
      console.log(chalk.gray(`    HTTP Status: ${error.status}`));
    }

    // Save detailed error to log file for debugging
    try {
      const errorLog = {
        timestamp: new Date().toISOString(),
        agent: description,
        error: {
          name: error.constructor.name,
          message: error.message,
          code: error.code,
          status: error.status,
          stack: error.stack
        },
        context: {
          sourceDir,
          prompt: fullPrompt.slice(0, 200) + '...',
          retryable: isRetryableError(error)
        },
        duration
      };

      const logPath = path.join(sourceDir, 'error.log');
      await fs.appendFile(logPath, JSON.stringify(errorLog) + '\n');
    } catch (logError) {
      // Ignore logging errors to avoid cascading failures
      console.log(chalk.gray(`    (Failed to write error log: ${logError.message})`));
    }

    return {
      error: error.message,
      errorType: error.constructor.name,
      prompt: fullPrompt.slice(0, 100) + '...',
      success: false,
      duration,
      cost: partialCost, // Include partial cost on error
      retryable: isRetryableError(error)
    };
  }
}

// PREFERRED: Production-ready Claude agent execution with full orchestration
// This is the standard function for all agent execution. Provides:
// - Intelligent retry logic with exponential backoff
// - Output validation to ensure deliverables are created
// - Prompt snapshotting for debugging and reproducibility
// - Git checkpoint/rollback safety for workspace protection
// - Comprehensive error handling and logging
// - Crash-safe audit logging via AuditSession
// - Multi-model strategy for cost optimization
export async function runClaudePromptWithRetry(prompt, sourceDir, allowedTools = 'Read', context = '', description = 'Claude analysis', agentName = null, colorFn = chalk.cyan, sessionMetadata = null, modelConfig = null, config = null) {
  const maxRetries = 3;
  let lastError;
  let retryContext = context; // Preserve context between retries

  console.log(chalk.cyan(`🚀 Starting ${description} with ${maxRetries} max attempts`));

  // Initialize audit session (crash-safe logging)
  let auditSession = null;
  if (sessionMetadata && agentName) {
    auditSession = new AuditSession(sessionMetadata);
    await auditSession.initialize();
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // Create checkpoint before each attempt
    await createGitCheckpoint(sourceDir, description, attempt);

    // Start agent tracking in audit system (saves prompt snapshot automatically)
    if (auditSession) {
      const fullPrompt = retryContext ? `${retryContext}\n\n${prompt}` : prompt;
      await auditSession.startAgent(agentName, fullPrompt, attempt);
    }

    try {
      const result = await runClaudePrompt(prompt, sourceDir, allowedTools, retryContext, description, agentName, colorFn, sessionMetadata, auditSession, attempt, modelConfig, config);

      // Validate output after successful run
      if (result.success) {
        const validationPassed = await validateAgentOutput(result, agentName, sourceDir);

        if (validationPassed) {
          // Check if API error was detected but validation passed
          if (result.apiErrorDetected) {
            console.log(chalk.yellow(`📋 Validation: Ready for exploitation despite API error warnings`));
          }

          // Record successful attempt in audit system
          if (auditSession) {
            await auditSession.endAgent(agentName, {
              attemptNumber: attempt,
              duration_ms: result.duration,
              cost_usd: result.cost || 0,
              success: true,
              checkpoint: await getGitCommitHash(sourceDir)
            });
          }

          // Commit successful changes (will include the snapshot)
          await commitGitSuccess(sourceDir, description);
          console.log(statusLine('+', `${description} completed successfully on attempt ${attempt}/${maxRetries}`, { color: COLORS.primary }));
          return result;
        } else {
          // Agent completed but output validation failed
          console.log(statusLine('!', `${description} completed but output validation failed`, { color: COLORS.warning }));

          // Record failed validation attempt in audit system
          if (auditSession) {
            await auditSession.endAgent(agentName, {
              attemptNumber: attempt,
              duration_ms: result.duration,
              cost_usd: result.partialCost || result.cost || 0,
              success: false,
              error: 'Output validation failed',
              isFinalAttempt: attempt === maxRetries
            });
          }

          // If API error detected AND validation failed, this is a retryable error
          if (result.apiErrorDetected) {
            console.log(statusLine('!', 'API Error detected with validation failure - treating as retryable', { color: COLORS.warning }));
            lastError = new Error('API Error: terminated with validation failure');
          } else {
            lastError = new Error('Output validation failed');
          }

          if (attempt < maxRetries) {
            // Rollback contaminated workspace
            await rollbackGitWorkspace(sourceDir, 'validation failure');
            continue;
          } else {
            // FAIL FAST - Don't continue with broken pipeline
            throw new PentestError(
              `Agent ${description} failed output validation after ${maxRetries} attempts. Required deliverable files were not created.`,
              'validation',
              false,
              { description, sourceDir, attemptsExhausted: maxRetries }
            );
          }
        }
      }

    } catch (error) {
      lastError = error;

      // Record failed attempt in audit system
      if (auditSession) {
        await auditSession.endAgent(agentName, {
          attemptNumber: attempt,
          duration_ms: error.duration || 0,
          cost_usd: error.cost || 0,
          success: false,
          error: error.message,
          isFinalAttempt: attempt === maxRetries
        });
      }

      // Check if error is retryable
      if (!isRetryableError(error)) {
        console.log(statusLine('-', `${description} failed with non-retryable error: ${error.message}`, { color: COLORS.error }));
        await rollbackGitWorkspace(sourceDir, 'non-retryable error cleanup');
        throw error;
      }

      if (attempt < maxRetries) {
        // Rollback for clean retry
        await rollbackGitWorkspace(sourceDir, 'retryable error cleanup');

        const delay = getRetryDelay(error, attempt);
        const delaySeconds = (delay / 1000).toFixed(1);
        console.log(statusLine('!', `${description} failed (attempt ${attempt}/${maxRetries})`, { color: COLORS.warning }));
        console.log(chalk.hex(COLORS.dim)(`    Error: ${error.message}`));
        console.log(chalk.hex(COLORS.dim)(`    Workspace rolled back, retrying in ${delaySeconds}s...`));

        // Preserve any partial results for next retry
        if (error.partialResults) {
          retryContext = `${context}\n\nPrevious partial results: ${JSON.stringify(error.partialResults)}`;
        }

        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        await rollbackGitWorkspace(sourceDir, 'final failure cleanup');
        console.log(statusLine('-', `${description} failed after ${maxRetries} attempts`, { color: COLORS.error }));
        console.log(chalk.hex(COLORS.error)(`    Final error: ${error.message}`));
      }
    }
  }

  throw lastError;
}

// Helper function to get git commit hash
async function getGitCommitHash(sourceDir) {
  try {
    const result = await $`cd ${sourceDir} && git rev-parse HEAD`;
    return result.stdout.trim();
  } catch (error) {
    return null;
  }
}