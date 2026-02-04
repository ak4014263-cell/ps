import express from 'express';
import crypto from 'crypto';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';
import { getAll, getOne, execute } from '../db.js';

const router = express.Router();

// ============================================================================
// CREATE DATA RECORD (SINGLE)
// ============================================================================

router.post('/', async (req, res) => {
  try {
    const {
      project_id,
      group_id,
      record_number,
      data_json,
      photo_url,
      processing_status
    } = req.body;

    if (!project_id || record_number === undefined || !data_json) {
      return res.status(400).json({
        success: false,
        error: 'project_id, record_number, and data_json are required'
      });
    }

    // Verify the project exists and get vendor_id
    const project = await getOne(
      'SELECT id, vendor_id FROM projects WHERE id = ?',
      [project_id]
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    const recordId = crypto.randomUUID();
    
    await execute(
      `INSERT INTO data_records (
        id, project_id, vendor_id, group_id, record_number, data_json,
        photo_url, processing_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        recordId,
        project_id,
        project.vendor_id || null,
        group_id || null,
        record_number,
        JSON.stringify(data_json),
        photo_url || null,
        processing_status || 'pending'
      ]
    );

    res.status(201).json({
      success: true,
      data: {
        id: recordId,
        project_id,
        record_number,
        processing_status: processing_status || 'pending'
      }
    });
  } catch (error) {
    console.error('Create data record error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// CREATE DATA RECORDS (BATCH)
// ============================================================================

router.post('/batch', async (req, res) => {
  try {
    const { records } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'records array is required and must not be empty'
      });
    }

    // Verify all records have required fields
    for (const record of records) {
      if (!record.project_id || record.record_number === undefined || !record.data_json) {
        return res.status(400).json({
          success: false,
          error: 'Each record must have project_id, record_number, and data_json'
        });
      }
    }

    // Verify the project exists (use first record's project_id) and get vendor_id
    const project = await getOne(
      'SELECT id, vendor_id FROM projects WHERE id = ?',
      [records[0].project_id]
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Insert records in batch
    const insertedIds = [];
    const values = [];
    const placeholders = [];

    for (const record of records) {
      const recordId = crypto.randomUUID();
      insertedIds.push(recordId);
      placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?)');
      values.push(
        recordId,
        record.project_id,
        project.vendor_id || null,
        record.group_id || null,
        record.record_number,
        JSON.stringify(record.data_json),
        record.photo_url || null,
        record.processing_status || 'pending'
      );
    }

    await execute(
      `INSERT INTO data_records (
        id, project_id, vendor_id, group_id, record_number, data_json,
        photo_url, processing_status
      ) VALUES ${placeholders.join(', ')}`,
      values
    );

    res.status(201).json({
      success: true,
      data: {
        count: records.length,
        ids: insertedIds
      }
    });
  } catch (error) {
    console.error('Batch create data records error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// GET MAX RECORD NUMBER FOR PROJECT (MUST BE BEFORE /project/:projectId)
// ============================================================================

router.get('/project/:projectId/max-record-number', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { vendor_id } = req.query;

    // Verify project exists and optionally check vendor ownership
    const project = await getOne(
      'SELECT id, vendor_id FROM projects WHERE id = ?',
      [projectId]
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // If vendor_id is provided, verify the project belongs to that vendor
    if (vendor_id && project.vendor_id !== vendor_id) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to access this project'
      });
    }

    let query = 'SELECT MAX(record_number) as max_record_number FROM data_records WHERE project_id = ?';
    const params = [projectId];

    // Filter by vendor_id if provided
    if (vendor_id) {
      query += ' AND vendor_id = ?';
      params.push(vendor_id);
    }

    const result = await getOne(query, params);

    const maxRecordNumber = result?.max_record_number || 0;

    res.json({
      success: true,
      data: {
        max_record_number: maxRecordNumber
      }
    });
  } catch (error) {
    console.error('Get max record number error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// GET DATA RECORDS BY PROJECT
// ============================================================================

router.get('/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { group_id, vendor_id, order_by = 'record_number', order = 'asc' } = req.query;

    // Verify project exists and optionally check vendor ownership
    const project = await getOne(
      'SELECT id, vendor_id FROM projects WHERE id = ?',
      [projectId]
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // If vendor_id is provided, verify the project belongs to that vendor
    if (vendor_id && project.vendor_id !== vendor_id) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to view records for this project'
      });
    }

    // 🔥 OPTIMIZATION: Select specific columns and exclude large blobs
    const columnsToSelect = `
      id, project_id, vendor_id, group_id, record_number, data_json,
      photo_url, cropped_photo_url, original_photo_url, cloudinary_public_id,
      processing_status, background_removed, face_detected, face_crop_coordinates,
      processing_error, created_at, updated_at
    `;
    let query = `SELECT ${columnsToSelect} FROM data_records WHERE project_id = ?`;
    const params = [projectId];

    // Filter by vendor_id if provided (additional security layer)
    if (vendor_id) {
      query += ' AND vendor_id = ?';
      params.push(vendor_id);
    }

    if (group_id) {
      query += ' AND group_id = ?';
      params.push(group_id);
    }

    // Validate order_by and order
    const validOrderBy = ['record_number', 'created_at', 'updated_at'];
    const validOrder = ['asc', 'desc'];
    
    if (validOrderBy.includes(order_by) && validOrder.includes(order.toLowerCase())) {
      query += ` ORDER BY ${order_by} ${order.toUpperCase()}`;
    } else {
      query += ' ORDER BY record_number ASC';
    }

    // Support pagination: optional `limit` and `offset` query params
    const limit = parseInt(req.query.limit) || null;
    const offset = parseInt(req.query.offset) || null;

    if (limit && Number.isFinite(limit) && limit > 0) {
      query += ' LIMIT ?';
      params.push(limit);
      if (offset && Number.isFinite(offset) && offset >= 0) {
        query += ' OFFSET ?';
        params.push(offset);
      }
    }

    const records = await getAll(query, params);

    // Parse JSON fields
    const parsedRecords = records.map(record => ({
      ...record,
      data_json: typeof record.data_json === 'string' 
        ? JSON.parse(record.data_json) 
        : record.data_json,
      face_crop_coordinates: record.face_crop_coordinates && typeof record.face_crop_coordinates === 'string'
        ? JSON.parse(record.face_crop_coordinates)
        : record.face_crop_coordinates
    }));

    res.json({
      success: true,
      count: parsedRecords.length,
      data: parsedRecords
    });
  } catch (error) {
    console.error('Get data records error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// GET DATA RECORDS BY VENDOR (must be before /:id)
// ============================================================================

router.get('/vendor/:vendorId', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { project_id, group_id, order_by = 'record_number', order = 'asc' } = req.query;

    let query = 'SELECT * FROM data_records WHERE vendor_id = ?';
    const params = [vendorId];

    if (project_id) {
      query += ' AND project_id = ?';
      params.push(project_id);
    }

    if (group_id) {
      query += ' AND group_id = ?';
      params.push(group_id);
    }

    // Validate order_by and order
    const validOrderBy = ['record_number', 'created_at', 'updated_at'];
    const validOrder = ['asc', 'desc'];
    
    if (validOrderBy.includes(order_by) && validOrder.includes(order.toLowerCase())) {
      query += ` ORDER BY ${order_by} ${order.toUpperCase()}`;
    } else {
      query += ' ORDER BY record_number ASC';
    }

    // Support pagination here as well
    const limit = parseInt(req.query.limit) || null;
    const offset = parseInt(req.query.offset) || null;

    if (limit && Number.isFinite(limit) && limit > 0) {
      query += ' LIMIT ?';
      params.push(limit);
      if (offset && Number.isFinite(offset) && offset >= 0) {
        query += ' OFFSET ?';
        params.push(offset);
      }
    }

    const records = await getAll(query, params);

    // Parse JSON fields
    const parsedRecords = records.map(record => ({
      ...record,
      data_json: typeof record.data_json === 'string' 
        ? JSON.parse(record.data_json) 
        : record.data_json,
      face_crop_coordinates: record.face_crop_coordinates && typeof record.face_crop_coordinates === 'string'
        ? JSON.parse(record.face_crop_coordinates)
        : record.face_crop_coordinates
    }));

    res.json({
      success: true,
      count: parsedRecords.length,
      data: parsedRecords
    });
  } catch (error) {
    console.error('Get data records by vendor error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// GET DATA RECORD BY ID
// ============================================================================

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { vendor_id } = req.query;
    
    let query = 'SELECT * FROM data_records WHERE id = ?';
    const params = [id];

    // Filter by vendor_id if provided
    if (vendor_id) {
      query += ' AND vendor_id = ?';
      params.push(vendor_id);
    }

    const record = await getOne(query, params);
    
    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Data record not found'
      });
    }

    // Parse JSON fields
    const parsedRecord = {
      ...record,
      data_json: typeof record.data_json === 'string' 
        ? JSON.parse(record.data_json) 
        : record.data_json,
      face_crop_coordinates: record.face_crop_coordinates && typeof record.face_crop_coordinates === 'string'
        ? JSON.parse(record.face_crop_coordinates)
        : record.face_crop_coordinates
    };

    res.json({
      success: true,
      data: parsedRecord
    });
  } catch (error) {
    console.error('Get data record error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// UPDATE DATA RECORD
// ============================================================================

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    console.log(`\n[UPDATE START] Record ID: ${id}`);
    console.log(`[UPDATE] Requested updates:`, updates);

    // First verify the record exists
    const existingRecord = await getOne('SELECT id, group_id FROM data_records WHERE id = ?', [id]);
    if (!existingRecord) {
      console.log(`[UPDATE] ERROR: Record ${id} not found`);
      return res.status(404).json({
        success: false,
        error: 'Record not found'
      });
    }

    console.log(`[UPDATE] Found existing record. Current group_id: ${existingRecord.group_id}`);

    const fields = [];
    const values = [];
    
    const allowedFields = [
      'group_id', 'record_number', 'data_json', 'photo_url',
      'cropped_photo_url', 'processing_status', 'background_removed',
      'face_detected', 'face_crop_coordinates', 'original_photo_url',
      'cloudinary_public_id', 'processing_error'
    ];

    for (const field of allowedFields) {
      if (field in updates) {
        if (field === 'data_json' || field === 'face_crop_coordinates') {
          fields.push(`${field} = ?`);
          values.push(JSON.stringify(updates[field]));
        } else {
          fields.push(`${field} = ?`);
          values.push(updates[field]);
        }
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    values.push(id);

    const sql = `UPDATE data_records SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`;
    console.log(`[UPDATE] SQL: ${sql}`);
    console.log(`[UPDATE] Values:`, values);

    const result = await execute(sql, values);

    console.log(`[UPDATE] Query result:`, result);
    console.log(`[UPDATE] Affected rows: ${result.affectedRows}, Changed rows: ${result.changedRows}`);

    if (result.affectedRows === 0) {
      console.log(`[UPDATE] WARNING: Update query affected 0 rows`);
    }

    // If group_id was updated, refresh record counts for both old and new groups
    if ('group_id' in updates) {
      console.log(`[UPDATE] Group ID changed, updating record counts...`);
      
      const oldRecord = existingRecord;
      const newGroupId = updates.group_id;
      const oldGroupId = oldRecord.group_id;

      // Update old group count (if it had one)
      if (oldGroupId) {
        await execute(
          `UPDATE project_groups SET record_count = (SELECT COUNT(*) FROM data_records WHERE group_id = ?) WHERE id = ?`,
          [oldGroupId, oldGroupId]
        );
        console.log(`[UPDATE] Updated record_count for old group ${oldGroupId}`);
      }

      // Update new group count (if assigned to one)
      if (newGroupId) {
        await execute(
          `UPDATE project_groups SET record_count = (SELECT COUNT(*) FROM data_records WHERE group_id = ?) WHERE id = ?`,
          [newGroupId, newGroupId]
        );
        console.log(`[UPDATE] Updated record_count for new group ${newGroupId}`);
      }
    }

    // Verify the update worked by fetching the record again
    const updatedRecord = await getOne('SELECT * FROM data_records WHERE id = ?', [id]);

    if (!updatedRecord) {
      console.log(`[UPDATE] ERROR: Could not fetch updated record`);
      return res.status(500).json({
        success: false,
        error: 'Update failed - record not found after update'
      });
    }

    console.log(`[UPDATE] SUCCESS. New group_id: ${updatedRecord.group_id}`);
    console.log(`[UPDATE END]\n`);

    res.json({
      success: true,
      message: 'Data record updated successfully',
      data: updatedRecord
    });
  } catch (error) {
    console.error(`[UPDATE] EXCEPTION for record ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// DELETE DATA RECORD
// ============================================================================

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await execute(
      'DELETE FROM data_records WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Data record not found'
      });
    }

    res.json({
      success: true,
      message: 'Data record deleted successfully'
    });
  } catch (error) {
    console.error('Delete data record error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// UPLOAD PHOTO (RECEIVES FILE AND STORES AS BASE64 IN DATABASE)
// ============================================================================

router.post('/:id/upload-photo', async (req, res) => {
  try {
    const { id } = req.params;
    const { processing_status, projectId } = req.body;

    console.log(`[Upload] Received upload request for record ${id}, projectId: ${projectId}`);

    // Get the photo file from request
    if (!req.files || !req.files.photo) {
      console.error('[Upload] No photo file in request');
      return res.status(400).json({
        success: false,
        error: 'No photo file provided'
      });
    }

    const photoFile = req.files.photo;
    console.log(`[Upload] Photo file received: ${photoFile.name} (${photoFile.size} bytes)`);
    
    // Create uploads directory if it doesn't exist
    // Store in: uploads/project-photos/{projectId}/{filename}
    const uploadsDir = path.join(process.cwd(), 'uploads', 'project-photos', projectId || 'general');
    if (!existsSync(uploadsDir)) {
      mkdirSync(uploadsDir, { recursive: true });
      console.log(`[Upload] Created directory: ${uploadsDir}`);
    }

    // Generate unique filename
    const filename = `photo_${id}_${Date.now()}.${photoFile.name.split('.').pop()}`;
    const filepath = path.join(uploadsDir, filename);
    const relativePath = `uploads/project-photos/${projectId || 'general'}/${filename}`;

    // Save file to disk
    await photoFile.mv(filepath);
    console.log(`[Upload] Saved photo to disk: ${filepath}`);

    console.log(`[Upload] Updating database with filename: ${filename}`);

    // Update record with file path (store only the filename)
    const result = await execute(
      `UPDATE data_records SET photo_url = ?, processing_status = ? WHERE id = ?`,
      [filename, processing_status || 'processed', id]
    );

    console.log(`[Upload] Database update result for ${id}: photo_url=${filename}, status=${processing_status}`);

    res.json({
      success: true,
      message: 'Photo uploaded successfully',
      recordId: id,
      photoPath: relativePath,
      filename: filename
    });
  } catch (error) {
    console.error('Upload photo error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
