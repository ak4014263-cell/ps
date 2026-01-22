import express from 'express';
import { testConnection } from '../db.js';

const router = express.Router();

// ============================================================================
// HEALTH CHECK
// ============================================================================

router.get('/', async (req, res) => {
  try {
    const dbHealthy = await testConnection();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: dbHealthy ? 'connected' : 'disconnected',
      uptime: process.uptime(),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

export default router;
