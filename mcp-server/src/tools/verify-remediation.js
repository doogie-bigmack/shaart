// Copyright (C) 2025 Keygraph, Inc.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License version 3
// as published by the Free Software Foundation.

/**
 * verify_remediation MCP Tool
 *
 * Marks vulnerabilities as fixed or verified after remediation testing.
 * Records remediation history for audit trails.
 */

import { tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { createToolResult } from '../types/tool-responses.js';
import { createGenericError, createValidationError } from '../utils/error-formatter.js';
import {
  getDatabase,
  getVulnerability,
  updateVulnerabilityStatus,
  recordRemediationHistory
} from '../../../src/exploit-memory/database.js';

/**
 * Input schema for verify_remediation tool
 */
export const VerifyRemediationInputSchema = z.object({
  hostname: z.string().min(1).describe('Target hostname'),
  vulnerability_id: z.string().min(1).describe('Vulnerability ID to verify'),
  new_status: z.enum(['fixed', 'verified', 'false_positive', 'wont_fix']).describe('New remediation status'),
  verification_method: z.string().optional().describe('How verification was performed'),
  notes: z.string().optional().describe('Additional notes about remediation')
});

/**
 * Verify vulnerability remediation
 *
 * @param {Object} args - Tool arguments
 * @returns {Promise<Object>} Tool result
 */
export async function verifyRemediation(args) {
  try {
    const {
      hostname,
      vulnerability_id,
      new_status,
      verification_method,
      notes
    } = args;

    // Get database connection
    const db = getDatabase(hostname);

    // Get existing vulnerability
    const vulnerability = getVulnerability(db, vulnerability_id);

    if (!vulnerability) {
      const errorResponse = createValidationError(
        `Vulnerability ${vulnerability_id} not found`,
        false,
        { vulnerability_id }
      );
      return createToolResult(errorResponse);
    }

    const old_status = vulnerability.remediation_status;

    // Validate status transition
    const validTransitions = {
      'open': ['fixed', 'false_positive', 'wont_fix'],
      'fixed': ['verified', 'open'],
      'verified': ['open'],
      'false_positive': ['open'],
      'wont_fix': ['open']
    };

    if (!validTransitions[old_status]?.includes(new_status)) {
      const errorResponse = createValidationError(
        `Invalid status transition from '${old_status}' to '${new_status}'`,
        false,
        {
          old_status,
          new_status,
          valid_transitions: validTransitions[old_status]
        }
      );
      return createToolResult(errorResponse);
    }

    // Update vulnerability status
    const updatedVulnerability = updateVulnerabilityStatus(db, vulnerability_id, new_status);

    // Record remediation history
    const history = recordRemediationHistory(db, {
      vulnerability_id,
      old_status,
      new_status,
      verification_method,
      notes
    });

    const result = {
      status: 'success',
      message: `Vulnerability remediation verified: ${old_status} → ${new_status}`,
      vulnerability_id,
      old_status,
      new_status,
      history_id: history.id,
      vulnerability: {
        id: updatedVulnerability.id,
        vuln_type: updatedVulnerability.vuln_type,
        source: updatedVulnerability.source,
        path: updatedVulnerability.path,
        confidence: updatedVulnerability.confidence,
        remediation_status: updatedVulnerability.remediation_status,
        last_verified_at: updatedVulnerability.last_verified_at
      }
    };

    return createToolResult(result);
  } catch (error) {
    const errorResponse = createGenericError(
      error,
      false,
      {
        hostname: args.hostname,
        vulnerability_id: args.vulnerability_id
      }
    );

    return createToolResult(errorResponse);
  }
}

/**
 * Tool definition for MCP server
 */
export const verifyRemediationTool = tool(
  'verify_remediation',
  'Verify that a vulnerability has been remediated. Updates remediation status and records verification history for audit trails.',
  VerifyRemediationInputSchema.shape,
  verifyRemediation
);
