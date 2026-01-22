#!/usr/bin/env node

// ============================================================================
// AUTOMATIC DATABASE SCHEMA IMPORT
// For: XAMPP MySQL - id_card database
// Usage: node import-schema.js
// ============================================================================

import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function importSchema() {
  console.log('\n🔍 Preparing Database Schema Import...\n');

  const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT) || 3306,
  };

  const dbName = process.env.DB_NAME || 'id_card';
  const schemaFile = path.join(__dirname, 'MYSQL_SCHEMA_id_card.sql');

  console.log('📊 Configuration:');
  console.log(`   Host: ${config.host}`);
  console.log(`   Port: ${config.port}`);
  console.log(`   User: ${config.user}`);
  console.log(`   Database: ${dbName}`);
  console.log(`   Schema file: ${schemaFile}\n`);

  try {
    // Check if schema file exists
    if (!fs.existsSync(schemaFile)) {
      throw new Error(`Schema file not found: ${schemaFile}`);
    }

    // Read schema file
    console.log('1️⃣  Reading schema file...');
    const schema = fs.readFileSync(schemaFile, 'utf8');
    console.log(`   ✅ Schema file read (${schema.length} bytes)\n`);

    // Connect to MySQL (without specifying database first)
    console.log('2️⃣  Connecting to MySQL...');
    const connection = await mysql.createConnection(config);
    console.log('   ✅ Connected to MySQL\n');

    // Drop existing database if exists
    console.log('3️⃣  Dropping existing database (if exists)...');
    try {
      await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
      console.log(`   ✅ Old database dropped\n`);
    } catch (error) {
      console.log(`   ℹ️  No existing database found\n`);
    }

    // Split schema into individual statements
    // Handle USE statements specially
    console.log('4️⃣  Executing schema queries...');
    
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'))
      .filter(stmt => stmt.length > 0);

    let executed = 0;
    for (const statement of statements) {
      // Skip comments
      if (statement.startsWith('--')) continue;
      
      // Skip USE database statements (we'll handle that separately)
      if (statement.toUpperCase().startsWith('USE ')) continue;

      try {
        await connection.query(statement);
        executed++;
        
        if (executed % 5 === 0) {
          console.log(`   ⏳ Executed ${executed}/${statements.length} statements...`);
        }
      } catch (error) {
        // Ignore certain errors
        if (error.code === 'ER_DB_CREATE_EXISTS' || 
            error.code === 'ER_TABLE_EXISTS_ERROR' ||
            error.message.includes('already exists')) {
          // Expected errors, continue
        } else if (error.code !== 'ER_BAD_DB_ERROR') {
          console.log(`   ⚠️  Non-critical error: ${error.message.substring(0, 50)}...`);
        }
      }
    }

    console.log(`   ✅ Executed ${executed} statements\n`);

    // Re-connect to the database
    console.log('4.5️⃣  Connecting to database...');
    await connection.end();
    
    // Give MySQL a moment to create the database
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const dbConnection = await mysql.createConnection({
      ...config,
      database: dbName,
    });
    console.log(`   ✅ Connected to database: ${dbName}\n`);

    // Verify tables created
    console.log('5️⃣  Verifying tables created...');
    const [tables] = await dbConnection.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = ?`,
      [dbName]
    );

    console.log(`   ✅ Found ${tables.length} tables:`);
    tables.forEach((table, index) => {
      console.log(`      ${index + 1}. ${table.table_name}`);
    });
    console.log('');

    // Verify indexes
    console.log('6️⃣  Checking indexes...');
    const [indexes] = await dbConnection.query(
      `SELECT COUNT(*) as count FROM information_schema.statistics WHERE table_schema = ?`,
      [dbName]
    );
    console.log(`   ✅ Found ${indexes[0].count} indexes\n`);

    // Close connection
    await dbConnection.end();

    // Final summary
    console.log('='.repeat(60));
    if (tables.length === 13) {
      console.log('✅ DATABASE IMPORT SUCCESSFUL!');
      console.log('='.repeat(60));
      console.log('\n✨ All 13 tables created successfully!');
      console.log('\nNext steps:');
      console.log('  1. Run: node test-db-connection.js');
      console.log('  2. Then: npm run dev\n');
      process.exit(0);
    } else {
      console.log(`⚠️  WARNING: Expected 13 tables but found ${tables.length}`);
      console.log('='.repeat(60));
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\n🔧 Troubleshooting tips:');
    console.error('   1. Is XAMPP MySQL running? Check XAMPP Control Panel');
    console.error('   2. Check .env has correct DB_HOST, DB_PORT, DB_USER');
    console.error('   3. Verify MYSQL_SCHEMA_id_card.sql file exists');
    console.error('   4. Try connecting manually: mysql -u root');
    console.error('\nFull error:\n', error);
    process.exit(1);
  }
}

// Run import
importSchema();
