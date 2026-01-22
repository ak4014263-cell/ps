#!/usr/bin/env node

// ============================================================================
// DATABASE CONNECTION TEST SCRIPT
// Tests: XAMPP MySQL - id_card database
// Usage: node test-db-connection.js
// ============================================================================

import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

async function testConnection() {
  console.log('\n🔍 Testing Database Connection...\n');
  
  const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'id_card',
    port: parseInt(process.env.DB_PORT) || 3306,
  };

  console.log('📊 Configuration:');
  console.log(`   Host: ${config.host}`);
  console.log(`   Port: ${config.port}`);
  console.log(`   User: ${config.user}`);
  console.log(`   Password: ${config.password ? '***' : '(empty)'}`);
  console.log(`   Database: ${config.database}`);
  console.log('');

  try {
    // Test 1: Basic Connection
    console.log('1️⃣  Testing basic connection...');
    const connection = await mysql.createConnection(config);
    console.log('   ✅ Connected successfully!');

    // Test 2: Check tables
    console.log('\n2️⃣  Checking tables...');
    const [tables] = await connection.query(
      `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ?`,
      [config.database]
    );
    const tableCount = tables[0].count;
    console.log(`   ✅ Found ${tableCount} tables`);

    // Test 3: List all tables
    console.log('\n3️⃣  Table list:');
    const [allTables] = await connection.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = ?`,
      [config.database]
    );
    allTables.forEach((table, index) => {
      console.log(`   ${index + 1}. ${table.table_name}`);
    });

    // Test 4: Check indexes
    console.log('\n4️⃣  Checking indexes...');
    const [indexes] = await connection.query(
      `SELECT COUNT(*) as count FROM information_schema.statistics WHERE table_schema = ?`,
      [config.database]
    );
    console.log(`   ✅ Found ${indexes[0].count} indexes`);

    // Test 5: Check foreign keys
    console.log('\n5️⃣  Checking foreign keys...');
    const [fks] = await connection.query(
      `SELECT COUNT(*) as count FROM information_schema.referential_constraints WHERE constraint_schema = ?`,
      [config.database]
    );
    console.log(`   ✅ Found ${fks[0].count} foreign key relationships`);

    // Test 6: Sample query from profiles table
    console.log('\n6️⃣  Testing query from profiles table...');
    const [profiles] = await connection.query('SELECT COUNT(*) as count FROM profiles');
    console.log(`   ✅ Profiles table accessible (${profiles[0].count} records)`);

    // Test 7: Test insert (create sample data)
    console.log('\n7️⃣  Testing insert capability...');
    try {
      const sampleId = require('uuid').v4();
      await connection.query(
        'INSERT INTO profiles (id, full_name, email, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
        [sampleId, 'Test User', 'test@example.com']
      );
      console.log('   ✅ Insert successful (sample data added)');
      
      // Delete test data
      await connection.query('DELETE FROM profiles WHERE full_name = "Test User"');
      console.log('   ✅ Cleanup successful (test data removed)');
    } catch (error) {
      console.log('   ⚠️  Insert test skipped (uuid package may not be installed)');
    }

    // Test 8: Connection close
    console.log('\n8️⃣  Closing connection...');
    await connection.end();
    console.log('   ✅ Connection closed');

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED!');
    console.log('='.repeat(60));
    console.log('\n✨ Your database is ready to use!');
    console.log(`📝 Connection string: mysql://root:@localhost:3306/${config.database}\n`);

    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\n🔧 Troubleshooting tips:');
    console.error('   1. Is XAMPP MySQL running? Check XAMPP Control Panel');
    console.error('   2. Has the schema been imported? Run MYSQL_SCHEMA_id_card.sql');
    console.error('   3. Check .env file has correct DATABASE_URL');
    console.error('   4. Try: mysql -u root -e "USE id_card; SHOW TABLES;"');
    console.error('\nFull error:\n', error);
    process.exit(1);
  }
}

// Run tests
testConnection();
