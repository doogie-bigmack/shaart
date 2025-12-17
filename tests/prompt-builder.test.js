// Copyright (C) 2025 Keygraph, Inc.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License version 3
// as published by the Free Software Foundation.

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { fs, path } from 'zx';
import { PromptBuilder, createVulnAnalysisPrompt } from '../src/prompts/prompt-builder.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test fixtures directory
const FIXTURES_DIR = path.join(__dirname, 'fixtures', 'prompts');

describe('PromptBuilder', () => {
  before(async () => {
    // Create fixtures directory structure
    await fs.ensureDir(FIXTURES_DIR);
    await fs.ensureDir(path.join(FIXTURES_DIR, 'shared'));

    // Create test template files
    await fs.writeFile(
      path.join(FIXTURES_DIR, 'shared', '_target.txt'),
      '# This Source Code Form is subject to the terms of the AGPL, v. 3.0\n# This section above is metadata and not part of the prompt.\nURL: {{WEB_URL}}',
      'utf8'
    );

    await fs.writeFile(
      path.join(FIXTURES_DIR, 'shared', '_rules.txt'),
      '# This Source Code Form is subject to the terms of the AGPL, v. 3.0\n# This section above is metadata and not part of the prompt.\nRules to Avoid:\n{{RULES_AVOID}}\n\nAreas to Focus On:\n{{RULES_FOCUS}}',
      'utf8'
    );
  });

  after(async () => {
    // Clean up fixtures
    await fs.remove(FIXTURES_DIR);
  });

  it('should create a basic prompt with role and objective', () => {
    const builder = new PromptBuilder();
    const prompt = builder
      .setRole('You are a security analyst.')
      .setObjective('Find vulnerabilities.')
      .build();

    assert.ok(prompt.includes('<role>'));
    assert.ok(prompt.includes('You are a security analyst.'));
    assert.ok(prompt.includes('<objective>'));
    assert.ok(prompt.includes('Find vulnerabilities.'));
    assert.ok(prompt.includes('AGPL'));
  });

  it('should add custom sections', () => {
    const builder = new PromptBuilder();
    const prompt = builder
      .setRole('Test role')
      .addSection('methodology', 'Step 1: Do this\nStep 2: Do that')
      .addSection('critical', 'This is critical information')
      .build();

    assert.ok(prompt.includes('<methodology>'));
    assert.ok(prompt.includes('Step 1: Do this'));
    assert.ok(prompt.includes('<critical>'));
    assert.ok(prompt.includes('This is critical information'));
  });

  it('should interpolate variables', () => {
    const builder = new PromptBuilder();
    const prompt = builder
      .setRole('Testing {{ROLE_TYPE}}')
      .addSection('target', 'URL: {{WEB_URL}}')
      .setVariable('ROLE_TYPE', 'Injection Analyst')
      .setVariable('WEB_URL', 'https://example.com')
      .build();

    assert.ok(prompt.includes('Testing Injection Analyst'));
    assert.ok(prompt.includes('URL: https://example.com'));
    assert.ok(!prompt.includes('{{ROLE_TYPE}}'));
    assert.ok(!prompt.includes('{{WEB_URL}}'));
  });

  it('should add shared sections using @include directives', () => {
    const builder = new PromptBuilder(FIXTURES_DIR);
    builder.addSharedSection('target');
    builder.addSharedSection('rules');

    const prompt = builder.build();

    assert.ok(prompt.includes('<target>'));
    assert.ok(prompt.includes('@include(shared/_target.txt)'));
    assert.ok(prompt.includes('<rules>'));
    assert.ok(prompt.includes('@include(shared/_rules.txt)'));
  });

  it('should load sections from files', async () => {
    const builder = new PromptBuilder(FIXTURES_DIR);
    await builder.addSectionFromFile('target', 'shared/_target.txt');

    const prompt = builder
      .setVariable('WEB_URL', 'https://test.com')
      .build();

    assert.ok(prompt.includes('<target>'));
    assert.ok(prompt.includes('URL: https://test.com'));
  });

  it('should strip metadata from loaded files', async () => {
    const builder = new PromptBuilder(FIXTURES_DIR);
    await builder.addSectionFromFile('target', 'shared/_target.txt');
    const prompt = builder.build();

    // Should not include the metadata lines from the loaded file
    const targetSection = prompt.match(/<target>([\s\S]*?)<\/target>/)[1];
    assert.ok(!targetSection.includes('This section above is metadata'));
  });

  it('should support method chaining', () => {
    const builder = new PromptBuilder();
    const result = builder
      .setRole('Role')
      .setObjective('Objective')
      .addSection('test', 'content')
      .setVariable('VAR', 'value');

    assert.strictEqual(result, builder);
  });

  it('should handle login instructions', () => {
    const builder = new PromptBuilder();
    builder.addLoginInstructions();
    const prompt = builder.build();

    assert.ok(prompt.includes('<login_instructions>'));
    assert.ok(prompt.includes('{{LOGIN_INSTRUCTIONS}}'));
  });

  it('should create vulnerability analysis prompts using helper', () => {
    const builder = createVulnAnalysisPrompt({
      baseDir: FIXTURES_DIR,
      role: 'XSS Analyst',
      objective: 'Find XSS vulnerabilities'
    });

    assert.ok(builder instanceof PromptBuilder);
    const prompt = builder.build();

    assert.ok(prompt.includes('XSS Analyst'));
    assert.ok(prompt.includes('Find XSS vulnerabilities'));
  });

  it('should build and save to file', async () => {
    const builder = new PromptBuilder();
    const testPath = path.join(FIXTURES_DIR, 'test-output.txt');

    await builder
      .setRole('Test role')
      .setObjective('Test objective')
      .buildAndSave(testPath);

    const content = await fs.readFile(testPath, 'utf8');
    assert.ok(content.includes('Test role'));
    assert.ok(content.includes('Test objective'));

    await fs.remove(testPath);
  });

  it('should set multiple variables at once', () => {
    const builder = new PromptBuilder();
    const prompt = builder
      .setRole('Role for {{APP_NAME}}')
      .addSection('config', 'URL: {{WEB_URL}}\nRepo: {{REPO_PATH}}')
      .setVariables({
        APP_NAME: 'TestApp',
        WEB_URL: 'https://example.com',
        REPO_PATH: '/path/to/repo'
      })
      .build();

    assert.ok(prompt.includes('Role for TestApp'));
    assert.ok(prompt.includes('URL: https://example.com'));
    assert.ok(prompt.includes('Repo: /path/to/repo'));
  });
});

describe('PromptBuilder Integration', () => {
  it('should create a complete prompt matching existing format', () => {
    const builder = new PromptBuilder();
    const prompt = builder
      .setRole('You are an Injection Analysis Specialist.')
      .setObjective('Find SQL injection and command injection vulnerabilities.')
      .addSection('critical', 'Your analysis must be thorough.')
      .addSection('methodology', 'Follow these steps:\n1. Trace data flow\n2. Identify sinks\n3. Check sanitization')
      .addLoginInstructions()
      .setVariable('WEB_URL', 'https://app.example.com')
      .setVariable('LOGIN_INSTRUCTIONS', 'Navigate to /login and authenticate')
      .build();

    // Check structure
    assert.ok(prompt.includes('=== PROMPT ==='));
    assert.ok(prompt.includes('<role>'));
    assert.ok(prompt.includes('</role>'));
    assert.ok(prompt.includes('<objective>'));
    assert.ok(prompt.includes('<critical>'));
    assert.ok(prompt.includes('<methodology>'));
    assert.ok(prompt.includes('<login_instructions>'));
    assert.ok(prompt.includes('Navigate to /login and authenticate'));
  });
});
