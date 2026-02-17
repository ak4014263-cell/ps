import express from 'express';

import cors from 'cors';

import dotenv from 'dotenv';

import { fileURLToPath } from 'url';

import path from 'path';

import { execute, query } from './db.js';

import compression from 'compression';

import fileUpload from 'express-fileupload';



// Queue and rate limiting imports

import { setupRateLimiters } from './lib/rateLimiter.js';

import imageProcessingQueueRoutes from './routes/image-processing-queue.js';

import { setupWorkerRoutes } from './worker.js';



// Route imports

import authRoutes from './routes/auth.js';

import profileRoutes from './routes/profiles.js';

import vendorRoutes from './routes/vendors.js';

import clientRoutes from './routes/clients.js';

import productRoutes from './routes/products.js';

import projectRoutes from './routes/projects.js';

import projectTasksRoutes from './routes/project-tasks.js';

import projectGroupsRoutes from './routes/project-groups.js';

import dataRecordsRoutes from './routes/data-records.js';

import templatesRoutes from './routes/templates.js';

import libraryRoutes from './routes/library.js';

import imageToolsRoutes from './routes/image-tools.js';
import reportRoutes from './routes/reports.js';
import complaintRoutes from './routes/complaints.js';
import projectFilesRoutes from './routes/project-files.js';
import batchProcessingRoutes from './routes/batch-processing.js';

import teacherLinksRoutes from './routes/teacher-links.js';

import staffRoutes from './routes/staff.js';

import healthRoutes from './routes/health.js';



dotenv.config({ path: '../.env.local' });

dotenv.config({ path: '../.env' });



const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);



const app = express();

const PORT = process.env.BACKEND_PORT || 3001;



// ============================================================================

// MIDDLEWARE

// ============================================================================



app.use(cors({

  origin: ['http://localhost:8080', 'http://localhost:8081', 'http://localhost:5173', 'http://localhost:3000'],

  credentials: true,

  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],

  allowedHeaders: ['Content-Type', 'Authorization'],

}));



// Enable compression for responses

app.use(compression());



// Increase body size limits for base64 image data (1GB)

app.use(express.json({ limit: '1gb' }));

app.use(express.urlencoded({ limit: '1gb', extended: true }));



// Enable file upload handling

// NOTE: This is for general file uploads. Image tools routes use multer instead,

// so we skip fileUpload middleware for /api/image routes

const fileUploadSkip = fileUpload({

  limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB

  abortOnLimit: true,

  responseOnLimit: 'Request entity too large',

});



// Apply fileUpload to all routes EXCEPT /api/image

app.use((req, res, next) => {

  if (req.path.startsWith('/api/image')) {

    // Skip fileUpload for image routes (they use multer instead)

    next();

  } else {

    fileUploadSkip(req, res, next);

  }

});



// Setup rate limiters for multivendor protection

setupRateLimiters(app);



// ============================================================================

// REQUEST LOGGING MIDDLEWARE

// ============================================================================



// Serve uploaded files (project photos) from the uploads folder
// Place files under <repo_root>/backend/uploads/project-photos/{projectId}/{filename}
app.use('/uploads', cors(), express.static(path.join(__dirname, './uploads')));



app.use((req, res, next) => {

  const timestamp = new Date().toISOString();

  console.log(`[${timestamp}] ${req.method} ${req.path}`);

  next();

});



// ============================================================================

// ROUTES

// ============================================================================



// Root health check endpoint

app.get('/health', (req, res) => {

  res.json({ status: 'ok', server: 'running', timestamp: new Date().toISOString() });

});



// Auth routes

app.use('/api/auth', authRoutes);



// Health check

app.use('/api/health', healthRoutes);



// API Routes

app.use('/api/profiles', profileRoutes);

app.use('/api/vendors', vendorRoutes);

app.use('/api/clients', clientRoutes);

app.use('/api/products', productRoutes);

app.use('/api/projects', projectRoutes);

app.use('/api/project-tasks', projectTasksRoutes);

app.use('/api/project-groups', projectGroupsRoutes);

app.use('/api/data-records', dataRecordsRoutes);

app.use('/api/templates', templatesRoutes);

app.use('/api/library', libraryRoutes);

app.use('/api/image', imageToolsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/project-files', projectFilesRoutes);

// Batch processing routes (production queue-based)

app.use('/api/batch', batchProcessingRoutes);



// Queue-based image processing routes (async)

app.use('/api/image-queue', imageProcessingQueueRoutes);



// Worker monitoring routes

setupWorkerRoutes(app);



app.use('/api/teacher-links', teacherLinksRoutes);

app.use('/api/staff', staffRoutes);



// ============================================================================

// ROOT ENDPOINT

// ============================================================================



app.get('/', (req, res) => {

  res.json({

    message: '🚀 Backend API Server',

    version: '1.0.0',

    status: 'running',

    endpoints: {

      auth: '/api/auth (login, signup, verify, logout)',

      health: '/api/health',

      profiles: '/api/profiles (GET, POST, PUT, DELETE)',

      vendors: '/api/vendors (GET, POST, PUT, DELETE)',

      clients: '/api/clients (GET, POST, PUT, DELETE)',

      products: '/api/products (GET)',

      projects: '/api/projects (GET, POST, PUT, DELETE)',

      projectTasks: '/api/project-tasks (GET, POST, PUT, DELETE)',

      dataRecords: '/api/data-records (GET, POST, PUT, DELETE, BATCH)',

      templates: '/api/templates (GET, POST, PUT, DELETE)',

    }

  });

});



// ============================================================================

// 404 HANDLER

// ============================================================================



app.use((req, res) => {

  res.status(404).json({

    error: 'Not Found',

    path: req.path,

    method: req.method,

  });

});



// ============================================================================

// ERROR HANDLER

// ============================================================================



app.use((err, req, res, next) => {

  console.error('❌ Error:', err.message);

  res.status(500).json({

    error: 'Internal Server Error',

    message: err.message,

  });

});



// ============================================================================

// START SERVER

// ============================================================================



// Initialize database schema

async function initializeDatabase() {

  try {

    console.log('🔧 Checking and fixing database schema...');



    try {

      await execute('ALTER TABLE clients MODIFY COLUMN company_logo LONGTEXT');

      console.log('✅ company_logo column updated to LONGTEXT');

    } catch (err) {

      console.log('ℹ️  company_logo column already correct or skipped');

    }



    try {

      await execute('ALTER TABLE clients MODIFY COLUMN signature_logo LONGTEXT');

      console.log('✅ signature_logo column updated to LONGTEXT');

    } catch (err) {

      console.log('ℹ️  signature_logo column already correct or skipped');

    }



    try {

      await execute('ALTER TABLE clients ADD COLUMN balance DECIMAL(15, 2) DEFAULT 0.00');

      console.log('✅ balance column added to clients');

    } catch (err) {

      console.log('ℹ️  balance column already exists or skipped');

    }



    try {

      await execute('ALTER TABLE clients ADD COLUMN credit_limit DECIMAL(15, 2) DEFAULT 0.00');

      console.log('✅ credit_limit column added to clients');

    } catch (err) {

      console.log('ℹ️  credit_limit column already exists or skipped');

    }



    try {

      await execute('ALTER TABLE clients ADD COLUMN institution VARCHAR(255)');

      console.log('✅ institution column added to clients');

    } catch (err) {

      console.log('ℹ️  institution column already exists or skipped');

    }



    try {

      await execute('ALTER TABLE clients ADD COLUMN contact VARCHAR(255)');

      console.log('✅ contact column added to clients');

    } catch (err) {

      console.log('ℹ️  contact column already exists or skipped');

    }



    try {

      await execute('ALTER TABLE profiles ADD COLUMN vendor_id CHAR(36)');

      console.log('✅ vendor_id column added to profiles');

    } catch (err) {

      console.log('ℹ️  vendor_id column already exists or skipped');

    }



    // Fix incorrect foreign key constraint on projects.client_id

    try {

      // Drop the wrong constraint

      await execute('ALTER TABLE projects DROP FOREIGN KEY projects_ibfk_2');

      console.log('✅ Removed incorrect foreign key on projects.client_id');

    } catch (err) {

      console.log('ℹ️  Foreign key already corrected or skipped');

    }



    try {

      // Add the correct constraint

      await execute('ALTER TABLE projects ADD CONSTRAINT projects_client_fk FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL');

      console.log('✅ Added correct foreign key: projects.client_id -> clients.id');

    } catch (err) {

      console.log('ℹ️  Correct foreign key already exists or skipped');

    }



    // Initialize data_records table

    try {

      await execute(`

        CREATE TABLE IF NOT EXISTS data_records (

          id VARCHAR(36) PRIMARY KEY,

          project_id VARCHAR(36) NOT NULL,

          vendor_id VARCHAR(36) NULL,

          group_id VARCHAR(36) NULL,

          record_number INT NOT NULL,

          data_json JSON NOT NULL,

          photo_url LONGTEXT NULL,

          photo_blob LONGBLOB NULL,

          cropped_photo_url LONGTEXT NULL,

          cropped_photo_blob LONGBLOB NULL,

          original_photo_url LONGTEXT NULL,

          original_photo_blob LONGBLOB NULL,

          cloudinary_public_id VARCHAR(255) NULL,

          processing_status VARCHAR(50) DEFAULT 'pending',

          background_removed BOOLEAN DEFAULT FALSE,

          face_detected BOOLEAN DEFAULT FALSE,

          face_crop_coordinates JSON NULL,

          processing_error TEXT NULL,

          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

          INDEX idx_project_id (project_id),

          INDEX idx_vendor_id (vendor_id),

          INDEX idx_group_id (group_id),

          INDEX idx_record_number (record_number),

          INDEX idx_processing_status (processing_status),

          INDEX idx_project_record (project_id, record_number)

        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci

      `);

      console.log('✅ data_records table created/verified');

    } catch (err) {

      console.log('ℹ️  data_records table already exists or error:', err.message);

    }



    // Add missing columns to data_records table if they don't exist

    const dataRecordsColumns = [

      { name: 'vendor_id', sql: 'ALTER TABLE data_records ADD COLUMN vendor_id VARCHAR(36) NULL AFTER project_id' },

      { name: 'cropped_photo_url', sql: 'ALTER TABLE data_records ADD COLUMN cropped_photo_url TEXT NULL AFTER photo_url' },

      { name: 'original_photo_url', sql: 'ALTER TABLE data_records ADD COLUMN original_photo_url TEXT NULL AFTER cropped_photo_url' },

      { name: 'photo_blob', sql: 'ALTER TABLE data_records ADD COLUMN photo_blob LONGBLOB NULL AFTER photo_url' },

      { name: 'cropped_photo_blob', sql: 'ALTER TABLE data_records ADD COLUMN cropped_photo_blob LONGBLOB NULL AFTER cropped_photo_url' },

      { name: 'original_photo_blob', sql: 'ALTER TABLE data_records ADD COLUMN original_photo_blob LONGBLOB NULL AFTER original_photo_url' },

      { name: 'cloudinary_public_id', sql: 'ALTER TABLE data_records ADD COLUMN cloudinary_public_id VARCHAR(255) NULL AFTER original_photo_url' },

      { name: 'processing_status', sql: 'ALTER TABLE data_records ADD COLUMN processing_status VARCHAR(50) DEFAULT \'pending\' AFTER cloudinary_public_id' },

      { name: 'background_removed', sql: 'ALTER TABLE data_records ADD COLUMN background_removed BOOLEAN DEFAULT FALSE AFTER processing_status' },

      { name: 'face_detected', sql: 'ALTER TABLE data_records ADD COLUMN face_detected BOOLEAN DEFAULT FALSE AFTER background_removed' },

      { name: 'face_crop_coordinates', sql: 'ALTER TABLE data_records ADD COLUMN face_crop_coordinates JSON NULL AFTER face_detected' },

      { name: 'processing_error', sql: 'ALTER TABLE data_records ADD COLUMN processing_error TEXT NULL AFTER face_crop_coordinates' }

    ];



    for (const col of dataRecordsColumns) {

      try {

        // Check if column exists by querying information_schema

        const columns = await query(

          `SELECT COLUMN_NAME FROM information_schema.COLUMNS 

           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'data_records' AND COLUMN_NAME = ?`,

          [col.name]

        );

        if (columns.length === 0) {

          await execute(col.sql);

          console.log(`✅ Added column ${col.name} to data_records`);

        }

      } catch (err) {

        // Column might already exist or table might not exist yet

        console.log(`ℹ️  Column ${col.name} already exists or skipped`);

      }

    }

    // Initialize library tables
    const libraryTables = [
      {
        name: 'library_fonts',
        sql: `CREATE TABLE IF NOT EXISTS library_fonts (
          id VARCHAR(36) PRIMARY KEY,
          vendor_id VARCHAR(36) NULL,
          name VARCHAR(255) NOT NULL,
          font_url TEXT NOT NULL,
          is_public BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_vendor_id (vendor_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      },
      {
        name: 'library_shapes',
        sql: `CREATE TABLE IF NOT EXISTS library_shapes (
          id VARCHAR(36) PRIMARY KEY,
          vendor_id VARCHAR(36) NULL,
          name VARCHAR(255) NOT NULL,
          shape_url TEXT NOT NULL,
          is_public BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_vendor_id (vendor_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      },
      {
        name: 'library_icons',
        sql: `CREATE TABLE IF NOT EXISTS library_icons (
          id VARCHAR(36) PRIMARY KEY,
          vendor_id VARCHAR(36) NULL,
          name VARCHAR(255) NOT NULL,
          icon_url TEXT NOT NULL,
          is_public BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_vendor_id (vendor_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      }
    ];

    for (const table of libraryTables) {
      try {
        await execute(table.sql);
        console.log(`✅ ${table.name} table created/verified`);
      } catch (err) {
        console.log(`ℹ️  ${table.name} table already exists or error:`, err.message);
      }
    }



    // Ensure photo URL columns can store long data URLs (base64)

    try {

      await execute('ALTER TABLE data_records MODIFY COLUMN photo_url LONGTEXT NULL');

      await execute('ALTER TABLE data_records MODIFY COLUMN cropped_photo_url LONGTEXT NULL');

      await execute('ALTER TABLE data_records MODIFY COLUMN original_photo_url LONGTEXT NULL');

      console.log('✅ Updated photo URL columns to LONGTEXT in data_records');

    } catch (err) {

      console.log('ℹ️  Photo URL columns already LONGTEXT or alteration skipped:', err.message);

    }



    console.log('✅ Database schema initialization complete\n');

  } catch (error) {

    console.error('⚠️  Error during database initialization:', error.message);

  }

}



console.log('[DEBUG] About to start server on port', PORT);

const server = app.listen(PORT, '0.0.0.0', async () => {

  console.log('[DEBUG] app.listen() callback triggered');



  // Initialize database schema

  try {

    await initializeDatabase();

  } catch (err) {

    console.error('[DEBUG] Database initialization error:', err.message);

    console.error(err.stack);

  }



  console.log('\n' + '='.repeat(60));

  console.log('🚀 Backend API Server Running');

  console.log('='.repeat(60));

  console.log(`\n📡 Server: http://localhost:${PORT}`);

  console.log(`🔗 API: http://localhost:${PORT}/api`);

  console.log(`\n✅ Database: mysql://root:@localhost:3306/id_card`);

  console.log(`\n📝 CORS Origins:`);

  console.log(`   - http://localhost:8080`);

  console.log(`   - http://localhost:8081`);

  console.log(`   - http://localhost:5173`);

  console.log(`\n💡 Environment: ${process.env.NODE_ENV || 'development'}`);

  console.log('\n' + '='.repeat(60) + '\n');

  console.log('[DEBUG] Server callback completed successfully');

});



console.log('[DEBUG] app.listen() called, waiting for callback');



server.on('error', (error) => {

  console.error('[DEBUG] Server error event:', error.message);

  console.error('❌ Server error:', error.message);

  if (error.code === 'EADDRINUSE') {

    console.error(`Port ${PORT} is already in use`);

  }

  // Don't exit - keep running

});



server.on('close', () => {

  console.log('[DEBUG] Server closed');

});



// Handle unhandled promise rejections

process.on('unhandledRejection', (reason, promise) => {

  console.error('[DEBUG] Unhandled rejection:', reason);

  if (reason && reason.stack) console.error(reason.stack);

  console.error('Promise:', promise);

  // Don't exit - keep server running

});



// Handle uncaught exceptions  

process.on('uncaughtException', (error) => {

  console.error('[DEBUG] Uncaught exception:', error.message);

  console.error(error.stack);

  // Don't exit - keep server running

});



// Keep process alive

console.log('[DEBUG] Keeping process alive...');

