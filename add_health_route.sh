#!/bin/bash
set -e
sed -i "/app.use('\\/api', apiLimiter);/a app.get('/api/health', (req, res) => res.json({ status: 'healthy', time: new Date() }));" /var/www/crystal-admin/backend/server.js