import mysql from 'mysql2/promise';
import crypto from 'crypto';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'id_card',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function debugLogin() {
  const connection = await pool.getConnection();
  
  try {
    console.log('\n=== DEBUG LOGIN ===\n');
    
    const email = 'admin@example.com';
    const password = 'admin@123';
    
    console.log('Testing with:');
    console.log('├─ Email:', email);
    console.log('└─ Password:', password);
    
    // Find profile
    const [profiles] = await connection.query(
      'SELECT id, email, full_name FROM profiles WHERE email = ?',
      [email.toLowerCase()]
    );
    
    if (profiles.length === 0) {
      console.log('\n❌ Profile not found!');
      return;
    }
    
    const profile = profiles[0];
    console.log('\n✅ Profile found:');
    console.log('├─ ID:', profile.id);
    console.log('└─ Name:', profile.full_name);
    
    // Check credentials
    const [credentials] = await connection.query(
      'SELECT password_hash FROM user_credentials WHERE user_id = ?',
      [profile.id]
    );
    
    if (credentials.length === 0) {
      console.log('\n❌ Credentials not found!');
      return;
    }
    
    const storedHash = credentials[0].password_hash;
    const testHash = hashPassword(password);
    
    console.log('\n📝 Password Hash Comparison:');
    console.log('├─ Stored Hash:', storedHash.substring(0, 20) + '...');
    console.log('├─ Test Hash:', testHash.substring(0, 20) + '...');
    console.log('└─ Match:', storedHash === testHash ? '✅ YES' : '❌ NO');
    
    if (storedHash !== testHash) {
      console.log('\n⚠️  Password mismatch! Hash does not match.');
      console.log('\nFull hashes:');
      console.log('Stored:', storedHash);
      console.log('Test:  ', testHash);
    }
    
    // Check role
    const [roles] = await connection.query(
      'SELECT role FROM user_roles WHERE user_id = ?',
      [profile.id]
    );
    
    if (roles.length > 0) {
      console.log('\n✅ Role found: ' + roles[0].role);
    }
    
    console.log('\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.release();
    await pool.end();
  }
}

debugLogin();
