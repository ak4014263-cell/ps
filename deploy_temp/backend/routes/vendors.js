import express from 'express';
import crypto from 'crypto';
import { getAll, getOne, execute } from '../db.js';

const router = express.Router();

// ============================================================================
// CREATE VENDOR
// ============================================================================

router.post('/', async (req, res) => {
  try {
    const {
      business_name,
      email,
      phone,
      address,
      city,
      state,
      postal_code,
      country,
      description,
      website,
      business_registration,
      tax_id,
    } = req.body;

    if (!business_name || !email) {
      return res.status(400).json({
        success: false,
        error: 'business_name and email are required',
      });
    }

    // Check for duplicate email
    const existingVendor = await getOne(
      'SELECT id FROM vendors WHERE email = ?',
      [email]
    );
    if (existingVendor) {
      return res.status(400).json({
        success: false,
        error: 'Email already exists. Please use a different email address.'
      });
    }

    const vendorId = crypto.randomUUID();

    await execute(
      `INSERT INTO vendors (
        id, business_name, email, phone, address, city, state, postal_code, country,
        description, website, business_registration, tax_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        vendorId,
        business_name,
        email,
        phone || null,
        address || null,
        city || null,
        state || null,
        postal_code || null,
        country || null,
        description || null,
        website || null,
        business_registration || null,
        tax_id || null,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Vendor created successfully',
      data: { id: vendorId },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// GET ALL VENDORS
// ============================================================================

router.get('/', async (req, res) => {
  try {
    const { keyword } = req.query;
    let sql = `
      SELECT v.*, p.full_name as profile_name, p.email as profile_email
      FROM vendors v
      LEFT JOIN profiles p ON v.user_id = p.id
    `;
    const params = [];

    if (keyword) {
      sql += ' WHERE v.business_name LIKE ? OR p.full_name LIKE ? OR p.email LIKE ?';
      const search = `%${keyword}%`;
      params.push(search, search, search);
    }

    sql += ' ORDER BY v.created_at DESC LIMIT 100';

    const vendors = await getAll(sql, params);

    // Transform to match expected format if needed
    const transformed = vendors.map(v => ({
      ...v,
      profile: v.profile_name ? {
        full_name: v.profile_name,
        email: v.profile_email
      } : null
    }));

    res.json({
      success: true,
      count: transformed.length,
      data: transformed,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// GET SUB-VENDORS
// ============================================================================

router.get('/:id/sub-vendors', async (req, res) => {
  try {
    const { id } = req.params;
    const subVendors = await getAll(
      'SELECT id, business_name, active, wallet_balance, created_at FROM vendors WHERE parent_vendor_id = ? ORDER BY created_at DESC',
      [id]
    );

    res.json({
      success: true,
      count: subVendors.length,
      data: subVendors,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// GET VENDOR BY ID
// ============================================================================

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const vendor = await getOne('SELECT * FROM vendors WHERE id = ?', [id]);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: 'Vendor not found',
      });
    }

    res.json({
      success: true,
      data: vendor,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// GET VENDOR BY USER ID
// ============================================================================

router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const vendor = await getOne('SELECT * FROM vendors WHERE user_id = ?', [userId]);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: 'Vendor not found for this user',
      });
    }

    res.json({
      success: true,
      data: vendor,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// GET VENDOR WITH PRODUCTS
// ============================================================================

router.get('/:id/products', async (req, res) => {
  try {
    const { id } = req.params;

    const vendor = await getOne('SELECT * FROM vendors WHERE id = ?', [id]);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: 'Vendor not found',
      });
    }

    const products = await getAll(
      'SELECT * FROM products WHERE vendor_id = ? LIMIT 50',
      [id]
    );

    res.json({
      success: true,
      data: {
        vendor,
        products,
        productCount: products.length,
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
// BULK UPDATE VENDORS
// ============================================================================

router.post('/bulk-update', async (req, res) => {
  try {
    const { ids, data } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'Ids array is required' });
    }

    const fields = [];
    const values = [];

    const allowedFields = ['active', 'is_master', 'commission_percentage'];
    for (const field of allowedFields) {
      if (field in data) {
        fields.push(`${field} = ?`);
        values.push(data[field]);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields to update' });
    }

    // MySQL doesn't support UPDATE ... IN (...) with placeholders easily for multiple fields
    // But we can use WHERE id IN (?, ?, ...)
    const placeholders = ids.map(() => '?').join(', ');
    const query = `UPDATE vendors SET ${fields.join(', ')} WHERE id IN (${placeholders})`;

    await execute(query, [...values, ...ids]);

    res.json({ success: true, message: `Updated ${ids.length} vendors` });
  } catch (error) {
    console.error('Bulk update vendor error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// UPDATE VENDOR
// ============================================================================

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const fields = [];
    const values = [];

    const allowedFields = [
      'business_name', 'email', 'phone', 'address', 'city', 'state',
      'pincode', 'gstin', 'active', 'is_master', 'wallet_balance',
      'credit_limit', 'commission_percentage', 'parent_vendor_id'
    ];

    for (const field of allowedFields) {
      if (field in updates) {
        fields.push(`${field} = ?`);
        values.push(updates[field]);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    values.push(id);
    const result = await execute(
      `UPDATE vendors SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Vendor not found' });
    }

    res.json({ success: true, message: 'Vendor updated successfully' });
  } catch (error) {
    console.error('Update vendor error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// DELETE VENDOR
// ============================================================================

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await execute('DELETE FROM vendors WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Vendor not found' });
    }

    res.json({ success: true, message: 'Vendor deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// SEARCH VENDORS BY NAME
// ============================================================================

router.get('/search/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const vendors = await getAll(
      'SELECT * FROM vendors WHERE business_name LIKE ? LIMIT 20',
      [`%${name}%`]
    );

    res.json({
      success: true,
      count: vendors.length,
      data: vendors,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
