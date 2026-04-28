/**
 * 速率限制中间件
 */

const { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX } = require('../utils/config');

function createRateLimiter({ windowMs, max, keyGenerator }) {
  const hits = new Map();
  const getKey = typeof keyGenerator === 'function' ? keyGenerator : (req) => req.ip;

  return (req, res, next) => {
    const now = Date.now();
    const key = getKey(req);
    const current = hits.get(key);

    if (!current || current.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    current.count += 1;
    if (current.count > max) {
      const retryAfter = Math.ceil((current.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({ error: 'Too many requests, please try again later' });
    }

    return next();
  };
}

function setupRateLimiter(app) {
  if (Number.isFinite(RATE_LIMIT_WINDOW_MS) && Number.isFinite(RATE_LIMIT_MAX) && RATE_LIMIT_WINDOW_MS > 0 && RATE_LIMIT_MAX > 0) {
    app.use('/api/', createRateLimiter({ windowMs: RATE_LIMIT_WINDOW_MS, max: RATE_LIMIT_MAX }));
  }
}

module.exports = {
  createRateLimiter,
  setupRateLimiter,
};
