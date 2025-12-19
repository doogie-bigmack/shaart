// Copyright (C) 2025 Keygraph, Inc.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License version 3
// as published by the Free Software Foundation.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkToolAvailability, handleMissingTools } from '../src/tool-checker.js';

// Mock zx module
vi.mock('zx', async () => {
  const actualZx = await vi.importActual('zx');
  return {
    ...actualZx,
    $: vi.fn()
  };
});

describe('checkToolAvailability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('should return all tools as available when found', async () => {
    const { $ } = await import('zx');
    $.mockResolvedValue({ exitCode: 0 });

    const availability = await checkToolAvailability();

    expect(availability.nmap).toBe(true);
    expect(availability.subfinder).toBe(true);
    expect(availability.whatweb).toBe(true);
    expect(availability.schemathesis).toBe(true);
  });

  it('should return false for missing tools', async () => {
    const { $ } = await import('zx');
    $.mockImplementation(async (cmd) => {
      const cmdStr = String(cmd);
      if (cmdStr.includes('nmap')) {
        throw new Error('Command not found');
      }
      return { exitCode: 0 };
    });

    const availability = await checkToolAvailability();

    expect(availability.nmap).toBe(false);
    expect(availability.subfinder).toBe(true);
    expect(availability.whatweb).toBe(true);
    expect(availability.schemathesis).toBe(true);
  });

  it('should handle multiple missing tools', async () => {
    const { $ } = await import('zx');
    $.mockImplementation(async (cmd) => {
      const cmdStr = String(cmd);
      if (cmdStr.includes('nmap') || cmdStr.includes('subfinder')) {
        throw new Error('Command not found');
      }
      return { exitCode: 0 };
    });

    const availability = await checkToolAvailability();

    expect(availability.nmap).toBe(false);
    expect(availability.subfinder).toBe(false);
    expect(availability.whatweb).toBe(true);
    expect(availability.schemathesis).toBe(true);
  });

  it('should log tool availability status', async () => {
    const { $ } = await import('zx');
    $.mockResolvedValue({ exitCode: 0 });

    const consoleSpy = vi.spyOn(console, 'log');

    await checkToolAvailability();

    expect(consoleSpy).toHaveBeenCalled();
  });
});

describe('handleMissingTools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('should return empty array when all tools available', () => {
    const toolAvailability = {
      nmap: true,
      subfinder: true,
      whatweb: true,
      schemathesis: true
    };

    const missing = handleMissingTools(toolAvailability);

    expect(missing).toEqual([]);
  });

  it('should return missing tool names', () => {
    const toolAvailability = {
      nmap: false,
      subfinder: true,
      whatweb: false,
      schemathesis: true
    };

    const missing = handleMissingTools(toolAvailability);

    expect(missing).toEqual(['nmap', 'whatweb']);
  });

  it('should log warning for missing tools', () => {
    const consoleSpy = vi.spyOn(console, 'log');

    const toolAvailability = {
      nmap: false,
      subfinder: true,
      whatweb: true,
      schemathesis: true
    };

    handleMissingTools(toolAvailability);

    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should provide installation hints', () => {
    const consoleSpy = vi.spyOn(console, 'log');

    const toolAvailability = {
      nmap: false,
      subfinder: false,
      whatweb: true,
      schemathesis: true
    };

    handleMissingTools(toolAvailability);

    // Should log installation hints
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Installation hints')
    );
  });

  it('should handle all tools missing', () => {
    const toolAvailability = {
      nmap: false,
      subfinder: false,
      whatweb: false,
      schemathesis: false
    };

    const missing = handleMissingTools(toolAvailability);

    expect(missing).toEqual(['nmap', 'subfinder', 'whatweb', 'schemathesis']);
  });

  it('should not log when no tools are missing', () => {
    const consoleSpy = vi.spyOn(console, 'log');

    const toolAvailability = {
      nmap: true,
      subfinder: true,
      whatweb: true,
      schemathesis: true
    };

    handleMissingTools(toolAvailability);

    // Should not log warnings when all tools are available
    const warningCalls = consoleSpy.mock.calls.filter(call =>
      call.some(arg => String(arg).includes('Missing tools'))
    );
    expect(warningCalls.length).toBe(0);
  });
});
