import express from 'express';
import { getAll, getOne } from '../db.js';

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

export default router;
