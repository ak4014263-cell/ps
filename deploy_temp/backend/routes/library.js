import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execute, query, getOne, getAll } from '../db.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'library');

// Ensure upload directories exist
['fonts', 'shapes', 'icons'].forEach(folder => {
    const dir = path.join(UPLOADS_DIR, folder);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Multer storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let folder = 'fonts';
        if (req.path.includes('shapes')) folder = 'shapes';
        if (req.path.includes('icons')) folder = 'icons';
        cb(null, path.join(UPLOADS_DIR, folder));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ storage });

// ============================================================================
// FONTS
// ============================================================================

router.get('/fonts', async (req, res) => {
    try {
        const { vendor_id } = req.query;
        // Get fonts for this vendor OR public fonts
        const fonts = await getAll(
            'SELECT * FROM library_fonts WHERE vendor_id = ? OR is_public = 1 ORDER BY created_at DESC',
            [vendor_id]
        );
        res.json(fonts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/fonts', upload.single('file'), async (req, res) => {
    try {
        const { name, is_public, vendor_id } = req.body;
        const file = req.file;
        if (!file) return res.status(400).json({ error: 'No file uploaded' });

        const id = uuidv4();
        const fontUrl = `http://localhost:3001/uploads/library/fonts/${file.filename}`;

        await execute(
            'INSERT INTO library_fonts (id, name, font_url, is_public, vendor_id) VALUES (?, ?, ?, ?, ?)',
            [id, name, fontUrl, is_public === 'true' ? 1 : 0, vendor_id]
        );

        res.json({ id, name, font_url: fontUrl });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/fonts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const font = await getOne('SELECT * FROM library_fonts WHERE id = ?', [id]);
        if (font) {
            // Try to delete file
            const filename = font.font_url.split('/').pop();
            const filePath = path.join(UPLOADS_DIR, 'fonts', filename);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        await execute('DELETE FROM library_fonts WHERE id = ?', [id]);
        res.json({ message: 'Font deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// SHAPES
// ============================================================================

router.get('/shapes', async (req, res) => {
    try {
        const { vendor_id } = req.query;
        const shapes = await getAll(
            'SELECT * FROM library_shapes WHERE vendor_id = ? OR is_public = 1 ORDER BY created_at DESC',
            [vendor_id]
        );
        res.json(shapes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/shapes', upload.single('file'), async (req, res) => {
    try {
        const { name, is_public, vendor_id } = req.body;
        const file = req.file;
        if (!file) return res.status(400).json({ error: 'No file uploaded' });

        const id = uuidv4();
        const shapeUrl = `http://localhost:3001/uploads/library/shapes/${file.filename}`;

        await execute(
            'INSERT INTO library_shapes (id, name, shape_url, is_public, vendor_id) VALUES (?, ?, ?, ?, ?)',
            [id, name, shapeUrl, is_public === 'true' ? 1 : 0, vendor_id]
        );

        res.json({ id, name, shape_url: shapeUrl });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/shapes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const shape = await getOne('SELECT * FROM library_shapes WHERE id = ?', [id]);
        if (shape) {
            const filename = shape.shape_url.split('/').pop();
            const filePath = path.join(UPLOADS_DIR, 'shapes', filename);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        await execute('DELETE FROM library_shapes WHERE id = ?', [id]);
        res.json({ message: 'Shape deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// ICONS
// ============================================================================

router.get('/icons', async (req, res) => {
    try {
        const { vendor_id } = req.query;
        const icons = await getAll(
            'SELECT * FROM library_icons WHERE vendor_id = ? OR is_public = 1 ORDER BY created_at DESC',
            [vendor_id]
        );
        res.json(icons);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/icons', upload.single('file'), async (req, res) => {
    try {
        const { name, is_public, vendor_id } = req.body;
        const file = req.file;
        if (!file) return res.status(400).json({ error: 'No file uploaded' });

        const id = uuidv4();
        const iconUrl = `http://localhost:3001/uploads/library/icons/${file.filename}`;

        await execute(
            'INSERT INTO library_icons (id, name, icon_url, is_public, vendor_id) VALUES (?, ?, ?, ?, ?)',
            [id, name, iconUrl, is_public === 'true' ? 1 : 0, vendor_id]
        );

        res.json({ id, name, icon_url: iconUrl });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/icons/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const icon = await getOne('SELECT * FROM library_icons WHERE id = ?', [id]);
        if (icon) {
            const filename = icon.icon_url.split('/').pop();
            const filePath = path.join(UPLOADS_DIR, 'icons', filename);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        await execute('DELETE FROM library_icons WHERE id = ?', [id]);
        res.json({ message: 'Icon deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
