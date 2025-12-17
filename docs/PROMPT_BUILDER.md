# PromptBuilder Documentation

## Overview

The `PromptBuilder` class provides a fluent API for constructing AI prompts with reduced duplication and improved modularity. It addresses the challenge of maintaining 13+ prompt files (4840+ lines) by:

- **Reducing duplication** through shared sections and templates
- **Supporting variable interpolation** for dynamic content ({{WEB_URL}}, {{REPO_PATH}}, etc.)
- **Enabling modular composition** via @include() directives
- **Providing a clean, chainable API** for building prompts programmatically

## Installation

The PromptBuilder is included in the core `shaart` package. Import it from the prompt manager:

```javascript
import { PromptBuilder } from './src/prompts/prompt-builder.js';
// Or use convenience functions:
import { createVulnAnalysisPrompt, createExploitPrompt } from './src/prompts/prompt-builder.js';
```

## Basic Usage

### Creating a Simple Prompt

```javascript
const prompt = new PromptBuilder()
  .setRole('You are a Security Analyst.')
  .setObjective('Find vulnerabilities in the application.')
  .addSection('methodology', 'Follow these steps...')
  .build();
```

### Using Shared Sections

Shared sections reduce duplication across multiple prompts:

```javascript
const prompt = new PromptBuilder()
  .setRole('XSS Analyst')
  .setObjective('Find XSS vulnerabilities')
  .addSharedSection('scope')      // Adds @include(shared/_vuln-scope.txt)
  .addSharedSection('target')     // Adds @include(shared/_target.txt)
  .addSharedSection('rules')      // Adds @include(shared/_rules.txt)
  .addLoginInstructions()         // Adds {{LOGIN_INSTRUCTIONS}} placeholder
  .build();
```

### Variable Interpolation

Replace placeholders with actual values:

```javascript
const prompt = new PromptBuilder()
  .setRole('Analyst for {{APP_NAME}}')
  .addSection('target', 'URL: {{WEB_URL}}\nRepo: {{REPO_PATH}}')
  .setVariable('APP_NAME', 'MyApp')
  .setVariable('WEB_URL', 'https://app.example.com')
  .setVariable('REPO_PATH', '/workspace/app')
  .build();
```

Or set multiple variables at once:

```javascript
builder.setVariables({
  WEB_URL: 'https://app.example.com',
  REPO_PATH: '/workspace/app',
  ENVIRONMENT: 'staging'
});
```

## API Reference

### Constructor

```javascript
new PromptBuilder(baseDir?: string)
```

- `baseDir` (optional): Custom directory for prompt files. Defaults to `prompts/` directory.

### Methods

#### `setRole(roleContent: string): PromptBuilder`

Sets the `<role>` section of the prompt.

```javascript
builder.setRole('You are a penetration tester specializing in web applications.');
```

#### `setObjective(objectiveContent: string): PromptBuilder`

Sets the `<objective>` section of the prompt.

```javascript
builder.setObjective('Your mission is to identify SQL injection vulnerabilities.');
```

#### `addSection(sectionName: string, content: string): PromptBuilder`

Adds a custom XML section to the prompt.

```javascript
builder.addSection('methodology', 'Step 1: Analyze\nStep 2: Test\nStep 3: Document');
```

#### `addSectionFromFile(sectionName: string, templatePath: string): Promise<PromptBuilder>`

Loads section content from a template file. Automatically strips metadata headers.

```javascript
await builder.addSectionFromFile('methodology', 'shared/_methodology.txt');
```

#### `addSharedSection(sectionName: string): PromptBuilder`

Adds a standard shared section using @include() directive.

Supported sections:
- `scope` → `@include(shared/_vuln-scope.txt)`
- `target` → `@include(shared/_target.txt)`
- `rules` → `@include(shared/_rules.txt)`
- `exploit-scope` → `@include(shared/_exploit-scope.txt)`

```javascript
builder.addSharedSection('scope').addSharedSection('target');
```

#### `addLoginInstructions(): PromptBuilder`

Adds the login instructions section with {{LOGIN_INSTRUCTIONS}} placeholder.

```javascript
builder.addLoginInstructions();
```

#### `setVariable(key: string, value: string): PromptBuilder`

Sets a single variable for interpolation (without {{ }} delimiters).

```javascript
builder.setVariable('WEB_URL', 'https://example.com');
```

#### `setVariables(vars: Object): PromptBuilder`

Sets multiple variables at once.

```javascript
builder.setVariables({
  WEB_URL: 'https://example.com',
  REPO_PATH: '/workspace/app'
});
```

#### `build(): string`

Builds and returns the final prompt string with all sections and variables interpolated.

```javascript
const finalPrompt = builder.build();
```

#### `buildAndSave(outputPath: string): Promise<string>`

Builds the prompt and saves it to a file.

```javascript
await builder.buildAndSave('prompts/my-custom-prompt.txt');
```

## Helper Functions

### `createVulnAnalysisPrompt(config)`

Creates a pre-configured builder for vulnerability analysis prompts.

```javascript
const builder = createVulnAnalysisPrompt({
  baseDir: 'prompts/',           // Optional
  role: 'XSS Analyst',           // Optional
  objective: 'Find XSS flaws'    // Optional
});

// Builder includes: scope, target, rules, login_instructions
```

### `createExploitPrompt(config)`

Creates a pre-configured builder for exploitation prompts.

```javascript
const builder = createExploitPrompt({
  baseDir: 'prompts/',
  role: 'Exploitation Specialist',
  objective: 'Weaponize vulnerabilities'
});

// Builder includes: exploit-scope, target, rules, login_instructions
```

## Migration Guide

### Converting Existing Prompts

**Before** (static template file):
```
# prompts/vuln-xss.txt
<role>
You are an XSS Analyst...
</role>

<scope>
@include(shared/_vuln-scope.txt)
</scope>

<target>
@include(shared/_target.txt)
</target>

<rules>
@include(shared/_rules.txt)
</rules>

<login_instructions>
{{LOGIN_INSTRUCTIONS}}
</login_instructions>

<methodology>
... long methodology content ...
</methodology>
```

**After** (PromptBuilder):
```javascript
const prompt = createVulnAnalysisPrompt({
  role: 'You are an XSS Analyst...',
  objective: 'Find XSS vulnerabilities...'
})
.addSectionFromFile('methodology', 'shared/_xss-methodology.txt')
.setVariables(config)
.build();
```

### Extracting Common Content

1. Identify repeated content across multiple prompts
2. Extract to `prompts/shared/_common-name.txt`
3. Reference using `addSharedSection()` or `addSectionFromFile()`

Example:
```javascript
// Extract professional standards to shared file
await builder.addSectionFromFile('critical', 'shared/_professional-standard.txt');
```

## Best Practices

### 1. Use Shared Sections for Common Content

Don't duplicate the same content across multiple prompts. Extract to shared files:

```javascript
// Good
builder.addSharedSection('scope')
       .addSharedSection('target');

// Avoid
builder.addSection('scope', '... duplicated content ...');
```

### 2. Keep Role and Objective Specific

While shared sections reduce duplication, keep role and objective specific to each prompt type:

```javascript
const xssPrompt = createVulnAnalysisPrompt({
  role: 'You are an XSS Analysis Specialist...',
  objective: 'Find cross-site scripting vulnerabilities...'
});

const sqliPrompt = createVulnAnalysisPrompt({
  role: 'You are an Injection Analysis Specialist...',
  objective: 'Find SQL injection vulnerabilities...'
});
```

### 3. Use Method Chaining

Take advantage of the fluent API for cleaner code:

```javascript
// Good
const prompt = new PromptBuilder()
  .setRole('Analyst')
  .setObjective('Test')
  .addSharedSection('scope')
  .addSharedSection('target')
  .setVariable('WEB_URL', url)
  .build();

// Works but less readable
const prompt = new PromptBuilder();
prompt.setRole('Analyst');
prompt.setObjective('Test');
prompt.addSharedSection('scope');
// ...
```

### 4. Validate Variables

Ensure all required variables are set before building:

```javascript
const requiredVars = ['WEB_URL', 'REPO_PATH', 'MCP_SERVER'];
const builder = new PromptBuilder();

// ... configure builder ...

// Check for unresolved placeholders in output
const prompt = builder.build();
if (prompt.includes('{{')) {
  console.warn('Warning: Unresolved variables in prompt');
}
```

## Advanced Usage

### Dynamic Section Addition

Add sections conditionally based on configuration:

```javascript
const builder = new PromptBuilder()
  .setRole('Analyst')
  .setObjective('Test application');

if (config.includeMethodology) {
  await builder.addSectionFromFile('methodology', 'shared/_methodology.txt');
}

if (config.vulnType === 'XSS') {
  await builder.addSectionFromFile('xss_guidance', 'shared/_xss-specific.txt');
}

const prompt = builder.build();
```

### Template Sections

Create reusable template sections:

```javascript
// prompts/shared/_system-architecture-vuln.txt
**Phase Sequence:** RECON (Complete) → **{{VULN_TYPE}} ANALYSIS (You)** → EXPLOITATION
**Your Input:** `deliverables/recon_deliverable.md`
**Your Output:** `deliverables/{{VULN_TYPE_LOWER}}_exploitation_queue.json`

// Usage:
await builder
  .addSectionFromFile('system_architecture', 'shared/_system-architecture-vuln.txt')
  .setVariable('VULN_TYPE', 'XSS')
  .setVariable('VULN_TYPE_LOWER', 'xss');
```

### Loading Legacy Prompts

Convert existing prompt files:

```javascript
const builder = new PromptBuilder();
await builder.loadLegacyPrompt('prompts/old-prompt.txt');

// Modify as needed
builder.setVariable('WEB_URL', newUrl);

// Save updated version
await builder.buildAndSave('prompts/updated-prompt.txt');
```

## Benefits

### Reduced Token Usage

By eliminating duplicate content across 13 prompts:
- **Before**: 4840 lines total, significant duplication
- **After**: Shared sections reduce redundancy by ~30%

### Easier Maintenance

- Update shared content once, applies to all prompts
- Centralized rules, scope definitions, and common sections
- Version control friendly (smaller diffs)

### Improved Testing

- Easier to A/B test prompt variations
- Programmatic construction enables automated testing
- Mock shared sections for unit tests

### Runtime Customization

```javascript
// Customize prompts at runtime based on user config
const prompt = createVulnAnalysisPrompt({ role: config.agentRole })
  .setVariables(config.scanParams)
  .build();
```

## Troubleshooting

### Unresolved Variables

If you see `{{VARIABLE}}` in output:
- Ensure variable is set with `setVariable()` or `setVariables()`
- Check variable name matches exactly (case-sensitive)

### Missing Sections

If @include() isn't working:
- Verify file exists in `prompts/shared/` directory
- Check file path in shared section mapping
- Ensure @include() processing happens in prompt-manager.js

### Metadata in Output

If you see copyright headers in sections loaded from files:
- PromptBuilder automatically strips metadata
- Metadata lines start with `#` or `===`
- Verify `stripMetadata()` is called in `addSectionFromFile()`

## Examples

See `examples/prompt-builder-example.js` for complete working examples.

Run examples:
```bash
node examples/prompt-builder-example.js
```

## Contributing

When adding new shared sections:
1. Create file in `prompts/shared/` with `_` prefix
2. Add metadata header (copyright + comment marker)
3. Add to `addSharedSection()` mapping if standard section
4. Document in this guide
5. Add test case in `tests/prompt-builder.test.js`
