#!/usr/bin/env node
// Copyright (C) 2025 Keygraph, Inc.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License version 3
// as published by the Free Software Foundation.

/**
 * PromptBuilder Usage Examples
 *
 * This file demonstrates how to use the PromptBuilder class to create
 * modular, reusable prompts with reduced duplication.
 */

import { PromptBuilder, createVulnAnalysisPrompt, createExploitPrompt } from '../src/prompts/prompt-builder.js';

// ============================================================================
// Example 1: Basic Prompt Construction
// ============================================================================
console.log('Example 1: Basic Prompt Construction');
console.log('=====================================\n');

const basicPrompt = new PromptBuilder()
  .setRole('You are a Security Analyst specializing in code review.')
  .setObjective('Identify potential security vulnerabilities in web applications.')
  .addSection('methodology', 'Follow these steps:\n1. Review code structure\n2. Identify input vectors\n3. Check sanitization')
  .addSection('critical', 'All findings must be documented with file:line references.')
  .build();

console.log('Generated Prompt:');
console.log(basicPrompt);
console.log('\n' + '='.repeat(80) + '\n');

// ============================================================================
// Example 2: Using Shared Sections
// ============================================================================
console.log('Example 2: Using Shared Sections');
console.log('=================================\n');

const promptWithShared = new PromptBuilder()
  .setRole('You are an XSS Analysis Specialist.')
  .setObjective('Find cross-site scripting vulnerabilities.')
  .addSharedSection('scope')
  .addSharedSection('target')
  .addSharedSection('rules')
  .addLoginInstructions()
  .setVariable('WEB_URL', 'https://app.example.com')
  .setVariable('LOGIN_INSTRUCTIONS', 'Navigate to /login and use credentials')
  .build();

console.log('Prompt with shared sections (contains @include directives):');
console.log(promptWithShared.substring(0, 500) + '...\n');
console.log('\n' + '='.repeat(80) + '\n');

// ============================================================================
// Example 3: Using Helper Functions
// ============================================================================
console.log('Example 3: Using Helper Functions');
console.log('==================================\n');

const vulnPrompt = createVulnAnalysisPrompt({
  role: 'You are an Injection Analysis Specialist.',
  objective: 'Identify SQL injection and command injection vulnerabilities.'
});

// Add additional custom sections
vulnPrompt.addSection('methodology', `
1. Trace data flow from sources to sinks
2. Identify sanitization functions
3. Determine if encoding matches context
4. Document findings with proof-of-concept payloads
`);

const finalPrompt = vulnPrompt
  .setVariable('WEB_URL', 'https://test.example.com')
  .setVariable('REPO_PATH', '/workspace/app')
  .setVariable('LOGIN_INSTRUCTIONS', 'Use SSO authentication')
  .build();

console.log('Vulnerability analysis prompt (first 500 chars):');
console.log(finalPrompt.substring(0, 500) + '...\n');
console.log('\n' + '='.repeat(80) + '\n');

// ============================================================================
// Example 4: Exploitation Prompt
// ============================================================================
console.log('Example 4: Exploitation Prompt');
console.log('===============================\n');

const exploitPrompt = createExploitPrompt({
  role: 'You are an Exploitation Specialist.',
  objective: 'Weaponize confirmed vulnerabilities to prove impact.'
});

exploitPrompt.addSection('critical', `
**CRITICAL RULES:**
- Only test authorized systems
- Document all attempts
- Provide evidence for successful exploits
`);

const exploitFinal = exploitPrompt
  .setVariable('WEB_URL', 'https://pentest-target.example.com')
  .setVariable('LOGIN_INSTRUCTIONS', 'Login as test user')
  .build();

console.log('Exploitation prompt (first 500 chars):');
console.log(exploitFinal.substring(0, 500) + '...\n');
console.log('\n' + '='.repeat(80) + '\n');

// ============================================================================
// Example 5: Dynamic Section Addition
// ============================================================================
console.log('Example 5: Dynamic Section Addition');
console.log('====================================\n');

const dynamicBuilder = new PromptBuilder()
  .setRole('You are a Dynamic Analyst.')
  .setObjective('Analyze based on configuration.');

// Conditionally add sections based on configuration
const config = {
  includeMethodology: true,
  includeExamples: false,
  vulnType: 'XSS'
};

if (config.includeMethodology) {
  dynamicBuilder.addSection('methodology', 'Systematic testing methodology...');
}

if (config.includeExamples) {
  dynamicBuilder.addSection('examples', 'Example vulnerabilities...');
}

if (config.vulnType) {
  dynamicBuilder.addSection('focus', `Focus on ${config.vulnType} vulnerabilities.`);
}

const dynamicPrompt = dynamicBuilder.build();

console.log('Dynamically constructed prompt (sections based on config):');
console.log(dynamicPrompt);
console.log('\n' + '='.repeat(80) + '\n');

// ============================================================================
// Example 6: Variable Interpolation
// ============================================================================
console.log('Example 6: Variable Interpolation');
console.log('==================================\n');

const templatePrompt = new PromptBuilder()
  .setRole('Security Analyst for {{APP_NAME}}')
  .setObjective('Test {{APP_NAME}} at {{WEB_URL}}')
  .addSection('target', `
Application: {{APP_NAME}}
URL: {{WEB_URL}}
Repository: {{REPO_PATH}}
Environment: {{ENVIRONMENT}}
  `)
  .setVariables({
    APP_NAME: 'E-Commerce Platform',
    WEB_URL: 'https://shop.example.com',
    REPO_PATH: '/repos/ecommerce',
    ENVIRONMENT: 'staging'
  })
  .build();

console.log('Prompt with variable interpolation:');
console.log(templatePrompt);

console.log('\n' + '='.repeat(80) + '\n');
console.log('All examples completed successfully!\n');
