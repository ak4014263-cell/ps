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

async function testInsert() {
  const connection = await pool.getConnection();
  try {
    // Try inserting with status = 'active'
    const projectId = '123e4567-e89b-12d3-a456-426614174000';
    const vendorId = '455e8894-a635-447f-8a2a-aa0066c27a20';

    console.log('Testing direct insert with status="active"...');
    await connection.execute(
      `INSERT INTO projects (
        id, project_name, vendor_id, status
      ) VALUES (?, ?, ?, ?)`,
      [projectId, 'Direct Test', vendorId, 'active']
    );
    console.log('✅ Success with status="active"');

    // Clean up
    await connection.execute('DELETE FROM projects WHERE id = ?', [projectId]);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    connection.release();
    pool.end();
  }
}

testInsert();
