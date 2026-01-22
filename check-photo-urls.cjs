const mysql = require('mysql2/promise');

async function checkPhotoUrls() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'id_card',
  });

  try {
    const [rows] = await connection.execute(
      'SELECT id, photo_url, cropped_photo_url, photo_blob, cropped_photo_blob FROM data_records LIMIT 5'
    );
    
    console.log('=== First 5 Records ===');
    rows.forEach((row) => {
      console.log(`\nRecord ID: ${row.id}`);
      console.log(`  photo_url: ${row.photo_url || '(NULL)'}`);
      console.log(`  cropped_photo_url: ${row.cropped_photo_url || '(NULL)'}`);
      console.log(`  photo_blob: ${row.photo_blob ? `${row.photo_blob.length} bytes` : '(NULL)'}`);
      console.log(`  cropped_photo_blob: ${row.cropped_photo_blob ? `${row.cropped_photo_blob.length} bytes` : '(NULL)'}`);
    });
  } finally {
    await connection.end();
  }
}

checkPhotoUrls().catch(console.error);
