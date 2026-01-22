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

async function checkEmails() {
  const connection = await pool.getConnection();
  
  try {
    console.log('\n=== CHECKING EMAILS IN DATABASE ===\n');
    
    const [profiles] = await connection.query(
      'SELECT id, email, full_name FROM profiles'
    );
    
    console.log('All profiles in database:');
    profiles.forEach((p, i) => {
      console.log(`${i + 1}. Email: "${p.email}" (ID: ${p.id})`);
    });
    
    console.log('\nLooking up "admin@example.com" (lowercase):');
    const [result] = await connection.query(
      'SELECT id, email, full_name FROM profiles WHERE email = ?',
      ['admin@example.com']
    );
    
    if (result.length > 0) {
      console.log('✅ Found:', result[0]);
    } else {
      console.log('❌ Not found with lowercase');
    }
    
    console.log('\nLooking up with LIKE (case-insensitive):');
    const [result2] = await connection.query(
      'SELECT id, email, full_name FROM profiles WHERE LOWER(email) = LOWER(?)',
      ['admin@example.com']
    );
    
    if (result2.length > 0) {
      console.log('✅ Found:', result2[0]);
    } else {
      console.log('❌ Still not found');
    }
    
    console.log('\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.release();
    await pool.end();
  }
}

checkEmails();
