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
      WHERE CONSTRAINT_SCHEMA = 'id_card' AND TABLE_NAME = 'projects'
    `);

    if (constraints.length > 0) {
      console.log('\n✅ CHECK constraints found:');
      constraints.forEach(c => {
        console.log(`  ${c.CONSTRAINT_NAME}: ${c.CHECK_CLAUSE}`);
      });
    } else {
      console.log('No CHECK constraints found. Checking table creation...');
      
      // Try to get table definition
      const [tableDef] = await connection.execute(`SHOW CREATE TABLE projects`);
      console.log('\nTable definition:');
      console.log(tableDef[0]['Create Table']);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    connection.release();
    pool.end();
  }
}

checkConstraints();
