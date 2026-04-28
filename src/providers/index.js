/**
 * 提供商工厂
 * 根据 provider 参数创建对应的 AI 提供商
 */

const dashscope = require('./dashscope');
const gemini = require('./gemini');
const volcengine = require('./volcengine');
const {
  GEMINI_API_KEY,
  GOOGLE_API_KEY,
  DASHSCOPE_API_KEY,
  VOLCENGINE_ACCESS_KEY,
  VOLCENGINE_SECRET_KEY,
  VOLCENGINE_SESSION_TOKEN,
} = require('../utils/config');

function normalizeProvider(provider) {
  if (provider === 'gemini') return 'gemini';
  if (provider === 'volcengine') return 'volcengine';
  return 'dashscope';
}

function getApiKey(provider, providedApiKey) {
  const trimmed = typeof providedApiKey === 'string' ? providedApiKey.trim() : '';
  if (trimmed) return trimmed;

  if (provider === 'gemini') {
    if (GEMINI_API_KEY) return GEMINI_API_KEY;
    const googleEnv = GOOGLE_API_KEY;
    return googleEnv || '';
  }

  const dashscopeEnv = DASHSCOPE_API_KEY;
  return dashscopeEnv || '';
}

function getVolcengineCredentials(providedApiKey) {
  return volcengine.parseCredentials(providedApiKey);
}

function createProvider(provider) {
  const normalized = normalizeProvider(provider);

  return {
    name: normalized,
    generateTextToImage: async (opts) => {
      if (normalized === 'gemini') {
        return gemini.generateTextToImage(opts);
      }
      if (normalized === 'volcengine') {
        return volcengine.generateTextToImage(opts);
      }
      return dashscope.generateTextToImage(opts);
    },
    generateImageToImage: async (opts) => {
      if (normalized === 'gemini') {
        return gemini.generateImageToImage(opts);
      }
      if (normalized === 'volcengine') {
        return volcengine.generateImageToImage(opts);
      }
      return dashscope.generateImageToImage(opts);
    },
    getModelNormalizer: () => {
      if (normalized === 'gemini') return gemini.normalizeModel;
      if (normalized === 'volcengine') return volcengine.normalizeModel;
      return (m) => m;
    },
  };
}

module.exports = {
  normalizeProvider,
  getApiKey,
  getVolcengineCredentials,
  createProvider,
};
