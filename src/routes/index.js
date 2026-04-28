/**
 * 路由聚合
 */

const express = require('express');
const router = express.Router();
const path = require('path');

const accessRoutes = require('./access.routes');
const generateRoutes = require('./generate.routes');
const imageToImageRoutes = require('./imageToImage.routes');
const { PUBLIC_DIR } = require('../utils/config');
const { accessControlMiddleware } = require('../middleware/auth');

// Static files
router.use(express.static(PUBLIC_DIR));

// Home
router.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// Access control routes
router.use('/', accessRoutes);

// API routes
router.use('/api', generateRoutes);
router.use('/api', imageToImageRoutes);

// Access control middleware (applied after routes)
router.use(accessControlMiddleware);

module.exports = router;
