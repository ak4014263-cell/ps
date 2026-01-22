import express from 'express';
import crypto from 'crypto';
import { getAll, getOne, execute } from '../db.js';

const router = express.Router();

// ============================================================================
// CREATE TEMPLATE
// ============================================================================

router.post('/', async (req, res) => {
  try {
    const {
      template_name,
      description,
      vendor_id,
      project_id,
      template_type,
      template_data,
      is_active
    } = req.body;

    if (!template_name || !vendor_id) {
      return res.status(400).json({
        success: false,
        error: 'template_name and vendor_id are required'
      });
    }

    if (!project_id) {
      return res.status(400).json({
        success: false,
        error: 'project_id is required. Templates must belong to a project.'
      });
    }

    const templateId = crypto.randomUUID();
    
    // Extract is_public from template_data if it exists there, otherwise default to false
    let isPublic = false;
    if (template_data && typeof template_data === 'object') {
      isPublic = template_data.is_public === true || template_data.is_public === 'true';
    }
    
    // Check if project_id column exists in the table
    // For now, we'll try to insert with project_id, and if it fails, we'll handle it
    // Note: You may need to add project_id column to templates table if it doesn't exist
    let insertSQL, insertValues;
    
    // Try to check if project_id column exists by attempting a query
    // For MySQL, we'll try inserting with project_id first
    insertSQL = `INSERT INTO templates (
      id, template_name, description, vendor_id, project_id, template_type,
      template_data, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    insertValues = [
      templateId,
      template_name,
      description || null,
      vendor_id,
      project_id,
      template_type || 'design',
      template_data ? JSON.stringify(template_data) : null,
      is_active !== false ? 1 : 0
    ];
    
    try {
      await execute(insertSQL, insertValues);
    } catch (err) {
      // If project_id column doesn't exist, insert without it
      // This is a fallback for databases that haven't been migrated yet
      if (err.message && err.message.includes('Unknown column')) {
        insertSQL = `INSERT INTO templates (
          id, template_name, description, vendor_id, template_type,
          template_data, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        insertValues = [
          templateId,
          template_name,
          description || null,
          vendor_id,
          template_type || 'design',
          template_data ? JSON.stringify(template_data) : null,
          is_active !== false ? 1 : 0
        ];
        await execute(insertSQL, insertValues);
      } else {
        throw err;
      }
    }

    res.status(201).json({
      success: true,
      data: {
        id: templateId,
        template_name,
        vendor_id,
        template_type: template_type || 'design'
      }
    });
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// UPDATE TEMPLATE
// ============================================================================

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const fields = [];
    const values = [];
    
    const allowedFields = [
      'template_name', 'description', 'template_type',
      'template_data', 'is_active', 'project_id'
    ];

    for (const field of allowedFields) {
      if (field in updates) {
        let value = updates[field];
        if (field === 'template_data') {
          value = typeof value === 'string' ? value : JSON.stringify(value);
        }
        fields.push(`${field} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    values.push(id);
    
    const result = await execute(
      `UPDATE templates SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      message: 'Template updated successfully'
    });
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// DELETE TEMPLATE
// ============================================================================

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await execute(
      'DELETE FROM templates WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// GET ALL TEMPLATES
// ============================================================================

router.get('/', async (req, res) => {
  try {
    // Get all templates - include public ones and vendor-specific ones
    // If vendorId query param is provided, filter by vendor or public
    const { vendorId } = req.query;
    
    let query = 'SELECT * FROM templates';
    let params = [];
    
    if (vendorId) {
      // Show templates for this vendor OR public templates (available to all vendors)
      // Check is_public in template_data JSON (is_public is stored in template_data, not as a separate column)
      query = `SELECT * FROM templates 
               WHERE vendor_id = ? 
               OR (template_data LIKE '%"is_public":true%')
               OR (template_data LIKE '%"is_public":"true"%')
               ORDER BY created_at DESC
               LIMIT 100`;
      params = [vendorId];
    } else {
      query = 'SELECT * FROM templates ORDER BY created_at DESC LIMIT 100';
    }
    
    const templates = await getAll(query, params);
    
    // Parse template_data for each template
    const parsedTemplates = templates.map(template => {
      if (template.template_data && typeof template.template_data === 'string') {
        try {
          template.template_data = JSON.parse(template.template_data);
        } catch (e) {
          // Keep as string if not valid JSON
        }
      }
      return template;
    });
    
    res.json({
      success: true,
      count: parsedTemplates.length,
      data: parsedTemplates,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// GET TEMPLATE BY ID
// ============================================================================

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const template = await getOne('SELECT * FROM templates WHERE id = ?', [id]);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    // Parse template_data if it's JSON
    if (template.template_data && typeof template.template_data === 'string') {
      try {
        template.template_data = JSON.parse(template.template_data);
      } catch (e) {
        // Keep as string if not valid JSON
      }
    }

    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// GET TEMPLATES BY VENDOR
// ============================================================================

router.get('/vendor/:vendorId', async (req, res) => {
  try {
    const { vendorId } = req.params;
    console.log('[DEBUG] GET /api/templates/vendor/:vendorId called -', vendorId);
    // Get templates that belong to this vendor OR are public (available to all vendors)
    // Check is_public in template_data JSON (is_public is stored in template_data, not as a separate column)
    // Ensure templates table exists to avoid SQL errors
    const tables = await getAll("SHOW TABLES LIKE 'templates'");
    if (!tables || tables.length === 0) {
      return res.json({ success: true, count: 0, data: [] });
    }

    // Use JSON_EXTRACT when possible to robustly check is_public inside JSON column
    const templates = await getAll(
      `SELECT * FROM templates 
       WHERE vendor_id = ? 
       OR JSON_EXTRACT(template_data, '$.is_public') = true
       OR JSON_EXTRACT(template_data, '$.is_public') = 'true'
       ORDER BY created_at DESC
       LIMIT 50`,
      [vendorId]
    );

    console.log('[DEBUG] templates rows fetched:', Array.isArray(templates) ? templates.length : typeof templates);

    // Parse template_data for each template
    const parsedTemplates = templates.map(template => {
      if (template.template_data && typeof template.template_data === 'string') {
        try {
          template.template_data = JSON.parse(template.template_data);
        } catch (e) {
          // Keep as string if not valid JSON
        }
      }
      return template;
    });

    res.json({
      success: true,
      count: parsedTemplates.length,
      data: parsedTemplates,
    });
  } catch (error) {
    console.error('Get templates by vendor error:', error && error.stack ? error.stack : error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
