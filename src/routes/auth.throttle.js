/**
 * 访问认证节流控制
 */

const {
  ACCESS_AUTH_WINDOW_MS,
  ACCESS_AUTH_MAX_ATTEMPTS,
  ACCESS_AUTH_LOCK_MS,
} = require('../utils/config');

const accessAuthHits = new Map();

function getClientIp(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function checkAccessAuthThrottle(req) {
  const now = Date.now();
  const ip = getClientIp(req);
  const current = accessAuthHits.get(ip);
  if (!current) {
    const initial = { count: 0, resetAt: now + ACCESS_AUTH_WINDOW_MS, lockUntil: 0 };
    accessAuthHits.set(ip, initial);
    return { blocked: false, state: initial };
  }
  if (current.lockUntil && current.lockUntil > now) {
    return { blocked: true, retryAfterSec: Math.ceil((current.lockUntil - now) / 1000), state: current };
  }
  if (current.resetAt <= now) {
    current.count = 0;
    current.resetAt = now + ACCESS_AUTH_WINDOW_MS;
    current.lockUntil = 0;
  }
  return { blocked: false, state: current };
}

function markAccessAuthFailure(req) {
  const now = Date.now();
  const ip = getClientIp(req);
  const current = accessAuthHits.get(ip) || { count: 0, resetAt: now + ACCESS_AUTH_WINDOW_MS, lockUntil: 0 };
  if (current.resetAt <= now) {
    current.count = 0;
    current.resetAt = now + ACCESS_AUTH_WINDOW_MS;
    current.lockUntil = 0;
  }
  current.count += 1;
  if (current.count >= ACCESS_AUTH_MAX_ATTEMPTS) {
    current.lockUntil = now + ACCESS_AUTH_LOCK_MS;
    current.count = 0;
    current.resetAt = now + ACCESS_AUTH_WINDOW_MS;
  }
  accessAuthHits.set(ip, current);
  return current;
}

function clearAccessAuthFailure(req) {
  const ip = getClientIp(req);
  accessAuthHits.delete(ip);
}

module.exports = {
  checkAccessAuthThrottle,
  markAccessAuthFailure,
  clearAccessAuthFailure,
};
