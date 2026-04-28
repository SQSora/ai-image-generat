/**
 * DashScope (阿里云百炼) AI 图片生成提供商
 */

const {
  DASHSCOPE_BASE_URL,
  DASHSCOPE_TIMEOUT_MS,
  SYNC_MODELS,
  SYNC_ENDPOINT,
  ASYNC_ENDPOINT,
  TASK_ENDPOINT,
} = require('../utils/config');

async function fetchWithTimeout(url, options = {}, timeoutMs = DASHSCOPE_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

function isSyncModel(model) {
  return SYNC_MODELS.has(model);
}

function extractImageUrls(data, model) {
  if (isSyncModel(model)) {
    const choices = data.output?.choices?.[0]?.message?.content || [];
    return choices.filter(c => c.image).map(c => c.image);
  }
  const results = data.output?.results || [];
  return results.filter(r => r.url).map(r => r.url);
}

async function generateTextToImage({ apiKey, model, prompt, parameters = {} }) {
  const { size, n, seed, negativePrompt, promptExtend, watermark } = parameters;
  const authHeader = { 'Authorization': `Bearer ${apiKey}` };
  const config = parameters.modelConfig || { size: '1024*1024', type: 'wan' };
  const resolvedSize = size || config.size;

  if (isSyncModel(model)) {
    const syncParams = {
      size: resolvedSize,
      n: n || 1,
      prompt_extend: promptExtend !== false,
      watermark: watermark || false,
    };
    if (seed !== undefined) syncParams.seed = seed;
    if (negativePrompt) syncParams.negative_prompt = negativePrompt;

    const syncRes = await fetchWithTimeout(
      `${DASHSCOPE_BASE_URL}${SYNC_ENDPOINT}`,
      {
        method: 'POST',
        headers: {
          ...authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          input: { messages: [{ role: 'user', content: [{ text: prompt.trim() }] }] },
          parameters: syncParams,
        }),
      },
      DASHSCOPE_TIMEOUT_MS
    );

    const syncData = await syncRes.json();
    if (!syncRes.ok) {
      throw new Error(syncData.message || JSON.stringify(syncData));
    }

    const imageUrls = extractImageUrls(syncData, model);
    if (!imageUrls.length) {
      throw new Error('No image URL in response');
    }
    return imageUrls;
  }

  // Async model
  const asyncParams = {
    size: resolvedSize,
    n: n || 1,
  };
  if (seed !== undefined) asyncParams.seed = seed;
  if (negativePrompt) asyncParams.negative_prompt = negativePrompt;
  if (promptExtend !== false) asyncParams.prompt_extend = true;
  if (watermark) asyncParams.watermark = true;

  const submitRes = await fetchWithTimeout(
    `${DASHSCOPE_BASE_URL}${ASYNC_ENDPOINT}`,
    {
      method: 'POST',
      headers: {
        ...authHeader,
        'Content-Type': 'application/json',
        'X-DashScope-Async': 'enable',
      },
      body: JSON.stringify({
        model,
        input: { prompt: prompt.trim() },
        parameters: asyncParams,
      }),
    },
    DASHSCOPE_TIMEOUT_MS
  );

  const submitData = await submitRes.json();
  if (!submitRes.ok) {
    throw new Error(submitData.message || JSON.stringify(submitData));
  }

  const taskId = submitData.output?.task_id;
  if (!taskId) {
    throw new Error('No task_id returned');
  }

  // Poll task status
  let imageUrls = null;
  let attempts = 0;
  const maxAttempts = 90;

  while (attempts < maxAttempts) {
    await new Promise(r => setTimeout(r, 2000));

    const pollRes = await fetchWithTimeout(
      `${DASHSCOPE_BASE_URL}${TASK_ENDPOINT}${taskId}`,
      { headers: authHeader },
      DASHSCOPE_TIMEOUT_MS
    );

    const pollData = await pollRes.json();
    const status = pollData.output?.task_status;

    if (status === 'SUCCEEDED') {
      imageUrls = extractImageUrls(pollData, model);
      break;
    } else if (status === 'FAILED') {
      throw new Error(pollData.output?.message || 'Task failed');
    }

    attempts++;
  }

  if (!imageUrls || !imageUrls.length) {
    throw new Error('Task timeout');
  }

  return imageUrls;
}

async function generateImageToImage({ apiKey, model, prompt, imageDataUrl, parameters = {} }) {
  const { size, n, seed, negativePrompt, promptExtend, watermark, imageStrength } = parameters;
  const authHeader = { 'Authorization': `Bearer ${apiKey}` };

  // Build content array: image first, then text
  const content = [{ image: imageDataUrl }];
  if (prompt) {
    content.push({ text: prompt });
  }

  const syncParams = { n: n || 1 };
  if (size) syncParams.size = size;
  if (seed !== undefined) syncParams.seed = seed;
  if (negativePrompt) syncParams.negative_prompt = negativePrompt;
  if (imageStrength !== undefined) syncParams.image_strength = imageStrength;
  if (promptExtend === true) syncParams.prompt_extend = true;
  if (watermark === true) syncParams.watermark = true;

  const syncRes = await fetchWithTimeout(
    `${DASHSCOPE_BASE_URL}${SYNC_ENDPOINT}`,
    {
      method: 'POST',
      headers: {
        ...authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: { messages: [{ role: 'user', content }] },
        parameters: syncParams,
      }),
    },
    300000 // 5 min timeout for image-to-image
  );

  const syncData = await syncRes.json();
  if (!syncRes.ok) {
    throw new Error(syncData.message || JSON.stringify(syncData));
  }

  const imageUrls = extractImageUrls(syncData, model);
  if (!imageUrls.length) {
    throw new Error('No image URL in response');
  }

  return imageUrls;
}

module.exports = {
  generateTextToImage,
  generateImageToImage,
  isSyncModel,
};
