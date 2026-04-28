/**
 * 环境变量配置
 * 集中管理所有 process.env 读取
 */

require('dotenv').config();

// Server
const PORT = process.env.PORT || 3000;
const DEBUG = process.env.DEBUG === '1' || process.env.DEBUG === 'true';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Paths
const PATH = require('path');
const PUBLIC_DIR = PATH.join(__dirname, '../../public');
const UPLOADS_RELATIVE_DIR = 'uploads';
const UPLOADS_DIR = PATH.join(PUBLIC_DIR, UPLOADS_RELATIVE_DIR);
const UPLOAD_FILE_CLEANUP_DELAY_MS = 5 * 60 * 1000;

// Frontend Access Control
const FRONTEND_ACCESS_CONTROL_ENABLED = process.env.FRONTEND_ACCESS_CONTROL_ENABLED === '1' || process.env.FRONTEND_ACCESS_CONTROL_ENABLED === 'true';
const FRONTEND_ACCESS_KEY = typeof process.env.FRONTEND_ACCESS_KEY === 'string' ? process.env.FRONTEND_ACCESS_KEY.trim() : '';
const ACCESS_COOKIE_NAME = 'access_auth';
const ACCESS_AUTH_WINDOW_MS = Number.parseInt(process.env.ACCESS_AUTH_WINDOW_MS || '300000', 10);
const ACCESS_AUTH_MAX_ATTEMPTS = Number.parseInt(process.env.ACCESS_AUTH_MAX_ATTEMPTS || '8', 10);
const ACCESS_AUTH_LOCK_MS = Number.parseInt(process.env.ACCESS_AUTH_LOCK_MS || '900000', 10);
const ACCESS_COOKIE_SECRET = process.env.ACCESS_COOKIE_SECRET || `${process.pid}-${Date.now()}`;

// MIME types for file uploads
const MIME_EXTENSION_MAP = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/bmp': '.bmp',
};

// DashScope
const DASHSCOPE_BASE_URL = 'https://dashscope.aliyuncs.com/api/v1';
const DASHSCOPE_API_KEY = typeof process.env.DASHSCOPE_API_KEY === 'string' ? process.env.DASHSCOPE_API_KEY.trim() : '';
const DASHSCOPE_TIMEOUT_MS = Number.parseInt(process.env.DASHSCOPE_TIMEOUT_MS || '120000', 10);

// Gemini
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash-image';
const GEMINI_API_KEY = typeof process.env.GEMINI_API_KEY === 'string' ? process.env.GEMINI_API_KEY.trim() : '';
const GOOGLE_API_KEY = typeof process.env.GOOGLE_API_KEY === 'string' ? process.env.GOOGLE_API_KEY.trim() : '';
const GEMINI_TIMEOUT_MS = Number.parseInt(process.env.GEMINI_TIMEOUT_MS || '180000', 10);

// Volcengine
const VOLCENGINE_HOST = process.env.VOLCENGINE_HOST || 'visual.volcengineapi.com';
const VOLCENGINE_REGION = process.env.VOLCENGINE_REGION || 'cn-north-1';
const VOLCENGINE_SERVICE = process.env.VOLCENGINE_SERVICE || 'cv';
const VOLCENGINE_VERSION = '2022-08-31';
const VOLCENGINE_ACCESS_KEY = typeof process.env.VOLCENGINE_ACCESS_KEY === 'string' ? process.env.VOLCENGINE_ACCESS_KEY.trim() : '';
const VOLCENGINE_SECRET_KEY = typeof process.env.VOLCENGINE_SECRET_KEY === 'string' ? process.env.VOLCENGINE_SECRET_KEY.trim() : '';
const VOLCENGINE_SESSION_TOKEN = typeof process.env.VOLCENGINE_SESSION_TOKEN === 'string' ? process.env.VOLCENGINE_SESSION_TOKEN.trim() : '';
const VOLCENGINE_TIMEOUT_MS = Number.parseInt(process.env.VOLCENGINE_TIMEOUT_MS || '120000', 10);
const VOLCENGINE_MAX_POLL_ATTEMPTS = Number.parseInt(process.env.VOLCENGINE_MAX_POLL_ATTEMPTS || '90', 10);
const VOLCENGINE_POLL_INTERVAL_MS = Number.parseInt(process.env.VOLCENGINE_POLL_INTERVAL_MS || '2000', 10);

// Volcengine Model Aliases
const VOLCENGINE_MODEL_ALIASES = {
  'jimeng-3.0': process.env.VOLCENGINE_JIMENG_30_REQ_KEY || 'jimeng_t2i_v30',
  'jimeng-3.1': process.env.VOLCENGINE_JIMENG_31_REQ_KEY || 'jimeng_t2i_v31',
  'jimeng-3.0-i2i': process.env.VOLCENGINE_JIMENG_I2I_30_REQ_KEY || 'jimeng_i2i_v30',
  'jimeng-material-pod': process.env.VOLCENGINE_JIMENG_MATERIAL_POD_REQ_KEY || 'i2i_material_extraction',
  'jimeng-material-product': process.env.VOLCENGINE_JIMENG_MATERIAL_PRODUCT_REQ_KEY || 'jimeng_i2i_extract_tiled_images',
  'jimeng-upscale': process.env.VOLCENGINE_JIMENG_UPSCALE_REQ_KEY || 'jimeng_i2i_seed3_tilesr_cvtob',
  'jimeng-inpainting': process.env.VOLCENGINE_JIMENG_INPAINT_REQ_KEY || 'jimeng_image2image_dream_inpaint',
  'jimeng-4.0': process.env.VOLCENGINE_JIMENG_40_REQ_KEY || 'jimeng_t2i_v40',
  'jimeng-4.6': process.env.VOLCENGINE_JIMENG_46_REQ_KEY || 'jimeng_seedream46_cvtob',
};

// Gemini Model Aliases
const GEMINI_MODEL_ALIASES = {
  'gemini-2.5-flash-preview-image': 'gemini-2.5-flash-image',
};

// Sync models (use synchronous API)
const SYNC_MODELS = new Set([
  'wan2.7-image-pro',
  'wan2.7-image',
  'wan2.6-image',
  'qwen-image-2.0-pro',
  'qwen-image-2.0',
]);

// API Endpoints
const SYNC_ENDPOINT = '/services/aigc/multimodal-generation/generation';
const ASYNC_ENDPOINT = '/services/aigc/text2image/image-synthesis';
const TASK_ENDPOINT = '/tasks/';

// Model default configs
const MODEL_CONFIG = {
  'wan2.7-image-pro': { size: '2K', type: 'wan' },
  'wan2.7-image': { size: '2K', type: 'wan' },
  'wan2.6-image': { size: '1024*1024', type: 'wan' },
  'wan2.6-t2i': { size: '1280*1280', type: 'wan' },
  'wan2.5-t2i-preview': { size: '1280*1280', type: 'wan' },
  'wan2.2-t2i-flash': { size: '1024*1024', type: 'wan' },
  'wan2.2-t2i-plus': { size: '1024*1024', type: 'wan' },
  'wanx2.1-t2i-turbo': { size: '1024*1024', type: 'wan' },
  'wanx2.1-t2i-plus': { size: '1024*1024', type: 'wan' },
  'wanx2.0-t2i-turbo': { size: '1024*1024', type: 'wan' },
  'qwen-image-2.0-pro': { size: '2048*2048', type: 'qwen' },
  'qwen-image-2.0': { size: '2048*2048', type: 'qwen' },
  'qwen-image-max': { size: '1664*928', type: 'qwen' },
  'qwen-image-plus': { size: '1664*928', type: 'qwen' },
  'qwen-image': { size: '1664*928', type: 'qwen' },
  'z-image-turbo': { size: '1024*1024', type: 'wan' },
};

// Allowed sizes per model
const ALLOWED_SIZES_BY_MODEL = {
  'wan2.7-image-pro': ['1K', '2K', '4K'],
  'wan2.7-image': ['1K', '2K'],
  'wan2.6-image': ['1024*1024', '1280*1280', '1024*768', '768*1024', '1280*720', '720*1280'],
  'wan2.6-t2i': ['1024*1024', '1280*1280', '1024*768', '768*1024', '1280*720', '720*1280'],
  'wan2.5-t2i-preview': ['1024*1024', '1280*1280', '1024*768', '768*1024', '1280*720', '720*1280'],
  'wan2.2-t2i-flash': ['1024*1024', '1024*768', '768*1024', '1280*720', '720*1280'],
  'wan2.2-t2i-plus': ['1024*1024', '1024*768', '768*1024', '1280*720', '720*1280'],
  'wanx2.1-t2i-turbo': ['1024*1024', '1024*768', '768*1024', '1280*720', '720*1280'],
  'wanx2.1-t2i-plus': ['1024*1024', '1024*768', '768*1024', '1280*720', '720*1280'],
  'wanx2.0-t2i-turbo': ['1024*1024', '1024*768', '768*1024', '1280*720', '720*1280'],
  'qwen-image-2.0-pro': ['1024*1024', '2048*2048', '1664*928', '928*1664', '1472*1104', '1104*1472'],
  'qwen-image-2.0': ['1024*1024', '2048*2048', '1664*928', '928*1664', '1472*1104', '1104*1472'],
  'qwen-image-max': ['1664*928', '928*1664', '1328*1328', '1472*1104', '1104*1472', '1024*1024'],
  'qwen-image-plus': ['1664*928', '928*1664', '1328*1328', '1472*1104', '1104*1472', '1024*1024'],
  'qwen-image': ['1664*928', '928*1664', '1328*1328', '1472*1104', '1104*1472', '1024*1024'],
  'z-image-turbo': ['1024*1024', '1024*768', '768*1024', '1280*720', '720*1280'],
};

// Rate Limiting
const RATE_LIMIT_WINDOW_MS = Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
const RATE_LIMIT_MAX = Number.parseInt(process.env.RATE_LIMIT_MAX || '30', 10);

// CORS
const CORS_ORIGIN = process.env.CORS_ORIGIN;

// Public Base URL
const PUBLIC_BASE_URL = typeof process.env.PUBLIC_BASE_URL === 'string' ? process.env.PUBLIC_BASE_URL.trim() : '';

module.exports = {
  PORT,
  DEBUG,
  NODE_ENV,
  PUBLIC_DIR,
  UPLOADS_RELATIVE_DIR,
  UPLOADS_DIR,
  UPLOAD_FILE_CLEANUP_DELAY_MS,
  MIME_EXTENSION_MAP,
  FRONTEND_ACCESS_CONTROL_ENABLED,
  FRONTEND_ACCESS_KEY,
  ACCESS_COOKIE_NAME,
  ACCESS_AUTH_WINDOW_MS,
  ACCESS_AUTH_MAX_ATTEMPTS,
  ACCESS_AUTH_LOCK_MS,
  ACCESS_COOKIE_SECRET,
  DASHSCOPE_BASE_URL,
  DASHSCOPE_API_KEY,
  DASHSCOPE_TIMEOUT_MS,
  GEMINI_BASE_URL,
  GEMINI_DEFAULT_MODEL,
  GEMINI_API_KEY,
  GOOGLE_API_KEY,
  GEMINI_TIMEOUT_MS,
  GEMINI_MODEL_ALIASES,
  VOLCENGINE_HOST,
  VOLCENGINE_REGION,
  VOLCENGINE_SERVICE,
  VOLCENGINE_VERSION,
  VOLCENGINE_ACCESS_KEY,
  VOLCENGINE_SECRET_KEY,
  VOLCENGINE_SESSION_TOKEN,
  VOLCENGINE_TIMEOUT_MS,
  VOLCENGINE_MAX_POLL_ATTEMPTS,
  VOLCENGINE_POLL_INTERVAL_MS,
  VOLCENGINE_MODEL_ALIASES,
  SYNC_MODELS,
  SYNC_ENDPOINT,
  ASYNC_ENDPOINT,
  TASK_ENDPOINT,
  MODEL_CONFIG,
  ALLOWED_SIZES_BY_MODEL,
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX,
  CORS_ORIGIN,
  PUBLIC_BASE_URL,
};
