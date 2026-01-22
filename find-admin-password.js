import mysql from 'mysql2/promise';
import crypto from 'crypto';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'id_card'
});

async function checkAdminPassword() {
  const connection = await pool.getConnection();
  
  try {
    console.log('\n=== CHECKING ADMIN PASSWORD ===\n');
    
    const adminId = 'd9758f13-29a5-4a82-9832-e378f24d3c50';
    
    // Get the stored hash
    const [creds] = await connection.query(
      'SELECT password_hash FROM user_credentials WHERE user_id = ?',
      [adminId]
    );
    
    if (creds.length === 0) {
      console.log('❌ No credentials found for admin');
      return;
    }
    
    const storedHash = creds[0].password_hash;
    console.log('Stored hash:', storedHash);
    
    // Test various passwords
    const passwords = [
      'admin@123',
      'password123',
      'Admin@123',
      'admin',
      'admin123',
      '1234567',
      'password1'
    ];
    
    console.log('\nTesting passwords:');
    for (const pwd of passwords) {
      const hash = crypto.createHash('sha256').update(pwd).digest('hex');
      const match = hash === storedHash;
      console.log(`  ${pwd.padEnd(20)} -> ${match ? '✅ MATCH' : '❌'}`);
      if (match) {
        console.log(`\n🎉 PASSWORD FOUND: "${pwd}"`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.release();
    await pool.end();
  }
}

checkAdminPassword();
