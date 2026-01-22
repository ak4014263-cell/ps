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

async function createVendor() {
  const connection = await pool.getConnection();
  
  try {
    // First check if vendors exist
    const [vendors] = await connection.query('SELECT COUNT(*) as count FROM vendors');
    console.log('Existing vendors:', vendors[0].count);
    
    if (vendors[0].count === 0) {
      console.log('\nNo vendors found, creating one...');
      
      const vendorId = crypto.randomUUID();
      const userId = crypto.randomUUID();
      
      // Create a vendor
      await connection.query(
        'INSERT INTO vendors (id, business_name, user_id) VALUES (?, ?, ?)',
        [vendorId, 'Test Vendor', userId]
      );
      
      console.log('✅ Created vendor:');
      console.log('  Vendor ID:', vendorId);
      console.log('  Business Name: Test Vendor');
      console.log('  User ID:', userId);
    } else {
      console.log('✅ Vendors already exist:');
      const [rows] = await connection.query('SELECT id, business_name FROM vendors');
      rows.forEach(row => {
        console.log(`  - ${row.business_name} (${row.id})`);
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.release();
    await pool.end();
  }
}

createVendor();
