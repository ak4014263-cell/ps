#!/usr/bin/env node

// ============================================================================
// INSERT SAMPLE DATA - SIMPLE VERSION
// ============================================================================

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const MYSQL_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'id_card',
  port: parseInt(process.env.DB_PORT) || 3306,
};

async function insertSampleData() {
  console.log('\n🎯 Inserting Sample Data\n');

  let connection;
  try {
    connection = await mysql.createConnection(MYSQL_CONFIG);
    console.log('✅ Connected to MySQL\n');

    // 1. Insert profiles
    console.log('1️⃣  Inserting profiles...');
    const profileIds = [];
    
    for (let i = 0; i < 3; i++) {
      const id = uuidv4();
      profileIds.push(id);
      
      const query = `
        INSERT INTO profiles (id, full_name, email, phone, avatar_url) 
        VALUES (?, ?, ?, ?, ?)
      `;
      
      try {
        await connection.execute(query, [
          id,
          `User ${i + 1}`,
          `user${i + 1}@example.com`,
          `+1-555-000-${String(i).padStart(4, '0')}`,
          `https://ui-avatars.com/api/?name=User+${i + 1}`,
        ]);
        console.log(`   ✅ Profile ${i + 1} inserted`);
      } catch (error) {
        console.log(`   ⚠️  Profile ${i + 1}: ${error.message.substring(0, 50)}`);
      }
    }
    console.log();

    // 2. Insert user roles
    console.log('2️⃣  Inserting user roles...');
    const roles = ['super_admin', 'master_vendor', 'designer_staff', 'sales_person', 'client'];
    
    for (let i = 0; i < Math.min(profileIds.length, roles.length); i++) {
      const id = uuidv4();
      const query = `
        INSERT INTO user_roles (id, user_id, role) 
        VALUES (?, ?, ?)
      `;
      
      try {
        await connection.execute(query, [id, profileIds[i], roles[i]]);
        console.log(`   ✅ Role ${roles[i]} assigned to User ${i + 1}`);
      } catch (error) {
        console.log(`   ⚠️  Role ${roles[i]}: ${error.message.substring(0, 50)}`);
      }
    }
    console.log();

    // 3. Insert vendors
    console.log('3️⃣  Inserting vendors...');
    const vendorIds = [];
    
    for (let i = 0; i < 2; i++) {
      const id = uuidv4();
      vendorIds.push(id);
      
      const query = `
        INSERT INTO vendors (
          id, user_id, business_name, description, phone, email, 
          address, city, state, postal_code, country, website
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      try {
        await connection.execute(query, [
          id,
          profileIds[i],
          `Vendor ${i + 1} Inc.`,
          `Premium vendor specializing in quality products`,
          `+1-555-123-${String(i * 100).padStart(4, '0')}`,
          `vendor${i + 1}@example.com`,
          `${100 + i * 50} Business St`,
          'New York',
          'NY',
          `1000${i}`,
          'USA',
          `https://vendor${i + 1}.example.com`,
        ]);
        console.log(`   ✅ Vendor ${i + 1} inserted`);
      } catch (error) {
        console.log(`   ⚠️  Vendor ${i + 1}: ${error.message.substring(0, 50)}`);
      }
    }
    console.log();

    // 4. Insert clients
    console.log('4️⃣  Inserting clients...');
    if (vendorIds.length > 0) {
      for (let i = 0; i < 3; i++) {
        const id = uuidv4();
        const vendorId = vendorIds[i % vendorIds.length];
        
        const query = `
          INSERT INTO clients (
            id, vendor_id, client_name, email, phone, company, address, city, state, postal_code, country, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        try {
          await connection.execute(query, [
            id,
            vendorId,
            `Client ${i + 1}`,
            `client${i + 1}@example.com`,
            `+1-555-987-${String(i * 100).padStart(4, '0')}`,
            `Company ${i + 1}`,
            `${300 + i * 100} Main St`,
            'Los Angeles',
            'CA',
            `9000${i}`,
            'USA',
            profileIds[0],
          ]);
          console.log(`   ✅ Client ${i + 1} inserted`);
        } catch (error) {
          console.log(`   ⚠️  Client ${i + 1}: ${error.message.substring(0, 50)}`);
        }
      }
    }
    console.log();

    // 5. Insert products (if vendors exist)
    if (vendorIds.length > 0) {
      console.log('5️⃣  Inserting products...');
      const categories = ['electronics', 'clothing', 'home', 'books', 'toys'];
      
      for (let i = 0; i < 5; i++) {
        const id = uuidv4();
        const vendorId = vendorIds[i % vendorIds.length];
        
        const query = `
          INSERT INTO products (
            id, vendor_id, product_name, product_code, description, price, cost, quantity_available, category, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        try {
          await connection.execute(query, [
            id,
            vendorId,
            `Product ${i + 1}`,
            `PROD-${String(i + 1).padStart(4, '0')}`,
            `High quality ${categories[i]} product`,
            (Math.random() * 200 + 20).toFixed(2),
            (Math.random() * 100 + 5).toFixed(2),
            Math.floor(Math.random() * 500) + 10,
            categories[i],
            profileIds[0],
          ]);
          console.log(`   ✅ Product ${i + 1} inserted`);
        } catch (error) {
          console.log(`   ⚠️  Product ${i + 1}: ${error.message.substring(0, 50)}`);
        }
      }
      console.log();
    }

    // 6. Verify data
    console.log('6️⃣  Verifying data...\n');
    const tables = ['profiles', 'user_roles', 'vendors', 'clients', 'products'];
    let totalRecords = 0;
    
    for (const table of tables) {
      const [result] = await connection.query(`SELECT COUNT(*) as count FROM \`${table}\``);
      const count = result[0].count;
      totalRecords += count;
      console.log(`   ${table}: ${count} records`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ SAMPLE DATA INSERTED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log(`\nTotal records inserted: ${totalRecords}`);
    console.log('Your database is ready for testing!');
    console.log('Run: npm run dev\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

insertSampleData();
