/**
 * CORS 中间件
 */

const cors = require('cors');
const { CORS_ORIGIN } = require('../utils/config');

function setupCors(app) {
  const corsOriginsEnv = CORS_ORIGIN;
  const corsOrigins = corsOriginsEnv
    ? corsOriginsEnv.split(',').map(s => s.trim()).filter(Boolean)
    : null;

  app.use(cors({
    origin: (origin, callback) => {
      if (!corsOrigins || corsOrigins.length === 0) return callback(null, true);
      if (!origin) return callback(null, true);
      if (corsOrigins.includes('*')) return callback(null, true);
      return callback(null, corsOrigins.includes(origin));
    },
  }));
}

module.exports = {
  setupCors,
};
