#!/usr/bin/env node
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'id_card'
});

async function checkSchema() {
  const connection = await pool.getConnection();
  
  try {
    const [rows] = await connection.query('DESCRIBE products');
    console.log('\n📊 PRODUCTS TABLE SCHEMA:\n');
    console.log(rows.map(row => `${row.Field}: ${row.Type}${row.Null === 'NO' ? ' (NOT NULL)' : ''}`).join('\n'));
    console.log('\n');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.release();
    await pool.end();
  }
}

checkSchema();
