#!/usr/bin/env node
/**
 * Test auto-extraction from queue files to exploit memory database
 * Tests: save_deliverable auto-saves vulnerabilities from queue JSON
 */

import { saveDeliverableTool } from './mcp-server/src/index.js';
import { getDatabase, closeAllDatabases } from './src/exploit-memory/database.js';
import { fs } from 'zx';

const hostname = 'test-auto-extract.example.com';
const sessionId = 'test-session-' + Date.now();
const targetDir = process.cwd();

console.log('\n🧪 Testing Queue File Auto-Extraction to Exploit Memory\n');
console.log('='.repeat(60));

// Setup global config
global.__SHAART_TARGET_DIR = targetDir;
global.__SHAART_HOSTNAME = hostname;
global.__SHAART_SESSION_ID = sessionId;
global.__SHAART_EXPLOIT_MEMORY_CONFIG = {
  enabled: true,
  deduplication_strategy: 'strict',
  max_age_days: 90,
  trigger_infrastructure: true
};

// Test 1: Save queue file with vulnerabilities
console.log('\n[1/3] Testing save_deliverable with queue file...');

const queueContent = JSON.stringify({
  vulnerabilities: [
    {
      id: 1,
      type: 'sql_injection',
      severity: 'critical',
      endpoint: '/api/users',
      parameter: 'id',
      description: 'SQL injection in user lookup endpoint',
      location: '/api/users',
      source: 'api/users.py:145',
      sink: 'db.execute',
      confidence: 95,
      impact: 'Full database access via UNION-based SQL injection',
      remediation: 'Use parameterized queries or ORM methods'
    },
    {
      id: 2,
      type: 'sql_injection',
      severity: 'high',
      endpoint: '/api/posts',
      parameter: 'search',
      description: 'SQL injection in post search',
      location: '/api/posts',
      source: 'api/posts.py:78',
      sink: 'cursor.execute',
      confidence: 88,
      impact: 'Data leakage from posts table',
      remediation: 'Sanitize search input and use prepared statements'
    }
  ]
}, null, 2);

try {
  const result = await saveDeliverableTool.handler({
    deliverable_type: 'INJECTION_QUEUE',
    content: queueContent
  });

  const parsed = JSON.parse(result.content[0].text);
  console.log('✅ save_deliverable succeeded');
  console.log(`   File saved: ${parsed.filepath}`);
  console.log(`   Validated: ${parsed.validated}`);

  if (parsed.exploit_memory_saved) {
    console.log(`   ✅ Auto-extracted to exploit memory: ${parsed.exploit_memory_saved} vulnerabilities`);
  } else {
    console.log('   ⚠️  No exploit_memory_saved in response');
  }
} catch (e) {
  console.error('❌ save_deliverable failed:', e.message);
  process.exit(1);
}

// Test 2: Query database to verify vulnerabilities were saved
console.log('\n[2/3] Verifying vulnerabilities in database...');

try {
  const db = getDatabase(hostname);

  // Count total vulnerabilities
  const countResult = db.prepare('SELECT COUNT(*) as count FROM vulnerabilities WHERE hostname = ?').get(hostname);
  console.log(`✅ Found ${countResult.count} vulnerabilities in database`);

  if (countResult.count !== 2) {
    throw new Error(`Expected 2 vulnerabilities, found ${countResult.count}`);
  }

  // Verify vulnerability details
  const vulns = db.prepare(`
    SELECT vuln_type, source, path, sink_call, confidence
    FROM vulnerabilities
    WHERE hostname = ?
    ORDER BY confidence DESC
  `).all(hostname);

  for (const vuln of vulns) {
    console.log(`   - ${vuln.vuln_type} at ${vuln.path} (${vuln.confidence}% confidence)`);
    console.log(`     Source: ${vuln.source}, Sink: ${vuln.sink_call}`);
  }

  // Verify deduplication by saving same queue again
  console.log('\n[3/3] Testing deduplication (saving same queue again)...');

  await saveDeliverableTool.handler({
    deliverable_type: 'INJECTION_QUEUE',
    content: queueContent
  });

  const countAfter = db.prepare('SELECT COUNT(*) as count FROM vulnerabilities WHERE hostname = ?').get(hostname);

  if (countAfter.count === 2) {
    console.log('✅ Deduplication works: Still 2 vulnerabilities (not 4)');
  } else {
    throw new Error(`Deduplication failed: Expected 2 vulns, found ${countAfter.count}`);
  }

} catch (e) {
  console.error('❌ Database verification failed:', e.message);
  closeAllDatabases();
  process.exit(1);
}

// Cleanup
console.log('\n' + '='.repeat(60));
console.log('🧹 Cleaning up test data...');
closeAllDatabases();

const dbPath = `./exploit-memory/${hostname}.db`;
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  if (fs.existsSync(`${dbPath}-shm`)) fs.unlinkSync(`${dbPath}-shm`);
  if (fs.existsSync(`${dbPath}-wal`)) fs.unlinkSync(`${dbPath}-wal`);
  console.log('✅ Test database deleted');
}

// Clean up deliverable file if created
const deliverablePath = `${targetDir}/deliverables/injection_exploitation_queue.json`;
if (fs.existsSync(deliverablePath)) {
  fs.unlinkSync(deliverablePath);
  console.log('✅ Test deliverable file deleted');
}

console.log('\n✅ All auto-extraction tests passed!\n');
