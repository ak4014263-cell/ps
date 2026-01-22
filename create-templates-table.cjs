const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'id_card',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function createTemplatesTable() {
  const connection = await pool.getConnection();
  try {
    const createTableSQL = `
    CREATE TABLE IF NOT EXISTS templates (
      id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
      template_name VARCHAR(255) NOT NULL,
      description TEXT,
      vendor_id CHAR(36) NOT NULL,
      template_type VARCHAR(100),
      template_data LONGTEXT,
      is_active BOOLEAN DEFAULT TRUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
    )
    `;

    console.log('Creating templates table...');
    await connection.execute(createTableSQL);
    console.log('✅ Templates table created successfully');

    // Verify table creation
    const [rows] = await connection.execute(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'templates' AND TABLE_SCHEMA = 'id_card'
    `);

    console.log('\n📋 Templates table structure:');
    rows.forEach(row => {
      console.log(`  - ${row.COLUMN_NAME}: ${row.COLUMN_TYPE}${row.IS_NULLABLE === 'NO' ? ' NOT NULL' : ''}`);
    });

  } catch (error) {
    console.error('❌ Error creating templates table:', error.message);
  } finally {
    connection.release();
    pool.end();
  }
}

createTemplatesTable();
