import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  database: 'id_card',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const connection = await pool.getConnection();
try {
  // Create teacher_data_links table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS teacher_data_links (
      id INT AUTO_INCREMENT PRIMARY KEY,
      token VARCHAR(50) NOT NULL UNIQUE,
      teacher_name VARCHAR(255) NOT NULL,
      teacher_email VARCHAR(255),
      teacher_phone VARCHAR(20),
      max_submissions INT DEFAULT 100,
      current_submissions INT DEFAULT 0,
      project_id INT,
      vendor_id INT NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_by VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_token (token),
      INDEX idx_vendor_id (vendor_id),
      INDEX idx_project_id (project_id),
      INDEX idx_created_at (created_at)
    )
  `);
  console.log('✅ teacher_data_links table created');

  // Create teacher_submissions table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS teacher_submissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      link_id INT NOT NULL,
      submission_data LONGTEXT,
      submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (link_id) REFERENCES teacher_data_links(id) ON DELETE CASCADE,
      INDEX idx_link_id (link_id),
      INDEX idx_submitted_at (submitted_at)
    )
  `);
  console.log('✅ teacher_submissions table created');

  console.log('✅ All tables created successfully!');
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
} finally {
  await connection.release();
  await pool.end();
}
