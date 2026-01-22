// ============================================================================
// DATABASE CONNECTION CONFIGURATION
// For: XAMPP MySQL - id_card database
// ============================================================================

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Connection Pool Configuration
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

// TypeORM Configuration (if using TypeORM)
const typeormConfig = {
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'id_card',
  entities: ['src/entities/**/*.ts'],
  migrations: ['src/migrations/**/*.ts'],
  subscribers: ['src/subscribers/**/*.ts'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  dropSchema: false,
};

// Sequelize Configuration (if using Sequelize)
const sequelizeConfig = {
  dialect: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'id_card',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  timezone: '+05:30', // Adjust to your timezone
};

// Knex Configuration (if using Knex)
const knexConfig = {
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'id_card',
  },
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    directory: './migrations',
  },
  seeds: {
    directory: './seeds',
  },
};

// Direct mysql2/promise Usage
async function getConnection() {
  return await pool.getConnection();
}

// Test Connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    const result = await connection.query('SELECT 1');
    await connection.end();
    console.log('✅ Database connection successful!');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// Export configurations based on usage
export {
  pool,
  typeormConfig,
  sequelizeConfig,
  knexConfig,
  getConnection,
  testConnection,
};
