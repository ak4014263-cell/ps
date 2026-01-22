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

async function checkConstraints() {
  const connection = await pool.getConnection();
  try {
    // Get CHECK constraints
    const [constraints] = await connection.execute(`
      SELECT CONSTRAINT_NAME, CHECK_CLAUSE
      FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = 'id_card' AND TABLE_NAME = 'project_tasks'
    `);

    if (constraints.length > 0) {
      console.log('\n✅ CHECK constraints found:');
      constraints.forEach(c => {
        console.log(`  ${c.CONSTRAINT_NAME}: ${c.CHECK_CLAUSE}`);
      });
    } else {
      console.log('No CHECK constraints. Checking columns...');
      
      const [rows] = await connection.execute(`
        SELECT COLUMN_NAME, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'project_tasks' AND TABLE_SCHEMA = 'id_card'
      `);
      
      console.log('\nColumns:');
      rows.forEach(r => console.log(`  ${r.COLUMN_NAME}: ${r.COLUMN_TYPE}`));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    connection.release();
    pool.end();
  }
}

checkConstraints();
