import express from 'express';
import { getAll, getOne, execute } from '../db.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// ============================================================================
// GET ALL PRODUCTS
// ============================================================================

router.get('/', async (req, res) => {
  try {
    const { vendor_id } = req.query;

    let query = 'SELECT * FROM products';
    let params = [];

    if (vendor_id) {
      query += ' WHERE vendor_id = ?';
      params.push(vendor_id);
    }

    query += ' LIMIT 100';

    const products = await getAll(query, params);
    res.json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// GET PRODUCTS BY VENDOR
// ============================================================================

router.get('/vendor/:vendor_id', async (req, res) => {
  try {
    const { vendor_id } = req.params;
    const products = await getAll(
      'SELECT * FROM products WHERE vendor_id = ? LIMIT 100',
      [vendor_id]
    );

    res.json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// GET PRODUCTS BY CATEGORY (specific route before parameterized)
// ============================================================================

router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const products = await getAll(
      'SELECT * FROM products WHERE category = ? LIMIT 100',
      [category]
    );

    res.json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// GET PRODUCTS BY VENDOR (specific route before parameterized)
// ============================================================================

router.get('/vendor/:vendorId', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const products = await getAll(
      'SELECT * FROM products WHERE vendor_id = ? ORDER BY product_name LIMIT 100',
      [vendorId]
    );

    res.json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// SEARCH PRODUCTS (specific route before parameterized)
// ============================================================================

router.get('/search/:searchQuery', async (req, res) => {
  try {
    const { searchQuery } = req.params;
    const products = await getAll(
      'SELECT * FROM products WHERE product_name LIKE ? OR product_code LIKE ? OR description LIKE ? LIMIT 50',
      [`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`]
    );

    res.json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// GET PRODUCT BY ID (generic route after specific ones)
// ============================================================================

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const product = await getOne('SELECT * FROM products WHERE id = ?', [id]);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// CREATE PRODUCT
// ============================================================================

router.post('/', async (req, res) => {
  try {
    const { name, category, description, base_price, default_width_mm, default_height_mm, active, vendor_id } = req.body;

    if (!name || !category || isNaN(parseFloat(base_price))) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const id = uuidv4();
    await execute(
      `INSERT INTO products (id, name, category, description, base_price, default_width_mm, default_height_mm, active, vendor_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, category, description || null, base_price, default_width_mm || null, default_height_mm || null, active ? 1 : 0, vendor_id || null]
    );

    res.json({ success: true, id, message: 'Product created successfully' });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// BULK CREATE PRODUCTS
// ============================================================================

router.post('/bulk', async (req, res) => {
  try {
    const { products } = req.body;
    if (!products || !Array.isArray(products)) {
      return res.status(400).json({ success: false, error: 'Missing products array' });
    }

    for (const p of products) {
      const id = uuidv4();
      await execute(
        `INSERT INTO products (id, name, category, description, base_price, default_width_mm, default_height_mm, active, vendor_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, p.name, p.category, p.description || null, p.base_price, p.default_width_mm || null, p.default_height_mm || null, p.active ? 1 : 0, p.vendor_id || null]
      );
    }

    res.json({ success: true, message: `Imported ${products.length} products` });
  } catch (error) {
    console.error('Bulk create product error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// UPDATE PRODUCT
// ============================================================================

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, description, base_price, default_width_mm, default_height_mm, active } = req.body;

    const result = await execute(
      `UPDATE products SET 
        name = ?, 
        category = ?, 
        description = ?, 
        base_price = ?, 
        default_width_mm = ?, 
        default_height_mm = ?, 
        active = ?,
        updated_at = NOW() 
       WHERE id = ?`,
      [name, category, description || null, base_price, default_width_mm || null, default_height_mm || null, active ? 1 : 0, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    res.json({ success: true, message: 'Product updated successfully' });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// DELETE PRODUCT
// ============================================================================

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await execute('DELETE FROM products WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
