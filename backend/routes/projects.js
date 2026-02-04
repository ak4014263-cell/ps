import express from 'express';
import crypto from 'crypto';
import { getAll, getOne, execute } from '../db.js';

const router = express.Router();

// ============================================================================
// CREATE PROJECT
// ============================================================================

router.post('/', async (req, res) => {
  try {
    const {
      project_name,
      description,
      vendor_id,
      client_id,
      status,
      start_date,
      end_date,
      budget,
      notes,
      created_by
    } = req.body;

    if (!project_name || !vendor_id) {
      return res.status(400).json({
        success: false,
        error: 'project_name and vendor_id are required'
      });
    }

    const projectId = crypto.randomUUID();
    
    await execute(
      `INSERT INTO projects (
        id, project_name, description, vendor_id, client_id, status,
        start_date, end_date, budget, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        projectId,
        project_name,
        description || null,
        vendor_id,
        client_id || null,
        status || 'draft',
        start_date || null,
        end_date || null,
        parseFloat(budget) || 0,
        notes || null,
        created_by || null
      ]
    );

    res.status(201).json({
      success: true,
      data: {
        id: projectId,
        project_name,
        vendor_id,
        status: status || 'draft'
      }
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// UPDATE PROJECT
// ============================================================================

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const fields = [];
    const values = [];
    
    const allowedFields = [
      'project_name', 'description', 'client_id', 'status',
      'start_date', 'end_date', 'budget', 'notes'
    ];

    for (const field of allowedFields) {
      if (field in updates) {
        fields.push(`${field} = ?`);
        values.push(updates[field]);
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
      `UPDATE projects SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    res.json({
      success: true,
      message: 'Project updated successfully'
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// DELETE PROJECT
// ============================================================================

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await execute(
      'DELETE FROM projects WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// GET ALL PROJECTS
// ============================================================================

router.get('/', async (req, res) => {
  try {
    const { vendor_id } = req.query;
    let query = 'SELECT * FROM projects';
    let params = [];
    
    if (vendor_id) {
      query += ' WHERE vendor_id = ?';
      params.push(vendor_id);
    }
    
    query += ' ORDER BY created_at DESC LIMIT 100';
    
    const projects = await getAll(query, params);
    res.json({
      success: true,
      count: projects.length,
      data: projects,
    });
  } catch (error) {
    console.error('Get project by id error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// GET PROJECT BY ID (WITH GROUPS)
// ============================================================================

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const project = await getOne('SELECT * FROM projects WHERE id = ?', [id]);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    // Fetch groups for this project including calculated record counts and template info
    const groupsQuery = `
      SELECT pg.*, 
             (SELECT COUNT(*) FROM data_records WHERE group_id = pg.id) as calculated_record_count,
             t.id as template_id, t.template_name as template_name, t.template_data as template_data
      FROM project_groups pg
      LEFT JOIN templates t ON pg.template_id = t.id
      WHERE pg.project_id = ?
      ORDER BY pg.created_at DESC
    `;

    const groupsRaw = await getAll(groupsQuery, [id]);

    const groups = (groupsRaw || []).map(g => ({
      id: g.id,
      project_id: g.project_id,
      name: g.name,
      template_id: g.template_id,
      record_count: g.calculated_record_count || 0,
      template: g.template_id ? (() => {
        // try to parse template_data if present
        let parsed = null;
        if (g.template_data) {
          try { parsed = typeof g.template_data === 'string' ? JSON.parse(g.template_data) : g.template_data; } catch (e) { parsed = null; }
        }
        const tplName = g.template_name || (parsed && (parsed.template_name || parsed.name)) || null;
        const designJson = (parsed && (parsed.design_json || parsed.back_design_json)) || null;
        return {
          id: g.template_id,
          name: tplName,
          design_json: designJson
        };
      })() : null
    }));

    res.json({
      success: true,
      data: {
        ...project,
        groups
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// GET PROJECT WITH TASKS
// ============================================================================

router.get('/:id/tasks', async (req, res) => {
  try {
    const { id } = req.params;
    
    const project = await getOne('SELECT * FROM projects WHERE id = ?', [id]);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    const tasks = await getAll(
      'SELECT * FROM project_tasks WHERE project_id = ? ORDER BY created_at DESC',
      [id]
    );

    res.json({
      success: true,
      data: {
        project,
        tasks,
        taskCount: tasks.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// GET PROJECT WITH ASSIGNMENTS
// ============================================================================

router.get('/:id/assignments', async (req, res) => {
  try {
    const { id } = req.params;
    
    const project = await getOne('SELECT * FROM projects WHERE id = ?', [id]);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    const assignments = await getAll(
      'SELECT * FROM project_assignments WHERE project_id = ?',
      [id]
    );

    res.json({
      success: true,
      data: {
        project,
        assignments,
        assignmentCount: assignments.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// SEARCH PROJECTS
// ============================================================================

router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const projects = await getAll(
      'SELECT * FROM projects WHERE project_name LIKE ? OR description LIKE ? LIMIT 50',
      [`%${query}%`, `%${query}%`]
    );

    res.json({
      success: true,
      count: projects.length,
      data: projects,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
