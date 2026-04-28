/**
 * URL 处理工具
 */

const { PUBLIC_BASE_URL } = require('./config');

function buildBaseUrl(req) {
  const configuredBaseUrl = PUBLIC_BASE_URL;
  if (configuredBaseUrl) {
    const normalizedBaseUrl = configuredBaseUrl.replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(normalizedBaseUrl)) {
      throw new Error('PUBLIC_BASE_URL must start with http:// or https://');
    }
    return normalizedBaseUrl;
  }

  const forwardedProto = typeof req.headers['x-forwarded-proto'] === 'string'
    ? req.headers['x-forwarded-proto'].split(',')[0].trim()
    : '';
  const protocol = forwardedProto || req.protocol || 'http';

  const forwardedHostHeader = typeof req.headers['x-forwarded-host'] === 'string'
    ? req.headers['x-forwarded-host'].split(',')[0].trim()
    : '';
  const forwardedHeader = typeof req.headers.forwarded === 'string'
    ? req.headers.forwarded
    : '';
  const forwardedHostMatch = forwardedHeader.match(/host=([^;,\s]+)/i);
  const forwardedHost = forwardedHostMatch ? forwardedHostMatch[1].replace(/^"|"$/g, '') : '';
  const host = forwardedHostHeader || forwardedHost || req.get('host');
  if (!host) {
    throw new Error('Cannot determine request host for public image URL');
  }
  const hostName = host.split(':')[0].toLowerCase();
  const isPrivateHost = (
    hostName === 'localhost' ||
    hostName === '127.0.0.1' ||
    hostName === '::1' ||
    hostName.endsWith('.local') ||
    /^10\./.test(hostName) ||
    /^192\.168\./.test(hostName) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostName)
  );
  if (isPrivateHost) {
    throw new Error('当前服务地址是本地/内网地址，火山引擎无法访问。请配置 PUBLIC_BASE_URL 为公网可访问地址。');
  }
  return `${protocol}://${host}`;
}

module.exports = {
  buildBaseUrl,
};
