import mysql from 'mysql2/promise';

async function checkSchema() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'id_card'
  });

  try {
    const conn = await pool.getConnection();
    
    // Get all tables
    const [tables] = await conn.execute(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'id_card'
      ORDER BY TABLE_NAME
    `);

    console.log('\n📊 Database Tables:');
    tables.forEach((t, i) => {
      console.log(`${i + 1}. ${t.TABLE_NAME}`);
    });

    // Check specific tables structure
    const tableNames = ['clients', 'projects', 'project_tasks', 'templates', 'vendors'];
    
    for (const tableName of tableNames) {
      const exists = tables.find(t => t.TABLE_NAME === tableName);
      if (exists) {
        const [cols] = await conn.execute(`
          SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = 'id_card' AND TABLE_NAME = '${tableName}'
        `);
        console.log(`\n✅ ${tableName}:`);
        cols.forEach(col => {
          console.log(`   - ${col.COLUMN_NAME}: ${col.COLUMN_TYPE}`);
        });
      } else {
        console.log(`\n❌ ${tableName}: MISSING`);
      }
    }

    conn.release();
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkSchema();
