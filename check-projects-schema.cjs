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

async function checkSchema() {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY, EXTRA
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'projects' AND TABLE_SCHEMA = 'id_card'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('\n📋 Projects table structure:');
    rows.forEach(row => {
      console.log(`  ${row.COLUMN_NAME}: ${row.COLUMN_TYPE}${row.IS_NULLABLE === 'NO' ? ' NOT NULL' : ''}${row.COLUMN_DEFAULT ? ` DEFAULT ${row.COLUMN_DEFAULT}` : ''}`);
    });

    // Check for ENUM constraint
    const [enumCheck] = await connection.execute(`
      SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'projects' AND COLUMN_NAME = 'status' AND TABLE_SCHEMA = 'id_card'
    `);
    
    if (enumCheck.length > 0) {
      console.log('\n⚠️  Status field type:', enumCheck[0].COLUMN_TYPE);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    connection.release();
    pool.end();
  }
}

checkSchema();
