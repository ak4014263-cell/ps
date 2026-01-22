#!/usr/bin/env node

import mysql from 'mysql2/promise';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const MYSQL_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'id_card',
  port: parseInt(process.env.DB_PORT) || 3306,
};

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function createDemoVendor() {
  console.log('\n🎯 Creating Demo Vendor Account\n');

  let connection;
  try {
    connection = await mysql.createConnection(MYSQL_CONFIG);
    console.log('✅ Connected to MySQL\n');

    const vendorEmail = 'vendor@demo.com';
    const vendorPassword = 'password123';
    const vendorName = 'Demo Vendor';
    const vendorCompany = 'Demo Vendor Company';

    // Check if vendor already exists
    const [existing] = await connection.query(
      'SELECT id FROM profiles WHERE LOWER(email) = LOWER(?)',
      [vendorEmail]
    );

    if (existing.length > 0) {
      console.log(`⚠️  Vendor ${vendorEmail} already exists!`);
      process.exit(0);
    }

    // Create profile
    const profileId = crypto.randomUUID();
    const hashedPassword = hashPassword(vendorPassword);

    await connection.execute(
      `INSERT INTO profiles (id, full_name, email, phone, avatar_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [profileId, vendorName, vendorEmail, '+1-555-0001', null]
    );

    console.log(`✅ Profile created: ${vendorEmail}`);

    // Create credentials
    await connection.execute(
      `INSERT INTO user_credentials (user_id, password_hash, created_at)
       VALUES (?, ?, NOW())`,
      [profileId, hashedPassword]
    );

    console.log('✅ Credentials stored');

    // Assign vendor role
    await connection.execute(
      `INSERT INTO user_roles (user_id, role, created_at)
       VALUES (?, ?, NOW())`,
      [profileId, 'master_vendor']
    );

    console.log('✅ Role assigned: master_vendor');

    // Create vendor record
    const vendorId = crypto.randomUUID();
    await connection.execute(
      `INSERT INTO vendors (id, user_id, business_name, email, phone, city, country, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [vendorId, profileId, vendorCompany, vendorEmail, '+1-555-0001', 'New York', 'USA']
    );

    console.log('✅ Vendor record created\n');

    console.log('='.repeat(60));
    console.log('✅ DEMO VENDOR CREATED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log(`\n📧 Email: ${vendorEmail}`);
    console.log(`🔐 Password: ${vendorPassword}`);
    console.log(`👤 Name: ${vendorName}`);
    console.log(`🏢 Company: ${vendorCompany}\n`);

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

createDemoVendor();
