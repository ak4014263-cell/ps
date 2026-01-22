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

async function createDemoAdmin() {
  console.log('\n🎯 Creating Demo Admin Account\n');

  let connection;
  try {
    connection = await mysql.createConnection(MYSQL_CONFIG);
    console.log('✅ Connected to MySQL\n');

    const adminEmail = 'admin@demo.com';
    const adminPassword = 'password123';
    const adminName = 'Admin User';

    // Check if admin already exists
    const [existing] = await connection.query(
      'SELECT id FROM profiles WHERE LOWER(email) = LOWER(?)',
      [adminEmail]
    );

    if (existing.length > 0) {
      console.log(`⚠️  Admin ${adminEmail} already exists!`);
      process.exit(0);
    }

    // Create profile
    const profileId = crypto.randomUUID();
    const hashedPassword = hashPassword(adminPassword);

    await connection.execute(
      `INSERT INTO profiles (id, full_name, email, phone, created_at, updated_at)
       VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [profileId, adminName, adminEmail, '+1-555-0000']
    );

    console.log(`✅ Profile created: ${adminEmail}`);

    // Create credentials
    await connection.execute(
      `INSERT INTO user_credentials (user_id, password_hash, created_at)
       VALUES (?, ?, NOW())`,
      [profileId, hashedPassword]
    );

    console.log('✅ Credentials stored');

    // Assign admin role
    await connection.execute(
      `INSERT INTO user_roles (user_id, role, created_at)
       VALUES (?, ?, NOW())`,
      [profileId, 'super_admin']
    );

    console.log('✅ Role assigned: super_admin\n');

    console.log('='.repeat(60));
    console.log('✅ DEMO ADMIN CREATED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log(`\n📧 Email: ${adminEmail}`);
    console.log(`🔐 Password: ${adminPassword}`);
    console.log(`👤 Name: ${adminName}\n`);

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

createDemoAdmin();
