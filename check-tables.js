import mysql from 'mysql2/promise';

async function checkTables() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'id_card'
  });

  try {
    const conn = await pool.getConnection();
    
    // Check if tables exist
    const [userCreds] = await conn.execute('SHOW TABLES WHERE Tables_in_id_card = "user_credentials"');
    const [sessions] = await conn.execute('SHOW TABLES WHERE Tables_in_id_card = "sessions"');
    const [profiles] = await conn.execute('SELECT COUNT(*) as count FROM profiles');
    const [vendors] = await conn.execute('SELECT COUNT(*) as count FROM vendors');

    console.log('\n📊 Database Status:');
    console.log(`✅ user_credentials table: ${userCreds.length > 0 ? 'EXISTS' : 'MISSING'}`);
    console.log(`✅ sessions table: ${sessions.length > 0 ? 'EXISTS' : 'MISSING'}`);
    console.log(`✅ profiles count: ${profiles[0].count}`);
    console.log(`✅ vendors count: ${vendors[0].count}`);

    if (userCreds.length === 0 || sessions.length === 0) {
      console.log('\n⚠️  Missing auth tables! Running migration...');
      await runMigration(conn);
    }

    conn.release();
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

async function runMigration(conn) {
  try {
    // Create user_credentials table
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS user_credentials (
        user_id CHAR(36) PRIMARY KEY,
        password_hash VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create sessions table
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_expires_at (expires_at),
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ Tables created successfully!');
  } catch (error) {
    console.error('Migration error:', error.message);
  }
}

checkTables();
