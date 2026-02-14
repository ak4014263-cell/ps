import express from 'express';
import crypto from 'crypto';
import { getAll, getOne, execute } from '../db.js';

const router = express.Router();

// ============================================================================
// CREATE PROJECT GROUP
// ============================================================================

router.post('/', async (req, res) => {
  try {
    const {
      project_id,
      name,
      template_id,
      vendor_id
    } = req.body;

    if (!project_id || !name) {
      return res.status(400).json({
        success: false,
        error: 'project_id and name are required'
      });
    }

    // Verify the project exists and optionally check vendor ownership
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

    // If vendor_id is provided, verify ownership
    if (vendor_id && project.vendor_id !== vendor_id) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to create groups for this project'
      });
    }

    const groupId = crypto.randomUUID();
    
    await execute(
      `INSERT INTO project_groups (
        id, project_id, name, template_id, record_count
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        groupId,
        project_id,
        name,
        template_id || null,
        0
      ]
    );

    res.status(201).json({
      success: true,
      data: {
        id: groupId,
        project_id,
        name,
        template_id: template_id || null,
        record_count: 0
      }
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// UPDATE PROJECT GROUP
// ============================================================================

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      template_id,
      vendor_id
    } = req.body;

    // Verify the group exists and get project info
    const group = await getOne(
      'SELECT pg.*, p.vendor_id FROM project_groups pg JOIN projects p ON pg.project_id = p.id WHERE pg.id = ?',
      [id]
    );

    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    // If vendor_id is provided, verify ownership
    if (vendor_id && group.vendor_id !== vendor_id) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to update this group'
      });
    }

    const updateFields = [];
    const updateValues = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }

    if (template_id !== undefined) {
      updateFields.push('template_id = ?');
      updateValues.push(template_id || null);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    updateValues.push(id);

    await execute(
      `UPDATE project_groups SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    res.json({
      success: true,
      data: {
        id,
        ...group,
        ...(name !== undefined && { name }),
        ...(template_id !== undefined && { template_id })
      }
    });
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// DELETE PROJECT GROUP
// ============================================================================

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { vendor_id } = req.query;

    // Verify the group exists and get project info
    const group = await getOne(
      'SELECT pg.*, p.vendor_id FROM project_groups pg JOIN projects p ON pg.project_id = p.id WHERE pg.id = ?',
      [id]
    );

    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    // If vendor_id is provided, verify ownership
    if (vendor_id && group.vendor_id !== vendor_id) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to delete this group'
      });
    }

    await execute(
      'DELETE FROM project_groups WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Group deleted successfully'
    });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// GET ALL GROUPS
// ============================================================================

router.get('/', async (req, res) => {
  try {
    const { project_id, vendor_id } = req.query;

    let query = `
      SELECT pg.*, 
             (SELECT COUNT(*) FROM data_records WHERE group_id = pg.id) as calculated_record_count,
             t.id as template_id, t.name as template_name, t.design_json
      FROM project_groups pg
      LEFT JOIN templates t ON pg.template_id = t.id
    `;
    const params = [];

    if (project_id) {
      query += ' WHERE pg.project_id = ?';
      params.push(project_id);
    }

    query += ' ORDER BY pg.created_at DESC';

    const groups = await getAll(query, params);

    // Format the response and update record_count in response if calculated differs
    let formattedGroups = groups.map(group => ({
      id: group.id,
      project_id: group.project_id,
      name: group.name,
      template_id: group.template_id,
      record_count: group.calculated_record_count || 0, // Use dynamically calculated count
      template: group.template_id ? {
        id: group.template_id,
        name: group.template_name,
        design_json: group.design_json
      } : null
    }));

    // If vendor_id is provided, filter by vendor
    if (vendor_id) {
      const filteredGroups = [];
      for (const group of formattedGroups) {
        const project = await getOne('SELECT vendor_id FROM projects WHERE id = ?', [group.project_id]);
        if (project && project.vendor_id === vendor_id) {
          filteredGroups.push(group);
        }
      }
      formattedGroups = filteredGroups;
    }

    console.log(`[GET-GROUPS] Found ${formattedGroups.length} groups with calculated record counts`);

    res.json({
      success: true,
      data: formattedGroups
    });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// GET GROUP BY ID
// ============================================================================

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const group = await getOne(
      'SELECT * FROM project_groups WHERE id = ?',
      [id]
    );

    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    res.json({
      success: true,
      data: group
    });
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
