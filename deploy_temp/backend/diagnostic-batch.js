#!/usr/bin/env node

/**
 * Batch Pipeline Diagnostic Tool
 * 
 * Usage: node diagnostic-batch.js [command]
 * 
 * Commands:
 *   health      - Check system health
 *   queues      - Show queue statistics
 *   workers     - List active workers
 *   redis       - Test Redis connection
 *   test-upload - Create and upload test ZIP
 *   cleanup     - Clear failed jobs
 */

import Redis from 'redis';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const API_BASE = process.env.API_BASE || 'http://localhost:5000';

// Colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function header(title) {
  log('\n' + '='.repeat(60), 'cyan');
  log(title, 'cyan');
  log('='.repeat(60) + '\n', 'cyan');
}

/**
 * Health Check
 */
async function healthCheck() {
  header('🏥 System Health Check');

  let ok = 0;
  let fail = 0;

  // Check Redis
  try {
    const client = Redis.createClient({ url: REDIS_URL });
    await client.connect();
    await client.ping();
    await client.quit();
    log('✅ Redis: OK', 'green');
    ok++;
  } catch (err) {
    log(`❌ Redis: ${err.message}`, 'red');
    fail++;
  }

  // Check Backend API
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (res.ok) {
      log('✅ Backend API: OK', 'green');
      ok++;
    } else {
      log(`❌ Backend API: HTTP ${res.status}`, 'red');
      fail++;
    }
  } catch (err) {
    log(`❌ Backend API: ${err.message}`, 'red');
    fail++;
  }

  // Check Batch Endpoint
  try {
    const res = await fetch(`${API_BASE}/api/batch/queue-stats`);
    if (res.ok) {
      log('✅ Batch Endpoint: OK', 'green');
      ok++;
    } else {
      log(`❌ Batch Endpoint: HTTP ${res.status}`, 'red');
      fail++;
    }
  } catch (err) {
    log(`❌ Batch Endpoint: ${err.message}`, 'red');
    fail++;
  }

  log(`\nResult: ${ok} OK, ${fail} failed\n`, fail === 0 ? 'green' : 'yellow');
}

/**
 * Queue Statistics
 */
async function queueStats() {
  header('📊 Queue Statistics');

  try {
    const res = await fetch(`${API_BASE}/api/batch/queue-stats`);
    if (!res.ok) {
      log(`Error: HTTP ${res.status}`, 'red');
      return;
    }

    const data = await res.json();
    const stats = data.stats || {};

    if (stats.faceDetection) {
      log('Face Detection Queue:', 'blue');
      Object.entries(stats.faceDetection).forEach(([key, val]) => {
        const color = val > 100 ? 'yellow' : 'green';
        log(`  ${key}: ${val}`, color);
      });
    }

    if (stats.batchIngestion) {
      log('\nBatch Ingestion Queue:', 'blue');
      Object.entries(stats.batchIngestion).forEach(([key, val]) => {
        const color = val > 10 ? 'yellow' : 'green';
        log(`  ${key}: ${val}`, color);
      });
    }

    log('');
  } catch (err) {
    log(`Error: ${err.message}`, 'red');
  }
}

/**
 * List Active Workers
 */
async function listWorkers() {
  header('👷 Active Workers');

  try {
    const client = Redis.createClient({ url: REDIS_URL });
    await client.connect();

    // Get worker keys
    const keys = await client.keys('bull:face-detection:*:worker:*');
    
    if (keys.length === 0) {
      log('No active workers found', 'yellow');
      await client.quit();
      return;
    }

    log(`Found ${keys.length} active workers:\n`, 'green');

    for (const key of keys) {
      const data = await client.get(key);
      if (data) {
        const worker = JSON.parse(data);
        log(`  Worker: ${worker.workerId || 'unknown'}`, 'cyan');
        log(`    Started: ${new Date(worker.start || 0).toISOString()}`);
      }
    }

    await client.quit();
  } catch (err) {
    log(`Error: ${err.message}`, 'red');
  }

  log('');
}

/**
 * Test Redis Connection
 */
async function testRedis() {
  header('🔴 Redis Diagnostics');

  try {
    log(`Connecting to: ${REDIS_URL}`, 'blue');
    const client = Redis.createClient({ url: REDIS_URL });
    await client.connect();

    // Test PING
    const pong = await client.ping();
    log(`✅ PING response: ${pong}`, 'green');

    // Get info
    const info = await client.info();
    const lines = info.split('\n');
    log(`\nServer Info:\n`, 'blue');
    lines
      .filter(line => line.includes('redis_version') || line.includes('used_memory') || line.includes('connected_clients'))
      .forEach(line => {
        log(`  ${line.trim()}`);
      });

    // List queues
    log(`\nQueues:\n`, 'blue');
    const queueKeys = await client.keys('bull:*:id');
    queueKeys.forEach(key => {
      const queueName = key.split(':')[1];
      log(`  - ${queueName}`);
    });

    await client.quit();
    log('\n✅ Redis connection OK\n', 'green');
  } catch (err) {
    log(`❌ Error: ${err.message}\n`, 'red');
  }
}

/**
 * Test Batch Upload (Create and upload test ZIP)
 */
async function testUpload() {
  header('🧪 Test Batch Upload');

  log('Creating test ZIP with sample images...', 'yellow');

  // Note: This would require additional dependencies to create ZIP
  // For now, show the command to run
  log('\n1. Create a test.zip with some images:', 'blue');
  log('   mkdir -p /tmp/test-images');
  log('   # Add some image files to /tmp/test-images');
  log('   cd /tmp/test-images');
  log('   zip -r ../../test.zip .');
  log('   cd -');

  log('\n2. Run upload:', 'blue');
  log('   curl -X POST http://localhost:5000/api/batch/upload-zip \\');
  log('     -F "file=@test.zip" \\');
  log('     -F "projectId=test-project" \\');
  log('     -F "priority=5"');

  log('\n3. Monitor progress:', 'blue');
  log('   curl http://localhost:5000/api/batch/status/<batchId> | jq');

  log('');
}

/**
 * Cleanup Failed Jobs
 */
async function cleanupFailed() {
  header('🧹 Cleanup Failed Jobs');

  try {
    const client = Redis.createClient({ url: REDIS_URL });
    await client.connect();

    // Get failed job keys
    const keys = await client.keys('bull:face-detection:failed:*');
    
    if (keys.length === 0) {
      log('No failed jobs found', 'green');
      await client.quit();
      return;
    }

    log(`Found ${keys.length} failed jobs`, 'yellow');
    log('\nFailed jobs:', 'blue');

    for (const key of keys) {
      const data = await client.get(key);
      if (data) {
        try {
          const job = JSON.parse(data);
          log(`  - ${job.id || key}: ${job.data?.recordId || 'unknown record'}`);
        } catch (e) {
          log(`  - ${key} (parse error)`);
        }
      }
    }

    log(`\nTo retry failed jobs, restart the worker:`, 'yellow');
    log('  docker compose -f docker-compose.batch.yml restart worker-1');

    await client.quit();
  } catch (err) {
    log(`Error: ${err.message}`, 'red');
  }

  log('');
}

/**
 * Main
 */
async function main() {
  const command = process.argv[2] || 'health';

  try {
    switch (command) {
      case 'health':
        await healthCheck();
        break;
      case 'queues':
        await queueStats();
        break;
      case 'workers':
        await listWorkers();
        break;
      case 'redis':
        await testRedis();
        break;
      case 'test-upload':
        await testUpload();
        break;
      case 'cleanup':
        await cleanupFailed();
        break;
      default:
        log('Available commands:\n', 'blue');
        log('  health       - Check system health');
        log('  queues       - Show queue statistics');
        log('  workers      - List active workers');
        log('  redis        - Test Redis connection');
        log('  test-upload  - Show test upload command');
        log('  cleanup      - List and cleanup failed jobs');
        log('\nUsage: node diagnostic-batch.js [command]\n');
    }
  } catch (err) {
    log(`\nError: ${err.message}\n`, 'red');
    process.exit(1);
  }
}

main();
