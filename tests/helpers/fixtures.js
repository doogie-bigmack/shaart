// Copyright (C) 2025 Keygraph, Inc.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License version 3
// as published by the Free Software Foundation.

/**
 * Test Fixtures
 *
 * Mock configuration objects, sample deliverables, test session data, etc.
 */

import crypto from 'crypto';

// Sample valid configuration
export const validConfig = {
  rules: {
    avoid: [
      {
        description: 'Avoid admin panel',
        type: 'path',
        url_path: '/admin'
      }
    ],
    focus: [
      {
        description: 'Focus on API endpoints',
        type: 'path',
        url_path: '/api'
      }
    ]
  },
  authentication: {
    login_type: 'form',
    login_url: 'https://example.com/login',
    credentials: {
      username: 'testuser',
      password: 'testpass123'
    },
    login_flow: [
      'Navigate to login URL',
      'Fill username field',
      'Fill password field',
      'Click submit button'
    ],
    success_condition: {
      type: 'url_contains',
      value: '/dashboard'
    }
  }
};

// Sample configuration with TOTP
export const configWithTotp = {
  ...validConfig,
  authentication: {
    ...validConfig.authentication,
    credentials: {
      ...validConfig.authentication.credentials,
      totp_secret: 'JBSWY3DPEHPK3PXP'
    }
  }
};

// Invalid configurations for testing
export const invalidConfigs = {
  notAnObject: 'invalid',
  emptyObject: {},
  missingRequired: {
    rules: {}
  },
  invalidRuleType: {
    rules: {
      avoid: [
        {
          description: 'Invalid rule',
          type: 'invalid_type',
          url_path: '/test'
        }
      ]
    }
  },
  duplicateRules: {
    rules: {
      avoid: [
        {
          description: 'First rule',
          type: 'path',
          url_path: '/admin'
        },
        {
          description: 'Duplicate rule',
          type: 'path',
          url_path: '/admin'
        }
      ]
    }
  },
  conflictingRules: {
    rules: {
      avoid: [
        {
          description: 'Avoid admin',
          type: 'path',
          url_path: '/admin'
        }
      ],
      focus: [
        {
          description: 'Focus on admin',
          type: 'path',
          url_path: '/admin'
        }
      ]
    }
  },
  dangerousPattern: {
    rules: {
      avoid: [
        {
          description: 'Path traversal',
          type: 'path',
          url_path: '../../etc/passwd'
        }
      ]
    }
  }
};

// Sample session data
export const createMockSession = (overrides = {}) => ({
  id: crypto.randomUUID(),
  webUrl: 'https://example.com',
  repoPath: '/tmp/test-repo',
  targetRepo: '/tmp/test-repo',
  status: 'in-progress',
  completedAgents: [],
  failedAgents: [],
  checkpoints: {},
  createdAt: new Date().toISOString(),
  lastActivity: new Date().toISOString(),
  ...overrides
});

// Sample session with completed agents
export const createCompletedSession = () => createMockSession({
  completedAgents: ['pre-recon', 'recon', 'injection-vuln'],
  checkpoints: {
    'pre-recon': 'abc123',
    'recon': 'def456',
    'injection-vuln': 'ghi789'
  },
  status: 'in-progress'
});

// Sample vulnerability queue
export const validVulnerabilityQueue = {
  vulnerabilities: [
    {
      id: 1,
      type: 'sql_injection',
      severity: 'high',
      endpoint: '/api/users',
      parameter: 'id',
      description: 'SQL injection in user lookup'
    },
    {
      id: 2,
      type: 'command_injection',
      severity: 'critical',
      endpoint: '/api/exec',
      parameter: 'cmd',
      description: 'Command injection in exec endpoint'
    }
  ]
};

// Empty vulnerability queue
export const emptyVulnerabilityQueue = {
  vulnerabilities: []
};

// Invalid queue structures
export const invalidQueues = {
  notJson: 'not valid json {',
  noVulnerabilities: {
    data: []
  },
  invalidArray: {
    vulnerabilities: 'not an array'
  }
};

// Sample deliverable content
export const sampleDeliverable = `# Injection Vulnerability Analysis

## Summary
Found 2 potential SQL injection vulnerabilities.

## Vulnerabilities

### 1. SQL Injection in User Lookup
- Endpoint: /api/users
- Parameter: id
- Severity: High

### 2. Command Injection in Exec
- Endpoint: /api/exec
- Parameter: cmd
- Severity: Critical
`;

// Sample audit metrics
export const createMockMetrics = () => ({
  session: {
    id: crypto.randomUUID(),
    webUrl: 'https://example.com',
    repoPath: '/tmp/test-repo',
    status: 'in-progress',
    createdAt: new Date().toISOString()
  },
  metrics: {
    total_duration_ms: 60000,
    total_cost_usd: 1.5,
    phases: {
      'pre-recon': {
        duration_ms: 10000,
        duration_percentage: 16.67,
        cost_usd: 0.25,
        agent_count: 1
      },
      'recon': {
        duration_ms: 15000,
        duration_percentage: 25.0,
        cost_usd: 0.35,
        agent_count: 1
      }
    },
    agents: {
      'pre-recon': {
        status: 'success',
        attempts: [
          {
            attempt_number: 1,
            duration_ms: 10000,
            cost_usd: 0.25,
            success: true,
            timestamp: new Date().toISOString()
          }
        ],
        final_duration_ms: 10000,
        total_cost_usd: 0.25,
        checkpoint: 'abc123'
      },
      'recon': {
        status: 'success',
        attempts: [
          {
            attempt_number: 1,
            duration_ms: 15000,
            cost_usd: 0.35,
            success: true,
            timestamp: new Date().toISOString()
          }
        ],
        final_duration_ms: 15000,
        total_cost_usd: 0.35,
        checkpoint: 'def456'
      }
    }
  }
});

// Sample agent execution results
export const createSuccessResult = (overrides = {}) => ({
  success: true,
  duration: 10000,
  cost: 0.25,
  agentName: 'pre-recon',
  checkpoint: 'abc123',
  completedAt: new Date().toISOString(),
  ...overrides
});

export const createFailureResult = (overrides = {}) => ({
  success: false,
  error: 'Agent execution failed',
  retryable: true,
  agentName: 'pre-recon',
  failedAt: new Date().toISOString(),
  ...overrides
});

// Test TOTP secrets
export const testTotpSecrets = {
  valid: 'JBSWY3DPEHPK3PXP',
  invalid: 'not-a-valid-secret',
  empty: ''
};

// Agent definitions (subset for testing)
export const testAgents = {
  'pre-recon': {
    name: 'pre-recon',
    displayName: 'Pre-recon agent',
    phase: 'pre-reconnaissance',
    order: 1,
    prerequisites: []
  },
  'recon': {
    name: 'recon',
    displayName: 'Recon agent',
    phase: 'reconnaissance',
    order: 2,
    prerequisites: ['pre-recon']
  },
  'injection-vuln': {
    name: 'injection-vuln',
    displayName: 'Injection vuln agent',
    phase: 'vulnerability-analysis',
    order: 3,
    prerequisites: ['recon']
  }
};
