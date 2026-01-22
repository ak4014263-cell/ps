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

async function createAdmin() {
  const connection = await pool.getConnection();
  
  try {
    console.log('\n=== CREATING ADMIN CREDENTIALS ===\n');
    
    // Admin credentials
    const adminEmail = 'admin@example.com';
    const adminPassword = 'admin@123';
    const adminName = 'Admin User';
    
    console.log('Admin Email:', adminEmail);
    console.log('Admin Password:', adminPassword);
    console.log('Admin Name:', adminName);
    
    // Check if admin already exists
    const [existing] = await connection.query(
      'SELECT id FROM profiles WHERE email = ?',
      [adminEmail]
    );
    
    if (existing.length > 0) {
      console.log('\n❌ Admin already exists!');
      return;
    }
    
    // Create admin profile
    const adminId = crypto.randomUUID();
    console.log('\nCreating admin profile...');
    await connection.query(
      'INSERT INTO profiles (id, full_name, email) VALUES (?, ?, ?)',
      [adminId, adminName, adminEmail]
    );
    console.log('✅ Profile created:', adminId);
    
    // Create credentials
    console.log('\nCreating credentials...');
    const passwordHash = hashPassword(adminPassword);
    await connection.query(
      'INSERT INTO user_credentials (user_id, password_hash) VALUES (?, ?)',
      [adminId, passwordHash]
    );
    console.log('✅ Credentials created');
    
    // Create admin role
    console.log('\nAssigning admin role...');
    const roleId = crypto.randomUUID();
    await connection.query(
      'INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)',
      [roleId, adminId, 'super_admin']
    );
    console.log('✅ Admin role assigned');
    
    // Create session token (for immediate login)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await connection.query(
      'INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)',
      [adminId, token, expiresAt]
    );
    console.log('✅ Session token created');
    
    console.log('\n=== ADMIN CREATED SUCCESSFULLY ===\n');
    console.log('Login Credentials:');
    console.log('├─ Email:', adminEmail);
    console.log('├─ Password:', adminPassword);
    console.log('├─ Role: super_admin');
    console.log('└─ User ID:', adminId);
    console.log('\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.release();
    await pool.end();
  }
}

createAdmin();
