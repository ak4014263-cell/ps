import express from 'express';
import { getAll, getOne, execute } from '../db.js';

const router = express.Router();

// ============================================================================
// GET ALL PROFILES
// ============================================================================

router.get('/', async (req, res) => {
  try {
    const profiles = await getAll('SELECT * FROM profiles LIMIT 100');
    res.json({
      success: true,
      count: profiles.length,
      data: profiles,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// GET PROFILE BY ID
// ============================================================================

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const profile = await getOne('SELECT * FROM profiles WHERE id = ?', [id]);

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found',
      });
    }

    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// SEARCH PROFILES BY EMAIL
// ============================================================================

router.get('/search/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const profiles = await getAll(
      'SELECT * FROM profiles WHERE email LIKE ? LIMIT 20',
      [`%${email}%`]
    );

    res.json({
      success: true,
      count: profiles.length,
      data: profiles,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// UPDATE PROFILE
// ============================================================================

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, phone, role, vendor_id, active } = req.body;

    const fields = [];
    const values = [];

    if (full_name !== undefined) { fields.push('full_name = ?'); values.push(full_name); }
    if (phone !== undefined) { fields.push('phone = ?'); values.push(phone); }
    if (role !== undefined) { fields.push('role = ?'); values.push(role); }
    if (vendor_id !== undefined) { fields.push('vendor_id = ?'); values.push(vendor_id); }
    if (active !== undefined) { fields.push('active = ?'); values.push(active); }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    values.push(id);
    const result = await execute(
      `UPDATE profiles SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
