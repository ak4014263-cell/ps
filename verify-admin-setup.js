#!/usr/bin/env node
import mysql from 'mysql2/promise';
import http from 'http';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'id_card'
});

async function verifyAdminSetup() {
  console.log('\n' + '='.repeat(70));
  console.log('🔐 ADMIN AUTHENTICATION SYSTEM VERIFICATION');
  console.log('='.repeat(70) + '\n');

  const connection = await pool.getConnection();
  
  try {
    // Check 1: Admin profile exists
    console.log('1️⃣  Checking admin profile...');
    const [profiles] = await connection.query(
      `SELECT id, email, full_name FROM profiles 
       WHERE email = 'admin@example.com'`
    );
    
    if (profiles.length === 0) {
      console.log('   ❌ Admin profile not found');
      return;
    }
    
    const adminId = profiles[0].id;
    console.log('   ✅ Profile found: ' + profiles[0].email);
    console.log('   ✅ Name: ' + profiles[0].full_name);
    
    // Check 2: Credentials exist
    console.log('\n2️⃣  Checking credentials...');
    const [creds] = await connection.query(
      `SELECT password_hash FROM user_credentials WHERE user_id = ?`,
      [adminId]
    );
    
    if (creds.length === 0) {
      console.log('   ❌ Credentials not found');
      return;
    }
    
    console.log('   ✅ Password hash stored');
    console.log('   ✅ Hash: ' + creds[0].password_hash.substring(0, 40) + '...');
    
    // Check 3: Role assigned
    console.log('\n3️⃣  Checking role...');
    const [roles] = await connection.query(
      `SELECT role FROM user_roles WHERE user_id = ?`,
      [adminId]
    );
    
    if (roles.length === 0) {
      console.log('   ❌ Role not found');
      return;
    }
    
    if (roles[0].role !== 'super_admin') {
      console.log('   ❌ Wrong role: ' + roles[0].role);
      return;
    }
    
    console.log('   ✅ Role: ' + roles[0].role);
    
    // Check 4: Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 SYSTEM STATUS');
    console.log('='.repeat(70));
    console.log('\n✅ DATABASE: All checks passed');
    console.log('✅ PROFILE: Admin account configured');
    console.log('✅ CREDENTIALS: Password hash stored');
    console.log('✅ ROLE: Super admin access granted');
    
    console.log('\n' + '='.repeat(70));
    console.log('🎯 ADMIN LOGIN CREDENTIALS');
    console.log('='.repeat(70));
    console.log('\nEmail:    admin@example.com');
    console.log('Password: admin@123');
    console.log('Role:     super_admin');
    
    console.log('\n' + '='.repeat(70));
    console.log('🚀 NEXT STEPS');
    console.log('='.repeat(70));
    console.log('\n1. Start backend:');
    console.log('   cd backend && npm start');
    console.log('\n2. Start frontend:');
    console.log('   npm run dev');
    console.log('\n3. Open browser:');
    console.log('   http://localhost:8080/auth');
    console.log('\n4. Login with credentials above');
    console.log('\n5. You will be taken to Super Admin Dashboard');
    
    console.log('\n' + '='.repeat(70) + '\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.release();
    await pool.end();
  }
}

verifyAdminSetup();
