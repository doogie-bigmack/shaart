// Copyright (C) 2025 Keygraph, Inc.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License version 3
// as published by the Free Software Foundation.

import chalk from 'chalk';
import gradient from 'gradient-string';

// Nostromo terminal color scheme
const COLORS = {
  primary: '#00FF00',    // Bright green
  secondary: '#00DD00',  // Slightly darker green
  tertiary: '#00FF41',   // Lime green
  warning: '#FFCC00',    // Amber
  error: '#FF4444',      // Red
  dim: '#008800',        // Dim green
  white: '#FFFFFF'       // White for emphasis
};

// Apply CRT glow effect using gradient
function applyGlow(text) {
  return gradient([COLORS.secondary, COLORS.primary, COLORS.tertiary])(text);
}

// Box drawing characters for retro terminal feel
const BOX = {
  horizontal: '─',
  vertical: '│',
  topLeft: '┌',
  topRight: '┐',
  bottomLeft: '└',
  bottomRight: '┘',
  heavyHorizontal: '═',
  heavyVertical: '║',
  tee: '├',
  cross: '┼'
};

/**
 * Create a retro terminal box
 */
export function terminalBox(title, content, width = 60) {
  const lines = [];
  const titleText = ` ${title} `;
  const padding = Math.max(0, width - titleText.length - 2);
  const leftPad = Math.floor(padding / 2);
  const rightPad = Math.ceil(padding / 2);

  // Top border with title
  lines.push(
    chalk.hex(COLORS.primary)(
      BOX.topLeft + BOX.horizontal.repeat(leftPad) + titleText + BOX.horizontal.repeat(rightPad) + BOX.topRight
    )
  );

  // Content lines
  const contentLines = content.split('\n');
  for (const line of contentLines) {
    const textWidth = width - 2;
    const paddedLine = line.padEnd(textWidth, ' ');
    lines.push(
      chalk.hex(COLORS.primary)(BOX.vertical) +
      ' ' + paddedLine + ' ' +
      chalk.hex(COLORS.primary)(BOX.vertical)
    );
  }

  // Bottom border
  lines.push(
    chalk.hex(COLORS.primary)(
      BOX.bottomLeft + BOX.horizontal.repeat(width) + BOX.bottomRight
    )
  );

  return lines.join('\n');
}

/**
 * System message with > prefix (Nostromo style)
 */
export function systemMessage(message, options = {}) {
  const {
    prefix = '>',
    color = COLORS.primary,
    suffix = '',
    dim = false
  } = options;

  const colorFunc = dim ? chalk.hex(COLORS.dim) : chalk.hex(color);
  return colorFunc(`${prefix} ${message}${suffix}`);
}

/**
 * Progress bar in Nostromo style
 */
export function progressBar(percentage, width = 30, options = {}) {
  const {
    label = '',
    showPercentage = true,
    filled = '█',
    empty = '░'
  } = options;

  const filledWidth = Math.round((width * percentage) / 100);
  const emptyWidth = width - filledWidth;

  const bar =
    chalk.hex(COLORS.primary)(filled.repeat(filledWidth)) +
    chalk.hex(COLORS.secondary)(empty.repeat(emptyWidth));

  const percentText = showPercentage ? ` ${percentage}%` : '';
  const labelText = label ? `${label} ` : '';

  return systemMessage(`${labelText}[${bar}]${percentText}`, { prefix: '' });
}

/**
 * Status indicator with icon
 */
export function statusLine(icon, message, options = {}) {
  const {
    color = COLORS.primary,
    indent = 0,
    dimMessage = false
  } = options;

  const indentStr = ' '.repeat(indent);
  const iconColor = chalk.hex(color);
  const messageColor = dimMessage ? chalk.hex(COLORS.dim) : chalk.hex(COLORS.white);

  return `${indentStr}${iconColor(icon)} ${messageColor(message)}`;
}

/**
 * Running/processing indicator
 */
export function runningIndicator(message, turn = 0, maxTurns = 10000) {
  const percentage = Math.min(Math.round((turn / maxTurns) * 100), 100);
  return systemMessage(`${message}`, {
    suffix: ` [${percentage}%]`,
    dim: true
  });
}

/**
 * Completion message with timing and cost
 */
export function completionMessage(agentName, duration, cost, options = {}) {
  const {
    turns = 0,
    success = true,
    model = 'Sonnet'
  } = options;

  const icon = success ? '+' : '-';
  const status = success ? 'COMPLETED' : 'FAILED';
  const statusColor = success ? COLORS.primary : COLORS.error;

  const lines = [];
  lines.push('');
  lines.push(chalk.hex(statusColor).bold(`    ${icon} ${status}:`));
  lines.push(chalk.hex(COLORS.dim)(`    > Duration: ${duration}s, Cost: $${cost.toFixed(4)}`));

  if (turns > 0) {
    lines.push(chalk.hex(COLORS.dim)(`    > Cost: $${cost.toFixed(4)} (${model})`));
  }

  return lines.join('\n');
}

/**
 * Agent activity message (replaces boring "Running analysis...")
 */
export function agentActivity(agentName, activity, options = {}) {
  const { emoji = '>', color = COLORS.primary } = options;
  return statusLine(emoji, `${agentName}: ${activity}`, { color, dimMessage: true });
}

/**
 * Phase header (PHASE 1: PRE-RECONNAISSANCE style)
 */
export function phaseHeader(phaseNumber, phaseName, options = {}) {
  const { emoji = '>' } = options;
  const header = `${emoji} PHASE ${phaseNumber}: ${phaseName.toUpperCase()}`;

  const lines = [];
  lines.push('');
  lines.push(applyGlow(header));
  lines.push(chalk.hex(COLORS.secondary)(BOX.heavyHorizontal.repeat(header.length)));

  return lines.join('\n');
}

/**
 * Validation result
 */
export function validationResult(passed, message) {
  const icon = passed ? '+' : '-';
  const color = passed ? COLORS.primary : COLORS.error;
  return statusLine(icon, message, { color, indent: 4 });
}

/**
 * Commit result
 */
export function commitResult(success, filesChanged, message = '') {
  if (success) {
    return statusLine('+', `Success commit created with ${filesChanged} file changes`, {
      color: COLORS.primary,
      indent: 4
    });
  } else {
    return statusLine('-', `Commit failed: ${message}`, {
      color: COLORS.error,
      indent: 4
    });
  }
}

/**
 * Checkpoint message
 */
export function checkpointMessage(action, agentName, attempt = null) {
  const actions = {
    creating: '>',
    created: '+',
    failed: '-',
    rolling_back: '<'
  };

  const icon = actions[action] || '•';
  const attemptText = attempt ? ` (attempt ${attempt})` : '';
  const messages = {
    creating: `Creating checkpoint for ${agentName}${attemptText}`,
    created: `Checkpoint created${attemptText}`,
    failed: `Checkpoint creation failed for ${agentName}`,
    rolling_back: `Rolling back to ${agentName}`
  };

  return statusLine(icon, messages[action], {
    color: action === 'failed' ? COLORS.error : COLORS.primary,
    indent: 4
  });
}

/**
 * Summary line (for phase/scan completion)
 */
export function summaryLine(completed, total, duration, options = {}) {
  const { label = 'Summary', cost = null } = options;

  const durationText = typeof duration === 'string' ? duration : `${(duration/1000).toFixed(1)}s`;
  let message = `${label}: ${completed}/${total} succeeded in ${durationText}`;

  if (cost !== null) {
    message += ` ($${cost.toFixed(4)})`;
  }

  return systemMessage(message, { color: COLORS.tertiary });
}

/**
 * Status table header (for --status command)
 */
export function tableHeader(columns, widths) {
  const headerText = columns.map((col, i) => col.padEnd(widths[i])).join(' ');
  return chalk.hex(COLORS.primary).bold(headerText);
}

/**
 * Status table row
 */
export function tableRow(values, widths, options = {}) {
  const {
    statusColor = COLORS.white,
    dimmed = false
  } = options;

  const colorFunc = dimmed ? chalk.hex(COLORS.dim) : chalk.hex(statusColor);
  const rowText = values.map((val, i) => val.toString().padEnd(widths[i])).join(' ');
  return colorFunc(rowText);
}

/**
 * Error message
 */
export function errorMessage(message, options = {}) {
  const { fatal = false, details = null } = options;

  const lines = [];
  lines.push('');
  lines.push(statusLine('!', message, { color: COLORS.error }));

  if (details) {
    lines.push(chalk.hex(COLORS.dim)(`    ${details}`));
  }

  return lines.join('\n');
}

/**
 * Tool execution result
 */
export function toolResult(toolName, success, duration, options = {}) {
  const { output = null } = options;

  const icon = success ? '+' : '-';
  const color = success ? COLORS.primary : COLORS.error;
  const durationText = typeof duration === 'string' ? duration : `${(duration/1000).toFixed(1)}s`;

  return statusLine(icon, `${toolName} ${success ? 'completed' : 'failed'} in ${durationText}`, {
    color,
    indent: 4
  });
}

/**
 * Separator line
 */
export function separator(width = 70, style = 'light') {
  const char = style === 'heavy' ? BOX.heavyHorizontal : BOX.horizontal;
  return chalk.hex(COLORS.secondary)(char.repeat(width));
}

/**
 * Waiting/loading message
 */
export function waitingMessage(message) {
  return systemMessage(`AWAITING ${message.toUpperCase()}...`, { color: COLORS.tertiary });
}

/**
 * Model indicator
 */
export function modelIndicator(modelName, phase = '') {
  const phaseText = phase ? ` (${phase})` : '';
  return statusLine('>', `Model: ${modelName}${phaseText}`, {
    color: COLORS.dim,
    indent: 4
  });
}

// Export color constants for direct use
export { COLORS, BOX };
