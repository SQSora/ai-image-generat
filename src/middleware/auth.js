/**
 * 访问控制中间件
 */

const {
  FRONTEND_ACCESS_CONTROL_ENABLED,
  FRONTEND_ACCESS_KEY,
  ACCESS_COOKIE_NAME,
  UPLOADS_RELATIVE_DIR,
} = require('../utils/config');
const { buildAccessCookieValue } = require('../utils/crypto');

function parseCookies(req) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader || typeof cookieHeader !== 'string') return {};
  return cookieHeader.split(';').reduce((acc, item) => {
    const [rawKey, ...rest] = item.split('=');
    const key = rawKey ? rawKey.trim() : '';
    if (!key) return acc;
    acc[key] = decodeURIComponent(rest.join('=').trim());
    return acc;
  }, {});
}

function isAccessAuthorized(req) {
  if (!FRONTEND_ACCESS_CONTROL_ENABLED) return true;
  if (!FRONTEND_ACCESS_KEY) return true;
  const cookies = parseCookies(req);
  return cookies[ACCESS_COOKIE_NAME] === buildAccessCookieValue();
}

function setAccessCookie(res) {
  const maxAge = 7 * 24 * 60 * 60;
  const secureAttr = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${ACCESS_COOKIE_NAME}=${buildAccessCookieValue()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secureAttr}`);
}

function clearAccessCookie(res) {
  const secureAttr = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${ACCESS_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureAttr}`);
}

function accessControlMiddleware(req, res, next) {
  if (!FRONTEND_ACCESS_CONTROL_ENABLED || !FRONTEND_ACCESS_KEY) return next();
  if (req.path === '/unlock' || req.path === '/api/access-auth' || req.path === '/api/access-logout') return next();
  if (req.path.startsWith(`/${UPLOADS_RELATIVE_DIR}/`)) return next();
  if (isAccessAuthorized(req)) return next();

  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Unauthorized: 需要访问密钥' });
  }
  return res.redirect('/unlock');
}

module.exports = {
  isAccessAuthorized,
  setAccessCookie,
  clearAccessCookie,
  accessControlMiddleware,
};
