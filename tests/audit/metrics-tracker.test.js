// Copyright (C) 2025 Keygraph, Inc.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License version 3
// as published by the Free Software Foundation.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { fs, path } from 'zx';
import { MetricsTracker } from '../../src/audit/metrics-tracker.js';
import { createMockSession } from '../helpers/fixtures.js';

describe('MetricsTracker', () => {
  const testDir = '/tmp/shaart-test-metrics';
  let sessionMetadata;
  let tracker;

  beforeEach(async () => {
    await fs.ensureDir(testDir);

    sessionMetadata = createMockSession({
      targetRepo: testDir
    });

    // Create the audit logs directory structure
    const hostname = new URL(sessionMetadata.webUrl).hostname.replace(/[^a-zA-Z0-9-]/g, '-');
    const sessionDir = path.join(process.cwd(), 'audit-logs', `${hostname}_${sessionMetadata.id}`);
    await fs.ensureDir(sessionDir);

    tracker = new MetricsTracker(sessionMetadata);
  });

  afterEach(async () => {
    await fs.remove(testDir);
    // Clean up audit logs
    const auditLogsDir = path.join(process.cwd(), 'audit-logs');
    if (await fs.pathExists(auditLogsDir)) {
      await fs.remove(auditLogsDir);
    }
  });

  describe('initialize', () => {
    it('should create initial session.json', async () => {
      await tracker.initialize();

      const metrics = tracker.getMetrics();

      expect(metrics.session.id).toBe(sessionMetadata.id);
      expect(metrics.session.webUrl).toBe(sessionMetadata.webUrl);
      expect(metrics.metrics.total_duration_ms).toBe(0);
      expect(metrics.metrics.total_cost_usd).toBe(0);
    });

    it('should load existing session.json', async () => {
      await tracker.initialize();

      // Create new tracker for same session
      const tracker2 = new MetricsTracker(sessionMetadata);
      await tracker2.initialize();

      const metrics = tracker2.getMetrics();
      expect(metrics.session.id).toBe(sessionMetadata.id);
    });

    it('should be idempotent', async () => {
      await tracker.initialize();
      await tracker.initialize();

      const metrics = tracker.getMetrics();
      expect(metrics.session.id).toBe(sessionMetadata.id);
    });
  });

  describe('startAgent and endAgent', () => {
    beforeEach(async () => {
      await tracker.initialize();
    });

    it('should track successful agent execution', async () => {
      tracker.startAgent('pre-recon', 1);

      await tracker.endAgent('pre-recon', {
        attemptNumber: 1,
        duration_ms: 10000,
        cost_usd: 0.25,
        success: true,
        checkpoint: 'abc123'
      });

      const metrics = tracker.getMetrics();
      const agent = metrics.metrics.agents['pre-recon'];

      expect(agent.status).toBe('success');
      expect(agent.final_duration_ms).toBe(10000);
      expect(agent.total_cost_usd).toBe(0.25);
      expect(agent.checkpoint).toBe('abc123');
      expect(agent.attempts).toHaveLength(1);
    });

    it('should track failed agent execution', async () => {
      tracker.startAgent('pre-recon', 1);

      await tracker.endAgent('pre-recon', {
        attemptNumber: 1,
        duration_ms: 5000,
        cost_usd: 0.15,
        success: false,
        error: 'Test error',
        isFinalAttempt: true
      });

      const metrics = tracker.getMetrics();
      const agent = metrics.metrics.agents['pre-recon'];

      expect(agent.status).toBe('failed');
      expect(agent.attempts[0].error).toBe('Test error');
    });

    it('should track multiple attempts', async () => {
      // First attempt fails
      tracker.startAgent('pre-recon', 1);
      await tracker.endAgent('pre-recon', {
        attemptNumber: 1,
        duration_ms: 5000,
        cost_usd: 0.15,
        success: false,
        error: 'First attempt failed'
      });

      // Second attempt succeeds
      tracker.startAgent('pre-recon', 2);
      await tracker.endAgent('pre-recon', {
        attemptNumber: 2,
        duration_ms: 8000,
        cost_usd: 0.20,
        success: true,
        checkpoint: 'abc123'
      });

      const metrics = tracker.getMetrics();
      const agent = metrics.metrics.agents['pre-recon'];

      expect(agent.status).toBe('success');
      expect(agent.attempts).toHaveLength(2);
      expect(agent.total_cost_usd).toBe(0.35); // Sum of both attempts
      expect(agent.final_duration_ms).toBe(8000); // Final successful attempt
    });

    it('should calculate total cost across attempts', async () => {
      tracker.startAgent('pre-recon', 1);
      await tracker.endAgent('pre-recon', {
        attemptNumber: 1,
        duration_ms: 5000,
        cost_usd: 0.10,
        success: false
      });

      tracker.startAgent('pre-recon', 2);
      await tracker.endAgent('pre-recon', {
        attemptNumber: 2,
        duration_ms: 7000,
        cost_usd: 0.15,
        success: false
      });

      tracker.startAgent('pre-recon', 3);
      await tracker.endAgent('pre-recon', {
        attemptNumber: 3,
        duration_ms: 9000,
        cost_usd: 0.20,
        success: true,
        checkpoint: 'abc123'
      });

      const metrics = tracker.getMetrics();
      const agent = metrics.metrics.agents['pre-recon'];

      expect(agent.total_cost_usd).toBe(0.45);
    });
  });

  describe('recalculateAggregations', () => {
    beforeEach(async () => {
      await tracker.initialize();
    });

    it('should calculate total duration and cost', async () => {
      // Complete pre-recon
      tracker.startAgent('pre-recon', 1);
      await tracker.endAgent('pre-recon', {
        attemptNumber: 1,
        duration_ms: 10000,
        cost_usd: 0.25,
        success: true,
        checkpoint: 'abc'
      });

      // Complete recon
      tracker.startAgent('recon', 1);
      await tracker.endAgent('recon', {
        attemptNumber: 1,
        duration_ms: 15000,
        cost_usd: 0.35,
        success: true,
        checkpoint: 'def'
      });

      const metrics = tracker.getMetrics();

      expect(metrics.metrics.total_duration_ms).toBe(25000);
      expect(metrics.metrics.total_cost_usd).toBe(0.60);
    });

    it('should calculate phase-level metrics', async () => {
      // Complete pre-recon
      tracker.startAgent('pre-recon', 1);
      await tracker.endAgent('pre-recon', {
        attemptNumber: 1,
        duration_ms: 10000,
        cost_usd: 0.25,
        success: true,
        checkpoint: 'abc'
      });

      // Complete recon
      tracker.startAgent('recon', 1);
      await tracker.endAgent('recon', {
        attemptNumber: 1,
        duration_ms: 15000,
        cost_usd: 0.35,
        success: true,
        checkpoint: 'def'
      });

      const metrics = tracker.getMetrics();

      expect(metrics.metrics.phases['pre-recon']).toBeDefined();
      expect(metrics.metrics.phases['pre-recon'].duration_ms).toBe(10000);
      expect(metrics.metrics.phases['pre-recon'].cost_usd).toBe(0.25);

      expect(metrics.metrics.phases['recon']).toBeDefined();
      expect(metrics.metrics.phases['recon'].duration_ms).toBe(15000);
    });

    it('should exclude rolled-back agents from aggregations', async () => {
      tracker.startAgent('pre-recon', 1);
      await tracker.endAgent('pre-recon', {
        attemptNumber: 1,
        duration_ms: 10000,
        cost_usd: 0.25,
        success: true,
        checkpoint: 'abc'
      });

      await tracker.markRolledBack('pre-recon');

      const metrics = tracker.getMetrics();

      expect(metrics.metrics.total_duration_ms).toBe(0);
      expect(metrics.metrics.total_cost_usd).toBe(0);
    });

    it('should exclude failed agents from aggregations', async () => {
      tracker.startAgent('pre-recon', 1);
      await tracker.endAgent('pre-recon', {
        attemptNumber: 1,
        duration_ms: 10000,
        cost_usd: 0.25,
        success: false,
        isFinalAttempt: true
      });

      const metrics = tracker.getMetrics();

      expect(metrics.metrics.total_duration_ms).toBe(0);
      expect(metrics.metrics.total_cost_usd).toBe(0);
    });
  });

  describe('markRolledBack', () => {
    beforeEach(async () => {
      await tracker.initialize();
    });

    it('should mark agent as rolled-back', async () => {
      tracker.startAgent('pre-recon', 1);
      await tracker.endAgent('pre-recon', {
        attemptNumber: 1,
        duration_ms: 10000,
        cost_usd: 0.25,
        success: true,
        checkpoint: 'abc'
      });

      await tracker.markRolledBack('pre-recon');

      const metrics = tracker.getMetrics();
      const agent = metrics.metrics.agents['pre-recon'];

      expect(agent.status).toBe('rolled-back');
      expect(agent.rolled_back_at).toBeDefined();
    });

    it('should handle non-existent agent', async () => {
      await tracker.markRolledBack('non-existent');
      // Should not throw
    });
  });

  describe('markMultipleRolledBack', () => {
    beforeEach(async () => {
      await tracker.initialize();
    });

    it('should mark multiple agents as rolled-back', async () => {
      // Complete agents
      for (const agentName of ['pre-recon', 'recon', 'injection-vuln']) {
        tracker.startAgent(agentName, 1);
        await tracker.endAgent(agentName, {
          attemptNumber: 1,
          duration_ms: 10000,
          cost_usd: 0.25,
          success: true,
          checkpoint: 'checkpoint'
        });
      }

      await tracker.markMultipleRolledBack(['recon', 'injection-vuln']);

      const metrics = tracker.getMetrics();

      expect(metrics.metrics.agents['pre-recon'].status).toBe('success');
      expect(metrics.metrics.agents['recon'].status).toBe('rolled-back');
      expect(metrics.metrics.agents['injection-vuln'].status).toBe('rolled-back');
    });
  });

  describe('updateSessionStatus', () => {
    beforeEach(async () => {
      await tracker.initialize();
    });

    it('should update session status', async () => {
      await tracker.updateSessionStatus('completed');

      const metrics = tracker.getMetrics();

      expect(metrics.session.status).toBe('completed');
      expect(metrics.session.completedAt).toBeDefined();
    });

    it('should set completedAt for completed status', async () => {
      await tracker.updateSessionStatus('completed');

      const metrics = tracker.getMetrics();

      expect(metrics.session.completedAt).toBeDefined();
    });

    it('should set completedAt for failed status', async () => {
      await tracker.updateSessionStatus('failed');

      const metrics = tracker.getMetrics();

      expect(metrics.session.completedAt).toBeDefined();
    });

    it('should not set completedAt for in-progress status', async () => {
      await tracker.updateSessionStatus('in-progress');

      const metrics = tracker.getMetrics();

      expect(metrics.session.completedAt).toBeUndefined();
    });
  });

  describe('reload', () => {
    beforeEach(async () => {
      await tracker.initialize();
    });

    it('should reload metrics from disk', async () => {
      tracker.startAgent('pre-recon', 1);
      await tracker.endAgent('pre-recon', {
        attemptNumber: 1,
        duration_ms: 10000,
        cost_usd: 0.25,
        success: true,
        checkpoint: 'abc'
      });

      // Create new tracker and reload
      const tracker2 = new MetricsTracker(sessionMetadata);
      await tracker2.initialize();
      await tracker2.reload();

      const metrics = tracker2.getMetrics();
      expect(metrics.metrics.agents['pre-recon']).toBeDefined();
    });
  });

  describe('getMetrics', () => {
    beforeEach(async () => {
      await tracker.initialize();
    });

    it('should return deep copy of metrics', () => {
      const metrics1 = tracker.getMetrics();
      const metrics2 = tracker.getMetrics();

      expect(metrics1).not.toBe(metrics2);
      expect(metrics1).toEqual(metrics2);
    });

    it('should not allow mutation of returned metrics', () => {
      const metrics = tracker.getMetrics();
      metrics.session.status = 'modified';

      const freshMetrics = tracker.getMetrics();
      expect(freshMetrics.session.status).toBe('in-progress');
    });
  });
});
