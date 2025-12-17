// Copyright (C) 2025 Keygraph, Inc.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License version 3
// as published by the Free Software Foundation.

import { fs, path } from 'zx';

/**
 * PromptBuilder - A fluent API for constructing prompts from modular sections
 *
 * This class reduces duplication across prompt files by:
 * - Supporting template sections with variable interpolation
 * - Enabling modular composition of prompt components
 * - Providing a clean, chainable API
 * - Centralizing shared content in prompts/shared/
 */
export class PromptBuilder {
  constructor(baseDir = null) {
    // Allow custom base directory for testing, otherwise use prompts directory
    this.baseDir = baseDir || path.join(import.meta.dirname, '..', '..', 'prompts');
    this.sections = [];
    this.variables = {};
    this.role = null;
    this.objective = null;
    this.metadata = {
      copyright: '# This Source Code Form is subject to the terms of the AGPL, v. 3.0',
      note: '# This section above is metadata and not part of the prompt.',
      separator: '=== PROMPT ==='
    };
  }

  /**
   * Set the role section of the prompt
   * @param {string} roleContent - The role description
   * @returns {PromptBuilder} - Returns this for chaining
   */
  setRole(roleContent) {
    this.role = roleContent;
    return this;
  }

  /**
   * Set the objective section of the prompt
   * @param {string} objectiveContent - The objective description
   * @returns {PromptBuilder} - Returns this for chaining
   */
  setObjective(objectiveContent) {
    this.objective = objectiveContent;
    return this;
  }

  /**
   * Add a section to the prompt
   * @param {string} sectionName - Name of the XML section (e.g., 'critical', 'methodology')
   * @param {string} content - Content for the section
   * @returns {PromptBuilder} - Returns this for chaining
   */
  addSection(sectionName, content) {
    this.sections.push({ name: sectionName, content });
    return this;
  }

  /**
   * Add a section from a shared template file
   * @param {string} sectionName - Name of the XML section
   * @param {string} templatePath - Path to template file relative to prompts directory
   * @returns {PromptBuilder} - Returns this for chaining
   */
  async addSectionFromFile(sectionName, templatePath) {
    const fullPath = path.join(this.baseDir, templatePath);
    const content = await fs.readFile(fullPath, 'utf8');
    // Remove metadata header if present
    const cleanContent = this.stripMetadata(content);
    this.sections.push({ name: sectionName, content: cleanContent });
    return this;
  }

  /**
   * Add a shared include section (scope, target, rules)
   * These are special sections that use @include() directives
   * @param {string} sectionName - Name of the section (scope, target, rules)
   * @returns {PromptBuilder} - Returns this for chaining
   */
  addSharedSection(sectionName) {
    const includeMap = {
      'scope': '@include(shared/_vuln-scope.txt)',
      'target': '@include(shared/_target.txt)',
      'rules': '@include(shared/_rules.txt)',
      'exploit-scope': '@include(shared/_exploit-scope.txt)'
    };

    if (includeMap[sectionName]) {
      this.sections.push({ name: sectionName, content: includeMap[sectionName] });
    }
    return this;
  }

  /**
   * Add login instructions section with variable placeholder
   * @returns {PromptBuilder} - Returns this for chaining
   */
  addLoginInstructions() {
    this.sections.push({
      name: 'login_instructions',
      content: '{{LOGIN_INSTRUCTIONS}}'
    });
    return this;
  }

  /**
   * Set a variable for interpolation
   * @param {string} key - Variable name (without {{ }})
   * @param {string} value - Variable value
   * @returns {PromptBuilder} - Returns this for chaining
   */
  setVariable(key, value) {
    this.variables[key] = value;
    return this;
  }

  /**
   * Set multiple variables at once
   * @param {Object} vars - Object with key-value pairs
   * @returns {PromptBuilder} - Returns this for chaining
   */
  setVariables(vars) {
    Object.assign(this.variables, vars);
    return this;
  }

  /**
   * Strip metadata header from content
   * @param {string} content - Content that may have metadata
   * @returns {string} - Content without metadata
   */
  stripMetadata(content) {
    // Remove copyright and metadata lines from the start
    const lines = content.split('\n');
    let startIdx = 0;

    // Look for lines that start with # (metadata comments)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip comment lines and empty lines at the start
      if (line.startsWith('#') || line === '') {
        continue;
      }

      // Found first non-comment, non-empty line
      startIdx = i;
      break;
    }

    if (startIdx > 0) {
      return lines.slice(startIdx).join('\n').trim();
    }

    return content.trim();
  }

  /**
   * Build the final prompt string
   * @returns {string} - The complete prompt
   */
  build() {
    let prompt = `${this.metadata.copyright}\n${this.metadata.note}\n${this.metadata.separator}\n\n`;

    // Add role if set
    if (this.role) {
      prompt += `<role>\n${this.role}\n</role>\n\n`;
    }

    // Add objective if set
    if (this.objective) {
      prompt += `<objective>\n${this.objective}\n</objective>\n\n`;
    }

    // Add all other sections in order
    for (const section of this.sections) {
      prompt += `<${section.name}>\n${section.content}\n</${section.name}>\n\n`;
    }

    // Perform variable interpolation
    for (const [key, value] of Object.entries(this.variables)) {
      const placeholder = `{{${key}}}`;
      prompt = prompt.replace(new RegExp(placeholder, 'g'), value);
    }

    return prompt.trim() + '\n';
  }

  /**
   * Build and save the prompt to a file
   * @param {string} outputPath - Path where to save the prompt
   * @returns {Promise<string>} - The built prompt content
   */
  async buildAndSave(outputPath) {
    const content = this.build();
    await fs.writeFile(outputPath, content, 'utf8');
    return content;
  }

  /**
   * Load a legacy prompt file and convert it to builder format
   * Useful for migration purposes
   * @param {string} promptPath - Path to existing prompt file
   * @returns {PromptBuilder} - Returns this for chaining
   */
  async loadLegacyPrompt(promptPath) {
    const content = await fs.readFile(promptPath, 'utf8');

    // Parse sections using regex
    const sectionRegex = /<(\w+)>([\s\S]*?)<\/\1>/g;
    let match;

    while ((match = sectionRegex.exec(content)) !== null) {
      const [, sectionName, sectionContent] = match;

      if (sectionName === 'role') {
        this.setRole(sectionContent.trim());
      } else if (sectionName === 'objective') {
        this.setObjective(sectionContent.trim());
      } else {
        this.sections.push({ name: sectionName, content: sectionContent.trim() });
      }
    }

    return this;
  }
}

/**
 * Helper function to create common vulnerability analysis prompts
 * @param {Object} config - Configuration object
 * @returns {PromptBuilder} - Configured builder
 */
export function createVulnAnalysisPrompt(config = {}) {
  const builder = new PromptBuilder(config.baseDir);

  if (config.role) builder.setRole(config.role);
  if (config.objective) builder.setObjective(config.objective);

  // Add common sections for vuln analysis
  builder
    .addSharedSection('scope')
    .addSharedSection('target')
    .addSharedSection('rules')
    .addLoginInstructions();

  return builder;
}

/**
 * Helper function to create common exploitation prompts
 * @param {Object} config - Configuration object
 * @returns {PromptBuilder} - Configured builder
 */
export function createExploitPrompt(config = {}) {
  const builder = new PromptBuilder(config.baseDir);

  if (config.role) builder.setRole(config.role);
  if (config.objective) builder.setObjective(config.objective);

  // Add common sections for exploitation
  builder
    .addSharedSection('exploit-scope')
    .addSharedSection('target')
    .addSharedSection('rules')
    .addLoginInstructions();

  return builder;
}
