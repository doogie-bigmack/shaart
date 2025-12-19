// Copyright (C) 2025 Keygraph, Inc.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License version 3
// as published by the Free Software Foundation.

import chalk from 'chalk';
import { progressBar, runningIndicator, COLORS } from './cli/terminal-ui.js';

export class ProgressIndicator {
  constructor(message = 'Working...', options = {}) {
    this.message = message;
    this.frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    this.frameIndex = 0;
    this.interval = null;
    this.isRunning = false;

    // Enhanced progress tracking
    this.currentTurn = 0;
    this.maxTurns = options.maxTurns || 50;
    this.currentActivity = '';
    this.startTime = null;
    this.tokenUsage = {
      input: 0,
      output: 0,
      total: 0
    };
    this.lastLoggedPercentage = -1; // Track last percentage logged in non-TTY mode

    // Check if we're in a TTY environment
    this.isTTY = process.stdout.isTTY;
  }

  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.frameIndex = 0;
    this.startTime = Date.now();

    this.interval = setInterval(() => {
      this.render();
      this.frameIndex = (this.frameIndex + 1) % this.frames.length;
    }, 100);
  }

  stop() {
    if (!this.isRunning) return;

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    // Clear the progress display
    if (this.isTTY) {
      process.stdout.write('\r\x1b[K'); // Clear current line
    }
    this.isRunning = false;
  }

  updateProgress(turn, activity = '', tokens = null) {
    this.currentTurn = turn;
    this.currentActivity = activity;

    if (tokens) {
      this.tokenUsage = {
        input: tokens.input || 0,
        output: tokens.output || 0,
        total: (tokens.input || 0) + (tokens.output || 0)
      };
    }
  }

  render() {
    if (!this.isRunning) return;

    const percentage = Math.min(Math.round((this.currentTurn / this.maxTurns) * 100), 100);

    // Calculate estimated time remaining
    const elapsed = Date.now() - this.startTime;
    const estimatedTotal = this.currentTurn > 0 ? (elapsed / this.currentTurn) * this.maxTurns : 0;
    const remaining = Math.max(0, estimatedTotal - elapsed);
    const remainingMinutes = Math.round(remaining / 60000);

    if (this.isTTY) {
      // TTY mode: Use carriage return for live updates with Nostromo styling
      let output = '';

      // Line 1: Running indicator with spinner
      output += chalk.hex(COLORS.primary)(this.frames[this.frameIndex]) + ' ' +
                chalk.hex(COLORS.dim)(this.message) + '\n';

      // Line 2: Progress bar (Nostromo style)
      output += progressBar(percentage, 20, {
        label: '',
        showPercentage: true
      }) + chalk.hex(COLORS.dim)(` (Turn ${this.currentTurn}/${this.maxTurns})`) + '\n';

      // Line 3: Current activity
      if (this.currentActivity) {
        const activityText = this.currentActivity.length > 80
          ? this.currentActivity.slice(0, 77) + '...'
          : this.currentActivity;
        output += chalk.hex(COLORS.dim)('> ') + chalk.hex(COLORS.white)(activityText) + '\n';
      }

      // Line 4: Time estimate
      if (this.currentTurn > 0) {
        const timeText = remainingMinutes > 0
          ? `${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`
          : 'less than a minute';
        output += chalk.hex(COLORS.dim)(`> Estimated time remaining: ${timeText}`) + '\n';
      }

      // Line 5: Token usage
      if (this.tokenUsage.total > 0) {
        output += chalk.hex(COLORS.dim)(
          `> Tokens: ${this.tokenUsage.total.toLocaleString()} ` +
          `(In: ${this.tokenUsage.input.toLocaleString()}, Out: ${this.tokenUsage.output.toLocaleString()})`
        );
      }

      // Move cursor up to overwrite previous output
      const lineCount = 4 + (this.currentActivity ? 0 : -1) + (this.currentTurn > 0 ? 0 : -1);
      process.stdout.write('\r\x1b[K' + output);
      if (this.frameIndex > 0) {
        process.stdout.write(`\x1b[${lineCount}A`); // Move cursor up
      }
    } else {
      // Non-TTY mode: Print periodic updates (every 10%)
      if (percentage % 10 === 0 && percentage !== this.lastLoggedPercentage) {
        console.log(progressBar(percentage, 20, {
          label: this.message,
          showPercentage: true
        }) + chalk.hex(COLORS.dim)(` (Turn ${this.currentTurn}/${this.maxTurns})`));

        if (this.currentActivity) {
          console.log(chalk.hex(COLORS.dim)(`> ${this.currentActivity}`));
        }
        if (this.tokenUsage.total > 0) {
          console.log(chalk.hex(COLORS.dim)(
            `> Tokens: ${this.tokenUsage.total.toLocaleString()} ` +
            `(In: ${this.tokenUsage.input.toLocaleString()}, Out: ${this.tokenUsage.output.toLocaleString()})`
          ));
        }
        this.lastLoggedPercentage = percentage;
      }
    }
  }

  finish(successMessage = 'Complete') {
    this.stop();
    console.log(chalk.hex(COLORS.primary)(`✓ ${successMessage}`));
  }
}
