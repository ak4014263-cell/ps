import mysql from 'mysql2/promise';
import crypto from 'crypto';

async function checkCredentials() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'id_card'
  });

  try {
    const conn = await pool.getConnection();
    
    // Get profiles
    const [profiles] = await conn.execute('SELECT id, full_name, email FROM profiles LIMIT 5');
    console.log('\n👥 Profiles:');
    profiles.forEach(p => console.log(`  - ${p.full_name} (${p.email})`));

    // Check credentials
    const [creds] = await conn.execute('SELECT user_id FROM user_credentials');
    console.log(`\n🔐 Credentials set: ${creds.length} users`);
    
    if (creds.length === 0) {
      console.log('\n⚠️  No credentials! Creating test credentials...');
      
      if (profiles.length > 0) {
        const testUser = profiles[0];
        const password = 'password123';
        const hash = crypto.createHash('sha256').update(password).digest('hex');
        
        try {
          await conn.execute(
            'INSERT INTO user_credentials (user_id, password_hash) VALUES (?, ?)',
            [testUser.id, hash]
          );
          console.log(`✅ Created credentials for: ${testUser.full_name}`);
          console.log(`   Email: ${testUser.email}`);
          console.log(`   Password: ${password}`);
        } catch (err) {
          if (err.code === 'ER_DUP_ENTRY') {
            console.log(`✅ Credentials already exist for: ${testUser.full_name}`);
          } else {
            throw err;
          }
        }
      }
    } else {
      console.log('\n✅ Checking credential assignments...');
      // Check which users have credentials
      for (const cred of creds) {
        const [profile] = await conn.execute(
          'SELECT full_name, email FROM profiles WHERE id = ?',
          [cred.user_id]
        );
        if (profile.length > 0) {
          console.log(`  ✅ ${profile[0].full_name} (${profile[0].email})`);
        }
      }
      
      console.log('\n📝 Test login credentials:');
      const [testProfile] = await conn.execute(
        'SELECT p.full_name, p.email FROM profiles p JOIN user_credentials c ON p.id = c.user_id LIMIT 1'
      );
      if (testProfile.length > 0) {
        console.log(`  Email: ${testProfile[0].email}`);
        console.log(`  Password: password123`);
      }
    }

    // Check roles
    const [roles] = await conn.execute('SELECT COUNT(*) as count FROM user_roles');
    console.log(`\n👤 User roles: ${roles[0].count} assigned`);

    conn.release();
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkCredentials();
