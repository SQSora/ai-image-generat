/**
 * 文生图路由
 * POST /api/generate-image
 */

const express = require('express');
const router = express.Router();
const { createProvider, normalizeProvider, getApiKey, getVolcengineCredentials } = require('../providers');
const { MODEL_CONFIG, ALLOWED_SIZES_BY_MODEL } = require('../utils/config');
const { log } = require('../utils/logger');
const { errorHandler } = require('../middleware/errorHandler');

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

router.post('/generate-image', async (req, res, next) => {
  try {
    const { prompt, apiKey, model, parameters = {}, provider } = req.body;
    const selectedProvider = normalizeProvider(provider);

    // Volcengine credentials check
    const volcengineCredentials = selectedProvider === 'volcengine'
      ? getVolcengineCredentials(apiKey)
      : null;
    if (selectedProvider === 'volcengine' && apiKey && !volcengineCredentials) {
      return res.status(400).json({ error: 'Volcengine credentials format invalid. Please use AK:SK' });
    }

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const resolvedApiKey = selectedProvider === 'volcengine'
      ? (volcengineCredentials ? `${volcengineCredentials.accessKey}:***` : '')
      : getApiKey(selectedProvider, apiKey);
    if (!resolvedApiKey) return res.status(400).json({ error: 'API Key is required' });

    // Determine model
    let selectedModel;
    if (selectedProvider === 'gemini') {
      selectedModel = createProvider('gemini').getModelNormalizer()(model) || 'gemini-2.5-flash-image';
    } else if (selectedProvider === 'volcengine') {
      selectedModel = createProvider('volcengine').getModelNormalizer()(model) || 'jimeng-4.0';
    } else {
      selectedModel = model || 'wan2.6-t2i';
    }

    const config = MODEL_CONFIG[selectedModel] || { size: '1024*1024', type: 'wan' };

    // Parse parameters
    const size = parameters.size || config.size;
    const width = Number.isInteger(parameters.width) ? parameters.width : undefined;
    const height = Number.isInteger(parameters.height) ? parameters.height : undefined;
    const n = parameters.n === undefined ? 1 : parameters.n;
    const seed = parameters.seed;
    const negativePrompt = parameters.negative_prompt;
    const promptExtend = parameters.prompt_extend !== undefined ? parameters.prompt_extend : true;
    const watermark = parameters.watermark || false;

    // Validations
    const promptErr = validateStringMaxLen('prompt', prompt, 4000);
    if (promptErr) return res.status(400).json({ error: promptErr });
    const negativeErr = validateStringMaxLen('negative_prompt', negativePrompt, 4000);
    if (negativeErr) return res.status(400).json({ error: negativeErr });

    const nErr = validateIntegerInRange('n', n, 1, 4);
    if (nErr) return res.status(400).json({ error: nErr });

    if (seed !== undefined) {
      const seedMin = selectedProvider === 'volcengine' ? -1 : 0;
      const seedErr = validateIntegerInRange('seed', seed, seedMin, 2147483647);
      if (seedErr) return res.status(400).json({ error: seedErr });
    }

    if (selectedProvider === 'dashscope') {
      const sizeErr = validateSize(selectedModel, size);
      if (sizeErr) return res.status(400).json({ error: sizeErr });
    }

    // Build provider opts
    const providerOpts = {
      apiKey: resolvedApiKey,
      model: selectedModel,
      prompt,
      parameters: {
        size,
        n,
        seed,
        negativePrompt,
        promptExtend,
        watermark,
        width,
        height,
        modelConfig: config,
      },
    };

    if (selectedProvider === 'volcengine') {
      providerOpts.credentials = volcengineCredentials;
    }

    const p = createProvider(selectedProvider);
    const imageUrls = await p.generateTextToImage(providerOpts);

    res.json({ imageUrls });
  } catch (err) {
    if (err?.name === 'AbortError' || err?.message?.includes('abort')) {
      return res.status(504).json({ error: 'Upstream request timeout' });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
