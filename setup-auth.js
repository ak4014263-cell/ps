import mysql from 'mysql2/promise';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config({ path: './.env.local' });
dotenv.config({ path: './.env' });

async function setupTestVendor() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'id_card',
    port: parseInt(process.env.DB_PORT) || 3306,
  });

  try {
    console.log('\n' + '='.repeat(70));
    console.log('🔐 VENDOR AUTHENTICATION SETUP TEST');
    console.log('='.repeat(70));

    const connection = await pool.getConnection();

    // Step 1: Create auth tables
    console.log('\n[1/4] Creating authentication tables...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_credentials (
        user_id CHAR(36) PRIMARY KEY,
        password_hash VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.execute(`
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
    console.log('✅ Tables created');

    // Step 2: Get existing vendor
    console.log('\n[2/4] Finding existing vendor...');
    const [vendors] = await connection.execute(
      'SELECT v.id, v.business_name, v.user_id, p.email, p.full_name FROM vendors v LEFT JOIN profiles p ON v.user_id = p.id LIMIT 1'
    );

    if (vendors.length === 0) {
      console.log('❌ No vendors found in database');
      console.log('   Create a vendor first via the admin panel');
      connection.release();
      pool.end();
      return;
    }

    const vendor = vendors[0];
    console.log(`✅ Found vendor: ${vendor.business_name} (${vendor.email || 'no user'})`);

    // Step 3: Create profile and credentials if needed
    console.log('\n[3/4] Setting up credentials...');
    
    let userId = vendor.user_id;
    
    if (!userId) {
      // Create new profile for this vendor
      userId = crypto.randomUUID();
      const testEmail = `vendor-${vendor.id.substring(0, 8)}@test.com`;
      const testName = vendor.business_name;

      await connection.execute(
        'INSERT INTO profiles (id, full_name, email) VALUES (?, ?, ?)',
        [userId, testName, testEmail]
      );

      await connection.execute(
        'UPDATE vendors SET user_id = ? WHERE id = ?',
        [userId, vendor.id]
      );

      console.log(`✅ Created profile: ${testEmail}`);
    } else {
      console.log(`✅ Using existing profile: ${vendor.email}`);
    }

    // Set password
    const testPassword = 'password123';
    const passwordHash = crypto
      .createHash('sha256')
      .update(testPassword)
      .digest('hex');

    await connection.execute(
      'INSERT INTO user_credentials (user_id, password_hash) VALUES (?, ?) ON DUPLICATE KEY UPDATE password_hash = ?',
      [userId, passwordHash, passwordHash]
    );
    console.log(`✅ Password set to: "${testPassword}"`);

    // Step 4: Verify setup
    console.log('\n[4/4] Verifying setup...');
    
    const [profiles] = await connection.execute(
      'SELECT id, full_name, email FROM profiles WHERE id = ?',
      [userId]
    );

    const [creds] = await connection.execute(
      'SELECT user_id FROM user_credentials WHERE user_id = ?',
      [userId]
    );

    const [roles] = await connection.execute(
      'SELECT role FROM user_roles WHERE user_id = ?',
      [userId]
    );

    if (profiles.length > 0 && creds.length > 0) {
      const profile = profiles[0];
      console.log(`✅ Profile: ${profile.full_name} (${profile.email})`);
      console.log(`✅ Password credentials: OK`);
      console.log(`✅ User role: ${roles[0]?.role || 'NOT SET (use master_vendor)'}`);

      // If no role, suggest adding it
      if (roles.length === 0) {
        console.log('\n⚠️  To set vendor role, run:');
        console.log(`    INSERT INTO user_roles (id, user_id, role)`);
        console.log(`    VALUES ('${crypto.randomUUID()}', '${userId}', 'master_vendor')`);
      }
    }

    connection.release();

    console.log('\n' + '='.repeat(70));
    console.log('✅ SETUP COMPLETE!');
    console.log('='.repeat(70));
    console.log('\n📝 Test Login Credentials:');
    console.log(`   Email: ${profiles[0]?.email || 'vendor@test.com'}`);
    console.log(`   Password: ${testPassword}`);
    console.log('\n🚀 Next steps:');
    console.log('   1. Start backend: npm run dev (in /backend)');
    console.log('   2. Start frontend: npm run dev');
    console.log('   3. Go to http://localhost:5173/auth');
    console.log('   4. Click Login and enter credentials above');
    console.log('\n');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  } finally {
    await pool.end();
  }
}

setupTestVendor();
