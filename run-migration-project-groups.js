#!/usr/bin/env node

import mysql from 'mysql2/promise';

const MYSQL_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'id_card'
};

async function createProjectGroupsTable() {
  let connection;
  try {
    connection = await mysql.createConnection(MYSQL_CONFIG);
    
    console.log('🔗 Connected to MySQL database');
    
    // Create the table directly
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS project_groups (
        id CHAR(36) PRIMARY KEY COMMENT 'UUID',
        project_id CHAR(36) NOT NULL,
        name VARCHAR(255) NOT NULL,
        template_id CHAR(36),
        record_count INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_project_id (project_id),
        INDEX idx_template_id (template_id),
        
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    
    console.log('⏳ Creating project_groups table...');
    await connection.query(createTableSQL);
    console.log('✅ Project Groups table created successfully');
    
    // Verify the table was created
    try {
      const [rows] = await connection.query('DESCRIBE project_groups');
      console.log('\n📋 Project Groups Table Structure:');
      rows.forEach(row => {
        console.log(`  ${row.Field}: ${row.Type}`);
      });
      console.log('\n✅ Project Groups table ready for use!');
    } catch (err) {
      console.log('⚠️  Warning: Could not verify table structure:', err.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

createProjectGroupsTable();
