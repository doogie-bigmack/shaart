// Copyright (C) 2025 Keygraph, Inc.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License version 3
// as published by the Free Software Foundation.

/**
 * save_deliverable MCP Tool
 *
 * Saves deliverable files with automatic validation.
 * Replaces tools/save_deliverable.js bash script.
 */

import { tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { DeliverableType, DELIVERABLE_FILENAMES, isQueueType } from '../types/deliverables.js';
import { createToolResult } from '../types/tool-responses.js';
import { validateQueueJson } from '../validation/queue-validator.js';
import { saveDeliverableFile } from '../utils/file-operations.js';
import { createValidationError, createGenericError } from '../utils/error-formatter.js';
import {
  getDatabase,
  upsertApplication,
  upsertVulnerability
} from '../../../src/exploit-memory/index.js';
import { generateIdentityHash } from '../../../src/exploit-memory/deduplicator.js';
import { extractCredentials, normalizeCredentials } from '../../../src/exploit-memory/credential-extractor.js';

/**
 * Input schema for save_deliverable tool
 */
export const SaveDeliverableInputSchema = z.object({
  deliverable_type: z.nativeEnum(DeliverableType).describe('Type of deliverable to save'),
  content: z.string().min(1).describe('File content (markdown for analysis/evidence, JSON for queues)'),
});

/**
 * Save vulnerabilities to exploit memory database
 *
 * @param {string} hostname - Target hostname
 * @param {Array} vulnerabilities - Vulnerabilities from queue
 * @param {string} sessionId - Current session ID
 */
async function saveVulnerabilitiesToExploitMemory(hostname, vulnerabilities, sessionId) {
  try {
    // Check if exploit memory is enabled
    const exploitMemoryEnabled = global.__SHAART_EXPLOIT_MEMORY_CONFIG?.enabled !== false;
    if (!exploitMemoryEnabled) {
      return;
    }

    const db = getDatabase(hostname);

    // Ensure application record exists
    upsertApplication(db, { hostname });

    // Get deduplication strategy
    const deduplicationStrategy = global.__SHAART_EXPLOIT_MEMORY_CONFIG?.deduplication_strategy || 'strict';

    // Save each vulnerability
    for (const vuln of vulnerabilities) {
      try {
        // Generate identity hash
        const vulnData = {
          hostname,
          vuln_type: vuln.type || 'unknown',
          source: vuln.source || 'unknown',
          path: vuln.location || vuln.path || 'unknown',
          sink_call: vuln.sink || null,
          confidence: vuln.confidence || 50,
          exploitation_data: {
            description: vuln.description,
            impact: vuln.impact,
            remediation: vuln.remediation
          }
        };

        const vulnerabilityId = generateIdentityHash(vulnData, deduplicationStrategy);

        // Upsert vulnerability
        upsertVulnerability(db, {
          id: vulnerabilityId,
          ...vulnData
        });
      } catch (vulnError) {
        console.warn(`Failed to save vulnerability to exploit memory: ${vulnError.message}`);
      }
    }
  } catch (error) {
    console.warn(`Failed to save to exploit memory: ${error.message}`);
  }
}

/**
 * Extract and save credentials from evidence files
 *
 * @param {string} hostname - Target hostname
 * @param {string} content - Evidence content
 * @param {string} sessionId - Current session ID
 */
async function saveCredentialsToExploitMemory(hostname, content, sessionId) {
  try {
    // Check if exploit memory is enabled
    const exploitMemoryEnabled = global.__SHAART_EXPLOIT_MEMORY_CONFIG?.enabled !== false;
    if (!exploitMemoryEnabled) {
      return;
    }

    const db = getDatabase(hostname);

    // Extract credentials from content
    const credentials = extractCredentials(content, `evidence_${sessionId}`);

    if (credentials.length === 0) {
      return;
    }

    // Ensure application record exists
    upsertApplication(db, { hostname });

    // Save credentials
    const { recordCredentials } = await import('../../../src/exploit-memory/index.js');

    for (const cred of credentials) {
      try {
        const normalizedCred = await normalizeCredentials(cred, hostname);
        recordCredentials(db, normalizedCred);
      } catch (credError) {
        console.warn(`Failed to save credential to exploit memory: ${credError.message}`);
      }
    }

    console.log(`   💾 Saved ${credentials.length} credentials to exploit memory`);
  } catch (error) {
    console.warn(`Failed to extract credentials: ${error.message}`);
  }
}

/**
 * save_deliverable tool implementation
 *
 * @param {Object} args
 * @param {string} args.deliverable_type - Type of deliverable to save
 * @param {string} args.content - File content
 * @returns {Promise<Object>} Tool result
 */
export async function saveDeliverable(args) {
  try {
    const { deliverable_type, content } = args;

    // Validate queue JSON if applicable
    if (isQueueType(deliverable_type)) {
      const queueValidation = validateQueueJson(content);
      if (!queueValidation.valid) {
        const errorResponse = createValidationError(
          queueValidation.message,
          true,
          {
            deliverableType: deliverable_type,
            expectedFormat: '{"vulnerabilities": [...]}',
          }
        );
        return createToolResult(errorResponse);
      }
    }

    // Get filename and save file
    const filename = DELIVERABLE_FILENAMES[deliverable_type];
    const filepath = saveDeliverableFile(filename, content);

    // Success response
    const successResponse = {
      status: 'success',
      message: `Deliverable saved successfully: ${filename}`,
      filepath,
      deliverableType: deliverable_type,
      validated: isQueueType(deliverable_type),
    };

    // Extract hostname from global context (set by session)
    const hostname = global.__SHAART_HOSTNAME;
    const sessionId = global.__SHAART_SESSION_ID;

    // Save to exploit memory if applicable
    if (hostname && isQueueType(deliverable_type)) {
      try {
        const queueData = JSON.parse(content);
        if (queueData.vulnerabilities && queueData.vulnerabilities.length > 0) {
          await saveVulnerabilitiesToExploitMemory(hostname, queueData.vulnerabilities, sessionId);
          successResponse.exploit_memory_saved = queueData.vulnerabilities.length;
        }
      } catch (exploitMemoryError) {
        console.warn(`Failed to save to exploit memory: ${exploitMemoryError.message}`);
      }
    }

    // Extract credentials from evidence files
    if (hostname && deliverable_type.includes('EVIDENCE')) {
      await saveCredentialsToExploitMemory(hostname, content, sessionId);
    }

    return createToolResult(successResponse);
  } catch (error) {
    const errorResponse = createGenericError(
      error,
      false,
      { deliverableType: args.deliverable_type }
    );

    return createToolResult(errorResponse);
  }
}

/**
 * Tool definition for MCP server - created using SDK's tool() function
 */
export const saveDeliverableTool = tool(
  'save_deliverable',
  'Saves deliverable files with automatic validation. Queue files must have {"vulnerabilities": [...]} structure.',
  SaveDeliverableInputSchema.shape,
  saveDeliverable
);
