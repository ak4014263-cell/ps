const mysql = require('mysql2/promise');

(async() => {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost', 
      user: 'root', 
      password: '', 
      database: 'id_card'
    });
    
    // Check records with photo_url 
    const [rows] = await conn.execute(
      'SELECT id, photo_url, processing_status FROM data_records WHERE photo_url IS NOT NULL AND photo_url LIKE "photo_%" LIMIT 15'
    );
    
    console.log('\n✓ Records with filenames in database:');
    console.log('  Total:', rows.length);
    rows.forEach((r, i) => {
      const recordId = r.id.substring(0, 12);
      const photoFile = r.photo_url ? r.photo_url.substring(0, 50) : 'null';
      const status = r.processing_status;
      console.log(`  ${i+1}. ${recordId}... photo=${photoFile}... status=${status}`);
    });
    
    // Check how many records have photos
    const [count] = await conn.execute(
      'SELECT COUNT(*) as total FROM data_records WHERE photo_url IS NOT NULL'
    );
    console.log('\n✓ Total records with photos:', count[0].total);
    
    await conn.end();
  } catch(e) { 
    console.error('✗ Error:', e.message); 
  }
})();
