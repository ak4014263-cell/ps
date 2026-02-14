import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getAll, execute } from '../db.js';

const router = express.Router();

// ============================================================================
// GET ALL FILES FOR A PROJECT
// ============================================================================

router.get('/project/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;
        const files = await getAll(
            'SELECT * FROM project_files WHERE project_id = ? ORDER BY created_at DESC',
            [projectId]
        );
        res.json({ success: true, count: files.length, data: files });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// ADD FILE METADATA
// ============================================================================

router.post('/', async (req, res) => {
    try {
        const {
            project_id,
            file_name,
            cloudinary_public_id,
            cloudinary_url,
            file_type,
            file_size
        } = req.body;

        if (!project_id || !cloudinary_public_id || !cloudinary_url) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        const id = uuidv4();
        await execute(
            `INSERT INTO project_files (id, project_id, file_name, cloudinary_public_id, cloudinary_url, file_type, file_size, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
            [id, project_id, file_name, cloudinary_public_id, cloudinary_url, file_type || null, file_size || null]
        );

        res.json({ success: true, id, message: 'File added successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// DELETE FILE
// ============================================================================

router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await execute('DELETE FROM project_files WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'File not found' });
        }

        res.json({ success: true, message: 'File deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
