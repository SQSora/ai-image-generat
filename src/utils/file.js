/**
 * 文件处理工具
 */

const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const {
  UPLOADS_DIR,
  UPLOADS_RELATIVE_DIR,
  MIME_EXTENSION_MAP,
  UPLOAD_FILE_CLEANUP_DELAY_MS,
} = require('./config');
const { log } = require('./logger');
const { buildBaseUrl } = require('./url');

async function saveUploadedImageAsPublicUrl(req, imageFile) {
  if (!imageFile?.buffer || !Buffer.isBuffer(imageFile.buffer)) {
    return { publicUrl: '', filePath: '' };
  }
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  const fileExt = MIME_EXTENSION_MAP[imageFile.mimetype] || '.png';
  const fileName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${fileExt}`;
  const filePath = path.join(UPLOADS_DIR, fileName);
  await fs.writeFile(filePath, imageFile.buffer);
  return {
    publicUrl: `${buildBaseUrl(req)}/${UPLOADS_RELATIVE_DIR}/${fileName}`,
    filePath,
  };
}

function scheduleUploadedFileCleanup(filePath, delayMs = UPLOAD_FILE_CLEANUP_DELAY_MS) {
  if (!filePath || typeof filePath !== 'string') return;
  const resolvedPath = path.resolve(filePath);
  const uploadsRoot = path.resolve(UPLOADS_DIR) + path.sep;
  if (!resolvedPath.startsWith(uploadsRoot)) return;

  const timer = setTimeout(async () => {
    try {
      await fs.unlink(resolvedPath);
      log(`🧹 已清理上传文件: ${resolvedPath}`);
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        console.error(`清理上传文件失败: ${resolvedPath}`, error);
      }
    }
  }, delayMs);
  if (typeof timer.unref === 'function') timer.unref();
}

module.exports = {
  saveUploadedImageAsPublicUrl,
  scheduleUploadedFileCleanup,
};
