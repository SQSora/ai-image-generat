/**
 * Google Gemini AI 图片生成提供商
 */

const {
  GEMINI_BASE_URL,
  GEMINI_DEFAULT_MODEL,
  GEMINI_TIMEOUT_MS,
  GEMINI_MODEL_ALIASES,
} = require('../utils/config');

async function fetchWithTimeout(url, options = {}, timeoutMs = GEMINI_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

function normalizeModel(model) {
  if (!model || typeof model !== 'string') return GEMINI_DEFAULT_MODEL;
  return GEMINI_MODEL_ALIASES[model] || model;
}

function parseDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string') return null;
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

function extractImageDataUrls(data) {
  const urls = [];
  const candidates = data?.candidates || [];

  candidates.forEach((candidate) => {
    const parts = candidate?.content?.parts || [];
    parts.forEach((part) => {
      const inlineData = part?.inlineData || part?.inline_data;
      if (inlineData?.data) {
        const mimeType = inlineData.mimeType || inlineData.mime_type || 'image/png';
        urls.push(`data:${mimeType};base64,${inlineData.data}`);
      }
    });
  });

  return urls;
}

async function generateTextToImage({ apiKey, model, prompt, n = 1 }) {
  const selectedModel = normalizeModel(model);
  const requestCount = Number.isInteger(n) ? n : 1;

  const parts = [{
    text: (prompt && prompt.trim()) ? prompt.trim() : 'Generate an image',
  }];

  const imageUrls = [];
  for (let i = 0; i < requestCount; i += 1) {
    const geminiRes = await fetchWithTimeout(
      `${GEMINI_BASE_URL}/models/${encodeURIComponent(selectedModel)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: { responseModalities: ['IMAGE'] },
        }),
      },
      GEMINI_TIMEOUT_MS
    );

    const geminiData = await geminiRes.json();
    if (!geminiRes.ok) {
      throw new Error(geminiData?.error?.message || geminiData?.message || `Gemini request failed (${geminiRes.status})`);
    }

    const generatedUrls = extractImageDataUrls(geminiData);
    if (!generatedUrls.length) {
      throw new Error('Gemini response does not include image data');
    }
    imageUrls.push(generatedUrls[0]);
  }

  return imageUrls;
}

async function generateImageToImage({ apiKey, model, prompt, imageDataUrl, n = 1 }) {
  const selectedModel = normalizeModel(model);
  const parsedImage = imageDataUrl ? parseDataUrl(imageDataUrl) : null;

  const parts = [];
  if (parsedImage) {
    parts.push({
      inlineData: {
        mimeType: parsedImage.mimeType,
        data: parsedImage.data,
      },
    });
  }
  parts.push({
    text: (prompt && prompt.trim()) ? prompt.trim() : 'Generate an image',
  });

  const geminiRes = await fetchWithTimeout(
    `${GEMINI_BASE_URL}/models/${encodeURIComponent(selectedModel)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: { responseModalities: ['IMAGE'] },
      }),
    },
    GEMINI_TIMEOUT_MS
  );

  const geminiData = await geminiRes.json();
  if (!geminiRes.ok) {
    throw new Error(geminiData?.error?.message || geminiData?.message || `Gemini request failed (${geminiRes.status})`);
  }

  const generatedUrls = extractImageDataUrls(geminiData);
  if (!generatedUrls.length) {
    throw new Error('Gemini response does not include image data');
  }

  return generatedUrls;
}

module.exports = {
  generateTextToImage,
  generateImageToImage,
  normalizeModel,
};
