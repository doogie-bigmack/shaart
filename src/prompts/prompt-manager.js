// Copyright (C) 2025 Keygraph, Inc.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License version 3
// as published by the Free Software Foundation.

import { fs, path } from 'zx';
import chalk from 'chalk';
import { PentestError, handlePromptError } from '../error-handling.js';
import { MCP_AGENT_MAPPING } from '../constants.js';
import { PromptBuilder } from './prompt-builder.js';

// Pure function: Build complete login instructions from config
async function buildLoginInstructions(authentication) {
  try {
    // Load the login instructions template
    const loginInstructionsPath = path.join(import.meta.dirname, '..', '..', 'prompts', 'shared', 'login-instructions.txt');

    if (!await fs.pathExists(loginInstructionsPath)) {
      throw new PentestError(
        'Login instructions template not found',
        'filesystem',
        false,
        { loginInstructionsPath }
      );
    }

    const fullTemplate = await fs.readFile(loginInstructionsPath, 'utf8');

    // Helper function to extract sections based on markers
    const getSection = (content, sectionName) => {
      const regex = new RegExp(`<!-- BEGIN:${sectionName} -->([\\s\\S]*?)<!-- END:${sectionName} -->`, 'g');
      const match = regex.exec(content);
      return match ? match[1].trim() : '';
    };

    // Extract sections based on login type
    const loginType = authentication.login_type?.toUpperCase();
    let loginInstructions = '';

    // Build instructions with only relevant sections
    const commonSection = getSection(fullTemplate, 'COMMON');
    const authSection = getSection(fullTemplate, loginType); // FORM or SSO
    const verificationSection = getSection(fullTemplate, 'VERIFICATION');

    // Fallback to full template if markers are missing (backward compatibility)
    if (!commonSection && !authSection && !verificationSection) {
      console.log(chalk.yellow('⚠️ Section markers not found, using full login instructions template'));
      loginInstructions = fullTemplate;
    } else {
      // Combine relevant sections
      loginInstructions = [commonSection, authSection, verificationSection]
        .filter(section => section) // Remove empty sections
        .join('\n\n');
    }

    // Replace the user instructions placeholder with the login flow from config
    let userInstructions = authentication.login_flow.join('\n');

    // Replace credential placeholders within the user instructions
    if (authentication.credentials) {
      if (authentication.credentials.username) {
        userInstructions = userInstructions.replace(/\$username/g, authentication.credentials.username);
      }
      if (authentication.credentials.password) {
        userInstructions = userInstructions.replace(/\$password/g, authentication.credentials.password);
      }
      if (authentication.credentials.totp_secret) {
        userInstructions = userInstructions.replace(/\$totp/g, `generated TOTP code using secret "${authentication.credentials.totp_secret}"`);
      }
    }

    loginInstructions = loginInstructions.replace(/{{user_instructions}}/g, userInstructions);

    // Replace TOTP secret placeholder if present in template
    if (authentication.credentials?.totp_secret) {
      loginInstructions = loginInstructions.replace(/{{totp_secret}}/g, authentication.credentials.totp_secret);
    }

    return loginInstructions;
  } catch (error) {
    if (error instanceof PentestError) {
      throw error;
    }
    throw new PentestError(
      `Failed to build login instructions: ${error.message}`,
      'config',
      false,
      { authentication, originalError: error.message }
    );
  }
}

// Pure function: Process @include() directives
async function processIncludes(content, baseDir) {
  const includeRegex = /@include\(([^)]+)\)/g;
  // Use a Promise.all to handle all includes concurrently
  const replacements = await Promise.all(
    Array.from(content.matchAll(includeRegex)).map(async (match) => {
      const includePath = path.join(baseDir, match[1]);
      const sharedContent = await fs.readFile(includePath, 'utf8');
      return {
        placeholder: match[0],
        content: sharedContent,
      };
    })
  );

  for (const replacement of replacements) {
    content = content.replace(replacement.placeholder, replacement.content);
  }
  return content;
}

/**
 * Format exploit memory context for injection into prompts
 *
 * @param {Object} exploitMemory - Exploit memory data
 * @returns {string} Formatted exploit memory section
 */
function formatExploitMemoryContext(exploitMemory) {
  if (!exploitMemory || !exploitMemory.vulnerabilities) {
    return '';
  }

  let context = '\n\n<exploit_memory>\n';
  context += '# Historical Vulnerability Data\n\n';
  context += 'The following vulnerabilities were discovered in previous test sessions:\n\n';

  // Group vulnerabilities by type
  const vulnsByType = {};
  for (const vuln of exploitMemory.vulnerabilities) {
    if (!vulnsByType[vuln.vuln_type]) {
      vulnsByType[vuln.vuln_type] = [];
    }
    vulnsByType[vuln.vuln_type].push(vuln);
  }

  // Format by type
  for (const [type, vulns] of Object.entries(vulnsByType)) {
    context += `## ${type} (${vulns.length} found)\n\n`;
    for (const vuln of vulns.slice(0, 5)) { // Limit to 5 per type
      context += `- **${vuln.path}** (confidence: ${vuln.confidence}%)\n`;
      context += `  - Source: ${vuln.source}\n`;
      if (vuln.sink_call) {
        context += `  - Sink: ${vuln.sink_call}\n`;
      }
      context += `  - Status: ${vuln.remediation_status}\n`;
      context += `  - First discovered: ${vuln.first_discovered_at}\n\n`;
    }
    if (vulns.length > 5) {
      context += `  ... and ${vulns.length - 5} more\n\n`;
    }
  }

  // Add attack patterns if available
  if (exploitMemory.patterns && exploitMemory.patterns.length > 0) {
    context += '\n## Successful Attack Patterns\n\n';
    for (const pattern of exploitMemory.patterns.slice(0, 3)) {
      context += `- **${pattern.pattern_type}** (used ${pattern.success_count} times)\n`;
      context += `  - Last used: ${pattern.last_used_at}\n\n`;
    }
  }

  // Add discovered credentials if available
  if (exploitMemory.credentials && exploitMemory.credentials.length > 0) {
    context += '\n## Discovered Credentials\n\n';
    context += `Found ${exploitMemory.credentials.length} credential(s) in previous sessions:\n\n`;
    for (const cred of exploitMemory.credentials.slice(0, 5)) {
      context += `- **${cred.credential_type}** (${cred.service_type || 'unknown service'})\n`;
      if (cred.username) {
        context += `  - Username: ${cred.username}\n`;
      }
      context += `  - Discovered via: ${cred.discovered_via}\n`;
      context += `  - Validated: ${cred.validated ? 'Yes' : 'No'}\n\n`;
    }
  }

  // Add tech stack if available
  if (exploitMemory.application?.tech_stack) {
    context += '\n## Known Tech Stack\n\n';
    context += exploitMemory.application.tech_stack.join(', ') + '\n\n';
  }

  context += '</exploit_memory>\n\n';
  context += 'Use this historical data to:\n';
  context += '1. Avoid testing already-verified vulnerabilities\n';
  context += '2. Focus on similar patterns that were successful before\n';
  context += '3. Build on discovered credentials for deeper exploitation\n\n';

  return context;
}

// Pure function: Variable interpolation
async function interpolateVariables(template, variables, config = null) {
  try {
    if (!template || typeof template !== 'string') {
      throw new PentestError(
        'Template must be a non-empty string',
        'validation',
        false,
        { templateType: typeof template, templateLength: template?.length }
      );
    }

    if (!variables || !variables.webUrl || !variables.repoPath) {
      throw new PentestError(
        'Variables must include webUrl and repoPath',
        'validation',
        false,
        { variables: Object.keys(variables || {}) }
      );
    }

    let result = template
      .replace(/{{WEB_URL}}/g, variables.webUrl)
      .replace(/{{REPO_PATH}}/g, variables.repoPath)
      .replace(/{{MCP_SERVER}}/g, variables.MCP_SERVER || 'playwright-agent1');

    if (config) {
      // Handle rules section - if both are empty, use cleaner messaging
      const hasAvoidRules = config.avoid && config.avoid.length > 0;
      const hasFocusRules = config.focus && config.focus.length > 0;

      if (!hasAvoidRules && !hasFocusRules) {
        // Replace the entire rules section with a clean message
        const cleanRulesSection = '<rules>\nNo specific rules or focus areas provided for this test.\n</rules>';
        result = result.replace(/<rules>[\s\S]*?<\/rules>/g, cleanRulesSection);
      } else {
        const avoidRules = hasAvoidRules ? config.avoid.map(r => `- ${r.description}`).join('\n') : 'None';
        const focusRules = hasFocusRules ? config.focus.map(r => `- ${r.description}`).join('\n') : 'None';

        result = result
          .replace(/{{RULES_AVOID}}/g, avoidRules)
          .replace(/{{RULES_FOCUS}}/g, focusRules);
      }

      // Extract and inject login instructions from config
      if (config.authentication?.login_flow) {
        const loginInstructions = await buildLoginInstructions(config.authentication);
        result = result.replace(/{{LOGIN_INSTRUCTIONS}}/g, loginInstructions);
      } else {
        result = result.replace(/{{LOGIN_INSTRUCTIONS}}/g, '');
      }

      // Inject exploit memory context if available
      if (variables.exploitMemory) {
        const exploitMemoryContext = formatExploitMemoryContext(variables.exploitMemory);
        result = result.replace(/{{EXPLOIT_MEMORY}}/g, exploitMemoryContext);
      } else {
        result = result.replace(/{{EXPLOIT_MEMORY}}/g, '');
      }
    } else {
      // Replace the entire rules section with a clean message when no config provided
      const cleanRulesSection = '<rules>\nNo specific rules or focus areas provided for this test.\n</rules>';
      result = result.replace(/<rules>[\s\S]*?<\/rules>/g, cleanRulesSection);
      result = result.replace(/{{LOGIN_INSTRUCTIONS}}/g, '');
      result = result.replace(/{{EXPLOIT_MEMORY}}/g, '');
    }

    // Validate that all placeholders have been replaced (excluding instructional text)
    const remainingPlaceholders = result.match(/\{\{[^}]+\}\}/g);
    if (remainingPlaceholders) {
      console.log(chalk.yellow(`⚠️ Warning: Found unresolved placeholders in prompt: ${remainingPlaceholders.join(', ')}`));
    }

    return result;
  } catch (error) {
    if (error instanceof PentestError) {
      throw error;
    }
    throw new PentestError(
      `Variable interpolation failed: ${error.message}`,
      'prompt',
      false,
      { originalError: error.message }
    );
  }
}

/**
 * Export PromptBuilder for external use
 */
export { PromptBuilder };

// Pure function: Load and interpolate prompt template
export async function loadPrompt(promptName, variables, config = null, pipelineTestingMode = false) {
  try {
    // Use pipeline testing prompts if pipeline testing mode is enabled
    const baseDir = pipelineTestingMode ? 'prompts/pipeline-testing' : 'prompts';
    const promptsDir = path.join(import.meta.dirname, '..', '..', baseDir);
    const promptPath = path.join(promptsDir, `${promptName}.txt`);

    // Debug message for pipeline testing mode
    if (pipelineTestingMode) {
      console.log(chalk.yellow(`⚡ Using pipeline testing prompt: ${promptPath}`));
    }

    // Check if file exists first
    if (!await fs.pathExists(promptPath)) {
      throw new PentestError(
        `Prompt file not found: ${promptPath}`,
        'prompt',
        false,
        { promptName, promptPath }
      );
    }

    // Add MCP server assignment to variables
    const enhancedVariables = { ...variables };

    // Assign MCP server based on prompt name (agent name)
    if (MCP_AGENT_MAPPING[promptName]) {
      enhancedVariables.MCP_SERVER = MCP_AGENT_MAPPING[promptName];
      console.log(chalk.gray(`    🎭 Assigned ${promptName} → ${enhancedVariables.MCP_SERVER}`));
    } else {
      // Fallback for unknown agents
      enhancedVariables.MCP_SERVER = 'playwright-agent1';
      console.log(chalk.yellow(`    🎭 Unknown agent ${promptName}, using fallback → ${enhancedVariables.MCP_SERVER}`));
    }

    let template = await fs.readFile(promptPath, 'utf8');

    // Pre-process the template to handle @include directives
    template = await processIncludes(template, promptsDir);

    return await interpolateVariables(template, enhancedVariables, config);
  } catch (error) {
    if (error instanceof PentestError) {
      throw error;
    }
    const promptError = handlePromptError(promptName, error);
    throw promptError.error;
  }
}