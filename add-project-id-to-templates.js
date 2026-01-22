import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'id_card',
  port: parseInt(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function addProjectIdColumn() {
  const connection = await pool.getConnection();
  try {
    console.log('🔄 Adding project_id column to templates table...');

    // Check if column already exists
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'templates' 
      AND TABLE_SCHEMA = ? 
      AND COLUMN_NAME = 'project_id'
    `, [process.env.DB_NAME || 'id_card']);

    if (columns.length > 0) {
      console.log('✅ project_id column already exists in templates table');
      return;
    }

    // Add project_id column
    await connection.execute(`
      ALTER TABLE templates 
      ADD COLUMN project_id CHAR(36) NULL AFTER vendor_id
    `);
    console.log('✅ Added project_id column');

    // Add foreign key constraint
    try {
      await connection.execute(`
        ALTER TABLE templates 
        ADD CONSTRAINT fk_templates_project 
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
      `);
      console.log('✅ Added foreign key constraint');
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log('⚠️  Foreign key constraint already exists');
      } else {
        throw err;
      }
    }

    // Add indexes
    try {
      await connection.execute(`
        CREATE INDEX idx_templates_project_id ON templates(project_id)
      `);
      console.log('✅ Added index on project_id');
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log('⚠️  Index on project_id already exists');
      } else {
        throw err;
      }
    }

    // Note: is_public is stored in template_data JSON, not as a separate column
    // So we don't create an index on it. The backend queries handle JSON extraction.
    console.log('ℹ️  Note: is_public is stored in template_data JSON field');

    // Verify table structure
    const [rows] = await connection.execute(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'templates' AND TABLE_SCHEMA = ?
      ORDER BY ORDINAL_POSITION
    `, [process.env.DB_NAME || 'id_card']);

    console.log('\n📋 Templates table structure:');
    rows.forEach(row => {
      console.log(`  - ${row.COLUMN_NAME}: ${row.COLUMN_TYPE}${row.IS_NULLABLE === 'NO' ? ' NOT NULL' : ''}`);
    });

    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Error running migration:', error.message);
    throw error;
  } finally {
    connection.release();
    pool.end();
  }
}

addProjectIdColumn()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });
