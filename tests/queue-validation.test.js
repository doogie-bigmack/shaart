// Copyright (C) 2025 Keygraph, Inc.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License version 3
// as published by the Free Software Foundation.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fs, path } from 'zx';
import {
  validateQueueAndDeliverable,
  safeValidateQueueAndDeliverable
} from '../src/queue-validation.js';
import {
  validVulnerabilityQueue,
  emptyVulnerabilityQueue,
  invalidQueues
} from './helpers/fixtures.js';
import { PentestError } from '../src/error-handling.js';

describe('validateQueueAndDeliverable', () => {
  const testDir = '/tmp/shaart-test-queue-validation';

  beforeEach(async () => {
    await fs.ensureDir(testDir);
    await fs.ensureDir(path.join(testDir, 'deliverables'));
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('file existence validation', () => {
    it('should throw error when neither deliverable nor queue exists', async () => {
      await expect(
        validateQueueAndDeliverable('injection', testDir)
      ).rejects.toThrow('Analysis failed: Neither deliverable nor queue file exists');
    });

    it('should throw error when queue missing but deliverable exists', async () => {
      const deliverablePath = path.join(testDir, 'deliverables', 'injection_analysis_deliverable.md');
      await fs.writeFile(deliverablePath, '# Analysis');

      await expect(
        validateQueueAndDeliverable('injection', testDir)
      ).rejects.toThrow('Analysis incomplete: Deliverable exists but queue file missing');
    });

    it('should throw error when deliverable missing but queue exists', async () => {
      const queuePath = path.join(testDir, 'deliverables', 'injection_exploitation_queue.json');
      await fs.writeJSON(queuePath, validVulnerabilityQueue);

      await expect(
        validateQueueAndDeliverable('injection', testDir)
      ).rejects.toThrow('Analysis incomplete: Queue exists but deliverable file missing');
    });
  });

  describe('queue structure validation', () => {
    it('should throw error for invalid JSON', async () => {
      const deliverablePath = path.join(testDir, 'deliverables', 'injection_analysis_deliverable.md');
      const queuePath = path.join(testDir, 'deliverables', 'injection_exploitation_queue.json');

      await fs.writeFile(deliverablePath, '# Analysis');
      await fs.writeFile(queuePath, 'not valid json {');

      await expect(
        validateQueueAndDeliverable('injection', testDir)
      ).rejects.toThrow('Queue validation failed for injection: Invalid JSON structure');
    });

    it('should throw error for missing vulnerabilities array', async () => {
      const deliverablePath = path.join(testDir, 'deliverables', 'injection_analysis_deliverable.md');
      const queuePath = path.join(testDir, 'deliverables', 'injection_exploitation_queue.json');

      await fs.writeFile(deliverablePath, '# Analysis');
      await fs.writeJSON(queuePath, invalidQueues.noVulnerabilities);

      await expect(
        validateQueueAndDeliverable('injection', testDir)
      ).rejects.toThrow("Missing or invalid 'vulnerabilities' array");
    });

    it('should throw error for invalid vulnerabilities type', async () => {
      const deliverablePath = path.join(testDir, 'deliverables', 'injection_analysis_deliverable.md');
      const queuePath = path.join(testDir, 'deliverables', 'injection_exploitation_queue.json');

      await fs.writeFile(deliverablePath, '# Analysis');
      await fs.writeJSON(queuePath, invalidQueues.invalidArray);

      await expect(
        validateQueueAndDeliverable('injection', testDir)
      ).rejects.toThrow("Missing or invalid 'vulnerabilities' array");
    });
  });

  describe('successful validation', () => {
    it('should return shouldExploit=true for non-empty queue', async () => {
      const deliverablePath = path.join(testDir, 'deliverables', 'injection_analysis_deliverable.md');
      const queuePath = path.join(testDir, 'deliverables', 'injection_exploitation_queue.json');

      await fs.writeFile(deliverablePath, '# Analysis');
      await fs.writeJSON(queuePath, validVulnerabilityQueue);

      const result = await validateQueueAndDeliverable('injection', testDir);

      expect(result.shouldExploit).toBe(true);
      expect(result.vulnerabilityCount).toBe(2);
      expect(result.vulnType).toBe('injection');
    });

    it('should return shouldExploit=false for empty queue', async () => {
      const deliverablePath = path.join(testDir, 'deliverables', 'injection_analysis_deliverable.md');
      const queuePath = path.join(testDir, 'deliverables', 'injection_exploitation_queue.json');

      await fs.writeFile(deliverablePath, '# Analysis');
      await fs.writeJSON(queuePath, emptyVulnerabilityQueue);

      const result = await validateQueueAndDeliverable('injection', testDir);

      expect(result.shouldExploit).toBe(false);
      expect(result.vulnerabilityCount).toBe(0);
    });
  });

  describe('all vulnerability types', () => {
    const vulnTypes = ['injection', 'xss', 'auth', 'ssrf', 'authz'];

    vulnTypes.forEach(vulnType => {
      it(`should validate ${vulnType} vulnerability type`, async () => {
        const deliverablePath = path.join(testDir, 'deliverables', `${vulnType}_analysis_deliverable.md`);
        const queuePath = path.join(testDir, 'deliverables', `${vulnType}_exploitation_queue.json`);

        await fs.writeFile(deliverablePath, '# Analysis');
        await fs.writeJSON(queuePath, validVulnerabilityQueue);

        const result = await validateQueueAndDeliverable(vulnType, testDir);

        expect(result.vulnType).toBe(vulnType);
        expect(result.shouldExploit).toBe(true);
      });
    });
  });

  describe('unknown vulnerability type', () => {
    it('should throw error for unknown vulnerability type', async () => {
      await expect(
        validateQueueAndDeliverable('unknown-vuln', testDir)
      ).rejects.toThrow('Unknown vulnerability type: unknown-vuln');
    });
  });
});

describe('safeValidateQueueAndDeliverable', () => {
  const testDir = '/tmp/shaart-test-safe-validation';

  beforeEach(async () => {
    await fs.ensureDir(testDir);
    await fs.ensureDir(path.join(testDir, 'deliverables'));
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  it('should return success for valid queue', async () => {
    const deliverablePath = path.join(testDir, 'deliverables', 'injection_analysis_deliverable.md');
    const queuePath = path.join(testDir, 'deliverables', 'injection_exploitation_queue.json');

    await fs.writeFile(deliverablePath, '# Analysis');
    await fs.writeJSON(queuePath, validVulnerabilityQueue);

    const result = await safeValidateQueueAndDeliverable('injection', testDir);

    expect(result.success).toBe(true);
    expect(result.data.shouldExploit).toBe(true);
    expect(result.data.vulnerabilityCount).toBe(2);
  });

  it('should return error for invalid queue without throwing', async () => {
    const result = await safeValidateQueueAndDeliverable('injection', testDir);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toBeInstanceOf(PentestError);
  });

  it('should return error for missing files', async () => {
    const result = await safeValidateQueueAndDeliverable('injection', testDir);

    expect(result.success).toBe(false);
    expect(result.error.message).toContain('Neither deliverable nor queue file exists');
  });

  it('should return error for invalid JSON', async () => {
    const deliverablePath = path.join(testDir, 'deliverables', 'injection_analysis_deliverable.md');
    const queuePath = path.join(testDir, 'deliverables', 'injection_exploitation_queue.json');

    await fs.writeFile(deliverablePath, '# Analysis');
    await fs.writeFile(queuePath, 'invalid json');

    const result = await safeValidateQueueAndDeliverable('injection', testDir);

    expect(result.success).toBe(false);
    expect(result.error.message).toContain('Invalid JSON structure');
  });
});
