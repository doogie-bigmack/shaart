// Copyright (C) 2025 Keygraph, Inc.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License version 3
// as published by the Free Software Foundation.

import { $ } from 'zx';
import chalk from 'chalk';
import { systemMessage, statusLine, COLORS } from './cli/terminal-ui.js';

// Check availability of required tools
export const checkToolAvailability = async () => {
  const tools = ['nmap', 'subfinder', 'whatweb', 'schemathesis'];
  const availability = {};

  console.log(systemMessage('Checking tool availability...', { color: COLORS.dim }));

  for (const tool of tools) {
    try {
      await $`command -v ${tool}`;
      availability[tool] = true;
      console.log(statusLine('+', `${tool} - available`, { color: COLORS.primary, indent: 4 }));
    } catch {
      availability[tool] = false;
      console.log(statusLine('-', `${tool} - not found`, { color: COLORS.warning, indent: 4 }));
    }
  }

  return availability;
};

// Handle missing tools with user-friendly messages
export const handleMissingTools = (toolAvailability) => {
  const missing = Object.entries(toolAvailability)
    .filter(([tool, available]) => !available)
    .map(([tool]) => tool);

  if (missing.length > 0) {
    console.log(statusLine('!', `Missing tools: ${missing.join(', ')}`, {
      color: COLORS.warning,
      indent: 0
    }));
    console.log(chalk.hex(COLORS.dim)('Some functionality will be limited. Install missing tools for full capability.'));

    // Provide installation hints
    const installHints = {
      'nmap': 'brew install nmap (macOS) or apt install nmap (Ubuntu)',
      'subfinder': 'go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest',
      'whatweb': 'gem install whatweb',
      'schemathesis': 'pip install schemathesis'
    };

    console.log(chalk.hex(COLORS.dim)('\nInstallation hints:'));
    missing.forEach(tool => {
      if (installHints[tool]) {
        console.log(chalk.hex(COLORS.dim)(`  ${tool}: ${installHints[tool]}`));
      }
    });
    console.log('');
  }

  return missing;
};
