const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function diagnose() {
  const recordId = 'd5856e69-7d72-41cd-88fe-26e90b552734';
  
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'id_card',
  });

  try {
    // Get record details
    const [rows] = await connection.execute(
      'SELECT id, photo_url, cropped_photo_url FROM data_records WHERE id = ?',
      [recordId]
    );
    
    if (!rows[0]) {
      console.log('❌ Record not found in database');
      return;
    }
    
    const record = rows[0];
    console.log('\n=== Record Data ===');
    console.log('ID:', record.id);
    console.log('photo_url:', record.photo_url);
    console.log('cropped_photo_url:', record.cropped_photo_url);

    // Check if file exists
    if (record.photo_url) {
      const filePath = path.join(__dirname, 'uploads/photos', record.photo_url);
      const exists = fs.existsSync(filePath);
      console.log('\n=== File Check ===');
      console.log('Expected path:', filePath);
      console.log('File exists:', exists ? '✓ YES' : '✗ NO');
      
      if (exists) {
        const stats = fs.statSync(filePath);
        console.log('File size:', stats.size, 'bytes');
      }
    }

    // List all files in uploads/photos
    const uploadsDir = path.join(__dirname, 'uploads/photos');
    const files = fs.readdirSync(uploadsDir).slice(0, 10);
    console.log('\n=== Sample Files in uploads/photos ===');
    files.forEach(f => console.log('  -', f));
    console.log(`  ... (${fs.readdirSync(uploadsDir).length} total files)`);
    
  } finally {
    await connection.end();
  }
}

diagnose().catch(console.error);
