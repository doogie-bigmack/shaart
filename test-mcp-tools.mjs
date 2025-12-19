#!/usr/bin/env node
/**
 * Test MCP tools for exploit memory
 */

import {
  saveExploitResultTool,
  queryExploitMemoryTool,
  verifyRemediationTool
} from './mcp-server/src/index.js';

const hostname = 'staging.bigmac-attack.com';
const sessionId = 'test-session-' + Date.now();
const targetDir = '/Users/damon.mcdougald/development/powder_finder';

console.log('\n🧪 Testing Exploit Memory MCP Tools');
console.log('═'.repeat(50));
console.log(`Target: ${hostname}`);
console.log(`Session: ${sessionId}\n`);

// Setup global config
global.__SHAART_TARGET_DIR = targetDir;
global.__SHAART_EXPLOIT_MEMORY_CONFIG = {
  enabled: true,
  deduplication_strategy: 'strict',
  max_age_days: 90,
  trigger_infrastructure: true
};

// Test 1: Save exploit result
console.log('[1/3] Testing save_exploit_result tool...');
try {
  const result = await saveExploitResultTool.handler({
    hostname,
    session_id: sessionId,
    vulnerability: {
      vuln_type: 'sql_injection',
      source: 'api/weather.py:145',
      path: '/api/v1/weather',
      sink_call: 'db.execute',
      confidence: 92,
      exploitation_data: {
        description: 'SQL injection in weather endpoint',
        impact: 'Database access',
        remediation: 'Use parameterized queries'
      }
    },
    exploitation_attempt: {
      success: true,
      technique: 'union-based',
      payload: "' UNION SELECT api_key FROM keys--",
      response_snippet: 'sk-test-abc123...'
    }
  });

  // Parse MCP response
  const parsed = JSON.parse(result.content[0].text);
  console.log('✅ save_exploit_result succeeded');
  console.log(`   Vulnerability ID: ${parsed.vulnerability_id.substring(0, 16)}...`);
  console.log(`   Status: ${parsed.status}`);
} catch (e) {
  console.error('❌ save_exploit_result failed:', e.message);
  process.exit(1);
}

// Test 2: Query exploit memory
console.log('\n[2/3] Testing query_exploit_memory tool...');
try {
  const result = await queryExploitMemoryTool.handler({
    hostname,
    vuln_type: 'sql_injection',
    remediation_status: 'open',
    include_patterns: true,
    include_credentials: false
  });

  // Parse MCP response
  const parsed = JSON.parse(result.content[0].text);
  console.log('✅ query_exploit_memory succeeded');
  console.log(`   Found ${parsed.vulnerabilities.length} vulnerabilities`);
  console.log(`   Found ${parsed.attack_patterns.length} attack patterns`);

  if (parsed.vulnerabilities.length > 0) {
    const vuln = parsed.vulnerabilities[0];
    console.log(`\n   Latest vulnerability:`);
    console.log(`     Type: ${vuln.vuln_type}`);
    console.log(`     Path: ${vuln.path}`);
    console.log(`     Confidence: ${vuln.confidence}%`);
    if (vuln.attempts) {
      console.log(`     Attempts: ${vuln.attempts.length}`);
    }
  }
} catch (e) {
  console.error('❌ query_exploit_memory failed:', e.message);
  console.error(e.stack);
  process.exit(1);
}

// Test 3: Verify remediation
console.log('\n[3/3] Testing verify_remediation tool...');
try {
  // Get the vulnerability ID from the query
  const queryResult = await queryExploitMemoryTool.handler({ hostname });
  const queryParsed = JSON.parse(queryResult.content[0].text);

  if (queryParsed.vulnerabilities.length === 0) {
    console.log('⚠️  No vulnerabilities to verify');
  } else {
    const vulnId = queryParsed.vulnerabilities[0].id;

    const result = await verifyRemediationTool.handler({
      hostname,
      vulnerability_id: vulnId,
      new_status: 'fixed',
      verification_method: 'Manual retest',
      notes: 'Parameterized queries implemented'
    });

    const parsed = JSON.parse(result.content[0].text);
    console.log('✅ verify_remediation succeeded');
    console.log(`   Old status: ${parsed.old_status}`);
    console.log(`   New status: ${parsed.new_status}`);
  }
} catch (e) {
  console.error('❌ verify_remediation failed:', e.message);
  console.error(e.stack);
  process.exit(1);
}

// Cleanup
console.log('\n' + '═'.repeat(50));
console.log('🧹 Cleaning up test data...');
import { closeAllDatabases } from './src/exploit-memory/database.js';
import { fs } from 'zx';
closeAllDatabases();

const dbPath = `./exploit-memory/${hostname}.db`;
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  if (fs.existsSync(`${dbPath}-shm`)) fs.unlinkSync(`${dbPath}-shm`);
  if (fs.existsSync(`${dbPath}-wal`)) fs.unlinkSync(`${dbPath}-wal`);
  console.log('✅ Test database deleted');
}

console.log('\n✅ All MCP tools tests passed!\n');
