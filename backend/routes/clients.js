import express from 'express';
import crypto from 'crypto';
import { getAll, getOne, execute } from '../db.js';

const router = express.Router();

// ============================================================================
// CREATE CLIENT
// ============================================================================

router.post('/', async (req, res) => {
  try {
    const {
      client_name,
      email,
      phone,
      company,
      address,
      city,
      state,
      postal_code,
      country,
      notes,
      company_logo,
      signature_logo,
      vendor_id,
      created_by,
      institution,
      contact,
      balance,
      credit_limit
    } = req.body;

    console.log('📋 Received create client request:', {
      client_name,
      email,
      phone,
      vendor_id,
      company_logo: company_logo ? `${company_logo.substring(0, 50)}...` : 'null',
      signature_logo: signature_logo ? `${signature_logo.substring(0, 50)}...` : 'null'
    });

    if (!client_name || !vendor_id) {
      return res.status(400).json({
        success: false,
        error: 'client_name and vendor_id are required'
      });
    }

    // Check for duplicate email
    if (email) {
      const existingClient = await getOne(
        'SELECT id FROM clients WHERE email = ? AND id != ?',
        [email, '']
      );
      if (existingClient) {
        return res.status(400).json({
          success: false,
          error: 'Email already exists. Please use a different email address.'
        });
      }
    }

    const clientId = crypto.randomUUID();
    
    const result = await execute(
      `INSERT INTO clients (
        id, client_name, email, phone, company, address, city, state,
        postal_code, country, company_logo, signature_logo, notes, vendor_id, created_by,
        institution, contact, balance, credit_limit
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        clientId,
        client_name,
        email || null,
        phone || null,
        company || null,
        address || null,
        city || null,
        state || null,
        postal_code || null,
        country || null,
        company_logo || null,
        signature_logo || null,
        notes || null,
        vendor_id,
        created_by || null,
        institution || null,
        contact || null,
        balance || 0,
        credit_limit || 0
      ]
    );

    console.log('✅ Client created successfully:', { clientId, affectedRows: result?.affectedRows });

    res.status(201).json({
      success: true,
      data: {
        id: clientId,
        client_name,
        vendor_id
      }
    });
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// UPDATE CLIENT
// ============================================================================

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const fields = [];
    const values = [];
    
    const allowedFields = [
      'client_name', 'email', 'phone', 'company',
      'address', 'city', 'state', 'postal_code', 'country', 'notes',
      'company_logo', 'signature_logo', 'balance', 'credit_limit',
      'institution', 'contact'
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
      `UPDATE clients SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }

    res.json({
      success: true,
      message: 'Client updated successfully'
    });
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// DELETE CLIENT
// ============================================================================

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await execute(
      'DELETE FROM clients WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }

    res.json({
      success: true,
      message: 'Client deleted successfully'
    });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// GET ALL CLIENTS
// ============================================================================

router.get('/', async (req, res) => {
  try {
    const clients = await getAll('SELECT * FROM clients LIMIT 100');
    res.json({
      success: true,
      count: clients.length,
      data: clients,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// GET CLIENT BY ID
// ============================================================================

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const client = await getOne('SELECT * FROM clients WHERE id = ?', [id]);
    
    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Client not found',
      });
    }

    res.json({
      success: true,
      data: client,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// GET CLIENTS BY VENDOR
// ============================================================================

router.get('/vendor/:vendorId', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const clients = await getAll(
      'SELECT * FROM clients WHERE vendor_id = ? LIMIT 50',
      [vendorId]
    );

    res.json({
      success: true,
      count: clients.length,
      data: clients,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// SEARCH CLIENTS BY NAME
// ============================================================================

router.get('/search/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const clients = await getAll(
      'SELECT * FROM clients WHERE client_name LIKE ? OR email LIKE ? LIMIT 20',
      [`%${name}%`, `%${name}%`]
    );

    res.json({
      success: true,
      count: clients.length,
      data: clients,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// CHECK DATABASE SCHEMA
// ============================================================================

router.get('/check/schema', async (req, res) => {
  try {
    const columns = await getAll(
      `SELECT COLUMN_NAME, COLUMN_TYPE FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clients'`
    );

    const hasCompanyLogo = columns.some(c => c.COLUMN_NAME === 'company_logo');
    const hasSignatureLogo = columns.some(c => c.COLUMN_NAME === 'signature_logo');

    res.json({
      success: true,
      data: {
        columns: columns.map(c => ({ name: c.COLUMN_NAME, type: c.COLUMN_TYPE })),
        hasCompanyLogo,
        hasSignatureLogo,
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
// FIX LOGO COLUMNS (increase size for base64 data)
// ============================================================================

router.post('/fix/logo-columns', async (req, res) => {
  try {
    console.log('🔧 Fixing logo columns to LONGTEXT...');
    
    // Modify columns to LONGTEXT for large base64 data
    await execute('ALTER TABLE clients MODIFY COLUMN company_logo LONGTEXT');
    console.log('✅ company_logo changed to LONGTEXT');
    
    await execute('ALTER TABLE clients MODIFY COLUMN signature_logo LONGTEXT');
    console.log('✅ signature_logo changed to LONGTEXT');

    res.json({
      success: true,
      message: 'Logo columns updated to LONGTEXT successfully',
    });
  } catch (error) {
    console.error('❌ Error fixing columns:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
