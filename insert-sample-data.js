#!/usr/bin/env node

// ============================================================================
// INSERT SAMPLE DATA INTO XAMPP MYSQL
// Creates sample test data for application testing
// Usage: node insert-sample-data.js
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

// ============================================================================
// SAMPLE DATA SETS
// ============================================================================

const sampleData = {
  profiles: [
    {
      id: uuidv4(),
      email: 'admin@example.com',
      full_name: 'Admin User',
      role: 'admin',
      organization: 'Crystal Admin',
      avatar_url: 'https://ui-avatars.com/api/?name=Admin+User',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      email: 'vendor@example.com',
      full_name: 'Vendor User',
      role: 'vendor',
      organization: 'Sample Vendor',
      avatar_url: 'https://ui-avatars.com/api/?name=Vendor+User',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],

  user_roles: [
    {
      id: uuidv4(),
      name: 'admin',
      description: 'Administrator with full access',
      permissions: JSON.stringify(['read', 'write', 'delete', 'manage_users']),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      name: 'vendor',
      description: 'Vendor can manage products and orders',
      permissions: JSON.stringify(['read', 'write']),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      name: 'client',
      description: 'Client can view and purchase products',
      permissions: JSON.stringify(['read']),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],

  vendors: [
    {
      id: uuidv4(),
      name: 'Sample Vendor Inc.',
      email: 'contact@vendor.com',
      phone: '+1 (555) 123-4567',
      address: '123 Business St, Suite 100',
      city: 'New York',
      state: 'NY',
      postal_code: '10001',
      country: 'USA',
      website: 'https://vendor.example.com',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],

  products: [
    {
      id: uuidv4(),
      vendor_id: null, // Will be set from vendor
      name: 'Sample Product 1',
      description: 'A premium quality product',
      price: 99.99,
      quantity_available: 100,
      category: 'electronics',
      image_url: 'https://via.placeholder.com/300x300?text=Product+1',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],

  clients: [
    {
      id: uuidv4(),
      name: 'John Client',
      email: 'john@client.com',
      phone: '+1 (555) 987-6543',
      address: '456 Main St',
      city: 'Los Angeles',
      state: 'CA',
      postal_code: '90001',
      country: 'USA',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
};

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function insertSampleData() {
  console.log('\n🎯 Inserting Sample Data into MySQL\n');

  try {
    const connection = await mysql.createConnection(MYSQL_CONFIG);
    console.log('✅ Connected to MySQL\n');

    // First, get IDs from inserted records so we can use them for foreign keys
    let vendorId = null;
    let profileId = null;

    // 1. Insert profiles
    console.log('1️⃣  Inserting profiles...');
    for (const profile of sampleData.profiles) {
      const query = `
        INSERT INTO profiles (id, email, full_name, role, organization, avatar_url, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const values = [
        profile.id,
        profile.email,
        profile.full_name,
        profile.role,
        profile.organization,
        profile.avatar_url,
        profile.created_at,
        profile.updated_at,
      ];
      try {
        await connection.query(query, values);
        profileId = profile.id;
      } catch (error) {
        // Profile might already exist
      }
    }
    console.log('   ✅ Profiles inserted\n');

    // 2. Insert user roles
    console.log('2️⃣  Inserting user roles...');
    for (const role of sampleData.user_roles) {
      const query = `
        INSERT INTO user_roles (id, name, description, permissions, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      const values = [role.id, role.name, role.description, role.permissions, role.created_at, role.updated_at];
      try {
        await connection.query(query, values);
      } catch (error) {
        // Role might already exist
      }
    }
    console.log('   ✅ User roles inserted\n');

    // 3. Insert vendors
    console.log('3️⃣  Inserting vendors...');
    for (const vendor of sampleData.vendors) {
      const query = `
        INSERT INTO vendors (id, name, email, phone, address, city, state, postal_code, country, website, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const values = [
        vendor.id,
        vendor.name,
        vendor.email,
        vendor.phone,
        vendor.address,
        vendor.city,
        vendor.state,
        vendor.postal_code,
        vendor.country,
        vendor.website,
        vendor.status,
        vendor.created_at,
        vendor.updated_at,
      ];
      try {
        await connection.query(query, values);
        vendorId = vendor.id;
      } catch (error) {
        // Vendor might already exist
      }
    }
    console.log('   ✅ Vendors inserted\n');

    // 4. Insert products (now with vendor_id)
    if (vendorId) {
      console.log('4️⃣  Inserting products...');
      for (const product of sampleData.products) {
        product.vendor_id = vendorId;
        const query = `
          INSERT INTO products (id, vendor_id, name, description, price, quantity_available, category, image_url, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [
          product.id,
          product.vendor_id,
          product.name,
          product.description,
          product.price,
          product.quantity_available,
          product.category,
          product.image_url,
          product.status,
          product.created_at,
          product.updated_at,
        ];
        try {
          await connection.query(query, values);
        } catch (error) {
          // Product might already exist
        }
      }
      console.log('   ✅ Products inserted\n');
    }

    // 5. Insert clients
    console.log('5️⃣  Inserting clients...');
    for (const client of sampleData.clients) {
      const query = `
        INSERT INTO clients (id, name, email, phone, address, city, state, postal_code, country, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const values = [
        client.id,
        client.name,
        client.email,
        client.phone,
        client.address,
        client.city,
        client.state,
        client.postal_code,
        client.country,
        client.status,
        client.created_at,
        client.updated_at,
      ];
      try {
        await connection.query(query, values);
      } catch (error) {
        // Client might already exist
      }
    }
    console.log('   ✅ Clients inserted\n');

    // Verify data
    console.log('6️⃣  Verifying data...\n');
    const tables = ['profiles', 'user_roles', 'vendors', 'products', 'clients'];
    for (const table of tables) {
      const [result] = await connection.query(`SELECT COUNT(*) as count FROM \`${table}\``);
      console.log(`   ${table}: ${result[0].count} records`);
    }

    await connection.end();

    console.log('\n' + '='.repeat(60));
    console.log('✅ SAMPLE DATA INSERTED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('\nYour database now has sample data for testing.');
    console.log('Run: npm run dev\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
}

// ============================================================================
// RUN
// ============================================================================

insertSampleData();
