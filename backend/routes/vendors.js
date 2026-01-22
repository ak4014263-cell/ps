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
    const vendors = await getAll('SELECT * FROM vendors LIMIT 100');
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
