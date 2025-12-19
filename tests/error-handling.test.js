// Copyright (C) 2025 Keygraph, Inc.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License version 3
// as published by the Free Software Foundation.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PentestError,
  logError,
  handleToolError,
  handlePromptError,
  isRetryableError,
  getRetryDelay
} from '../src/error-handling.js';

describe('PentestError', () => {
  it('should create error with all properties', () => {
    const error = new PentestError(
      'Test error',
      'config',
      true,
      { key: 'value' }
    );

    expect(error.message).toBe('Test error');
    expect(error.name).toBe('PentestError');
    expect(error.type).toBe('config');
    expect(error.retryable).toBe(true);
    expect(error.context).toEqual({ key: 'value' });
    expect(error.timestamp).toBeDefined();
  });

  it('should default retryable to false', () => {
    const error = new PentestError('Test error', 'validation');

    expect(error.retryable).toBe(false);
  });

  it('should default context to empty object', () => {
    const error = new PentestError('Test error', 'network');

    expect(error.context).toEqual({});
  });

  it('should be instanceof Error', () => {
    const error = new PentestError('Test error', 'config');

    expect(error instanceof Error).toBe(true);
  });
});

describe('logError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should log retryable error with warning', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const error = new PentestError('Network error', 'network', true);

    const logEntry = await logError(error, 'Test context');

    expect(logEntry.context).toBe('Test context');
    expect(logEntry.error.message).toBe('Network error');
    expect(logEntry.error.retryable).toBe(true);
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should log non-retryable error', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const error = new PentestError('Config error', 'config', false);

    const logEntry = await logError(error, 'Test context');

    expect(logEntry.error.retryable).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should log error with context', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const error = new PentestError('Error', 'validation', false, { file: 'test.txt' });

    const logEntry = await logError(error, 'Test context');

    expect(logEntry.error.type).toBe('validation');
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});

describe('handleToolError', () => {
  it('should handle network error as retryable', () => {
    const error = new Error('Connection reset');
    error.code = 'ECONNRESET';

    const result = handleToolError('nmap', error);

    expect(result.tool).toBe('nmap');
    expect(result.status).toBe('error');
    expect(result.success).toBe(false);
    expect(result.error.retryable).toBe(true);
  });

  it('should handle timeout error as retryable', () => {
    const error = new Error('Connection timeout');
    error.code = 'ETIMEDOUT';

    const result = handleToolError('subfinder', error);

    expect(result.error.retryable).toBe(true);
  });

  it('should handle DNS error as retryable', () => {
    const error = new Error('DNS not found');
    error.code = 'ENOTFOUND';

    const result = handleToolError('whatweb', error);

    expect(result.error.retryable).toBe(true);
  });

  it('should handle generic error as non-retryable', () => {
    const error = new Error('Generic error');

    const result = handleToolError('nmap', error);

    expect(result.error.retryable).toBe(false);
  });
});

describe('handlePromptError', () => {
  it('should create non-retryable error for prompt loading', () => {
    const error = new Error('File not found');

    const result = handlePromptError('vuln-injection', error);

    expect(result.success).toBe(false);
    expect(result.error.type).toBe('prompt');
    expect(result.error.retryable).toBe(false);
  });
});

describe('isRetryableError', () => {
  it('should identify network errors as retryable', () => {
    const error = new Error('network connection failed');
    expect(isRetryableError(error)).toBe(true);
  });

  it('should identify connection errors as retryable', () => {
    const error = new Error('connection refused');
    expect(isRetryableError(error)).toBe(true);
  });

  it('should identify timeout errors as retryable', () => {
    const error = new Error('request timeout');
    expect(isRetryableError(error)).toBe(true);
  });

  it('should identify rate limit errors as retryable', () => {
    const error = new Error('rate limit exceeded');
    expect(isRetryableError(error)).toBe(true);

    const error429 = new Error('429 Too Many Requests');
    expect(isRetryableError(error429)).toBe(true);
  });

  it('should identify server errors as retryable', () => {
    const error = new Error('internal server error');
    expect(isRetryableError(error)).toBe(true);

    const error503 = new Error('503 service unavailable');
    expect(isRetryableError(error503)).toBe(true);
  });

  it('should identify max turns error as retryable', () => {
    const error = new Error('maximum turns exceeded');
    expect(isRetryableError(error)).toBe(true);
  });

  it('should identify authentication errors as non-retryable', () => {
    const error = new Error('authentication failed');
    expect(isRetryableError(error)).toBe(false);
  });

  it('should identify permission errors as non-retryable', () => {
    const error = new Error('permission denied');
    expect(isRetryableError(error)).toBe(false);
  });

  it('should identify invalid API key as non-retryable', () => {
    const error = new Error('invalid api key');
    expect(isRetryableError(error)).toBe(false);
  });

  it('should default unknown errors to non-retryable', () => {
    const error = new Error('some unknown error');
    expect(isRetryableError(error)).toBe(false);
  });
});

describe('getRetryDelay', () => {
  it('should return longer delay for rate limit errors', () => {
    const error = new Error('rate limit exceeded');

    const delay1 = getRetryDelay(error, 1);
    const delay2 = getRetryDelay(error, 2);

    expect(delay1).toBeGreaterThanOrEqual(30000);
    expect(delay2).toBeGreaterThan(delay1);
    expect(delay2).toBeLessThanOrEqual(120000);
  });

  it('should use exponential backoff for other errors', () => {
    const error = new Error('network error');

    const delay1 = getRetryDelay(error, 1);
    const delay2 = getRetryDelay(error, 2);
    const delay3 = getRetryDelay(error, 3);

    expect(delay1).toBeGreaterThanOrEqual(2000);
    expect(delay2).toBeGreaterThan(delay1);
    expect(delay3).toBeGreaterThan(delay2);
    expect(delay3).toBeLessThanOrEqual(30000);
  });

  it('should cap maximum delay at 30s for non-rate-limit errors', () => {
    const error = new Error('network error');

    const delay = getRetryDelay(error, 10);

    expect(delay).toBeLessThanOrEqual(30000);
  });

  it('should include jitter in delay', () => {
    const error = new Error('network error');

    const delays = [];
    for (let i = 0; i < 10; i++) {
      delays.push(getRetryDelay(error, 1));
    }

    // With jitter, delays should vary
    const uniqueDelays = new Set(delays);
    expect(uniqueDelays.size).toBeGreaterThan(1);
  });
});
