import mysql from 'mysql2/promise';
import crypto from 'crypto';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'id_card'
});

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function resetAdminPassword() {
  const connection = await pool.getConnection();
  
  try {
    console.log('\n=== RESETTING ADMIN PASSWORD ===\n');
    
    const adminId = 'd9758f13-29a5-4a82-9832-e378f24d3c50';
    const newPassword = 'admin@123';
    const passwordHash = hashPassword(newPassword);
    
    // Update the password
    await connection.query(
      'UPDATE user_credentials SET password_hash = ? WHERE user_id = ?',
      [passwordHash, adminId]
    );
    
    console.log('✅ Admin password updated successfully');
    console.log('\nLogin Credentials:');
    console.log('├─ Email: admin@example.com');
    console.log('├─ Password: admin@123');
    console.log('└─ Role: super_admin');
    console.log('\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.release();
    await pool.end();
  }
}

resetAdminPassword();
