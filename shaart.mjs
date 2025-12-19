#!/usr/bin/env zx
// Copyright (C) 2025 Keygraph, Inc.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License version 3
// as published by the Free Software Foundation.

import { path, fs } from 'zx';
import chalk from 'chalk';
import dotenv from 'dotenv';

dotenv.config();

// Config and Tools
import { parseConfig, distributeConfig } from './src/config-parser.js';
import { checkToolAvailability, handleMissingTools } from './src/tool-checker.js';

// Session and Checkpoints
import { createSession, updateSession, getSession, AGENTS } from './src/session-manager.js';
import { runPhase, getGitCommitHash } from './src/checkpoint-manager.js';

// Setup and Deliverables
import { setupLocalRepo } from './src/setup/environment.js';

// AI and Prompts
import { runClaudePromptWithRetry } from './src/ai/claude-executor.js';
import { loadPrompt } from './src/prompts/prompt-manager.js';

// Phases
import { executePreReconPhase } from './src/phases/pre-recon.js';
import { assembleFinalReport } from './src/phases/reporting.js';

// Utils
import { timingResults, costResults, displayTimingSummary, Timer } from './src/utils/metrics.js';
import { formatDuration, generateAuditPath } from './src/audit/utils.js';
import { estimateTotalCost } from './src/cost-estimator.js';

// CLI
import { handleDeveloperCommand } from './src/cli/command-handler.js';
import { showHelp, displaySplashScreen } from './src/cli/ui.js';
import { phaseHeader, systemMessage, statusLine, separator, COLORS } from './src/cli/terminal-ui.js';
import { validateWebUrl, validateRepoPath } from './src/cli/input-validator.js';

// Error Handling
import { PentestError, logError } from './src/error-handling.js';

// Session Manager Functions
import {
  calculateVulnerabilityAnalysisSummary,
  calculateExploitationSummary,
  getNextAgent
} from './src/session-manager.js';

// Configure zx to disable timeouts (let tools run as long as needed)
$.timeout = 0;

// Setup graceful cleanup on process signals
process.on('SIGINT', async () => {
  console.log(statusLine('!', 'Received SIGINT, cleaning up...', { color: COLORS.warning }));

  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log(statusLine('!', 'Received SIGTERM, cleaning up...', { color: COLORS.warning }));

  process.exit(0);
});

// Main orchestration function
async function main(webUrl, repoPath, configPath = null, pipelineTestingMode = false, disableLoader = false) {
  // Set global flag for loader control
  global.SHAART_DISABLE_LOADER = disableLoader;

  const totalTimer = new Timer('total-execution');
  timingResults.total = totalTimer;

  // Display splash screen
  await displaySplashScreen();

  console.log('');
  console.log(systemMessage('AWAITING TARGET CONFIGURATION...', { color: COLORS.tertiary }));
  console.log(systemMessage(`Target: ${webUrl}`, { color: COLORS.white }));
  console.log(systemMessage(`Source: ${repoPath}`, { color: COLORS.white }));
  if (configPath) {
    console.log(systemMessage(`Config: ${configPath}`, { color: COLORS.white }));
  }
  console.log('');

  // Parse configuration if provided
  let config = null;
  let distributedConfig = null;
  if (configPath) {
    try {
      // Resolve config path - check configs folder if relative path
      let resolvedConfigPath = configPath;
      if (!path.isAbsolute(configPath)) {
        const configsDir = path.join(process.cwd(), 'configs');
        const configInConfigsDir = path.join(configsDir, configPath);
        // Check if file exists in configs directory, otherwise use original path
        if (await fs.pathExists(configInConfigsDir)) {
          resolvedConfigPath = configInConfigsDir;
        }
      }

      config = await parseConfig(resolvedConfigPath);
      distributedConfig = distributeConfig(config);
      console.log(statusLine('+', 'Configuration loaded successfully', {
        color: COLORS.primary,
        indent: 0
      }));
    } catch (error) {
      await logError(error, `Configuration loading from ${configPath}`);
      throw error; // Let the main error boundary handle it
    }
  }

  // Check tool availability
  const toolAvailability = await checkToolAvailability();
  handleMissingTools(toolAvailability);

  // Setup local repository
  console.log(systemMessage('Setting up local repository...', { color: COLORS.dim }));
  let sourceDir;
  try {
    sourceDir = await setupLocalRepo(repoPath);
    const variables = { webUrl, repoPath, sourceDir };
    console.log(statusLine('+', 'Local repository setup successfully', {
      color: COLORS.primary,
      indent: 0
    }));
  } catch (error) {
    console.log(statusLine('-', `Failed to setup local repository: ${error.message}`, { color: COLORS.error }));
    console.log(systemMessage('This could be due to:', { color: COLORS.dim, prefix: '' }));
    console.log(systemMessage('  - Insufficient permissions', { color: COLORS.dim, prefix: '' }));
    console.log(systemMessage('  - Repository path not accessible', { color: COLORS.dim, prefix: '' }));
    console.log(systemMessage('  - Git initialization issues', { color: COLORS.dim, prefix: '' }));
    console.log(systemMessage('  - Insufficient disk space', { color: COLORS.dim, prefix: '' }));
    process.exit(1);
  }

  const variables = { webUrl, repoPath, sourceDir };

  // Create session for tracking (in normal mode)
  const session = await createSession(webUrl, repoPath, configPath, sourceDir);
  console.log(statusLine('>', `Session created: ${session.id.substring(0, 8)}...`, { color: COLORS.primary }));

  // If setup-only mode, exit after session creation
  if (process.argv.includes('--setup-only')) {
    console.log(statusLine('+', 'Setup complete! Local repository setup and session created.', { color: COLORS.primary }));
    console.log(systemMessage('Use developer commands to run individual agents:', { color: COLORS.dim, prefix: '' }));
    console.log(systemMessage('  ./shaart.mjs --run-agent pre-recon', { color: COLORS.dim, prefix: '' }));
    console.log(systemMessage('  ./shaart.mjs --status', { color: COLORS.dim, prefix: '' }));
    process.exit(0);
  }

  // Helper function to update session progress
  const updateSessionProgress = async (agentName, commitHash = null) => {
    try {
      const updates = {
        completedAgents: [...new Set([...session.completedAgents, agentName])],
        failedAgents: session.failedAgents.filter(name => name !== agentName), // Remove from failed if it was there
        status: 'in-progress'
      };

      if (commitHash) {
        updates.checkpoints = { ...session.checkpoints, [agentName]: commitHash };
      }

      await updateSession(session.id, updates);
      // Update local session object for subsequent updates
      Object.assign(session, updates);
      console.log(systemMessage(`Session updated: ${agentName} completed`, {
        color: COLORS.dim,
        prefix: '   '
      }));
    } catch (error) {
      console.log(statusLine('!', `Failed to update session: ${error.message}`, {
        color: COLORS.warning,
        indent: 4
      }));
    }
  };

  // Create outputs directory in source directory
  try {
    const outputsDir = path.join(sourceDir, 'outputs');
    await fs.ensureDir(outputsDir);
    await fs.ensureDir(path.join(outputsDir, 'schemas'));
    await fs.ensureDir(path.join(outputsDir, 'scans'));
  } catch (error) {
    throw new PentestError(
      `Failed to create output directories: ${error.message}`,
      'filesystem',
      false,
      { sourceDir, originalError: error.message }
    );
  }

  // Check if we should continue from where session left off
  const nextAgent = getNextAgent(session);
  if (!nextAgent) {
    console.log(statusLine('+', 'All agents completed! Session is finished.', { color: COLORS.primary }));
    await displayTimingSummary(timingResults, costResults, session.completedAgents);
    process.exit(0);
  }

  console.log(statusLine('>', `Continuing from ${nextAgent.displayName} (${session.completedAgents.length}/${Object.keys(AGENTS).length} agents completed)`, { color: COLORS.primary }));

  // Determine which phase to start from based on next agent
  const startPhase = nextAgent.name === 'pre-recon' ? 1
                   : nextAgent.name === 'recon' ? 2
                   : ['injection-vuln', 'xss-vuln', 'auth-vuln', 'ssrf-vuln', 'authz-vuln'].includes(nextAgent.name) ? 3
                   : ['injection-exploit', 'xss-exploit', 'auth-exploit', 'ssrf-exploit', 'authz-exploit'].includes(nextAgent.name) ? 4
                   : nextAgent.name === 'report' ? 5 : 1;

  // PHASE 1: PRE-RECONNAISSANCE
  if (startPhase <= 1) {
    const { duration: preReconDuration } = await executePreReconPhase(
      webUrl,
      sourceDir,
      variables,
      distributedConfig,
      toolAvailability,
      pipelineTestingMode,
      session.id  // Pass session ID for logging
    );
    timingResults.phases['pre-recon'] = preReconDuration;
    await updateSessionProgress('pre-recon');
  }

  // PHASE 2: RECONNAISSANCE
  if (startPhase <= 2) {
    console.log(phaseHeader(2, 'RECONNAISSANCE', { emoji: '🔎' }));
    console.log(systemMessage('Analyzing initial findings...', { color: COLORS.dim }));
    const reconTimer = new Timer('phase-2-recon');
    const recon = await runClaudePromptWithRetry(
      await loadPrompt('recon', variables, distributedConfig, pipelineTestingMode),
      sourceDir,
      '*',
      '',
      AGENTS['recon'].displayName,
      'recon',  // Agent name for snapshot creation
      chalk.cyan,
      { id: session.id, webUrl },  // Session metadata for audit logging (STANDARD: use 'id' field)
      distributedConfig?.models,  // Model configuration for cost optimization
      distributedConfig  // Full config for exploit memory
    );
    const reconDuration = reconTimer.stop();
    timingResults.phases['recon'] = reconDuration;

    console.log(statusLine('✅', `Reconnaissance complete in ${formatDuration(reconDuration)}`, {
      color: COLORS.primary
    }));
    await updateSessionProgress('recon');
  }

  // PHASE 3: VULNERABILITY ANALYSIS
  if (startPhase <= 3) {
    const vulnTimer = new Timer('phase-3-vulnerability-analysis');
    console.log(phaseHeader(3, 'VULNERABILITY ANALYSIS', { emoji: '🚨' }));

    await runPhase('vulnerability-analysis', session, pipelineTestingMode, runClaudePromptWithRetry, loadPrompt, distributedConfig?.models);

    // Display vulnerability analysis summary
    const currentSession = await getSession(session.id);
    const vulnSummary = calculateVulnerabilityAnalysisSummary(currentSession);
    console.log(systemMessage(`Vulnerability Analysis Summary: ${vulnSummary.totalAnalyses} analyses, ${vulnSummary.totalVulnerabilities} vulnerabilities found, ${vulnSummary.exploitationCandidates} ready for exploitation`, {
      color: COLORS.primary
    }));

    const vulnDuration = vulnTimer.stop();
    timingResults.phases['vulnerability-analysis'] = vulnDuration;

    console.log(statusLine('+', `Vulnerability analysis phase complete in ${formatDuration(vulnDuration)}`, {
      color: COLORS.primary
    }));
  }

  // PHASE 4: EXPLOITATION
  if (startPhase <= 4) {
    const exploitTimer = new Timer('phase-4-exploitation');
    console.log(phaseHeader(4, 'EXPLOITATION', { emoji: '💥' }));

    // Get fresh session data to ensure we have latest vulnerability analysis results
    const freshSession = await getSession(session.id);
    await runPhase('exploitation', freshSession, pipelineTestingMode, runClaudePromptWithRetry, loadPrompt, distributedConfig?.models);

    // Display exploitation summary
    const finalSession = await getSession(session.id);
    const exploitSummary = calculateExploitationSummary(finalSession);
    if (exploitSummary.eligibleExploits > 0) {
      console.log(systemMessage(`Exploitation Summary: ${exploitSummary.totalAttempts}/${exploitSummary.eligibleExploits} attempted, ${exploitSummary.skippedExploits} skipped (no vulnerabilities)`, {
        color: COLORS.primary
      }));
    } else {
      console.log(systemMessage('Exploitation Summary: No exploitation attempts (no vulnerabilities found)', {
        color: COLORS.dim
      }));
    }

    const exploitDuration = exploitTimer.stop();
    timingResults.phases['exploitation'] = exploitDuration;

    console.log(statusLine('+', `Exploitation phase complete in ${formatDuration(exploitDuration)}`, {
      color: COLORS.primary
    }));
  }

  // PHASE 5: REPORTING
  if (startPhase <= 5) {
    console.log(phaseHeader(5, 'REPORTING', { emoji: '📊' }));
    console.log(systemMessage('Generating executive summary and assembling final report...', {
      color: COLORS.dim
    }));
    const reportTimer = new Timer('phase-5-reporting');

    // First, assemble all deliverables into a single concatenated report
    console.log(systemMessage('Assembling deliverables from specialist agents...', {
      color: COLORS.primary
    }));

    try {
      await assembleFinalReport(sourceDir);
    } catch (error) {
      console.log(statusLine('-', `Error assembling final report: ${error.message}`, { color: COLORS.error }));
    }

    // Then run reporter agent to create executive summary and clean up hallucinations
    console.log(systemMessage('Generating executive summary and cleaning up report...', {
      color: COLORS.primary
    }));
    const execSummary = await runClaudePromptWithRetry(
      await loadPrompt('report-executive', variables, distributedConfig, pipelineTestingMode),
      sourceDir,
      '*',
      '',
      'Executive Summary and Report Cleanup',
      'report',  // Agent name for snapshot creation
      chalk.cyan,
      { id: session.id, webUrl },  // Session metadata for audit logging (STANDARD: use 'id' field)
      distributedConfig?.models,  // Model configuration for cost optimization
      distributedConfig  // Full config for exploit memory
    );

    const reportDuration = reportTimer.stop();
    timingResults.phases['reporting'] = reportDuration;

    console.log(statusLine('+', `Final report generated in ${formatDuration(reportDuration)}`, {
      color: COLORS.primary
    }));

    // Get the commit hash after successful report generation for checkpoint
    try {
      const reportCommitHash = await getGitCommitHash(sourceDir);
      await updateSessionProgress('report', reportCommitHash);
      console.log(systemMessage(`Report checkpoint saved: ${reportCommitHash.substring(0, 8)}`, {
        color: COLORS.dim,
        prefix: '   '
      }));
    } catch (error) {
      console.log(statusLine('!', `Failed to save report checkpoint: ${error.message}`, {
        color: COLORS.warning,
        indent: 4
      }));
      await updateSessionProgress('report'); // Fallback without checkpoint
    }
  }

  // Calculate final timing and cost data
  const totalDuration = timingResults.total.stop();
  const timingBreakdown = {
    total: totalDuration,
    phases: { ...timingResults.phases },
    agents: { ...timingResults.agents },
    commands: { ...timingResults.commands }
  };

  // Use accumulated cost data
  const costBreakdown = {
    total: costResults.total,
    agents: { ...costResults.agents }
  };

  // Mark session as completed with timing and cost data
  await updateSession(session.id, {
    status: 'completed',
    timingBreakdown,
    costBreakdown
  });

  // Display comprehensive timing summary
  displayTimingSummary();

  console.log('');
  console.log(statusLine('+', 'PENETRATION TESTING COMPLETE!', { color: COLORS.primary }));
  console.log(separator(60, 'light'));

  // Calculate audit logs path
  const auditLogsPath = generateAuditPath(session);

  // Return final report path and audit logs path for clickable output
  return {
    reportPath: path.join(sourceDir, 'deliverables', 'comprehensive_security_assessment_report.md'),
    auditLogsPath
  };
}

// Entry point - handle both direct node execution and shebang execution
let args = process.argv.slice(2);
// If first arg is the script name (from shebang), remove it
if (args[0] && args[0].includes('shaart.mjs')) {
  args = args.slice(1);
}

// Parse flags and arguments
let configPath = null;
let pipelineTestingMode = false;
let disableLoader = false;
let estimateCost = false;
const nonFlagArgs = [];
let developerCommand = null;
const developerCommands = ['--run-phase', '--run-all', '--rollback-to', '--rerun', '--status', '--list-agents', '--cleanup'];

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--config') {
    if (i + 1 < args.length) {
      configPath = args[i + 1];
      i++; // Skip the next argument
    } else {
      console.log(statusLine('-', '--config flag requires a file path', { color: COLORS.error }));
      process.exit(1);
    }
  } else if (args[i] === '--pipeline-testing') {
    pipelineTestingMode = true;
  } else if (args[i] === '--disable-loader') {
    disableLoader = true;
  } else if (args[i] === '--estimate-cost') {
    estimateCost = true;
  } else if (developerCommands.includes(args[i])) {
    developerCommand = args[i];
    // Collect remaining args for the developer command
    const remainingArgs = args.slice(i + 1).filter(arg => !arg.startsWith('--') || arg === '--pipeline-testing' || arg === '--disable-loader');

    // Check for --pipeline-testing in remaining args
    if (remainingArgs.includes('--pipeline-testing')) {
      pipelineTestingMode = true;
    }

    // Check for --disable-loader in remaining args
    if (remainingArgs.includes('--disable-loader')) {
      disableLoader = true;
    }

    // Add non-flag args (excluding --pipeline-testing and --disable-loader)
    nonFlagArgs.push(...remainingArgs.filter(arg => arg !== '--pipeline-testing' && arg !== '--disable-loader'));
    break; // Stop parsing after developer command
  } else if (!args[i].startsWith('-')) {
    nonFlagArgs.push(args[i]);
  }
}

// Handle help flag
if (args.includes('--help') || args.includes('-h') || args.includes('help')) {
  showHelp();
  process.exit(0);
}

// Handle developer commands
if (developerCommand) {
  // Set global flag for loader control in developer mode too
  global.SHAART_DISABLE_LOADER = disableLoader;

  await handleDeveloperCommand(developerCommand, nonFlagArgs, pipelineTestingMode, runClaudePromptWithRetry, loadPrompt);

  process.exit(0);
}

// Handle no arguments - show help
if (nonFlagArgs.length === 0) {
  console.log(statusLine('-', 'Error: No arguments provided', { color: COLORS.error }));
  console.log('');
  showHelp();
  process.exit(1);
}

// Handle insufficient arguments
if (nonFlagArgs.length < 2) {
  console.log(statusLine('-', 'Both WEB_URL and REPO_PATH are required', { color: COLORS.error }));
  console.log(systemMessage('Usage: ./shaart.mjs <WEB_URL> <REPO_PATH> [--config config.yaml]', { color: COLORS.dim, prefix: '' }));
  console.log(systemMessage('Help:  ./shaart.mjs --help', { color: COLORS.dim, prefix: '' }));
  process.exit(1);
}

const [webUrl, repoPath] = nonFlagArgs;

// Validate web URL
const webUrlValidation = validateWebUrl(webUrl);
if (!webUrlValidation.valid) {
  console.log(statusLine('-', `Invalid web URL: ${webUrlValidation.error}`, { color: COLORS.error }));
  console.log(systemMessage('Expected format: https://example.com', { color: COLORS.dim, prefix: '' }));
  process.exit(1);
}

// Validate repository path
const repoPathValidation = await validateRepoPath(repoPath);
if (!repoPathValidation.valid) {
  console.log(statusLine('-', `Invalid repository path: ${repoPathValidation.error}`, { color: COLORS.error }));
  console.log(systemMessage('Expected: Accessible local directory path', { color: COLORS.dim, prefix: '' }));
  process.exit(1);
}

// Success - show validated inputs
console.log(statusLine('+', 'Input validation passed:', { color: COLORS.primary }));
console.log(systemMessage(`   Target Web URL: ${webUrl}`, { color: COLORS.dim, prefix: '' }));
console.log(systemMessage(`   Target Repository: ${repoPathValidation.path}`, { color: COLORS.dim, prefix: '' }));
console.log(systemMessage(`   Config Path: ${configPath}`, { color: COLORS.dim, prefix: '' }));
console.log('');
if (pipelineTestingMode) {
  console.log(statusLine('>', 'PIPELINE TESTING MODE ENABLED - Using minimal test prompts for fast pipeline validation', { color: COLORS.warning }));
  console.log('');
}
if (disableLoader) {
  console.log(statusLine('>', 'LOADER DISABLED - Progress indicator will not be shown', { color: COLORS.warning }));
  console.log('');
}

// Handle cost estimation mode
if (estimateCost) {
  try {
    await estimateTotalCost(webUrl, repoPathValidation.path, configPath);
    process.exit(0);
  } catch (error) {
    console.log('');
    console.log(statusLine('-', 'COST ESTIMATION FAILED', { color: COLORS.error }));
    console.log(systemMessage(`   Error: ${error?.message || error?.toString() || 'Unknown error'}`, { color: COLORS.error, prefix: '' }));
    if (process.env.DEBUG) {
      console.log(systemMessage(`   Stack: ${error?.stack || 'No stack trace available'}`, { color: COLORS.dim, prefix: '' }));
    }
    process.exit(1);
  }
}

try {
  const result = await main(webUrl, repoPathValidation.path, configPath, pipelineTestingMode, disableLoader);
  console.log('');
  console.log(statusLine('+', 'FINAL REPORT AVAILABLE:', { color: COLORS.primary }));
  console.log(systemMessage(result.reportPath, { color: COLORS.tertiary, prefix: '' }));
  console.log('');
  console.log(statusLine('+', 'AUDIT LOGS AVAILABLE:', { color: COLORS.primary }));
  console.log(systemMessage(result.auditLogsPath, { color: COLORS.tertiary, prefix: '' }));

} catch (error) {
  // Enhanced error boundary with proper logging
  if (error instanceof PentestError) {
    await logError(error, 'Main execution failed');
    console.log('');
    console.log(statusLine('-', 'PENTEST EXECUTION FAILED', { color: COLORS.error }));
    console.log(systemMessage(`   Type: ${error.type}`, { color: COLORS.error, prefix: '' }));
    console.log(systemMessage(`   Retryable: ${error.retryable ? 'Yes' : 'No'}`, { color: COLORS.error, prefix: '' }));

    if (error.retryable) {
      console.log(systemMessage('   Consider running the command again or checking network connectivity.', { color: COLORS.warning, prefix: '' }));
    }
  } else {
    console.log('');
    console.log(statusLine('-', 'UNEXPECTED ERROR OCCURRED', { color: COLORS.error }));
    console.log(systemMessage(`   Error: ${error?.message || error?.toString() || 'Unknown error'}`, { color: COLORS.error, prefix: '' }));

    if (process.env.DEBUG) {
      console.log(systemMessage(`   Stack: ${error?.stack || 'No stack trace available'}`, { color: COLORS.dim, prefix: '' }));
    }
  }

  process.exit(1);
}