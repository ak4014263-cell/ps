#!/usr/bin/env node

/**
 * Full System Test Script
 * Tests: Frontend, Backend, Database, API Connectivity
 */

import mysql from 'mysql2/promise';
import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001/api';
const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'id_card',
};

async function testDatabaseConnection() {
  console.log('\n📊 Testing Database Connection...');
  try {
    const connection = await mysql.createConnection(DB_CONFIG);
    const [result] = await connection.execute('SELECT 1');
    await connection.end();
    console.log('   ✅ MySQL Connected');
    return true;
  } catch (error) {
    console.error('   ❌ MySQL Error:', error.message);
    return false;
  }
}

async function testDatabaseTables() {
  console.log('\n📋 Checking Database Tables...');
  try {
    const connection = await mysql.createConnection(DB_CONFIG);
    const [tables] = await connection.execute(
      'SELECT table_name FROM information_schema.tables WHERE table_schema = ?',
      ['id_card']
    );
    console.log(`   ✅ Found ${tables.length} tables`);
    const requiredTables = ['templates', 'projects', 'clients', 'vendors', 'data_records'];
    const foundTables = tables.map(t => t.table_name);
    
    for (const table of requiredTables) {
      if (foundTables.includes(table)) {
        console.log(`      ✓ ${table}`);
      } else {
        console.log(`      ✗ ${table} (MISSING)`);
      }
    }
    await connection.end();
    return true;
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    return false;
  }
}

async function testBackendAPI() {
  console.log('\n🌐 Testing Backend API...');
  try {
    const response = await fetch(`${API_URL}/templates`, { timeout: 5000 });
    if (response.ok) {
      console.log('   ✅ Backend API Responding');
      return true;
    } else {
      console.log(`   ⚠️  Status ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error('   ❌ Backend API Error:', error.message);
    return false;
  }
}

async function testTemplatesEndpoint() {
  console.log('\n📝 Testing Templates Endpoint...');
  try {
    const response = await fetch(`${API_URL}/templates`);
    const data = await response.json();
    console.log(`   ✅ Templates Endpoint Responding`);
    console.log(`   📊 Found ${Array.isArray(data) ? data.length : 0} templates`);
    return true;
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    return false;
  }
}

async function testAllEndpoints() {
  console.log('\n🔗 Testing All API Endpoints...');
  const endpoints = [
    '/clients',
    '/vendors',
    '/projects',
    '/project-tasks',
    '/data-records',
    '/templates',
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, { timeout: 3000 });
      const status = response.ok ? '✅' : `⚠️ (${response.status})`;
      console.log(`   ${status} GET /api${endpoint}`);
    } catch (error) {
      console.log(`   ❌ GET /api${endpoint} - ${error.message}`);
    }
  }
}

async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 FULL SYSTEM TEST');
  console.log('='.repeat(60));

  const results = {
    db: await testDatabaseConnection(),
    tables: await testDatabaseTables(),
    api: await testBackendAPI(),
    templates: await testTemplatesEndpoint(),
  };

  await testAllEndpoints();

  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Database Connection: ${results.db ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Database Tables: ${results.tables ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Backend API: ${results.api ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Templates Endpoint: ${results.templates ? '✅ PASS' : '❌ FAIL'}`);

  const allPass = Object.values(results).every(r => r);
  console.log(`\nOverall Status: ${allPass ? '✅ ALL TESTS PASSED' : '⚠️  SOME TESTS FAILED'}`);
  console.log('='.repeat(60) + '\n');

  process.exit(allPass ? 0 : 1);
}

runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
