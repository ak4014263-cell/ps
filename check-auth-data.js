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

async function checkAuth() {
  const connection = await pool.getConnection();
  
  try {
    console.log('\n=== PROFILES ===');
    const [profiles] = await connection.query('SELECT id, full_name, email FROM profiles LIMIT 5');
    profiles.forEach(p => console.log(`  ${p.full_name} (${p.id}) - ${p.email}`));

    console.log('\n=== USER ROLES ===');
    const [roles] = await connection.query('SELECT user_id, role FROM user_roles LIMIT 10');
    roles.forEach(r => console.log(`  ${r.user_id}: ${r.role}`));

    console.log('\n=== VENDORS ===');
    const [vendors] = await connection.query('SELECT id, user_id, business_name FROM vendors');
    vendors.forEach(v => console.log(`  ${v.business_name} (${v.id}) - user: ${v.user_id}`));

    console.log('\n=== CHECKING VENDOR LOOKUP ===');
    const vendorUser = vendors[0]?.user_id;
    if (vendorUser) {
      console.log(`Testing vendor lookup for user: ${vendorUser}`);
      const [vendorCheck] = await connection.query(
        'SELECT id, business_name FROM vendors WHERE user_id = ?',
        [vendorUser]
      );
      console.log('  Result:', vendorCheck);
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.release();
    await pool.end();
  }
}

checkAuth();
