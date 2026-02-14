import express from 'express';
import { getAll, getOne, execute } from '../db.js';
import crypto from 'crypto';

const router = express.Router();

// ============================================================================
// GET ALL TEACHER LINKS
// ============================================================================
router.get('/', async (req, res) => {
  try {
    const links = await getAll('SELECT * FROM teacher_data_links ORDER BY created_at DESC');
    res.json({
      success: true,
      data: links || []
    });
  } catch (error) {
    console.error('Error fetching teacher links:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// GET TEACHER LINK BY ID
// ============================================================================
router.get('/:id', async (req, res) => {
  try {
    const link = await getOne('SELECT * FROM teacher_data_links WHERE id = ?', [req.params.id]);
    if (!link) {
      return res.status(404).json({
        success: false,
        error: 'Teacher link not found'
      });
    }
    res.json({
      success: true,
      data: link
    });
  } catch (error) {
    console.error('Error fetching teacher link:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// GET TEACHER LINK BY TOKEN (for public access)
// ============================================================================
router.get('/token/:token', async (req, res) => {
  try {
    const link = await getOne('SELECT * FROM teacher_data_links WHERE token = ?', [req.params.token]);
    if (!link) {
      return res.status(404).json({
        success: false,
        error: 'Invalid teacher link'
      });
    }
    if (!link.is_active) {
      return res.status(403).json({
        success: false,
        error: 'This teacher link is no longer active'
      });
    }
    if (link.current_submissions >= link.max_submissions) {
      return res.status(403).json({
        success: false,
        error: 'This teacher link has reached its submission limit'
      });
    }
    res.json({
      success: true,
      data: link
    });
  } catch (error) {
    console.error('Error fetching teacher link:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// CREATE NEW TEACHER LINK
// ============================================================================
router.post('/', async (req, res) => {
  try {
    const {
      teacher_name,
      teacher_email,
      teacher_phone,
      max_submissions = 100,
      project_id,
      vendor_id,
      created_by
    } = req.body;

    if (!teacher_name || !vendor_id) {
      return res.status(400).json({
        success: false,
        error: 'Teacher name and vendor ID are required'
      });
    }

    // Generate unique token
    const token = crypto.randomBytes(8).toString('hex');
    const now = new Date().toISOString();

    const result = await execute(
      `INSERT INTO teacher_data_links 
       (token, teacher_name, teacher_email, teacher_phone, max_submissions, current_submissions, project_id, vendor_id, is_active, created_by, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        token,
        teacher_name,
        teacher_email || null,
        teacher_phone || null,
        max_submissions,
        0,
        project_id || null,
        vendor_id,
        true,
        created_by || null,
        now,
        now
      ]
    );

    res.json({
      success: true,
      data: {
        id: result.insertId,
        token,
        teacher_name,
        teacher_email,
        teacher_phone,
        max_submissions,
        current_submissions: 0,
        project_id,
        vendor_id,
        is_active: true,
        created_by,
        created_at: now,
        updated_at: now
      }
    });
  } catch (error) {
    console.error('Error creating teacher link:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// UPDATE TEACHER LINK
// ============================================================================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      teacher_name,
      teacher_email,
      teacher_phone,
      max_submissions,
      is_active,
      project_id
    } = req.body;

    const updates = [];
    const values = [];

    if (teacher_name !== undefined) {
      updates.push('teacher_name = ?');
      values.push(teacher_name);
    }
    if (teacher_email !== undefined) {
      updates.push('teacher_email = ?');
      values.push(teacher_email);
    }
    if (teacher_phone !== undefined) {
      updates.push('teacher_phone = ?');
      values.push(teacher_phone);
    }
    if (max_submissions !== undefined) {
      updates.push('max_submissions = ?');
      values.push(max_submissions);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(is_active ? 1 : 0);
    }
    if (project_id !== undefined) {
      updates.push('project_id = ?');
      values.push(project_id || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    const result = await execute(
      `UPDATE teacher_data_links SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Teacher link not found'
      });
    }

    res.json({
      success: true,
      message: 'Teacher link updated successfully'
    });
  } catch (error) {
    console.error('Error updating teacher link:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// DELETE TEACHER LINK
// ============================================================================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await execute(
      'DELETE FROM teacher_data_links WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Teacher link not found'
      });
    }

    res.json({
      success: true,
      message: 'Teacher link deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting teacher link:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// GET SUBMISSIONS FOR A LINK
// ============================================================================
router.get('/:id/submissions', async (req, res) => {
  try {
    const { id } = req.params;

    const submissions = await getAll(
      'SELECT * FROM teacher_submissions WHERE link_id = ? ORDER BY submitted_at DESC',
      [id]
    );

    res.json({
      success: true,
      data: submissions || []
    });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// SUBMIT DATA FOR TEACHER LINK
// ============================================================================
router.post('/:token/submit', async (req, res) => {
  try {
    const { token } = req.params;
    const { submission_data } = req.body;

    // Get the link by token
    const link = await getOne('SELECT * FROM teacher_data_links WHERE token = ?', [token]);
    if (!link) {
      return res.status(404).json({
        success: false,
        error: 'Invalid teacher link'
      });
    }

    if (!link.is_active) {
      return res.status(403).json({
        success: false,
        error: 'This teacher link is no longer active'
      });
    }

    if (link.current_submissions >= link.max_submissions) {
      return res.status(403).json({
        success: false,
        error: 'This teacher link has reached its submission limit'
      });
    }

    // Create submission
    const now = new Date().toISOString();
    await execute(
      `INSERT INTO teacher_submissions 
       (link_id, submission_data, submitted_at, updated_at) 
       VALUES (?, ?, ?, ?)`,
      [link.id, JSON.stringify(submission_data), now, now]
    );

    // Increment submission count
    await execute(
      'UPDATE teacher_data_links SET current_submissions = current_submissions + 1 WHERE id = ?',
      [link.id]
    );

    res.json({
      success: true,
      message: 'Submission received successfully'
    });
  } catch (error) {
    console.error('Error submitting data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
