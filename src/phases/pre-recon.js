// Copyright (C) 2025 Keygraph, Inc.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License version 3
// as published by the Free Software Foundation.

import { $, fs, path } from 'zx';
import chalk from 'chalk';
import { Timer, timingResults } from '../utils/metrics.js';
import { formatDuration } from '../audit/utils.js';
import { handleToolError, PentestError } from '../error-handling.js';
import { AGENTS } from '../session-manager.js';
import { runClaudePromptWithRetry } from '../ai/claude-executor.js';
import { loadPrompt } from '../prompts/prompt-manager.js';
import { systemMessage, statusLine, toolResult, phaseHeader, COLORS } from '../cli/terminal-ui.js';

// Pure function: Run terminal scanning tools
async function runTerminalScan(tool, target, sourceDir = null) {
  const timer = new Timer(`command-${tool}`);
  try {
    let command, result;
    switch (tool) {
      case 'nmap':
        console.log(systemMessage(`Running ${tool} scan...`, { color: COLORS.dim, prefix: '   ' }));
        const nmapHostname = new URL(target).hostname;
        result = await $({ silent: true, stdio: ['ignore', 'pipe', 'ignore'] })`nmap -sV -sC ${nmapHostname}`;
        const duration = timer.stop();
        timingResults.commands[tool] = duration;
        console.log(toolResult(tool, true, duration));
        return { tool: 'nmap', output: result.stdout, status: 'success', duration };
      case 'subfinder':
        console.log(systemMessage(`Running ${tool} scan...`, { color: COLORS.dim, prefix: '   ' }));
        const hostname = new URL(target).hostname;
        result = await $({ silent: true, stdio: ['ignore', 'pipe', 'ignore'] })`subfinder -d ${hostname}`;
        const subfinderDuration = timer.stop();
        timingResults.commands[tool] = subfinderDuration;
        console.log(toolResult(tool, true, subfinderDuration));
        return { tool: 'subfinder', output: result.stdout, status: 'success', duration: subfinderDuration };
      case 'whatweb':
        console.log(systemMessage(`Running ${tool} scan...`, { color: COLORS.dim, prefix: '   ' }));
        command = `whatweb --open-timeout 30 --read-timeout 60 ${target}`;
        console.log(systemMessage(`Command: ${command}`, { color: COLORS.dim, prefix: '   ' }));
        result = await $({ silent: true, stdio: ['ignore', 'pipe', 'ignore'] })`whatweb --open-timeout 30 --read-timeout 60 ${target}`;
        const whatwebDuration = timer.stop();
        timingResults.commands[tool] = whatwebDuration;
        console.log(toolResult(tool, true, whatwebDuration));
        return { tool: 'whatweb', output: result.stdout, status: 'success', duration: whatwebDuration };
      case 'schemathesis':
        // Only run if API schemas found
        const schemasDir = path.join(sourceDir || '.', 'outputs', 'schemas');
        if (await fs.pathExists(schemasDir)) {
          const schemaFiles = await fs.readdir(schemasDir);
          const apiSchemas = schemaFiles.filter(f => f.endsWith('.json') || f.endsWith('.yml') || f.endsWith('.yaml'));
          if (apiSchemas.length > 0) {
            console.log(systemMessage(`Running ${tool} scan...`, { color: COLORS.dim, prefix: '   ' }));
            let allResults = [];

            // Run schemathesis on each schema file
            for (const schemaFile of apiSchemas) {
              const schemaPath = path.join(schemasDir, schemaFile);
              try {
                result = await $({ silent: true, stdio: ['ignore', 'pipe', 'ignore'] })`schemathesis run ${schemaPath} -u ${target} --max-failures=5`;
                allResults.push(`Schema: ${schemaFile}\n${result.stdout}`);
              } catch (schemaError) {
                allResults.push(`Schema: ${schemaFile}\nError: ${schemaError.stdout || schemaError.message}`);
              }
            }

            const schemaDuration = timer.stop();
            timingResults.commands[tool] = schemaDuration;
            console.log(toolResult(tool, true, schemaDuration));
            return { tool: 'schemathesis', output: allResults.join('\n\n'), status: 'success', duration: schemaDuration };
          } else {
            console.log(systemMessage(`${tool} - no API schemas found`, {
              color: COLORS.dim,
              prefix: '   '
            }));
            return { tool: 'schemathesis', output: 'No API schemas found', status: 'skipped', duration: timer.stop() };
          }
        } else {
          console.log(systemMessage(`${tool} - schemas directory not found`, {
            color: COLORS.dim,
            prefix: '   '
          }));
          return { tool: 'schemathesis', output: 'Schemas directory not found', status: 'skipped', duration: timer.stop() };
        }
      default:
        throw new Error(`Unknown tool: ${tool}`);
    }
  } catch (error) {
    const duration = timer.stop();
    timingResults.commands[tool] = duration;
    console.log(toolResult(tool, false, duration));
    return handleToolError(tool, error);
  }
}

// Wave 1: Initial footprinting + authentication
async function runPreReconWave1(webUrl, sourceDir, variables, config, pipelineTestingMode = false, sessionId = null) {
  console.log(systemMessage('Launching Wave 1 operations in parallel...', {
    color: COLORS.dim,
    prefix: '   '
  }));

  const operations = [];

  // Skip external commands in pipeline testing mode
  if (pipelineTestingMode) {
    console.log(systemMessage('Skipping external tools (pipeline testing mode)', {
      color: COLORS.dim,
      prefix: '   '
    }));
    operations.push(
      runClaudePromptWithRetry(
        await loadPrompt('pre-recon-code', variables, null, pipelineTestingMode),
        sourceDir,
        '*',
        '',
        AGENTS['pre-recon'].displayName,
        'pre-recon',  // Agent name for snapshot creation
        chalk.cyan,
        { id: sessionId, webUrl },  // Session metadata for audit logging (STANDARD: use 'id' field)
        config?.models,  // Model configuration for cost optimization
        config  // Full config for exploit memory
      )
    );
    const [codeAnalysis] = await Promise.all(operations);
    return {
      nmap: 'Skipped (pipeline testing mode)',
      subfinder: 'Skipped (pipeline testing mode)',
      whatweb: 'Skipped (pipeline testing mode)',
      codeAnalysis
    };
  } else {
    operations.push(
      runTerminalScan('nmap', webUrl),
      runTerminalScan('subfinder', webUrl),
      runTerminalScan('whatweb', webUrl),
      runClaudePromptWithRetry(
        await loadPrompt('pre-recon-code', variables, null, pipelineTestingMode),
        sourceDir,
        '*',
        '',
        AGENTS['pre-recon'].displayName,
        'pre-recon',  // Agent name for snapshot creation
        chalk.cyan,
        { id: sessionId, webUrl },  // Session metadata for audit logging (STANDARD: use 'id' field)
        config?.models,  // Model configuration for cost optimization
        config  // Full config for exploit memory
      )
    );
  }

  // Check if authentication config is provided for login instructions injection
  console.log(systemMessage(
    `Config check: ${config ? 'present' : 'missing'}, Auth: ${config?.authentication ? 'present' : 'missing'}`,
    { color: COLORS.dim, prefix: '   ' }
  ));

  const [nmap, subfinder, whatweb, codeAnalysis] = await Promise.all(operations);

  return { nmap, subfinder, whatweb, codeAnalysis };
}

// Wave 2: Additional scanning
async function runPreReconWave2(webUrl, sourceDir, toolAvailability, pipelineTestingMode = false) {
  console.log(systemMessage('Running Wave 2 additional scans in parallel...', {
    color: COLORS.dim,
    prefix: '   '
  }));

  // Skip external commands in pipeline testing mode
  if (pipelineTestingMode) {
    console.log(systemMessage('Skipping external tools (pipeline testing mode)', {
      color: COLORS.dim,
      prefix: '   '
    }));
    return {
      schemathesis: { tool: 'schemathesis', output: 'Skipped (pipeline testing mode)', status: 'skipped', duration: 0 }
    };
  }

  const operations = [];

  // Parallel additional scans (only run if tools are available)

  if (toolAvailability.schemathesis) {
    operations.push(runTerminalScan('schemathesis', webUrl, sourceDir));
  }

  // If no tools are available, return early
  if (operations.length === 0) {
    console.log(systemMessage('No Wave 2 tools available', {
      color: COLORS.dim,
      prefix: '   '
    }));
    return {
      schemathesis: { tool: 'schemathesis', output: 'Tool not available', status: 'skipped', duration: 0 }
    };
  }

  // Run all operations in parallel
  const results = await Promise.all(operations);

  // Map results back to named properties
  const response = {};
  let resultIndex = 0;

  if (toolAvailability.schemathesis) {
    response.schemathesis = results[resultIndex++];
  } else {
    console.log(systemMessage('schemathesis - tool not available', {
      color: COLORS.dim,
      prefix: '   '
    }));
    response.schemathesis = { tool: 'schemathesis', output: 'Tool not available', status: 'skipped', duration: 0 };
  }

  return response;
}

// Pure function: Stitch together pre-recon outputs and save to file
async function stitchPreReconOutputs(outputs, sourceDir) {
  const [nmap, subfinder, whatweb, codeAnalysis, ...additionalScans] = outputs;

  // Try to read the code analysis deliverable file
  let codeAnalysisContent = 'No analysis available';
  try {
    const codeAnalysisPath = path.join(sourceDir, 'deliverables', 'code_analysis_deliverable.md');
    codeAnalysisContent = await fs.readFile(codeAnalysisPath, 'utf8');
  } catch (error) {
    console.log(statusLine('!', `Could not read code analysis deliverable: ${error.message}`, {
      color: COLORS.warning
    }));
    // Fallback message if file doesn't exist
    codeAnalysisContent = 'Analysis located in deliverables/code_analysis_deliverable.md';
  }


  // Build additional scans section
  let additionalSection = '';
  if (additionalScans && additionalScans.length > 0) {
    additionalSection = '\n## Authenticated Scans\n';
    additionalScans.forEach(scan => {
      if (scan && scan.tool) {
        additionalSection += `
### ${scan.tool.toUpperCase()}
Status: ${scan.status}
${scan.output}
`;
      }
    });
  }

  const report = `
# Pre-Reconnaissance Report

## Network Scanning (nmap)
Status: ${nmap?.status || 'Skipped'}
${nmap?.output || nmap || 'No output'}

## Subdomain Discovery (subfinder)
Status: ${subfinder?.status || 'Skipped'}
${subfinder?.output || subfinder || 'No output'}

## Technology Detection (whatweb)
Status: ${whatweb?.status || 'Skipped'}
${whatweb?.output || whatweb || 'No output'}

## Code Analysis
${codeAnalysisContent}
${additionalSection}
---
Report generated at: ${new Date().toISOString()}
  `.trim();

  // Ensure deliverables directory exists in the cloned repo
  try {
    const deliverablePath = path.join(sourceDir, 'deliverables', 'pre_recon_deliverable.md');
    await fs.ensureDir(path.join(sourceDir, 'deliverables'));

    // Write to file in the cloned repository
    await fs.writeFile(deliverablePath, report);
  } catch (error) {
    throw new PentestError(
      `Failed to write pre-recon report: ${error.message}`,
      'filesystem',
      false,
      { sourceDir, originalError: error.message }
    );
  }

  return report;
}

// Main pre-recon phase execution function
export async function executePreReconPhase(webUrl, sourceDir, variables, config, toolAvailability, pipelineTestingMode, sessionId = null) {
  console.log(phaseHeader(1, 'PRE-RECONNAISSANCE'));
  const timer = new Timer('phase-1-pre-recon');

  console.log(systemMessage('Wave 1: Initial footprinting...', { color: COLORS.white }));
  const wave1Results = await runPreReconWave1(webUrl, sourceDir, variables, config, pipelineTestingMode, sessionId);
  console.log(statusLine('+', 'Wave 1 operations completed', {
    color: COLORS.primary,
    indent: 2
  }));

  console.log(systemMessage('Wave 2: Additional scanning...', { color: COLORS.white }));
  const wave2Results = await runPreReconWave2(webUrl, sourceDir, toolAvailability, pipelineTestingMode);
  console.log(statusLine('+', 'Wave 2 operations completed', {
    color: COLORS.primary,
    indent: 2
  }));

  console.log(systemMessage('Stitching pre-recon outputs...', { color: COLORS.dim }));
  // Combine wave 1 and wave 2 results for stitching
  const allResults = [
    wave1Results.nmap,
    wave1Results.subfinder,
    wave1Results.whatweb,
    wave1Results.codeAnalysis,
    ...(wave2Results.schemathesis ? [wave2Results.schemathesis] : [])
  ];
  const preReconReport = await stitchPreReconOutputs(allResults, sourceDir);
  const duration = timer.stop();

  console.log(statusLine('+', `Pre-reconnaissance complete in ${formatDuration(duration)}`, {
    color: COLORS.primary
  }));
  console.log(statusLine('+', `Saved to ${sourceDir}/deliverables/pre_recon_deliverable.md`, {
    color: COLORS.primary
  }));

  return { duration, report: preReconReport };
}