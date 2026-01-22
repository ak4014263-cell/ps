/**
 * Rate Limiting Middleware for Multivendor System
 * In-memory implementation for development
 */
import rateLimit from 'express-rate-limit';
import { MemoryStore } from './memoryStore.js';

const store = new MemoryStore();

console.log('[RateLimit] Using in-memory rate limiter store');

/**
 * Global rate limiter: 10000 requests per 15 minutes (development)
 * Production should be 100 requests per 15 minutes
 */
export const globalLimiter = rateLimit({
  store: store,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // Much higher for development
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Image processing limiter: 500 requests per 15 minutes per vendor (development)
 * Production should be 50 requests per 15 minutes
 */
export const imageProcessingLimiter = rateLimit({
  store: store,
  windowMs: 15 * 60 * 1000,
  max: 500, // Higher for development
  keyGenerator: (req) => {
    return `img-${req.user?.vendorId || req.ip}`;
  },
  message: 'Too many image processing requests, please try again later.',
  skip: (req) => !req.path.includes('/image') && !req.path.includes('/remove-bg'),
});

/**
 * Background removal specific limiter: 300 requests per hour per vendor (development)
 * Production should be 30 requests per hour
 */
export const bgRemovalLimiter = rateLimit({
  store: store,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 300, // Higher for development
  keyGenerator: (req) => {
    return `bg-${req.user?.vendorId || req.ip}`;
  },
  message: 'Background removal limit reached. Please try again in 1 hour.',
  skip: (req) => !req.path.includes('/remove-bg'),
});

/**
 * Bulk operation limiter: 100 bulk operations per hour per vendor (development)
 * Production should be 10 requests per hour
 */
export const bulkOperationLimiter = rateLimit({
  store: store,
  windowMs: 60 * 60 * 1000,
  max: 100, // Higher for development
  keyGenerator: (req) => {
    return `bulk-${req.user?.vendorId || req.ip}`;
  },
  message: 'Too many bulk operations, please try again later.',
  skip: (req) => !req.path.includes('/bulk'),
});

/**
 * Setup all rate limiters on app
 */
export function setupRateLimiters(app) {
  // Apply global limiter to all routes
  app.use(globalLimiter);

  // Apply specific limiters to endpoints
  app.use('/api/image', imageProcessingLimiter);
  app.use('/api/data-records/remove-bg', bgRemovalLimiter);
  app.use('/api/data-records/bulk', bulkOperationLimiter);

  console.log('[RateLimit] ✅ Rate limiters configured');
}

/**
 * Get rate limit status for a vendor
 */
export function getRateLimitStatus(vendorId) {
  return {
    global: 0,
    imageProcessing: 0,
    backgroundRemoval: 0,
    bulkOperations: 0,
  };
}

export default {
  globalLimiter,
  imageProcessingLimiter,
  bgRemovalLimiter,
  bulkOperationLimiter,
  setupRateLimiters,
  getRateLimitStatus,
};
