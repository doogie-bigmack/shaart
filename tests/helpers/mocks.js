// Copyright (C) 2025 Keygraph, Inc.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License version 3
// as published by the Free Software Foundation.

/**
 * Test Mocks
 *
 * Mock functions for Claude SDK, file system operations, MCP server responses, etc.
 */

import { vi } from 'vitest';

// Mock Claude SDK Agent
export const createMockAgent = () => ({
  run: vi.fn().mockResolvedValue({
    success: true,
    result: 'Agent execution completed',
    duration: 10000,
    cost: 0.25
  })
});

// Mock file system operations
export const createMockFs = () => ({
  pathExists: vi.fn().mockResolvedValue(true),
  readFile: vi.fn().mockResolvedValue('mock file content'),
  writeFile: vi.fn().mockResolvedValue(undefined),
  writeJSON: vi.fn().mockResolvedValue(undefined),
  readJSON: vi.fn().mockResolvedValue({}),
  remove: vi.fn().mockResolvedValue(undefined),
  ensureDir: vi.fn().mockResolvedValue(undefined),
  stat: vi.fn().mockResolvedValue({ size: 1024 }),
  move: vi.fn().mockResolvedValue(undefined),
  appendFile: vi.fn().mockResolvedValue(undefined)
});

// Mock git commands
export const createMockGitCommands = () => ({
  'git rev-parse HEAD': {
    stdout: 'abc123def456\n',
    stderr: '',
    exitCode: 0
  },
  'git status --porcelain': {
    stdout: '',
    stderr: '',
    exitCode: 0
  },
  'git log --reverse --format=%H': {
    stdout: 'initial123\nabc123\ndef456\n',
    stderr: '',
    exitCode: 0
  },
  'git reset --hard': {
    stdout: 'HEAD is now at abc123\n',
    stderr: '',
    exitCode: 0
  },
  'git clean -fd': {
    stdout: 'Removing file.txt\n',
    stderr: '',
    exitCode: 0
  }
});

// Mock $ (zx) function
export const createMock$ = () => {
  const mockExec = vi.fn(async (command) => {
    const cmdStr = Array.isArray(command) ? command.join(' ') : String(command);
    const mocks = createMockGitCommands();

    // Find matching command
    for (const [key, value] of Object.entries(mocks)) {
      if (cmdStr.includes(key)) {
        return value;
      }
    }

    // Default response
    return {
      stdout: '',
      stderr: '',
      exitCode: 0
    };
  });

  return mockExec;
};

// Mock MCP save_deliverable tool
export const createMockSaveDeliverable = () => ({
  name: 'save_deliverable',
  execute: vi.fn().mockResolvedValue({
    success: true,
    message: 'Deliverable saved successfully',
    path: '/tmp/test-repo/deliverables/test.md'
  })
});

// Mock MCP generate_totp tool
export const createMockGenerateTotp = () => ({
  name: 'generate_totp',
  execute: vi.fn().mockResolvedValue({
    success: true,
    totp: '123456',
    expiresIn: 30
  })
});

// Mock AuditSession
export const createMockAuditSession = () => ({
  initialize: vi.fn().mockResolvedValue(undefined),
  startAgent: vi.fn().mockResolvedValue(undefined),
  endAgent: vi.fn().mockResolvedValue(undefined),
  logEvent: vi.fn().mockResolvedValue(undefined),
  getMetrics: vi.fn().mockResolvedValue({
    session: {
      id: 'test-session',
      status: 'in-progress'
    },
    metrics: {
      total_duration_ms: 0,
      total_cost_usd: 0,
      phases: {},
      agents: {}
    }
  }),
  markMultipleRolledBack: vi.fn().mockResolvedValue(undefined),
  updateSessionStatus: vi.fn().mockResolvedValue(undefined)
});

// Mock MetricsTracker
export const createMockMetricsTracker = () => ({
  initialize: vi.fn().mockResolvedValue(undefined),
  startAgent: vi.fn(),
  endAgent: vi.fn().mockResolvedValue(undefined),
  markRolledBack: vi.fn().mockResolvedValue(undefined),
  markMultipleRolledBack: vi.fn().mockResolvedValue(undefined),
  updateSessionStatus: vi.fn().mockResolvedValue(undefined),
  getMetrics: vi.fn().mockReturnValue({
    session: {
      id: 'test-session',
      status: 'in-progress'
    },
    metrics: {
      total_duration_ms: 0,
      total_cost_usd: 0,
      phases: {},
      agents: {}
    }
  }),
  reload: vi.fn().mockResolvedValue(undefined),
  save: vi.fn().mockResolvedValue(undefined)
});

// Mock AgentLogger
export const createMockAgentLogger = () => ({
  initialize: vi.fn().mockResolvedValue(undefined),
  logEvent: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
  savePrompt: vi.fn().mockResolvedValue(undefined)
});

// Mock session mutex
export const createMockSessionMutex = () => ({
  lock: vi.fn(async () => {
    // Return unlock function
    return vi.fn();
  })
});

// Mock prompt loader
export const createMockPromptLoader = () =>
  vi.fn().mockResolvedValue('Mock prompt content for testing');

// Mock Claude executor
export const createMockClaudeExecutor = () =>
  vi.fn().mockResolvedValue({
    success: true,
    result: 'Execution completed',
    duration: 10000,
    cost: 0.25
  });

// Mock configuration parser
export const createMockConfigParser = () => ({
  parseConfig: vi.fn().mockResolvedValue({
    rules: {
      avoid: [],
      focus: []
    },
    authentication: null
  }),
  distributeConfig: vi.fn().mockReturnValue({
    avoid: [],
    focus: [],
    authentication: null,
    models: null
  })
});

// Mock tool checker
export const createMockToolChecker = () => ({
  checkToolAvailability: vi.fn().mockResolvedValue({
    nmap: true,
    subfinder: true,
    whatweb: true,
    schemathesis: true
  }),
  handleMissingTools: vi.fn().mockReturnValue([])
});

// Mock queue validator
export const createMockQueueValidator = () => ({
  validateQueueAndDeliverable: vi.fn().mockResolvedValue({
    shouldExploit: true,
    vulnerabilityCount: 2,
    vulnType: 'injection'
  }),
  safeValidateQueueAndDeliverable: vi.fn().mockResolvedValue({
    success: true,
    data: {
      shouldExploit: true,
      vulnerabilityCount: 2,
      vulnType: 'injection'
    }
  })
});

// Helper to create a temporary test directory structure
export const createTestDirectory = async (fs, basePath) => {
  await fs.ensureDir(basePath);
  await fs.ensureDir(`${basePath}/.git`);
  await fs.ensureDir(`${basePath}/deliverables`);
  return basePath;
};

// Helper to clean up test directories
export const cleanupTestDirectory = async (fs, basePath) => {
  try {
    await fs.remove(basePath);
  } catch (error) {
    // Ignore cleanup errors
  }
};

// Mock console methods for testing output
export const mockConsole = () => {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  const logs = [];
  const errors = [];
  const warnings = [];

  console.log = vi.fn((...args) => logs.push(args.join(' ')));
  console.error = vi.fn((...args) => errors.push(args.join(' ')));
  console.warn = vi.fn((...args) => warnings.push(args.join(' ')));

  return {
    logs,
    errors,
    warnings,
    restore: () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    }
  };
};

// Helper for testing async errors
export const expectAsyncError = async (fn, expectedError) => {
  let error;
  try {
    await fn();
  } catch (e) {
    error = e;
  }

  if (!error) {
    throw new Error('Expected function to throw an error');
  }

  return error;
};

// Helper to wait for condition
export const waitFor = async (condition, timeout = 5000, interval = 100) => {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error('Timeout waiting for condition');
};
