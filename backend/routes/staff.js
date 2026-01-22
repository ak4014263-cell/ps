/**
 * Staff Management Routes
 * Handles staff creation, retrieval, and updates
 */

import express from 'express';
import crypto from 'crypto';
import { execute, getAll, getOne, query } from '../db.js';

const router = express.Router();

/**
 * POST /api/staff - Create new staff member
 * Body: { email, password, fullName, phone, role, vendorId }
 */
router.post('/', async (req, res) => {
  const { email, password, fullName, phone, role, vendorId } = req.body;

  if (!email || !password || !fullName || !role) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required fields: email, password, fullName, role' 
    });
  }

  try {
    // Check for duplicate email
    const existingProfile = await getOne(
      'SELECT id FROM profiles WHERE email = ?',
      [email]
    );
    if (existingProfile) {
      return res.status(400).json({
        success: false,
        error: 'Email already exists. Please use a different email address.'
      });
    }

    // 1. Create profile
    const profileId = crypto.randomUUID();
    const profileQuery = `
      INSERT INTO profiles (id, full_name, email, phone)
      VALUES (?, ?, ?, ?)
    `;
    await execute(profileQuery, [profileId, fullName, email, phone || null]);

    // 2. Hash password
    const passwordHash = crypto
      .createHash('sha256')
      .update(password)
      .digest('hex');

    // 3. Create user credentials
    const credQuery = `
      INSERT INTO user_credentials (user_id, password_hash)
      VALUES (?, ?)
    `;
    await execute(credQuery, [profileId, passwordHash]);

    // 4. Assign role
    const roleQuery = `
      INSERT INTO user_roles (user_id, role)
      VALUES (?, ?)
    `;
    await execute(roleQuery, [profileId, role]);

    // 5. If vendorId provided, create vendor_staff record
    if (vendorId) {
      const staffId = crypto.randomUUID();
      const vendorStaffQuery = `
        INSERT INTO vendor_staff (id, user_id, vendor_id, role)
        VALUES (?, ?, ?, ?)
      `;
      await execute(vendorStaffQuery, [staffId, profileId, vendorId, role]);
    }

    res.json({
      success: true,
      data: {
        id: profileId,
        email,
        fullName,
        phone,
        role,
        vendorId
      }
    });
  } catch (error) {
    console.error('Staff creation error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to create staff' 
    });
  }
});

/**
 * GET /api/staff - Get all staff (admin only)
 */
router.get('/', async (req, res) => {
  try {
    const queryStr = `
      SELECT 
        p.id,
        p.full_name,
        p.email,
        p.phone,
        ur.role,
        vs.vendor_id
      FROM profiles p
      LEFT JOIN user_roles ur ON p.id = ur.user_id
      LEFT JOIN vendor_staff vs ON p.id = vs.user_id
      WHERE ur.role IN ('vendor_staff', 'designer_staff', 'data_operator', 'sales_person', 'accounts_manager', 'production_manager')
      ORDER BY p.full_name
    `;
    const staff = await getAll(queryStr);
    res.json({
      success: true,
      count: staff.length,
      data: staff
    });
  } catch (error) {
    console.error('Staff fetch error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to fetch staff' 
    });
  }
});

/**
 * GET /api/staff/vendor/:vendorId - Get staff for specific vendor
 */
router.get('/vendor/:vendorId', async (req, res) => {
  const { vendorId } = req.params;

  try {
    const queryStr = `
      SELECT 
        p.id,
        p.full_name,
        p.email,
        p.phone,
        ur.role,
        vs.vendor_id
      FROM profiles p
      LEFT JOIN user_roles ur ON p.id = ur.user_id
      LEFT JOIN vendor_staff vs ON p.id = vs.user_id
      WHERE vs.vendor_id = ?
      ORDER BY p.full_name
    `;
    const staff = await getAll(queryStr, [vendorId]);
    res.json({
      success: true,
      count: staff.length,
      data: staff
    });
  } catch (error) {
    console.error('Vendor staff fetch error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to fetch vendor staff' 
    });
  }
});

/**
 * GET /api/staff/:id - Get specific staff member
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const queryStr = `
      SELECT 
        p.id,
        p.full_name,
        p.email,
        p.phone,
        ur.role,
        vs.vendor_id
      FROM profiles p
      LEFT JOIN user_roles ur ON p.id = ur.user_id
      LEFT JOIN vendor_staff vs ON p.id = vs.user_id
      WHERE p.id = ?
    `;
    const staff = await getOne(queryStr, [id]);
    
    if (!staff) {
      return res.status(404).json({ 
        success: false, 
        error: 'Staff not found' 
      });
    }

    res.json({
      success: true,
      data: staff
    });
  } catch (error) {
    console.error('Staff fetch error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to fetch staff' 
    });
  }
});

/**
 * PUT /api/staff/:id - Update staff member
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { fullName, phone, role, vendorId } = req.body;

  try {
    // Update profile
    if (fullName || phone !== undefined) {
      const profileQuery = `
        UPDATE profiles 
        SET full_name = COALESCE(?, full_name),
            phone = COALESCE(?, phone)
        WHERE id = ?
      `;
      await execute(profileQuery, [fullName || null, phone || null, id]);
    }

    // Update role
    if (role) {
      const roleQuery = `
        UPDATE user_roles 
        SET role = ?
        WHERE user_id = ?
      `;
      await execute(roleQuery, [role, id]);
    }

    // Update vendor staff if needed
    if (vendorId) {
      const checkQuery = `SELECT COUNT(*) as count FROM vendor_staff WHERE user_id = ?`;
      const [result] = await query(checkQuery, [id]);
      
      if (result.count > 0) {
        const updateQuery = `
          UPDATE vendor_staff 
          SET vendor_id = ?, role = COALESCE(?, role)
          WHERE user_id = ?
        `;
        await execute(updateQuery, [vendorId, role || null, id]);
      } else {
        const staffId = crypto.randomUUID();
        const insertQuery = `
          INSERT INTO vendor_staff (id, user_id, vendor_id, role)
          VALUES (?, ?, ?, ?)
        `;
        await execute(insertQuery, [staffId, id, vendorId, role]);
      }
    }

    res.json({
      success: true,
      data: { id }
    });
  } catch (error) {
    console.error('Staff update error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to update staff' 
    });
  }
});

/**
 * DELETE /api/staff/:id - Delete staff member
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Delete from user_roles
    await execute('DELETE FROM user_roles WHERE user_id = ?', [id]);

    // Delete from user_credentials
    await execute('DELETE FROM user_credentials WHERE user_id = ?', [id]);

    // Delete from vendor_staff
    await execute('DELETE FROM vendor_staff WHERE user_id = ?', [id]);

    // Delete profile
    await execute('DELETE FROM profiles WHERE id = ?', [id]);

    res.json({
      success: true,
      data: { id }
    });
  } catch (error) {
    console.error('Staff deletion error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to delete staff' 
    });
  }
});

export default router;
