// Copyright (C) 2025 Keygraph, Inc.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License version 3
// as published by the Free Software Foundation.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { fs, path } from 'zx';
import { parseConfig, distributeConfig } from '../src/config-parser.js';
import {
  validConfig,
  configWithTotp,
  invalidConfigs
} from './helpers/fixtures.js';
import yaml from 'js-yaml';

describe('parseConfig', () => {
  const testDir = '/tmp/shaart-test-config-parser';
  const testConfigPath = path.join(testDir, 'test-config.yaml');

  beforeEach(async () => {
    await fs.ensureDir(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('valid configuration parsing', () => {
    it('should parse valid YAML config successfully', async () => {
      await fs.writeFile(testConfigPath, yaml.dump(validConfig));

      const config = await parseConfig(testConfigPath);

      expect(config).toBeDefined();
      expect(config.rules).toBeDefined();
      expect(config.authentication).toBeDefined();
    });

    it('should parse config with TOTP secret', async () => {
      await fs.writeFile(testConfigPath, yaml.dump(configWithTotp));

      const config = await parseConfig(testConfigPath);

      expect(config.authentication.credentials.totp_secret).toBe('JBSWY3DPEHPK3PXP');
    });

    it('should parse config with rules', async () => {
      await fs.writeFile(testConfigPath, yaml.dump(validConfig));

      const config = await parseConfig(testConfigPath);

      expect(config.rules.avoid).toHaveLength(1);
      expect(config.rules.focus).toHaveLength(1);
      expect(config.rules.avoid[0].type).toBe('path');
      expect(config.rules.avoid[0].url_path).toBe('/admin');
    });

    it('should parse config with authentication', async () => {
      await fs.writeFile(testConfigPath, yaml.dump(validConfig));

      const config = await parseConfig(testConfigPath);

      expect(config.authentication.login_type).toBe('form');
      expect(config.authentication.credentials.username).toBe('testuser');
      expect(config.authentication.login_flow).toHaveLength(4);
    });
  });

  describe('file validation', () => {
    it('should throw error for non-existent file', async () => {
      await expect(
        parseConfig('/nonexistent/config.yaml')
      ).rejects.toThrow('Configuration file not found');
    });

    it('should throw error for empty file', async () => {
      await fs.writeFile(testConfigPath, '');

      await expect(
        parseConfig(testConfigPath)
      ).rejects.toThrow('Configuration file is empty');
    });

    it('should throw error for file too large', async () => {
      const largeContent = 'x'.repeat(2 * 1024 * 1024); // 2MB
      await fs.writeFile(testConfigPath, largeContent);

      await expect(
        parseConfig(testConfigPath)
      ).rejects.toThrow('Configuration file too large');
    });
  });

  describe('YAML parsing errors', () => {
    it('should throw error for invalid YAML syntax', async () => {
      await fs.writeFile(testConfigPath, 'invalid: yaml: syntax:');

      await expect(
        parseConfig(testConfigPath)
      ).rejects.toThrow('YAML parsing failed');
    });

    it('should throw error for null result after parsing', async () => {
      await fs.writeFile(testConfigPath, '---');

      await expect(
        parseConfig(testConfigPath)
      ).rejects.toThrow('Configuration file resulted in null/undefined after parsing');
    });
  });

  describe('schema validation', () => {
    it('should reject config that is not an object', async () => {
      await fs.writeFile(testConfigPath, yaml.dump('not an object'));

      await expect(
        parseConfig(testConfigPath)
      ).rejects.toThrow('Configuration must be a valid object');
    });

    it('should reject config that is an array', async () => {
      await fs.writeFile(testConfigPath, yaml.dump(['array', 'values']));

      await expect(
        parseConfig(testConfigPath)
      ).rejects.toThrow('Configuration must be an object, not an array');
    });

    it('should reject duplicate rules', async () => {
      await fs.writeFile(testConfigPath, yaml.dump(invalidConfigs.duplicateRules));

      await expect(
        parseConfig(testConfigPath)
      ).rejects.toThrow('Duplicate rule found');
    });

    it('should reject conflicting rules', async () => {
      await fs.writeFile(testConfigPath, yaml.dump(invalidConfigs.conflictingRules));

      await expect(
        parseConfig(testConfigPath)
      ).rejects.toThrow('Conflicting rule found');
    });

    it('should reject dangerous patterns in paths', async () => {
      await fs.writeFile(testConfigPath, yaml.dump(invalidConfigs.dangerousPattern));

      await expect(
        parseConfig(testConfigPath)
      ).rejects.toThrow('potentially dangerous pattern');
    });
  });

  describe('rule type validation', () => {
    it('should validate path rules start with /', async () => {
      const invalidPathRule = {
        rules: {
          avoid: [
            {
              description: 'Invalid path',
              type: 'path',
              url_path: 'admin'  // Missing leading /
            }
          ]
        }
      };

      await fs.writeFile(testConfigPath, yaml.dump(invalidPathRule));

      await expect(
        parseConfig(testConfigPath)
      ).rejects.toThrow("must start with '/'");
    });

    it('should validate domain rules have dots', async () => {
      const invalidDomainRule = {
        rules: {
          avoid: [
            {
              description: 'Invalid domain',
              type: 'domain',
              url_path: 'localhost'  // No dot
            }
          ]
        }
      };

      await fs.writeFile(testConfigPath, yaml.dump(invalidDomainRule));

      await expect(
        parseConfig(testConfigPath)
      ).rejects.toThrow('must be a valid domain name');
    });

    it('should validate method rules are valid HTTP methods', async () => {
      const invalidMethodRule = {
        rules: {
          avoid: [
            {
              description: 'Invalid method',
              type: 'method',
              url_path: 'INVALID'
            }
          ]
        }
      };

      await fs.writeFile(testConfigPath, yaml.dump(invalidMethodRule));

      await expect(
        parseConfig(testConfigPath)
      ).rejects.toThrow('must be one of');
    });

    it('should validate header names are alphanumeric', async () => {
      const invalidHeaderRule = {
        rules: {
          avoid: [
            {
              description: 'Invalid header',
              type: 'header',
              url_path: 'invalid header!'  // Contains space and !
            }
          ]
        }
      };

      await fs.writeFile(testConfigPath, yaml.dump(invalidHeaderRule));

      await expect(
        parseConfig(testConfigPath)
      ).rejects.toThrow('must be a valid header name');
    });

    it('should validate parameter names are alphanumeric', async () => {
      const invalidParamRule = {
        rules: {
          avoid: [
            {
              description: 'Invalid parameter',
              type: 'parameter',
              url_path: 'param@name'  // Contains @
            }
          ]
        }
      };

      await fs.writeFile(testConfigPath, yaml.dump(invalidParamRule));

      await expect(
        parseConfig(testConfigPath)
      ).rejects.toThrow('must be a valid parameter name');
    });
  });

  describe('security validation', () => {
    it('should reject dangerous patterns in username', async () => {
      const dangerousConfig = {
        authentication: {
          login_type: 'form',
          login_url: 'https://example.com/login',
          credentials: {
            username: '../../../etc/passwd',
            password: 'test'
          },
          login_flow: ['Login'],
          success_condition: {
            type: 'url',
            value: '/dashboard'
          }
        }
      };

      await fs.writeFile(testConfigPath, yaml.dump(dangerousConfig));

      await expect(
        parseConfig(testConfigPath)
      ).rejects.toThrow('potentially dangerous pattern');
    });

    it('should reject dangerous patterns in login flow', async () => {
      const dangerousConfig = {
        authentication: {
          login_type: 'form',
          login_url: 'https://example.com/login',
          credentials: {
            username: 'test',
            password: 'test'
          },
          login_flow: ['<script>alert(1)</script>'],
          success_condition: {
            type: 'url',
            value: '/dashboard'
          }
        }
      };

      await fs.writeFile(testConfigPath, yaml.dump(dangerousConfig));

      await expect(
        parseConfig(testConfigPath)
      ).rejects.toThrow('potentially dangerous pattern');
    });
  });
});

describe('distributeConfig', () => {
  it('should distribute config sections correctly', () => {
    const distributed = distributeConfig(validConfig);

    expect(distributed.avoid).toBeDefined();
    expect(distributed.focus).toBeDefined();
    expect(distributed.authentication).toBeDefined();
    expect(distributed.models).toBe(null);
  });

  it('should sanitize rules', () => {
    const distributed = distributeConfig(validConfig);

    expect(distributed.avoid[0].description).toBe('Avoid admin panel');
    expect(distributed.avoid[0].type).toBe('path');
    expect(distributed.avoid[0].url_path).toBe('/admin');
  });

  it('should handle empty config', () => {
    const distributed = distributeConfig({});

    expect(distributed.avoid).toEqual([]);
    expect(distributed.focus).toEqual([]);
    expect(distributed.authentication).toBe(null);
  });

  it('should handle config without rules', () => {
    const configWithoutRules = {
      authentication: validConfig.authentication
    };

    const distributed = distributeConfig(configWithoutRules);

    expect(distributed.avoid).toEqual([]);
    expect(distributed.focus).toEqual([]);
    expect(distributed.authentication).toBeDefined();
  });

  it('should preserve TOTP secret', () => {
    const distributed = distributeConfig(configWithTotp);

    expect(distributed.authentication.credentials.totp_secret).toBe('JBSWY3DPEHPK3PXP');
  });

  it('should sanitize authentication fields', () => {
    const configWithWhitespace = {
      authentication: {
        login_type: '  form  ',
        login_url: '  https://example.com/login  ',
        credentials: {
          username: '  testuser  ',
          password: 'testpass123'
        },
        login_flow: ['  Navigate to login  ', '  Submit form  '],
        success_condition: {
          type: '  url  ',
          value: '  /dashboard  '
        }
      }
    };

    const distributed = distributeConfig(configWithWhitespace);

    expect(distributed.authentication.login_type).toBe('form');
    expect(distributed.authentication.login_url).toBe('https://example.com/login');
    expect(distributed.authentication.credentials.username).toBe('testuser');
    expect(distributed.authentication.login_flow[0]).toBe('Navigate to login');
    expect(distributed.authentication.success_condition.type).toBe('url');
    expect(distributed.authentication.success_condition.value).toBe('/dashboard');
  });

  it('should pass through models config', () => {
    const configWithModels = {
      ...validConfig,
      models: {
        default: 'claude-sonnet-4-5',
        vuln: 'claude-opus-4-5'
      }
    };

    const distributed = distributeConfig(configWithModels);

    expect(distributed.models).toEqual({
      default: 'claude-sonnet-4-5',
      vuln: 'claude-opus-4-5'
    });
  });
});
