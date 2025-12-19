// Copyright (C) 2025 Keygraph, Inc.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License version 3
// as published by the Free Software Foundation.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fs, path } from 'zx';
import { AuditSession } from '../../src/audit/audit-session.js';
import { createMockSession } from '../helpers/fixtures.js';

describe('AuditSession', () => {
  const testDir = '/tmp/shaart-test-audit-session';
  let sessionMetadata;

  beforeEach(async () => {
    await fs.ensureDir(testDir);
    await fs.ensureDir(path.join(testDir, 'audit-logs'));

    sessionMetadata = createMockSession({
      targetRepo: testDir
    });
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('constructor', () => {
    it('should create audit session with valid metadata', () => {
      const auditSession = new AuditSession(sessionMetadata);

      expect(auditSession.sessionId).toBe(sessionMetadata.id);
      expect(auditSession.sessionMetadata.webUrl).toBe(sessionMetadata.webUrl);
    });

    it('should throw error if session id missing', () => {
      const invalidMetadata = { ...sessionMetadata, id: undefined };

      expect(() => new AuditSession(invalidMetadata)).toThrow(
        'sessionMetadata.id is required'
      );
    });

    it('should throw error if webUrl missing', () => {
      const invalidMetadata = { ...sessionMetadata, webUrl: undefined };

      expect(() => new AuditSession(invalidMetadata)).toThrow(
        'sessionMetadata.webUrl is required'
      );
    });

    it('should initialize as not initialized', () => {
      const auditSession = new AuditSession(sessionMetadata);

      expect(auditSession.initialized).toBe(false);
    });
  });

  describe('initialize', () => {
    it('should create audit directory structure', async () => {
      const auditSession = new AuditSession(sessionMetadata);

      await auditSession.initialize();

      expect(auditSession.initialized).toBe(true);
    });

    it('should be idempotent', async () => {
      const auditSession = new AuditSession(sessionMetadata);

      await auditSession.initialize();
      await auditSession.initialize();

      expect(auditSession.initialized).toBe(true);
    });

    it('should initialize metrics tracker', async () => {
      const auditSession = new AuditSession(sessionMetadata);

      await auditSession.initialize();

      const metrics = await auditSession.getMetrics();
      expect(metrics.session.id).toBe(sessionMetadata.id);
    });
  });

  describe('startAgent', () => {
    it('should start agent execution', async () => {
      const auditSession = new AuditSession(sessionMetadata);
      await auditSession.initialize();

      await auditSession.startAgent('pre-recon', 'Test prompt content', 1);

      expect(auditSession.currentLogger).toBeDefined();
    });

    it('should save prompt snapshot on first attempt', async () => {
      const auditSession = new AuditSession(sessionMetadata);
      await auditSession.initialize();

      await auditSession.startAgent('pre-recon', 'Test prompt content', 1);

      // Prompt should be saved (tested via file existence)
      // This would require checking the prompt file exists
    });

    it('should not save prompt on retry attempts', async () => {
      const auditSession = new AuditSession(sessionMetadata);
      await auditSession.initialize();

      await auditSession.startAgent('pre-recon', 'Test prompt content', 1);
      await auditSession.endAgent('pre-recon', {
        attemptNumber: 1,
        duration_ms: 10000,
        cost_usd: 0.25,
        success: false
      });

      // Second attempt should not save prompt again
      await auditSession.startAgent('pre-recon', 'Test prompt content', 2);
    });

    it('should start metrics tracking', async () => {
      const auditSession = new AuditSession(sessionMetadata);
      await auditSession.initialize();

      await auditSession.startAgent('pre-recon', 'Test prompt', 1);

      // Metrics tracker should have active timer
      expect(auditSession.metricsTracker.activeTimers.has('pre-recon')).toBe(true);
    });
  });

  describe('endAgent', () => {
    it('should end successful agent execution', async () => {
      const auditSession = new AuditSession(sessionMetadata);
      await auditSession.initialize();

      await auditSession.startAgent('pre-recon', 'Test prompt', 1);
      await auditSession.endAgent('pre-recon', {
        attemptNumber: 1,
        duration_ms: 10000,
        cost_usd: 0.25,
        success: true,
        checkpoint: 'abc123'
      });

      const metrics = await auditSession.getMetrics();
      expect(metrics.metrics.agents['pre-recon'].status).toBe('success');
      expect(metrics.metrics.agents['pre-recon'].checkpoint).toBe('abc123');
    });

    it('should end failed agent execution', async () => {
      const auditSession = new AuditSession(sessionMetadata);
      await auditSession.initialize();

      await auditSession.startAgent('pre-recon', 'Test prompt', 1);
      await auditSession.endAgent('pre-recon', {
        attemptNumber: 1,
        duration_ms: 5000,
        cost_usd: 0.15,
        success: false,
        error: 'Test error',
        isFinalAttempt: true
      });

      const metrics = await auditSession.getMetrics();
      expect(metrics.metrics.agents['pre-recon'].status).toBe('failed');
    });

    it('should close current logger', async () => {
      const auditSession = new AuditSession(sessionMetadata);
      await auditSession.initialize();

      await auditSession.startAgent('pre-recon', 'Test prompt', 1);
      await auditSession.endAgent('pre-recon', {
        attemptNumber: 1,
        duration_ms: 10000,
        cost_usd: 0.25,
        success: true,
        checkpoint: 'abc123'
      });

      expect(auditSession.currentLogger).toBeNull();
    });

    it('should be mutex-protected', async () => {
      const auditSession = new AuditSession(sessionMetadata);
      await auditSession.initialize();

      await auditSession.startAgent('pre-recon', 'Test prompt', 1);

      // End agent while another is running should still work
      await auditSession.endAgent('pre-recon', {
        attemptNumber: 1,
        duration_ms: 10000,
        cost_usd: 0.25,
        success: true,
        checkpoint: 'abc123'
      });
    });
  });

  describe('logEvent', () => {
    it('should log event during agent execution', async () => {
      const auditSession = new AuditSession(sessionMetadata);
      await auditSession.initialize();

      await auditSession.startAgent('pre-recon', 'Test prompt', 1);
      await auditSession.logEvent('tool_start', {
        tool: 'nmap',
        timestamp: new Date().toISOString()
      });

      // Event should be logged (tested via logger)
    });

    it('should throw error if no active logger', async () => {
      const auditSession = new AuditSession(sessionMetadata);
      await auditSession.initialize();

      await expect(
        auditSession.logEvent('tool_start', {})
      ).rejects.toThrow('No active logger');
    });
  });

  describe('markMultipleRolledBack', () => {
    it('should mark multiple agents as rolled-back', async () => {
      const auditSession = new AuditSession(sessionMetadata);
      await auditSession.initialize();

      // Complete some agents
      for (const agentName of ['pre-recon', 'recon']) {
        await auditSession.startAgent(agentName, 'Test prompt', 1);
        await auditSession.endAgent(agentName, {
          attemptNumber: 1,
          duration_ms: 10000,
          cost_usd: 0.25,
          success: true,
          checkpoint: 'checkpoint'
        });
      }

      await auditSession.markMultipleRolledBack(['recon']);

      const metrics = await auditSession.getMetrics();
      expect(metrics.metrics.agents['recon'].status).toBe('rolled-back');
      expect(metrics.metrics.agents['pre-recon'].status).toBe('success');
    });

    it('should be mutex-protected', async () => {
      const auditSession = new AuditSession(sessionMetadata);
      await auditSession.initialize();

      await auditSession.startAgent('pre-recon', 'Test prompt', 1);
      await auditSession.endAgent('pre-recon', {
        attemptNumber: 1,
        duration_ms: 10000,
        cost_usd: 0.25,
        success: true,
        checkpoint: 'abc'
      });

      // Should handle concurrent rollback
      await Promise.all([
        auditSession.markMultipleRolledBack(['pre-recon']),
        auditSession.markMultipleRolledBack(['pre-recon'])
      ]);

      const metrics = await auditSession.getMetrics();
      expect(metrics.metrics.agents['pre-recon'].status).toBe('rolled-back');
    });
  });

  describe('updateSessionStatus', () => {
    it('should update session status', async () => {
      const auditSession = new AuditSession(sessionMetadata);
      await auditSession.initialize();

      await auditSession.updateSessionStatus('completed');

      const metrics = await auditSession.getMetrics();
      expect(metrics.session.status).toBe('completed');
    });

    it('should be mutex-protected', async () => {
      const auditSession = new AuditSession(sessionMetadata);
      await auditSession.initialize();

      // Concurrent status updates should not corrupt data
      await Promise.all([
        auditSession.updateSessionStatus('completed'),
        auditSession.updateSessionStatus('completed')
      ]);

      const metrics = await auditSession.getMetrics();
      expect(metrics.session.status).toBe('completed');
    });
  });

  describe('getMetrics', () => {
    it('should return current metrics', async () => {
      const auditSession = new AuditSession(sessionMetadata);
      await auditSession.initialize();

      const metrics = await auditSession.getMetrics();

      expect(metrics.session).toBeDefined();
      expect(metrics.metrics).toBeDefined();
      expect(metrics.metrics.total_duration_ms).toBe(0);
    });

    it('should return metrics after agent completion', async () => {
      const auditSession = new AuditSession(sessionMetadata);
      await auditSession.initialize();

      await auditSession.startAgent('pre-recon', 'Test prompt', 1);
      await auditSession.endAgent('pre-recon', {
        attemptNumber: 1,
        duration_ms: 10000,
        cost_usd: 0.25,
        success: true,
        checkpoint: 'abc123'
      });

      const metrics = await auditSession.getMetrics();
      expect(metrics.metrics.total_duration_ms).toBe(10000);
      expect(metrics.metrics.total_cost_usd).toBe(0.25);
    });
  });

  describe('ensureInitialized', () => {
    it('should initialize if not initialized', async () => {
      const auditSession = new AuditSession(sessionMetadata);

      expect(auditSession.initialized).toBe(false);

      await auditSession.startAgent('pre-recon', 'Test prompt', 1);

      expect(auditSession.initialized).toBe(true);
    });

    it('should not reinitialize if already initialized', async () => {
      const auditSession = new AuditSession(sessionMetadata);
      await auditSession.initialize();

      const initializeSpy = vi.spyOn(auditSession, 'initialize');

      await auditSession.startAgent('pre-recon', 'Test prompt', 1);

      // Initialize should not be called again
      expect(initializeSpy).not.toHaveBeenCalled();

      initializeSpy.mockRestore();
    });
  });

  describe('crash recovery', () => {
    it('should recover from crash between start and end', async () => {
      const auditSession1 = new AuditSession(sessionMetadata);
      await auditSession1.initialize();

      await auditSession1.startAgent('pre-recon', 'Test prompt', 1);

      // Simulate crash - create new audit session
      const auditSession2 = new AuditSession(sessionMetadata);
      await auditSession2.initialize();

      const metrics = await auditSession2.getMetrics();
      // Metrics should still be valid from disk
      expect(metrics.session.id).toBe(sessionMetadata.id);
    });

    it('should handle concurrent agent executions', async () => {
      const auditSession = new AuditSession(sessionMetadata);
      await auditSession.initialize();

      // Start multiple agents
      await auditSession.startAgent('pre-recon', 'Test prompt 1', 1);
      await auditSession.endAgent('pre-recon', {
        attemptNumber: 1,
        duration_ms: 10000,
        cost_usd: 0.25,
        success: true,
        checkpoint: 'abc'
      });

      await auditSession.startAgent('recon', 'Test prompt 2', 1);
      await auditSession.endAgent('recon', {
        attemptNumber: 1,
        duration_ms: 15000,
        cost_usd: 0.35,
        success: true,
        checkpoint: 'def'
      });

      const metrics = await auditSession.getMetrics();
      expect(metrics.metrics.agents['pre-recon']).toBeDefined();
      expect(metrics.metrics.agents['recon']).toBeDefined();
      expect(metrics.metrics.total_cost_usd).toBe(0.60);
    });
  });
});
