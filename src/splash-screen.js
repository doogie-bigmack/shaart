// Copyright (C) 2025 Keygraph, Inc.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License version 3
// as published by the Free Software Foundation.

import figlet from 'figlet';
import gradient from 'gradient-string';
import chalk from 'chalk';
import { fs, path } from 'zx';

// Sleep utility for animation timing
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Typewriter effect - character by character
async function typewriterEffect(text, color = chalk.hex('#00FF00'), delayMs = 30) {
  for (const char of text) {
    process.stdout.write(color(char));
    await sleep(delayMs);
  }
  process.stdout.write('\n');
}

// Line-by-line with delay
async function bootSequenceLine(text, delayMs = 100) {
  await typewriterEffect(text, chalk.hex('#00FF00'), 20);
  await sleep(delayMs);
}

// Loading bar with blocks
async function loadingBar(label, durationMs = 2000) {
  const width = 30;
  const steps = 20;
  const stepDelay = durationMs / steps;

  process.stdout.write(chalk.hex('#00FF00')(`> ${label} [`));

  for (let i = 0; i < width; i++) {
    await sleep(stepDelay);
    if (i < width * 0.7) {
      process.stdout.write(chalk.hex('#00FF00')('█'));
    } else {
      process.stdout.write(chalk.hex('#00DD00')('░'));
    }
  }

  process.stdout.write(chalk.hex('#00FF00')('] OK\n'));
}

// CRT glow effect using gradient
function applyGlow(text) {
  return gradient(['#00DD00', '#00FF00', '#00FF41'])(text);
}

// Nostromo boot sequence
async function nostromoBootSequence(version) {
  console.clear();

  // Header with typewriter effect
  await typewriterEffect(
    'WEYLAND-YUTANI CORP :: SECURITY TERMINAL v' + version,
    chalk.hex('#00FF00'),
    25
  );
  await typewriterEffect('═'.repeat(70), chalk.hex('#00DD00'), 5);
  await sleep(200);

  // Boot messages
  await bootSequenceLine('> INITIALIZING SYSTEM...', 300);
  await bootSequenceLine('> LOADING BIOS... OK', 200);
  await bootSequenceLine('> CHECKING MEMORY... 64K OK', 200);
  await bootSequenceLine('> MOUNTING DRIVES... OK', 200);
  await sleep(300);

  await bootSequenceLine('> BOOTING SECURITY SUBSYSTEM...', 400);
  await bootSequenceLine('> LOADING MU/TH/UR 6000 PROTOCOLS...', 600);
  await bootSequenceLine('> INITIALIZING AI MODULES...', 500);
  await sleep(400);

  // ASCII art (instant display after boot with glow effect)
  const artText = figlet.textSync('SHAART', {
    font: 'ANSI Shadow',
    horizontalLayout: 'default',
    verticalLayout: 'default'
  });

  console.log('\n' + applyGlow(artText));
  await sleep(300);

  // System info
  await bootSequenceLine('> SECURITY HUNTING AI AGENT FOR RECON & TESTING', 100);
  await bootSequenceLine('> SYSTEM STATUS........................... [ACTIVE]', 100);
  await bootSequenceLine('> AUTHORIZATION................. [REQUIRED - READ ONLY]', 100);
  await sleep(300);

  // Warnings with amber color
  console.log('\n' + chalk.hex('#FFCC00')('⚠ WARNING: DEFENSIVE SECURITY OPERATIONS ONLY'));
  await sleep(100);
  console.log(chalk.hex('#FFCC00')('⚠ UNAUTHORIZED ACCESS PROHIBITED :: 18 U.S.C. § 1030\n'));
  await sleep(300);

  await bootSequenceLine('> AWAITING TARGET CONFIGURATION...', 200);
  await sleep(500);
}

// Quick splash (for skip animation mode)
function generateQuickSplash(version) {
  console.clear();

  const artText = figlet.textSync('SHAART', {
    font: 'ANSI Shadow',
    horizontalLayout: 'default',
    verticalLayout: 'default'
  });

  const content = [
    chalk.hex('#00FF00')('WEYLAND-YUTANI CORP :: SECURITY TERMINAL v' + version),
    chalk.hex('#00DD00')('═'.repeat(70)),
    '',
    applyGlow(artText),
    '',
    chalk.hex('#00FF00')('> SECURITY HUNTING AI AGENT FOR RECON & TESTING'),
    chalk.hex('#00FF00')('> SYSTEM STATUS........................... [ACTIVE]'),
    chalk.hex('#00FF00')('> AUTHORIZATION................. [REQUIRED - READ ONLY]'),
    '',
    chalk.hex('#FFCC00')('⚠ WARNING: DEFENSIVE SECURITY OPERATIONS ONLY'),
    chalk.hex('#FFCC00')('⚠ UNAUTHORIZED ACCESS PROHIBITED :: 18 U.S.C. § 1030'),
    ''
  ].join('\n');

  console.log(content);
}

export const displaySplashScreen = async () => {
  try {
    // Get version info from package.json
    const packagePath = path.join(import.meta.dirname, '..', 'package.json');
    const packageJson = await fs.readJSON(packagePath);
    const version = packageJson.version || '1.0.0';

    // Check for skip animation flag
    const SKIP_ANIMATION = process.env.SHAART_SKIP_ANIMATION === 'true';

    if (SKIP_ANIMATION) {
      // Show instant version
      generateQuickSplash(version);
    } else {
      // Full animated boot sequence
      await nostromoBootSequence(version);
    }

  } catch (error) {
    // Fallback to simple splash if anything fails
    console.clear();
    console.log(chalk.hex('#00FF00').bold('\n🚀 SHAART - Security Hunting AI Agent for Recon & Testing\n'));
    console.log(chalk.hex('#FFCC00')('⚠️  Could not load full splash screen:', error.message));
    console.log('');
  }
};
