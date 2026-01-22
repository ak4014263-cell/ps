import express from 'express';
import { getAll, getOne, execute } from '../db.js';

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
// UPDATE PRODUCT
// ============================================================================

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { product_name, product_code, description, category, price, cost, quantity_available, image_url } = req.body;

    console.log('🔄 UPDATE PRODUCT REQUEST:', { id, body: req.body });

    // Validate required fields
    if (!product_name) {
      return res.status(400).json({
        success: false,
        error: 'Product name is required',
        received: { product_name, product_code, description, category, price, cost, quantity_available, image_url },
      });
    }

    // Update the product
    const result = await execute(
      `UPDATE products SET 
        product_name = ?, 
        product_code = ?, 
        description = ?, 
        category = ?, 
        price = ?, 
        cost = ?, 
        quantity_available = ?, 
        image_url = ?,
        updated_at = NOW() 
       WHERE id = ?`,
      [product_name, product_code || null, description || null, category || null, price || 0, cost || 0, quantity_available || 0, image_url || null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }

    res.json({
      success: true,
      message: 'Product updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
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
      return res.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }

    res.json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
