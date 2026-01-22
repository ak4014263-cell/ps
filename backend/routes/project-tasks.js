import express from 'express';
import crypto from 'crypto';
import { getAll, getOne, execute } from '../db.js';

const router = express.Router();

// ============================================================================
// CREATE PROJECT TASK
// ============================================================================

router.post('/', async (req, res) => {
  try {
    const {
      project_id,
      task_name,
      description,
      assigned_to,
      status,
      priority,
      due_date,
      created_by,
      vendor_id
    } = req.body;

    if (!project_id || !task_name) {
      return res.status(400).json({
        success: false,
        error: 'project_id and task_name are required'
      });
    }

    // Verify the project exists and belongs to the vendor
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
        error: 'You do not have permission to create tasks for this project'
      });
    }

    const taskId = crypto.randomUUID();
    
    await execute(
      `INSERT INTO project_tasks (
        id, project_id, task_name, description, assigned_to, status,
        priority, due_date, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        taskId,
        project_id,
        task_name,
        description || null,
        assigned_to || null,
        status || 'todo',
        priority || 'medium',
        due_date || null,
        created_by || null
      ]
    );

    res.status(201).json({
      success: true,
      data: {
        id: taskId,
        task_name,
        project_id,
        status: status || 'todo'
      }
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// UPDATE PROJECT TASK
// ============================================================================

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const fields = [];
    const values = [];
    
    const allowedFields = [
      'task_name', 'description', 'assigned_to', 'status', 'priority', 'due_date'
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
      `UPDATE project_tasks SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    res.json({
      success: true,
      message: 'Task updated successfully'
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// DELETE PROJECT TASK
// ============================================================================

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await execute(
      'DELETE FROM project_tasks WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// GET ALL TASKS
// ============================================================================

router.get('/', async (req, res) => {
  try {
    const { vendor_id } = req.query;
    let query = `SELECT pt.* FROM project_tasks pt
                 JOIN projects p ON pt.project_id = p.id`;
    let params = [];
    
    if (vendor_id) {
      query += ' WHERE p.vendor_id = ?';
      params.push(vendor_id);
    }
    
    query += ' ORDER BY pt.created_at DESC LIMIT 100';
    
    const tasks = await getAll(query, params);
    res.json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// GET TASK BY ID
// ============================================================================

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const task = await getOne('SELECT * FROM project_tasks WHERE id = ?', [id]);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
      });
    }

    res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// GET TASKS BY PROJECT
// ============================================================================

router.get('/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const tasks = await getAll(
      'SELECT * FROM project_tasks WHERE project_id = ? ORDER BY created_at DESC',
      [projectId]
    );

    res.json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
