import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env.local' });
dotenv.config({ path: '../.env' });

// ============================================================================
// DATABASE CONNECTION POOL
// ============================================================================

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'id_card',
  port: parseInt(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelayMs: 0,
});

// ============================================================================
// QUERY HELPER FUNCTIONS
// ============================================================================

/**
 * Execute a SELECT query
 */
export async function query(sql, values = []) {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(sql, values);
    return rows;
  } finally {
    connection.release();
  }
}

/**
 * Execute an INSERT query and return the inserted ID
 */
export async function insert(sql, values = []) {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute(sql, values);
    return {
      id: result.insertId,
      affectedRows: result.affectedRows,
    };
  } finally {
    connection.release();
  }
}

/**
 * Execute an UPDATE or DELETE query
 */
export async function execute(sql, values = []) {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute(sql, values);
    return {
      affectedRows: result.affectedRows,
      changedRows: result.changedRows,
    };
  } finally {
    connection.release();
  }
}

/**
 * Get a single row
 */
export async function getOne(sql, values = []) {
  const rows = await query(sql, values);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Get all rows
 */
export async function getAll(sql, values = []) {
  return await query(sql, values);
}

/**
 * Test the database connection
 */
export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    const result = await connection.query('SELECT 1');
    connection.release();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    return false;
  }
}

export default {
  query,
  insert,
  execute,
  getOne,
  getAll,
  testConnection,
};
