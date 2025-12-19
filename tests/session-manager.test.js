// Copyright (C) 2025 Keygraph, Inc.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License version 3
// as published by the Free Software Foundation.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fs, path } from 'zx';
import {
  createSession,
  getSession,
  updateSession,
  validateAgent,
  validateAgentRange,
  validatePhase,
  checkPrerequisites,
  getNextAgent,
  markAgentCompleted,
  markAgentFailed,
  getSessionStatus,
  rollbackToAgent,
  reconcileSession,
  deleteSession,
  deleteAllSessions,
  AGENTS,
  PHASES
} from '../src/session-manager.js';
import { PentestError } from '../src/error-handling.js';

// Mock better-sqlite3 to avoid native dependency issues in tests
vi.mock('better-sqlite3', () => ({
  default: vi.fn()
}));

// Mock audit system
vi.mock('../src/audit/index.js', () => ({
  AuditSession: class MockAuditSession {
    constructor(sessionMetadata) {
      this.sessionMetadata = sessionMetadata;
    }
    async initialize() {}
    async getMetrics() {
      return {
        metrics: {
          agents: {}
        }
      };
    }
    async markMultipleRolledBack() {}
  }
}));

describe('Session Manager', () => {
  const testStoreFile = '/tmp/shaart-test-store.json';

  beforeEach(async () => {
    // Ensure clean state
    if (await fs.pathExists(testStoreFile)) {
      await fs.remove(testStoreFile);
    }
    // Replace store file path for testing
    process.env.TEST_STORE_FILE = testStoreFile;
  });

  afterEach(async () => {
    // Clean up test files
    if (await fs.pathExists(testStoreFile)) {
      await fs.remove(testStoreFile);
    }
  });

  describe('createSession', () => {
    it('should create new session with required fields', async () => {
      const session = await createSession(
        'https://example.com',
        '/tmp/test-repo'
      );

      expect(session.id).toBeDefined();
      expect(session.webUrl).toBe('https://example.com');
      expect(session.repoPath).toBe('/tmp/test-repo');
      expect(session.targetRepo).toBe('/tmp/test-repo');
      expect(session.status).toBe('in-progress');
      expect(session.completedAgents).toEqual([]);
      expect(session.failedAgents).toEqual([]);
      expect(session.checkpoints).toEqual({});
    });

    it('should create session with config file', async () => {
      const session = await createSession(
        'https://example.com',
        '/tmp/test-repo',
        'test-config.yaml'
      );

      expect(session.configFile).toBe('test-config.yaml');
    });

    it('should reuse existing incomplete session', async () => {
      const session1 = await createSession(
        'https://example.com',
        '/tmp/test-repo'
      );

      const session2 = await createSession(
        'https://example.com',
        '/tmp/test-repo'
      );

      expect(session2.id).toBe(session1.id);
    });

    it('should create new session if previous completed', async () => {
      const session1 = await createSession(
        'https://example.com',
        '/tmp/test-repo'
      );

      await updateSession(session1.id, { status: 'completed' });

      const session2 = await createSession(
        'https://example.com',
        '/tmp/test-repo'
      );

      expect(session2.id).not.toBe(session1.id);
    });

    it('should handle targetRepo parameter', async () => {
      const session = await createSession(
        'https://example.com',
        '/tmp/old-path',
        null,
        '/tmp/new-path'
      );

      expect(session.targetRepo).toBe('/tmp/new-path');
    });
  });

  describe('getSession', () => {
    it('should retrieve existing session', async () => {
      const created = await createSession(
        'https://example.com',
        '/tmp/test-repo'
      );

      const retrieved = await getSession(created.id);

      expect(retrieved.id).toBe(created.id);
      expect(retrieved.webUrl).toBe(created.webUrl);
    });

    it('should return null for non-existent session', async () => {
      const session = await getSession('non-existent-id');

      expect(session).toBeNull();
    });
  });

  describe('updateSession', () => {
    it('should update session fields', async () => {
      const session = await createSession(
        'https://example.com',
        '/tmp/test-repo'
      );

      const updated = await updateSession(session.id, {
        status: 'completed'
      });

      expect(updated.status).toBe('completed');
    });

    it('should update lastActivity timestamp', async () => {
      const session = await createSession(
        'https://example.com',
        '/tmp/test-repo'
      );

      const originalActivity = session.lastActivity;
      await new Promise(resolve => setTimeout(resolve, 10));

      const updated = await updateSession(session.id, {
        status: 'in-progress'
      });

      expect(updated.lastActivity).not.toBe(originalActivity);
    });

    it('should throw error for non-existent session', async () => {
      await expect(
        updateSession('non-existent', { status: 'completed' })
      ).rejects.toThrow('Session non-existent not found');
    });
  });

  describe('validateAgent', () => {
    it('should validate valid agent name', () => {
      const agent = validateAgent('pre-recon');

      expect(agent.name).toBe('pre-recon');
      expect(agent.phase).toBe('pre-reconnaissance');
    });

    it('should throw error for invalid agent name', () => {
      expect(() => validateAgent('invalid-agent')).toThrow(
        "Agent 'invalid-agent' not recognized"
      );
    });

    it('should validate all agent names', () => {
      Object.keys(AGENTS).forEach(agentName => {
        expect(() => validateAgent(agentName)).not.toThrow();
      });
    });
  });

  describe('validateAgentRange', () => {
    it('should return agents in range', () => {
      const agents = validateAgentRange('pre-recon', 'injection-vuln');

      expect(agents).toHaveLength(3);
      expect(agents[0].name).toBe('pre-recon');
      expect(agents[2].name).toBe('injection-vuln');
    });

    it('should throw error if end comes before start', () => {
      expect(() => validateAgentRange('recon', 'pre-recon')).toThrow(
        'must come after'
      );
    });

    it('should throw error for invalid start agent', () => {
      expect(() => validateAgentRange('invalid', 'recon')).toThrow(
        'not recognized'
      );
    });
  });

  describe('validatePhase', () => {
    it('should validate valid phase', () => {
      const agents = validatePhase('pre-reconnaissance');

      expect(agents).toHaveLength(1);
      expect(agents[0].name).toBe('pre-recon');
    });

    it('should validate vulnerability-analysis phase', () => {
      const agents = validatePhase('vulnerability-analysis');

      expect(agents).toHaveLength(5);
    });

    it('should throw error for invalid phase', () => {
      expect(() => validatePhase('invalid-phase')).toThrow(
        "Phase 'invalid-phase' not recognized"
      );
    });
  });

  describe('checkPrerequisites', () => {
    it('should pass when all prerequisites completed', async () => {
      const session = await createSession(
        'https://example.com',
        '/tmp/test-repo'
      );

      await updateSession(session.id, {
        completedAgents: ['pre-recon']
      });

      expect(() => checkPrerequisites(session, 'recon')).not.toThrow();
    });

    it('should throw error when prerequisites missing', async () => {
      const session = await createSession(
        'https://example.com',
        '/tmp/test-repo'
      );

      expect(() => checkPrerequisites(session, 'recon')).toThrow(
        'prerequisite agent(s) not completed'
      );
    });

    it('should allow agent with no prerequisites', async () => {
      const session = await createSession(
        'https://example.com',
        '/tmp/test-repo'
      );

      expect(() => checkPrerequisites(session, 'pre-recon')).not.toThrow();
    });
  });

  describe('getNextAgent', () => {
    it('should return first agent for new session', async () => {
      const session = await createSession(
        'https://example.com',
        '/tmp/test-repo'
      );

      const nextAgent = getNextAgent(session);

      expect(nextAgent.name).toBe('pre-recon');
    });

    it('should return next agent after completion', async () => {
      const session = await createSession(
        'https://example.com',
        '/tmp/test-repo'
      );

      await updateSession(session.id, {
        completedAgents: ['pre-recon']
      });

      const updated = await getSession(session.id);
      const nextAgent = getNextAgent(updated);

      expect(nextAgent.name).toBe('recon');
    });

    it('should return null when all agents completed', async () => {
      const session = await createSession(
        'https://example.com',
        '/tmp/test-repo'
      );

      await updateSession(session.id, {
        completedAgents: Object.keys(AGENTS)
      });

      const updated = await getSession(session.id);
      const nextAgent = getNextAgent(updated);

      expect(nextAgent).toBeUndefined();
    });
  });

  describe('markAgentCompleted', () => {
    it('should mark agent as completed', async () => {
      const session = await createSession(
        'https://example.com',
        '/tmp/test-repo'
      );

      const updated = await markAgentCompleted(
        session.id,
        'pre-recon',
        'abc123'
      );

      expect(updated.completedAgents).toContain('pre-recon');
      expect(updated.checkpoints['pre-recon']).toBe('abc123');
    });

    it('should remove from failedAgents if previously failed', async () => {
      const session = await createSession(
        'https://example.com',
        '/tmp/test-repo'
      );

      await updateSession(session.id, {
        failedAgents: ['pre-recon']
      });

      const updated = await markAgentCompleted(
        session.id,
        'pre-recon',
        'abc123'
      );

      expect(updated.failedAgents).not.toContain('pre-recon');
      expect(updated.completedAgents).toContain('pre-recon');
    });

    it('should update status to completed when all agents done', async () => {
      const session = await createSession(
        'https://example.com',
        '/tmp/test-repo'
      );

      // Complete all but last agent
      const allAgents = Object.keys(AGENTS);
      await updateSession(session.id, {
        completedAgents: allAgents.slice(0, -1),
        checkpoints: Object.fromEntries(
          allAgents.slice(0, -1).map(name => [name, 'checkpoint'])
        )
      });

      // Complete last agent
      const updated = await markAgentCompleted(
        session.id,
        allAgents[allAgents.length - 1],
        'final-checkpoint'
      );

      expect(updated.status).toBe('completed');
    });
  });

  describe('markAgentFailed', () => {
    it('should mark agent as failed', async () => {
      const session = await createSession(
        'https://example.com',
        '/tmp/test-repo'
      );

      const updated = await markAgentFailed(session.id, 'pre-recon');

      expect(updated.failedAgents).toContain('pre-recon');
    });

    it('should remove from completedAgents if previously completed', async () => {
      const session = await createSession(
        'https://example.com',
        '/tmp/test-repo'
      );

      await updateSession(session.id, {
        completedAgents: ['pre-recon']
      });

      const updated = await markAgentFailed(session.id, 'pre-recon');

      expect(updated.completedAgents).not.toContain('pre-recon');
      expect(updated.failedAgents).toContain('pre-recon');
    });
  });

  describe('getSessionStatus', () => {
    it('should calculate status for new session', async () => {
      const session = await createSession(
        'https://example.com',
        '/tmp/test-repo'
      );

      const status = getSessionStatus(session);

      expect(status.status).toBe('in-progress');
      expect(status.completedCount).toBe(0);
      expect(status.completionPercentage).toBe(0);
    });

    it('should calculate status for partially completed session', async () => {
      const session = await createSession(
        'https://example.com',
        '/tmp/test-repo'
      );

      await updateSession(session.id, {
        completedAgents: ['pre-recon', 'recon']
      });

      const updated = await getSession(session.id);
      const status = getSessionStatus(updated);

      expect(status.completedCount).toBe(2);
      expect(status.completionPercentage).toBeGreaterThan(0);
    });

    it('should show completed status when all agents done', async () => {
      const session = await createSession(
        'https://example.com',
        '/tmp/test-repo'
      );

      await updateSession(session.id, {
        completedAgents: Object.keys(AGENTS)
      });

      const updated = await getSession(session.id);
      const status = getSessionStatus(updated);

      expect(status.status).toBe('completed');
      expect(status.completionPercentage).toBe(100);
    });

    it('should show failed status when agents failed', async () => {
      const session = await createSession(
        'https://example.com',
        '/tmp/test-repo'
      );

      await updateSession(session.id, {
        failedAgents: ['pre-recon']
      });

      const updated = await getSession(session.id);
      const status = getSessionStatus(updated);

      expect(status.status).toBe('failed');
      expect(status.failedCount).toBe(1);
    });
  });

  describe('rollbackToAgent', () => {
    it('should remove agents after target checkpoint', async () => {
      const session = await createSession(
        'https://example.com',
        '/tmp/test-repo'
      );

      await updateSession(session.id, {
        completedAgents: ['pre-recon', 'recon', 'injection-vuln'],
        checkpoints: {
          'pre-recon': 'abc',
          'recon': 'def',
          'injection-vuln': 'ghi'
        }
      });

      const updated = await rollbackToAgent(session.id, 'recon');

      expect(updated.completedAgents).toContain('pre-recon');
      expect(updated.completedAgents).toContain('recon');
      expect(updated.completedAgents).not.toContain('injection-vuln');
      expect(updated.checkpoints).not.toHaveProperty('injection-vuln');
    });

    it('should throw error if checkpoint not found', async () => {
      const session = await createSession(
        'https://example.com',
        '/tmp/test-repo'
      );

      await expect(
        rollbackToAgent(session.id, 'pre-recon')
      ).rejects.toThrow('No checkpoint found');
    });
  });

  describe('deleteSession', () => {
    it('should delete specific session', async () => {
      const session = await createSession(
        'https://example.com',
        '/tmp/test-repo'
      );

      const deleted = await deleteSession(session.id);

      expect(deleted.id).toBe(session.id);

      const retrieved = await getSession(session.id);
      expect(retrieved).toBeNull();
    });

    it('should throw error for non-existent session', async () => {
      await expect(
        deleteSession('non-existent')
      ).rejects.toThrow('Session non-existent not found');
    });
  });

  describe('deleteAllSessions', () => {
    it('should delete all sessions', async () => {
      await createSession('https://example1.com', '/tmp/repo1');
      await createSession('https://example2.com', '/tmp/repo2');

      const result = await deleteAllSessions();

      expect(result).toBe(true);
    });

    it('should return false if store file does not exist', async () => {
      const result = await deleteAllSessions();

      expect(result).toBe(false);
    });
  });

  describe('AGENTS constant', () => {
    it('should be frozen', () => {
      expect(Object.isFrozen(AGENTS)).toBe(true);
    });

    it('should have all required agents', () => {
      expect(AGENTS['pre-recon']).toBeDefined();
      expect(AGENTS['recon']).toBeDefined();
      expect(AGENTS['injection-vuln']).toBeDefined();
      expect(AGENTS['report']).toBeDefined();
    });

    it('should have correct prerequisites', () => {
      expect(AGENTS['pre-recon'].prerequisites).toEqual([]);
      expect(AGENTS['recon'].prerequisites).toEqual(['pre-recon']);
      expect(AGENTS['injection-vuln'].prerequisites).toEqual(['recon']);
    });
  });

  describe('PHASES constant', () => {
    it('should be frozen', () => {
      expect(Object.isFrozen(PHASES)).toBe(true);
    });

    it('should have all phases', () => {
      expect(PHASES['pre-reconnaissance']).toBeDefined();
      expect(PHASES['reconnaissance']).toBeDefined();
      expect(PHASES['vulnerability-analysis']).toBeDefined();
      expect(PHASES['exploitation']).toBeDefined();
      expect(PHASES['reporting']).toBeDefined();
    });

    it('should map agents to correct phases', () => {
      expect(PHASES['vulnerability-analysis']).toContain('injection-vuln');
      expect(PHASES['exploitation']).toContain('injection-exploit');
    });
  });
});
