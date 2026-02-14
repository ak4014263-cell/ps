const mysql = require('mysql2/promise');

async function findProject() {
  const recordId = 'd5856e69-7d72-41cd-88fe-26e90b552734';
  
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'id_card',
  });

  try {
    // Get record details with project
    const [rows] = await connection.execute(`
      SELECT 
        dr.id, 
        dr.photo_url, 
        dr.project_id,
        p.id as project_id_direct
      FROM data_records dr
      LEFT JOIN projects p ON dr.project_id = p.id
      WHERE dr.id = ?
    `, [recordId]);
    
    if (rows[0]) {
      console.log('Record found:');
      console.log('  ID:', rows[0].id);
      console.log('  photo_url:', rows[0].photo_url);
      console.log('  project_id (from record):', rows[0].project_id);
      console.log('  project_id (lookup):', rows[0].project_id_direct);
      
      // This is the correct path for photos
      if (rows[0].project_id) {
        console.log('\n✓ Correct photo path should be:');
        console.log(`  /uploads/project-photos/${rows[0].project_id}/${rows[0].photo_url}`);
      }
    }
  } finally {
    await connection.end();
  }
}

findProject().catch(console.error);
