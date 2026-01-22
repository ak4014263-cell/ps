#!/usr/bin/env node

// ============================================================================
// AUTOMATIC DATABASE SCHEMA IMPORT (Simplified)
// For: XAMPP MySQL - id_card database
// Usage: node import-schema-simple.js
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
  console.log('\n🚀 Database Schema Import for XAMPP MySQL\n');

  const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT) || 3306,
  };

  const dbName = process.env.DB_NAME || 'id_card';
  const schemaFile = path.join(__dirname, 'MYSQL_SCHEMA_id_card.sql');

  console.log('📋 Configuration:');
  console.log(`   Database: ${dbName}`);
  console.log(`   Host: ${config.host}:${config.port}`);
  console.log(`   User: ${config.user}\n`);

  try {
    // Verify file exists
    if (!fs.existsSync(schemaFile)) {
      throw new Error(`Schema file not found: ${schemaFile}`);
    }

    console.log('✅ Schema file found\n');

    // Read entire schema file
    const schema = fs.readFileSync(schemaFile, 'utf8');

    // Connect to MySQL
    console.log('🔌 Connecting to MySQL...');
    const connection = await mysql.createConnection(config);
    console.log('✅ Connected\n');

    // Step 1: Create database
    console.log(`📦 Creating database '${dbName}'...`);
    await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    await connection.query(`CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log('✅ Database created\n');

    // Step 2: Use database
    await connection.query(`USE \`${dbName}\``);

    // Step 3: Parse and execute schema statements
    console.log('📝 Creating tables and indexes...');
    
    // Split by semicolon and filter
    const lines = schema.split('\n');
    let currentStatement = '';
    let statementCount = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip comments
      if (trimmed.startsWith('--')) continue;
      if (trimmed === '') continue;
      
      currentStatement += ' ' + trimmed;
      
      // Execute when we find a semicolon
      if (trimmed.endsWith(';')) {
        const statement = currentStatement.replace(/;$/, '').trim();
        
        // Skip USE and CREATE DATABASE statements (already handled)
        if (!statement.toUpperCase().startsWith('USE ') && 
            !statement.toUpperCase().startsWith('CREATE DATABASE')) {
          
          if (statement.length > 0) {
            try {
              await connection.query(statement + ';');
              statementCount++;
            } catch (error) {
              // Log but continue on error
              if (!error.message.includes('already exists')) {
                console.error(`   ⚠️  Error: ${error.message.substring(0, 60)}`);
              }
            }
          }
        }
        
        currentStatement = '';
      }
    }

    console.log(`✅ Executed ${statementCount} SQL statements\n`);

    // Step 4: Verify
    console.log('🔍 Verifying tables...');
    const [tables] = await connection.query(`SHOW TABLES`);
    
    const tableList = tables.map(t => {
      const key = Object.keys(t)[0];
      return t[key];
    });

    console.log(`✅ Found ${tableList.length} tables:`);
    tableList.forEach((table, index) => {
      console.log(`   ${index + 1}. ${table}`);
    });

    // Step 5: Check indexes
    console.log('\n📊 Checking indexes...');
    const [indexes] = await connection.query(
      `SELECT COUNT(*) as cnt FROM information_schema.statistics WHERE table_schema = DATABASE() AND index_name != 'PRIMARY'`
    );
    console.log(`✅ Found ${indexes[0].cnt} indexes\n`);

    // Close connection
    await connection.end();

    // Summary
    if (tableList.length === 13) {
      console.log('═'.repeat(60));
      console.log('✅ SUCCESS! Database is ready to use!');
      console.log('═'.repeat(60));
      console.log('\n📝 Next steps:');
      console.log('   1. Run: node test-db-connection.js');
      console.log('   2. Then: npm run dev\n');
      process.exit(0);
    } else {
      console.log(`⚠️  Warning: Expected 13 tables, found ${tableList.length}`);
      if (tableList.length > 0) {
        console.log('   Database was partially imported. Continue with testing.');
        process.exit(0);
      } else {
        process.exit(1);
      }
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Is XAMPP MySQL running?');
    console.error('   2. Check .env file has correct database credentials');
    console.error('   3. Try: mysql -u root (to test connection)');
    process.exit(1);
  }
}

// Run import
importSchema();
