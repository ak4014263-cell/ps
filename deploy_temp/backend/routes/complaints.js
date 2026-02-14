import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getAll, getOne, execute } from '../db.js';

const router = express.Router();

// ============================================================================
// CREATE COMPLAINT
// ============================================================================

router.post('/', async (req, res) => {
    try {
        const { title, description, priority, client_id, vendor_id, project_id } = req.body;

        if (!title || !description || !client_id || !vendor_id) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        const id = uuidv4();
        await execute(
            `INSERT INTO complaints (id, title, description, priority, client_id, vendor_id, project_id, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [id, title, description, priority || 'medium', client_id, vendor_id, project_id || null, 'open']
        );

        res.json({ success: true, id, message: 'Complaint created successfully' });
    } catch (error) {
        console.error('Create complaint error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// GET ALL COMPLAINTS
// ============================================================================

router.get('/', async (req, res) => {
    try {
        const { vendor_id, client_id, status, keyword } = req.query;

        let sql = `
      SELECT c.*, cl.institution_name as client_name, v.business_name as vendor_name, p.project_number
      FROM complaints c
      LEFT JOIN clients cl ON c.client_id = cl.id
      LEFT JOIN vendors v ON c.vendor_id = v.id
      LEFT JOIN projects p ON c.project_id = p.id
    `;

        const params = [];
        const where = [];

        if (vendor_id) {
            where.push('c.vendor_id = ?');
            params.push(vendor_id);
        }
        if (client_id) {
            where.push('c.client_id = ?');
            params.push(client_id);
        }
        if (status) {
            where.push('c.status = ?');
            params.push(status);
        }
        if (keyword) {
            where.push('(c.title LIKE ? OR c.description LIKE ?)');
            params.push(`%${keyword}%`);
            params.push(`%${keyword}%`);
        }

        if (where.length > 0) {
            sql += ' WHERE ' + where.join(' AND ');
        }

        sql += ' ORDER BY c.created_at DESC LIMIT 100';

        const complaints = await getAll(sql, params);
        res.json({ success: true, count: complaints.length, data: complaints });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// UPDATE COMPLAINT STATUS
// ============================================================================

router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, resolution_notes } = req.body;

        const result = await execute(
            'UPDATE complaints SET status = ?, resolution_notes = ?, updated_at = NOW() WHERE id = ?',
            [status, resolution_notes || null, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Complaint not found' });
        }

        res.json({ success: true, message: 'Complaint updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
