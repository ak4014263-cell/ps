import express from 'express';
import crypto from 'crypto';
import { getAll, getOne, execute } from '../db.js';

const router = express.Router();

// Helper function to format template response
function formatTemplate(template) {
  // Parse template_data if it's a string
  let templateData = template.template_data;
  if (typeof templateData === 'string') {
    try {
      templateData = JSON.parse(templateData);
    } catch (e) {
      templateData = {};
    }
  } else if (!templateData) {
    templateData = {};
  }

  // Extract actual values from template_data or use database fields as fallback
  const width_mm = templateData.width_mm || template.width_mm || 100;
  const height_mm = templateData.height_mm || template.height_mm || 100;
  const has_back_side = templateData.has_back_side !== undefined ? templateData.has_back_side : (template.has_back_side === 1 || template.has_back_side === true);
  let design_json = templateData.design_json || template.design_json;
  let back_design_json = templateData.back_design_json || template.back_design_json;

  // Parse design_json if it's a string
  if (design_json && typeof design_json === 'string') {
    try {
      design_json = JSON.parse(design_json);
    } catch (e) {
      design_json = null;
    }
  }

  // Parse back_design_json if it's a string
  if (back_design_json && typeof back_design_json === 'string') {
    try {
      back_design_json = JSON.parse(back_design_json);
    } catch (e) {
      back_design_json = null;
    }
  }

  const templateName = template.name || template.template_name || 'Untitled';
  const templateCategory = template.category || template.template_type || template.type || 'General';

  return {
    id: template.id,
    name: templateName,
    category: templateCategory,
    vendor_id: template.vendor_id,
    is_public: templateData.is_public === true || template.is_public === 1 || template.is_public === true,
    width_mm: width_mm,
    height_mm: height_mm,
    thumbnail_url: template.thumbnail_url,
    design_json: design_json,
    back_design_json: back_design_json,
    has_back_side: has_back_side,
    created_at: template.created_at,
    template_data: templateData
  };
}

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
    const templates = await getAll('SELECT * FROM templates ORDER BY created_at DESC');
    console.log('[DEBUG] GET /api/templates - Retrieved templates:', templates.length);
    if (templates.length > 0) {
      console.log('[DEBUG] First template raw data:', templates[0]);
    }
    const formatted = templates.map(formatTemplate);
    console.log('[DEBUG] First formatted template:', formatted.length > 0 ? formatted[0] : 'none');
    res.json(formatted);
  } catch (error) {
    console.error('Get all templates error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// GET TEMPLATES BY VENDOR (must be before /:id route)
// ============================================================================

router.get('/vendor/:vendorId', async (req, res) => {
  try {
    const { vendorId } = req.params;
    console.log('[DEBUG] GET /api/templates/vendor/:vendorId called -', vendorId);
    
    const tables = await getAll("SHOW TABLES LIKE 'templates'");
    if (!tables || tables.length === 0) {
      return res.json([]);
    }

    const templates = await getAll(
      `SELECT * FROM templates WHERE vendor_id = ? ORDER BY created_at DESC`,
      [vendorId]
    );

    console.log('[DEBUG] templates rows fetched:', Array.isArray(templates) ? templates.length : typeof templates);
    res.json(templates.map(formatTemplate));
  } catch (error) {
    console.error('Get templates by vendor error:', error);
    res.status(500).json({ success: false, error: error.message });
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
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    res.json(formatTemplate(template));
  } catch (error) {
    console.error('Get template by ID error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
