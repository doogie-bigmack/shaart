// Copyright (C) 2025 Keygraph, Inc.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License version 3
// as published by the Free Software Foundation.

import { fs, path } from 'zx';
import chalk from 'chalk';
import { loadPrompt } from './prompts/prompt-manager.js';
import { AGENTS } from './session-manager.js';

// Claude Sonnet 4.5 pricing (as of 2025-01)
// Source: https://www.anthropic.com/api#pricing
const PRICING = {
  model: 'claude-sonnet-4-5-20250929',
  inputTokensPerMillion: 3.00,  // $3.00 per million input tokens
  outputTokensPerMillion: 15.00  // $15.00 per million output tokens
};

// Token estimation constants
const CHARS_PER_TOKEN = 4; // Rough approximation for English text
const AVERAGE_OUTPUT_TOKENS = 2000; // Average output per agent (conservative estimate)

/**
 * Estimate token count from text
 * Uses character-based approximation (4 chars ≈ 1 token)
 */
function estimateTokens(text) {
  if (!text || typeof text !== 'string') return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Calculate cost from token counts
 */
function calculateCost(inputTokens, outputTokens) {
  const inputCost = (inputTokens / 1_000_000) * PRICING.inputTokensPerMillion;
  const outputCost = (outputTokens / 1_000_000) * PRICING.outputTokensPerMillion;
  return inputCost + outputCost;
}

/**
 * Estimate repository context size
 */
async function estimateRepoSize(repoPath) {
  try {
    // Check if path exists
    if (!await fs.pathExists(repoPath)) {
      return {
        files: 0,
        totalChars: 0,
        totalTokens: 0,
        estimatedContextTokens: 0
      };
    }

    // Common file extensions to analyze
    const extensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.go', '.rb', '.php', '.cs', '.cpp', '.c', '.h'];

    let totalChars = 0;
    let fileCount = 0;

    // Recursively scan directory
    async function scanDir(dirPath) {
      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);

          // Skip node_modules, .git, and other common excluded directories
          if (entry.isDirectory()) {
            const dirName = entry.name;
            if (!['node_modules', '.git', '.next', 'dist', 'build', 'coverage', '.venv', 'venv'].includes(dirName)) {
              await scanDir(fullPath);
            }
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name);
            if (extensions.includes(ext)) {
              try {
                const content = await fs.readFile(fullPath, 'utf8');
                totalChars += content.length;
                fileCount++;
              } catch (readError) {
                // Skip files that can't be read
              }
            }
          }
        }
      } catch (error) {
        // Skip directories that can't be read
      }
    }

    await scanDir(repoPath);

    const totalTokens = estimateTokens(totalChars.toString().padEnd(totalChars, 'x'));

    // Estimate context tokens (agents typically see a subset of the repo)
    // Pre-recon sees most of it, others see selected portions
    const estimatedContextTokens = Math.floor(totalTokens * 0.3); // ~30% of repo in typical context

    return {
      files: fileCount,
      totalChars,
      totalTokens,
      estimatedContextTokens
    };
  } catch (error) {
    console.log(chalk.yellow(`⚠️  Could not analyze repository: ${error.message}`));
    return {
      files: 0,
      totalChars: 0,
      totalTokens: 0,
      estimatedContextTokens: 5000 // Fallback estimate
    };
  }
}

/**
 * Estimate cost for a single agent
 */
async function estimateAgentCost(agentName, variables, config, repoContext) {
  try {
    // Load the prompt template
    const promptName = getPromptName(agentName);
    const prompt = await loadPrompt(promptName, variables, config, false);

    // Estimate input tokens (prompt + context)
    const promptTokens = estimateTokens(prompt);
    let contextTokens = 0;

    // Add repository context for agents that need it
    if (['pre-recon', 'recon'].includes(agentName)) {
      contextTokens = repoContext.estimatedContextTokens;
    } else if (agentName.includes('vuln') || agentName.includes('exploit')) {
      // Vuln and exploit agents see deliverables from previous phases
      contextTokens = Math.floor(repoContext.estimatedContextTokens * 0.2); // ~20% context
    }

    const totalInputTokens = promptTokens + contextTokens;

    // Estimate output tokens (varies by agent type)
    let estimatedOutputTokens = AVERAGE_OUTPUT_TOKENS;
    if (agentName === 'pre-recon') {
      estimatedOutputTokens = 3000; // Larger architectural analysis
    } else if (agentName === 'report') {
      estimatedOutputTokens = 2500; // Executive summary
    } else if (agentName.includes('exploit')) {
      estimatedOutputTokens = 2500; // Exploitation attempts with evidence
    }

    const cost = calculateCost(totalInputTokens, estimatedOutputTokens);

    return {
      agent: agentName,
      promptTokens,
      contextTokens,
      totalInputTokens,
      estimatedOutputTokens,
      cost
    };
  } catch (error) {
    console.log(chalk.yellow(`⚠️  Could not estimate cost for ${agentName}: ${error.message}`));
    // Return a fallback estimate
    return {
      agent: agentName,
      promptTokens: 5000,
      contextTokens: 2000,
      totalInputTokens: 7000,
      estimatedOutputTokens: AVERAGE_OUTPUT_TOKENS,
      cost: calculateCost(7000, AVERAGE_OUTPUT_TOKENS)
    };
  }
}

/**
 * Convert agent name to prompt name
 */
function getPromptName(agentName) {
  const mapping = {
    'pre-recon': 'pre-recon-code',
    'recon': 'recon',
    'injection-vuln': 'vuln-injection',
    'xss-vuln': 'vuln-xss',
    'auth-vuln': 'vuln-auth',
    'ssrf-vuln': 'vuln-ssrf',
    'authz-vuln': 'vuln-authz',
    'injection-exploit': 'exploit-injection',
    'xss-exploit': 'exploit-xss',
    'auth-exploit': 'exploit-auth',
    'ssrf-exploit': 'exploit-ssrf',
    'authz-exploit': 'exploit-authz',
    'report': 'report-executive'
  };
  return mapping[agentName] || agentName;
}

/**
 * Main function to estimate total cost
 */
export async function estimateTotalCost(webUrl, repoPath, configPath = null) {
  console.log(chalk.cyan.bold('\n💰 COST ESTIMATION'));
  console.log(chalk.gray('─'.repeat(60)));
  console.log(chalk.cyan(`🎯 Target: ${webUrl}`));
  console.log(chalk.cyan(`📁 Source: ${repoPath}`));
  if (configPath) {
    console.log(chalk.cyan(`⚙️  Config: ${configPath}`));
  }
  console.log(chalk.gray('─'.repeat(60)));

  // Analyze repository
  console.log(chalk.blue('\n📊 Analyzing repository...'));
  const repoContext = await estimateRepoSize(repoPath);
  console.log(chalk.gray(`   Files: ${repoContext.files}`));
  console.log(chalk.gray(`   Characters: ${repoContext.totalChars.toLocaleString()}`));
  console.log(chalk.gray(`   Estimated tokens: ${repoContext.totalTokens.toLocaleString()}`));

  // Load config if provided
  let config = null;
  if (configPath) {
    try {
      const { parseConfig, distributeConfig } = await import('./config-parser.js');

      // Resolve config path
      let resolvedConfigPath = configPath;
      if (!path.isAbsolute(configPath)) {
        const configsDir = path.join(process.cwd(), 'configs');
        const configInConfigsDir = path.join(configsDir, configPath);
        if (await fs.pathExists(configInConfigsDir)) {
          resolvedConfigPath = configInConfigsDir;
        }
      }

      const parsedConfig = await parseConfig(resolvedConfigPath);
      config = distributeConfig(parsedConfig);
      console.log(chalk.green('✅ Configuration loaded'));
    } catch (error) {
      console.log(chalk.yellow(`⚠️  Could not load config: ${error.message}`));
    }
  }

  // Prepare variables for prompt loading
  const variables = {
    webUrl,
    repoPath,
    sourceDir: repoPath // For cost estimation, we use the repo path as source dir
  };

  // Estimate costs by phase
  console.log(chalk.blue('\n📋 Estimating costs by phase...\n'));

  const phaseEstimates = {
    'pre-recon': [],
    'recon': [],
    'vulnerability-analysis': [],
    'exploitation': [],
    'reporting': []
  };

  // Group agents by phase
  for (const [agentName, agentInfo] of Object.entries(AGENTS)) {
    const estimate = await estimateAgentCost(agentName, variables, config, repoContext);

    if (agentInfo.phase === 'pre-reconnaissance') {
      phaseEstimates['pre-recon'].push(estimate);
    } else if (agentInfo.phase === 'reconnaissance') {
      phaseEstimates['recon'].push(estimate);
    } else if (agentInfo.phase === 'vulnerability-analysis') {
      phaseEstimates['vulnerability-analysis'].push(estimate);
    } else if (agentInfo.phase === 'exploitation') {
      phaseEstimates['exploitation'].push(estimate);
    } else if (agentInfo.phase === 'reporting') {
      phaseEstimates['reporting'].push(estimate);
    }
  }

  // Display breakdown
  let totalCost = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  const phaseLabels = {
    'pre-recon': 'Pre-Reconnaissance',
    'recon': 'Reconnaissance',
    'vulnerability-analysis': 'Vulnerability Analysis',
    'exploitation': 'Exploitation',
    'reporting': 'Reporting'
  };

  console.log(chalk.yellow.bold('Estimated Cost Breakdown:\n'));

  for (const [phaseKey, estimates] of Object.entries(phaseEstimates)) {
    if (estimates.length === 0) continue;

    const phaseCost = estimates.reduce((sum, est) => sum + est.cost, 0);
    const phaseInputTokens = estimates.reduce((sum, est) => sum + est.totalInputTokens, 0);
    const phaseOutputTokens = estimates.reduce((sum, est) => sum + est.estimatedOutputTokens, 0);

    totalCost += phaseCost;
    totalInputTokens += phaseInputTokens;
    totalOutputTokens += phaseOutputTokens;

    const agentCount = estimates.length === 1 ? '1 agent' : `${estimates.length} agents`;
    console.log(chalk.yellow(`├── ${phaseLabels[phaseKey].padEnd(25)} ~$${phaseCost.toFixed(2).padStart(6)}  (${agentCount}, ${phaseInputTokens.toLocaleString()} in / ${phaseOutputTokens.toLocaleString()} out)`));
  }

  console.log(chalk.yellow(`└── ${'Total'.padEnd(25)} ~$${totalCost.toFixed(2).padStart(6)}  (${totalInputTokens.toLocaleString()} in / ${totalOutputTokens.toLocaleString()} out)`));

  // Display summary
  console.log(chalk.gray('\n─'.repeat(60)));
  console.log(chalk.green.bold('\n📊 ESTIMATION SUMMARY'));
  console.log(chalk.gray(`   Model: ${PRICING.model}`));
  console.log(chalk.gray(`   Total agents: ${Object.keys(AGENTS).length}`));
  console.log(chalk.gray(`   Estimated input tokens: ${totalInputTokens.toLocaleString()}`));
  console.log(chalk.gray(`   Estimated output tokens: ${totalOutputTokens.toLocaleString()}`));
  console.log(chalk.green(`   Estimated total cost: $${totalCost.toFixed(2)}`));

  console.log(chalk.yellow('\n⚠️  Note: This is a rough estimate. Actual costs may vary by ±20% based on:'));
  console.log(chalk.gray('   - Actual repository complexity and size'));
  console.log(chalk.gray('   - Number of vulnerabilities found'));
  console.log(chalk.gray('   - Agent iteration count and tool usage'));
  console.log(chalk.gray('   - Configuration and focus areas'));

  console.log(chalk.gray('\n─'.repeat(60)));

  return {
    totalCost,
    totalInputTokens,
    totalOutputTokens,
    phaseEstimates
  };
}
