/**
 * AI 文生图 - Express 后端服务
 * 代理阿里云百炼 (DashScope) 文生图 API
 *
 * @copyright 2026 wenyinos. All rights reserved.
 * @license MIT
 * @see https://github.com/wenyinos/ai-image-generator
 */

const express = require('express');
const { PORT } = require('./src/utils/config');
const { setupCors } = require('./src/middleware/cors');
const { setupRateLimiter } = require('./src/middleware/rateLimiter');
const routes = require('./src/routes');

const app = express();

// Setup middleware
setupCors(app);
setupRateLimiter(app);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false }));

// Routes
app.use(routes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
