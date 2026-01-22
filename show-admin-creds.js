import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'id_card',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function showAdminCreds() {
  const connection = await pool.getConnection();
  
  try {
    console.log('\n=== ADMIN CREDENTIALS ===\n');
    
    // Find super_admin user
    const [roles] = await connection.query(
      `SELECT p.id, p.email, p.full_name, ur.role 
       FROM profiles p
       JOIN user_roles ur ON p.id = ur.user_id
       WHERE ur.role = 'super_admin'`
    );
    
    if (roles.length === 0) {
      console.log('❌ No admin user found!');
      console.log('\nTo create admin, run: node create-admin.js\n');
      return;
    }
    
    roles.forEach((admin, index) => {
      console.log(`Admin ${index + 1}:`);
      console.log(`├─ Email: ${admin.email}`);
      console.log(`├─ Name: ${admin.full_name}`);
      console.log(`├─ Role: ${admin.role}`);
      console.log(`└─ User ID: ${admin.id}`);
      console.log('');
    });
    
    console.log('📝 Default Password: admin@123');
    console.log('(Change password after first login)\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.release();
    await pool.end();
  }
}

showAdminCreds();
