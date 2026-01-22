#!/usr/bin/env node

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

async function insertProjects() {
  console.log('\n🎯 Inserting Sample Projects\n');

  let connection;
  try {
    connection = await mysql.createConnection(MYSQL_CONFIG);
    console.log('✅ Connected to MySQL\n');

    // Get existing vendor and client IDs
    const [vendors] = await connection.query('SELECT id FROM vendors');
    const [clients] = await connection.query('SELECT id FROM clients');
    const [users] = await connection.query('SELECT id FROM profiles');

    if (!vendors.length || !clients.length || !users.length) {
      console.log('❌ No vendors, clients, or users found. Run insert-sample-data-v2.js first!');
      process.exit(1);
    }

    console.log('✅ Found existing data:\n');
    console.log(`   Vendors: ${vendors.length}`);
    console.log(`   Clients: ${clients.length}`);
    console.log(`   Users: ${users.length}\n`);

    // Insert sample projects
    console.log('📋 Inserting projects...\n');
    
    const projectStatuses = ['draft', 'data_upload', 'design', 'proof_ready', 'approved', 'printing', 'dispatched', 'delivered'];
    let projectCount = 0;

    for (let i = 0; i < 5; i++) {
      const projectId = uuidv4();
      const vendorId = vendors[i % vendors.length].id;
      const clientId = clients[i % clients.length].id;
      const userId = users[0].id;
      const status = projectStatuses[i % projectStatuses.length];

      const query = `
        INSERT INTO projects (
          id, project_name, description, vendor_id, client_id, status,
          start_date, end_date, budget, notes, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;

      try {
        await connection.execute(query, [
          projectId,
          `Project ${i + 1}`,
          `High-quality ID card project for ${i + 1} stakeholders`,
          vendorId,
          clientId,
          status,
          new Date().toISOString().split('T')[0],
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          (Math.random() * 5000 + 1000).toFixed(2),
          `Project notes for project ${i + 1}`,
          userId,
        ]);
        console.log(`   ✅ Project ${i + 1} inserted (Status: ${status})`);
        projectCount++;
      } catch (error) {
        console.log(`   ⚠️  Project ${i + 1}: ${error.message.substring(0, 60)}`);
      }
    }

    console.log();

    // Verify insertion
    const [result] = await connection.query('SELECT COUNT(*) as count FROM projects');
    const totalProjects = result[0].count;

    console.log('='.repeat(60));
    console.log('✅ PROJECTS INSERTED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log(`\nTotal projects in database: ${totalProjects}`);
    console.log('\n📱 Your admin panel should now show projects!');
    console.log('Navigate to: http://localhost:5173\n');

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

insertProjects();
