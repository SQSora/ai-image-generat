/**
 * 图生图路由
 * POST /api/image-to-image
 */

const express = require('express');
const router = express.Router();
const { createProvider, normalizeProvider, getApiKey, getVolcengineCredentials } = require('../providers');
const { MODEL_CONFIG, ALLOWED_SIZES_BY_MODEL } = require('../utils/config');
const { log } = require('../utils/logger');
const { upload, handleMulterError } = require('../middleware/upload');
const { saveUploadedImageAsPublicUrl, scheduleUploadedFileCleanup } = require('../utils/file');
const { buildBaseUrl } = require('../utils/url');

function validateIntegerInRange(name, value, min, max) {
  if (!Number.isInteger(value)) return `${name} must be an integer`;
  if (value < min || value > max) return `${name} must be between ${min} and ${max}`;
  return null;
}

function validateStringMaxLen(name, value, maxLen) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return `${name} must be a string`;
  if (value.length > maxLen) return `${name} is too long (max ${maxLen})`;
  return null;
}

function validateSize(model, size) {
  const allowed = ALLOWED_SIZES_BY_MODEL[model];
  if (!allowed) return null;
  if (!allowed.includes(size)) {
    return `Invalid size for model ${model}. Allowed: ${allowed.join(', ')}`;
  }
  return null;
}

function parseImageUrlsInput(rawValue) {
  const isAllowedImageRef = (value) => /^https?:\/\//i.test(value);
  if (Array.isArray(rawValue)) {
    return rawValue.map(v => (typeof v === 'string' ? v.trim() : '')).filter(v => isAllowedImageRef(v));
  }
  if (typeof rawValue !== 'string') return [];
  return rawValue.split(/[\n,\s]+/).map(v => v.trim()).filter(v => isAllowedImageRef(v));
}

function parseSizeToArea(size) {
  if (size === undefined || size === null) return undefined;
  if (typeof size === 'number' && Number.isInteger(size) && size > 0) return size;
  if (typeof size !== 'string') return undefined;
  const normalized = size.trim().toUpperCase();
  const preset = { '1K': 1024 * 1024, '2K': 2048 * 2048, '4K': 4096 * 4096 };
  if (preset[normalized]) return preset[normalized];
  const matched = normalized.match(/^(\d+)\*(\d+)$/);
  if (!matched) return undefined;
  const width = Number.parseInt(matched[1], 10);
  const height = Number.parseInt(matched[2], 10);
  if (!Number.isFinite(width) || !Number.isFinite(height)) return undefined;
  return width * height;
}

router.post('/image-to-image', (req, res, next) => {
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'imageMask', maxCount: 1 },
  ])(req, res, (err) => {
    if (err) return handleMulterError(err, req, res, next);
    next();
  });
}, async (req, res) => {
  const { prompt, apiKey, model, parameters, provider, imageUrls } = req.body;
  const selectedProvider = normalizeProvider(provider);

  const volcengineCredentials = selectedProvider === 'volcengine'
    ? getVolcengineCredentials(apiKey)
    : null;
  if (selectedProvider === 'volcengine' && apiKey && !volcengineCredentials) {
    return res.status(400).json({ error: 'Volcengine credentials format invalid. Please use AK:SK' });
  }

  const imageFile = req.files?.image?.[0];
  const imageMaskFile = req.files?.imageMask?.[0];

  if (selectedProvider !== 'volcengine' && !imageFile) {
    return res.status(400).json({ error: '参考图片是必需的' });
  }

  const resolvedApiKey = selectedProvider === 'volcengine'
    ? (volcengineCredentials ? `${volcengineCredentials.accessKey}:***` : '')
    : getApiKey(selectedProvider, apiKey);
  if (!resolvedApiKey) return res.status(400).json({ error: 'API Key is required' });

  let selectedModel;
  if (selectedProvider === 'gemini') {
    selectedModel = createProvider('gemini').getModelNormalizer()(model) || 'gemini-2.5-flash-image';
  } else if (selectedProvider === 'volcengine') {
    selectedModel = createProvider('volcengine').getModelNormalizer()(model) || 'jimeng-3.0-i2i';
  } else {
    selectedModel = model || 'wan2.6-image';
  }

  // Validate model support
  const I2I_SUPPORTED_MODELS = ['wan2.7-image-pro', 'wan2.7-image', 'wan2.6-image'];
  if (selectedProvider === 'dashscope' && !I2I_SUPPORTED_MODELS.includes(selectedModel)) {
    return res.status(400).json({
      error: `模型 ${selectedModel} 不支持图生图，请使用: ${I2I_SUPPORTED_MODELS.join(', ')}`,
    });
  }

  if (log) log('📷 图生图请求 - 使用模型:', selectedModel);

  // Build image data URL for non-volcengine providers
  const imageBase64 = imageFile && selectedProvider !== 'volcengine'
    ? imageFile.buffer.toString('base64')
    : '';
  const mimeType = imageFile?.mimetype || 'image/png';
  const imageDataUrl = imageBase64 ? `data:${mimeType};base64,${imageBase64}` : '';

  // Parse parameters
  let params;
  try {
    params = parameters ? JSON.parse(parameters) : {};
  } catch (e) {
    params = {};
  }

  const size = params.size;
  const width = Number.isInteger(params.width) ? params.width : undefined;
  const height = Number.isInteger(params.height) ? params.height : undefined;
  const n = params.n === undefined ? 1 : params.n;
  const seed = params.seed;
  const negativePrompt = params.negative_prompt;
  const promptExtend = params.prompt_extend !== undefined ? params.prompt_extend : true;
  const watermark = params.watermark || false;
  const hasImageStrength = params.image_strength !== undefined;
  const imageStrength = hasImageStrength ? params.image_strength : 0.5;
  const upscaleResolution = typeof params.upscale_resolution === 'string' ? params.upscale_resolution : undefined;
  const upscaleScale = params.upscale_scale;
  const inpaintingSeed = params.inpainting_seed;
  const imageEditPrompt = typeof params.image_edit_prompt === 'string'
    ? params.image_edit_prompt
    : (typeof params.edit_prompt === 'string' ? params.edit_prompt : prompt);
  const loraWeight = typeof params.lora_weight === 'number' ? params.lora_weight : undefined;

  try {
    const negativeErr = validateStringMaxLen('negative_prompt', negativePrompt, 4000);
    if (negativeErr) return res.status(400).json({ error: negativeErr });
    const promptErr = validateStringMaxLen('prompt', prompt, 4000);
    if (promptErr) return res.status(400).json({ error: promptErr });

    const nErr = validateIntegerInRange('n', n, 1, 4);
    if (nErr) return res.status(400).json({ error: nErr });

    if (seed !== undefined) {
      const seedMin = selectedProvider === 'volcengine' ? -1 : 0;
      const seedErr = validateIntegerInRange('seed', seed, seedMin, 2147483647);
      if (seedErr) return res.status(400).json({ error: seedErr });
    }

    if (selectedProvider === 'dashscope' && size) {
      const sizeErr = validateSize(selectedModel, size);
      if (sizeErr) return res.status(400).json({ error: sizeErr });
    }

    if (imageStrength !== undefined) {
      if (typeof imageStrength !== 'number' || Number.isNaN(imageStrength) || imageStrength < 0 || imageStrength > 1) {
        return res.status(400).json({ error: 'image_strength must be a number between 0 and 1' });
      }
    }

    if (selectedProvider === 'gemini') {
      const imageUrls = await createProvider('gemini').generateImageToImage({
        apiKey: resolvedApiKey,
        model: selectedModel,
        prompt,
        imageDataUrl,
        n,
      });
      return res.json({ imageUrls });
    }

    if (selectedProvider === 'volcengine') {
      const uploadedImageMeta = imageFile
        ? await saveUploadedImageAsPublicUrl(req, imageFile)
        : { publicUrl: '', filePath: '' };
      const uploadedMaskMeta = imageMaskFile
        ? await saveUploadedImageAsPublicUrl(req, imageMaskFile)
        : { publicUrl: '', filePath: '' };
      let parsedImageUrls = [];
      if (imageUrls) {
        try {
          const urlInput = typeof imageUrls === 'string' ? JSON.parse(imageUrls) : imageUrls;
          parsedImageUrls = parseImageUrlsInput(urlInput);
        } catch (e) {
          parsedImageUrls = parseImageUrlsInput(imageUrls);
        }
      }
      if (uploadedImageMeta.publicUrl) {
        parsedImageUrls.unshift(uploadedImageMeta.publicUrl);
      }

      // Handle model-specific requirements
      if (selectedModel === 'jimeng_i2i_v30') {
        if (uploadedImageMeta.publicUrl) {
          parsedImageUrls = [uploadedImageMeta.publicUrl];
        } else if (parsedImageUrls.length > 0) {
          parsedImageUrls = [parsedImageUrls[0]];
        } else {
          return res.status(400).json({ error: 'jimeng-3.0-i2i 需要且仅支持 1 张参考图（本地上传或1条HTTP URL）' });
        }
      } else if (selectedModel === 'jimeng_i2i_seed3_tilesr_cvtob') {
        if (uploadedImageMeta.publicUrl) {
          parsedImageUrls = [uploadedImageMeta.publicUrl];
        } else if (parsedImageUrls.length > 0) {
          parsedImageUrls = [parsedImageUrls[0]];
        } else {
          return res.status(400).json({ error: 'jimeng-upscale 需要且仅支持 1 张参考图（本地上传或1条HTTP URL）' });
        }
      } else if (selectedModel === 'jimeng_image2image_dream_inpaint') {
        if (uploadedImageMeta.publicUrl && uploadedMaskMeta.publicUrl) {
          parsedImageUrls = [uploadedImageMeta.publicUrl, uploadedMaskMeta.publicUrl];
        } else {
          if (uploadedImageMeta.publicUrl) {
            parsedImageUrls = [uploadedImageMeta.publicUrl, ...parsedImageUrls];
          }
          if (uploadedMaskMeta.publicUrl) {
            parsedImageUrls = [parsedImageUrls[0], uploadedMaskMeta.publicUrl].filter(Boolean);
          }
        }
        if (parsedImageUrls.length < 2) {
          return res.status(400).json({ error: 'jimeng-inpainting 需要 2 张参考图（原图+mask）。请上传原图与Mask图，或补足URL。' });
        }
        parsedImageUrls = parsedImageUrls.slice(0, 2);
      } else if (selectedModel === 'i2i_material_extraction' || selectedModel === 'jimeng_i2i_extract_tiled_images') {
        if (uploadedImageMeta.publicUrl) {
          parsedImageUrls = [uploadedImageMeta.publicUrl];
        } else if (parsedImageUrls.length > 0) {
          parsedImageUrls = [parsedImageUrls[0]];
        } else {
          return res.status(400).json({ error: `${selectedModel} 需要且仅支持 1 张参考图（本地上传或1条HTTP URL）` });
        }
      }

      const volcengineScale = selectedModel === 'jimeng_seedream46_cvtob'
        ? Math.max(1, Math.min(100, Math.round(imageStrength * 100)))
        : (selectedModel === 'jimeng_i2i_seed3_tilesr_cvtob'
          ? Math.max(0, Math.min(100, Number.isFinite(upscaleScale) ? Math.round(upscaleScale) : Math.round(imageStrength * 100)))
          : (selectedModel === 'jimeng_i2i_v30' ? imageStrength : undefined));
      const volcengineSeed = selectedModel === 'jimeng_image2image_dream_inpaint'
        ? (Number.isInteger(inpaintingSeed) ? inpaintingSeed : seed)
        : seed;

      const volcengineImageUrls = await createProvider('volcengine').generateImageToImage({
        credentials: volcengineCredentials,
        model: selectedModel,
        prompt,
        imageUrls: parsedImageUrls,
        n,
        size: parseSizeToArea(size),
        width,
        height,
        watermark,
        scale: volcengineScale,
        usePreLlm: promptExtend,
        seed: volcengineSeed,
        resolution: selectedModel === 'jimeng_i2i_seed3_tilesr_cvtob' ? upscaleResolution : undefined,
        imageEditPrompt,
        loraWeight,
      });

      if (uploadedImageMeta.filePath) scheduleUploadedFileCleanup(uploadedImageMeta.filePath);
      if (uploadedMaskMeta.filePath) scheduleUploadedFileCleanup(uploadedMaskMeta.filePath);

      return res.json({ imageUrls: volcengineImageUrls });
    }

    // Dashscope image-to-image (sync API)
    const syncParams = { n };
    if (size) syncParams.size = size;
    if (seed !== undefined) syncParams.seed = seed;
    if (negativePrompt) syncParams.negative_prompt = negativePrompt;
    if (hasImageStrength) syncParams.image_strength = imageStrength;
    if (promptExtend === true) syncParams.prompt_extend = true;
    if (watermark === true) syncParams.watermark = true;

    const content = [{ image: imageDataUrl }];
    if (prompt) content.push({ text: prompt });

    if (log) {
      log('=== 图生图请求调试 ===');
      log('模型:', selectedModel);
      log('图片大小:', imageFile.size, '字节');
      log('图片类型:', imageFile.mimetype);
      log('Base64长度:', imageDataUrl.length);
      log('请求参数:', JSON.stringify(syncParams, null, 2));
      log('=====================');
    }

    const imageUrls = await createProvider('dashscope').generateImageToImage({
      apiKey: resolvedApiKey,
      model: selectedModel,
      prompt,
      imageDataUrl,
      parameters: syncParams,
    });

    res.json({ imageUrls });
  } catch (err) {
    if (log) log('❌ 图生图异常:', err);

    if (res.headersSent) {
      if (log) log('响应已发送，跳过错误处理');
      return;
    }

    if (err.name === 'AbortError' || err.message?.includes('abort')) {
      return res.status(504).json({ error: '请求超时,图片较大或网络较慢,请稍后重试' });
    }

    if (err.message?.includes('fetch failed') || err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      return res.status(502).json({ error: '网络错误,无法连接到 AI 服务,请检查网络或稍后重试' });
    }

    res.status(500).json({ error: `生成失败: ${err.message}` });
  }
});

module.exports = router;
