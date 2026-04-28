/**
 * 错误处理中间件
 */

const { log } = require('../utils/logger');

function errorHandler(err, req, res, next) {
  log('❌ Error:', err.message);

  if (res.headersSent) {
    log('响应已发送，跳过错误处理');
    return next(err);
  }

  if (err.name === 'AbortError' || err.message?.includes('abort')) {
    return res.status(504).json({ error: '请求超时' });
  }

  if (err.message?.includes('fetch failed') || err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    return res.status(502).json({ error: '网络错误,无法连接到 AI 服务' });
  }

  res.status(500).json({ error: err.message });
}

module.exports = {
  errorHandler,
};
