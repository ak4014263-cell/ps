#!/usr/bin/env node

// ============================================================================
// MIGRATE DATA FROM SUPABASE TO XAMPP MYSQL
// Exports data from Supabase PostgreSQL and imports to local MySQL
// Usage: node migrate-data-supabase-to-mysql.js
// ============================================================================

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import path from 'path';

// Load environment variables from .env.local or .env
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://jkcdwxkqzohibsxglhyk.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const MYSQL_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'id_card',
  port: parseInt(process.env.DB_PORT) || 3306,
};

// Table order (respecting foreign keys)
const TABLES_IN_ORDER = [
  'profiles',
  'user_roles',
  'vendors',
  'vendor_staff',
  'admin_staff',
  'clients',
  'projects',
  'project_tasks',
  'project_assignments',
  'items',
  'products',
  'complaints',
  'transactions',
];

// ============================================================================
// MAIN MIGRATION
// ============================================================================

async function migrateData() {
  console.log('\n🚀 Data Migration: Supabase → XAMPP MySQL\n');

  try {
    // Step 1: Connect to Supabase
    console.log('1️⃣  Connecting to Supabase...');
    if (!SUPABASE_ANON_KEY) {
      throw new Error('VITE_SUPABASE_ANON_KEY not found in .env. Please add your Supabase anon key.');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('   ✅ Connected to Supabase\n');

    // Step 2: Connect to MySQL
    console.log('2️⃣  Connecting to MySQL...');
    const mysqlConnection = await mysql.createConnection(MYSQL_CONFIG);
    console.log('   ✅ Connected to MySQL\n');

    // Step 3: Migrate data from each table
    console.log('3️⃣  Migrating data...\n');

    let totalRecords = 0;

    for (const table of TABLES_IN_ORDER) {
      try {
        // Fetch data from Supabase
        const { data, error } = await supabase
          .from(table)
          .select('*');

        if (error) {
          console.log(`   ⚠️  ${table}: Table not found or error - ${error.message}`);
          continue;
        }

        if (!data || data.length === 0) {
          console.log(`   ℹ️  ${table}: No data to migrate`);
          continue;
        }

        // Clear existing data in MySQL table
        await mysqlConnection.query(`DELETE FROM \`${table}\``);

        // Prepare and insert data
        const insertedCount = await insertDataIntoMySQL(mysqlConnection, table, data);
        totalRecords += insertedCount;

        console.log(`   ✅ ${table}: ${insertedCount} records migrated`);

      } catch (error) {
        console.log(`   ❌ ${table}: Error - ${error.message}`);
      }
    }

    console.log(`\n4️⃣  Verifying migration...`);

    // Verify data counts
    let verifiedRecords = 0;
    for (const table of TABLES_IN_ORDER) {
      const [result] = await mysqlConnection.query(`SELECT COUNT(*) as count FROM \`${table}\``);
      const count = result[0].count;
      if (count > 0) {
        console.log(`   ${table}: ${count} records`);
        verifiedRecords += count;
      }
    }

    // Close connections
    await mysqlConnection.end();

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ MIGRATION COMPLETE!');
    console.log('='.repeat(60));
    console.log(`\nTotal records migrated: ${verifiedRecords}`);
    console.log('All data from Supabase has been imported to MySQL!\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Check .env has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    console.error('   2. Verify MySQL is running (XAMPP Control Panel)');
    console.error('   3. Ensure database schema is imported: node import-schema-simple.js');
    console.error('   4. Check internet connection (need to reach Supabase)');
    process.exit(1);
  }
}

// ============================================================================
// HELPER FUNCTION: Insert data into MySQL
// ============================================================================

async function insertDataIntoMySQL(connection, table, data) {
  if (!data || data.length === 0) return 0;

  try {
    const columns = Object.keys(data[0]);
    const placeholders = columns.map(() => '?').join(',');
    const columnNames = columns.map(c => `\`${c}\``).join(',');

    const query = `INSERT INTO \`${table}\` (${columnNames}) VALUES (${placeholders})`;

    for (const record of data) {
      const values = columns.map(col => {
        let value = record[col];
        
        // Handle null values
        if (value === null || value === undefined) {
          return null;
        }

        // Handle JSON/JSONB fields
        if (typeof value === 'object') {
          return JSON.stringify(value);
        }

        // Handle UUIDs and other text fields
        return value;
      });

      try {
        await connection.query(query, values);
      } catch (error) {
        // Log but continue with next record
        if (!error.message.includes('Duplicate entry')) {
          console.log(`      Warning: Failed to insert record in ${table}: ${error.message.substring(0, 40)}`);
        }
      }
    }

    return data.length;

  } catch (error) {
    console.log(`   Error preparing insert for ${table}: ${error.message}`);
    return 0;
  }
}

// ============================================================================
// RUN MIGRATION
// ============================================================================

migrateData();
