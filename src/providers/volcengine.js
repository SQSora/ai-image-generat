/**
 * Volcengine (火山引擎) AI 图片生成提供商
 */

const {
  VOLCENGINE_HOST,
  VOLCENGINE_REGION,
  VOLCENGINE_SERVICE,
  VOLCENGINE_VERSION,
  VOLCENGINE_TIMEOUT_MS,
  VOLCENGINE_MAX_POLL_ATTEMPTS,
  VOLCENGINE_POLL_INTERVAL_MS,
  VOLCENGINE_MODEL_ALIASES,
} = require('../utils/config');
const { volcengineSign, volcengineCanonicalQuery } = require('../utils/crypto');

function normalizeModel(model) {
  if (typeof model === 'string' && model.trim()) {
    const mapped = VOLCENGINE_MODEL_ALIASES[model.trim()];
    if (mapped) return mapped;
    return model.trim();
  }
  return VOLCENGINE_MODEL_ALIASES['jimeng-4.0'];
}

function parseCredentials(providedValue) {
  const raw = typeof providedValue === 'string' ? providedValue.trim() : '';
  if (raw) {
    const splitByColon = raw.split(':');
    if ((splitByColon.length === 2 || splitByColon.length === 3) && splitByColon[0].trim() && splitByColon[1].trim()) {
      return {
        accessKey: splitByColon[0].trim(),
        secretKey: splitByColon[1].trim(),
        sessionToken: splitByColon[2] ? splitByColon[2].trim() : '',
      };
    }
    const splitByLine = raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    if (splitByLine.length >= 2) {
      return {
        accessKey: splitByLine[0],
        secretKey: splitByLine[1],
        sessionToken: splitByLine[2] || '',
      };
    }
  }
  return null;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = VOLCENGINE_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

function extractImageUrls(data) {
  const urls = [];
  const imageUrls = Array.isArray(data?.data?.image_urls) ? data.data.image_urls : [];
  imageUrls.forEach((url) => {
    if (typeof url === 'string' && url.trim()) urls.push(url.trim());
  });

  const base64Images = Array.isArray(data?.data?.binary_data_base64) ? data.data.binary_data_base64 : [];
  base64Images.forEach((b64) => {
    if (typeof b64 === 'string' && b64.trim()) urls.push(`data:image/png;base64,${b64.trim()}`);
  });

  if (!urls.length && typeof data?.url === 'string') urls.push(data.url);
  return urls;
}

async function generateTextToImage({ credentials, model, prompt, n, size, width, height, watermark, usePreLlm, seed }) {
  if (!credentials?.accessKey || !credentials?.secretKey) {
    throw new Error('Volcengine credentials are required. Use AK:SK or VOLCENGINE_ACCESS_KEY/VOLCENGINE_SECRET_KEY');
  }

  const reqKey = normalizeModel(model);
  const isJimengT2IV3 = reqKey === 'jimeng_t2i_v30' || reqKey === 'jimeng_t2i_v31';
  const promptText = (prompt && prompt.trim()) ? prompt.trim() : 'Generate an image';

  const submitBody = { req_key: reqKey, prompt: promptText };

  if (Number.isInteger(seed)) {
    submitBody.seed = seed;
  }
  if (isJimengT2IV3 && typeof usePreLlm === 'boolean') {
    submitBody.use_pre_llm = usePreLlm;
  }

  if (Number.isInteger(width) && Number.isInteger(height) && width > 0 && height > 0) {
    submitBody.width = width;
    submitBody.height = height;
  } else if (!isJimengT2IV3 && typeof size === 'number' && Number.isFinite(size)) {
    submitBody.size = size;
  }
  if (watermark === true) {
    submitBody.logo_info = JSON.stringify({ add_logo: true, position: 0, language: 0, opacity: 1 });
  }

  const baseUrl = `https://${VOLCENGINE_HOST}`;
  const submitQuery = { Action: 'CVSync2AsyncSubmitTask', Version: VOLCENGINE_VERSION };
  const submitBodyText = JSON.stringify(submitBody);

  const submitAuth = volcengineSign({
    accessKey: credentials.accessKey,
    secretKey: credentials.secretKey,
    sessionToken: credentials.sessionToken || '',
    bodyText: submitBodyText,
    queryParams: submitQuery,
    host: VOLCENGINE_HOST,
    service: VOLCENGINE_SERVICE,
    region: VOLCENGINE_REGION,
  });

  const submitQueryString = volcengineCanonicalQuery(submitQuery);
  const submitRes = await fetchWithTimeout(
    `${baseUrl}/?${submitQueryString}`,
    { method: 'POST', headers: submitAuth.headers, body: submitBodyText },
    VOLCENGINE_TIMEOUT_MS
  );
  const submitText = await submitRes.text().catch(() => '');
  let submitData;
  try {
    submitData = submitText ? JSON.parse(submitText) : {};
  } catch (e) {
    submitData = {};
  }

  if (submitData?.code !== 10000) {
    if (submitRes.status === 401 || submitData?.ResponseMetadata?.Error?.Code === 'SignatureDoesNotMatch') {
      const err = submitData?.ResponseMetadata?.Error || {};
      const requestId = submitData?.request_id || submitData?.ResponseMetadata?.RequestId || '';
      throw new Error(
        `Volcengine 鉴权失败(401): ${err.Message || 'Sign error'}` +
        `${requestId ? `, request_id=${requestId}` : ''}` +
        '。请确认使用的是火山引擎 AccessKey/SecretKey（不是 Ark API Key）；若为临时凭证还需携带 SessionToken。并检查账号权限、VOLCENGINE_REGION/VOLCENGINE_SERVICE 及服务器时间。'
      );
    }
    throw new Error(submitData?.message || submitData?.ResponseMetadata?.Error?.Message || `Volcengine submit failed (${submitRes.status})`);
  }
  const taskId = submitData?.data?.task_id;
  if (!taskId) throw new Error('Volcengine submit success but task_id is missing');

  const getResultQuery = { Action: 'CVSync2AsyncGetResult', Version: VOLCENGINE_VERSION };
  const getResultBody = {
    req_key: reqKey,
    task_id: taskId,
    req_json: JSON.stringify({ return_url: true }),
  };

  for (let attempt = 0; attempt < VOLCENGINE_MAX_POLL_ATTEMPTS; attempt += 1) {
    await new Promise(resolve => setTimeout(resolve, VOLCENGINE_POLL_INTERVAL_MS));

    const getResultBodyText = JSON.stringify(getResultBody);
    const getResultAuth = volcengineSign({
      accessKey: credentials.accessKey,
      secretKey: credentials.secretKey,
      sessionToken: credentials.sessionToken || '',
      bodyText: getResultBodyText,
      queryParams: getResultQuery,
      host: VOLCENGINE_HOST,
      service: VOLCENGINE_SERVICE,
      region: VOLCENGINE_REGION,
    });
    const getResultQueryString = volcengineCanonicalQuery(getResultQuery);

    const resultRes = await fetchWithTimeout(
      `${baseUrl}/?${getResultQueryString}`,
      { method: 'POST', headers: getResultAuth.headers, body: getResultBodyText },
      VOLCENGINE_TIMEOUT_MS
    );
    const resultData = await resultRes.json();

    if (!resultRes.ok || resultData?.code !== 10000) {
      throw new Error(resultData?.message || resultData?.ResponseMetadata?.Error?.Message || `Volcengine get result failed (${resultRes.status})`);
    }

    const status = resultData?.data?.status;
    if (status === 'done') {
      const urls = extractImageUrls(resultData);
      if (!urls.length) throw new Error('Volcengine task done but no image_urls returned');
      return urls;
    }

    if (status === 'failed') {
      throw new Error(resultData?.data?.msg || resultData?.message || 'Volcengine task failed');
    }
  }

  throw new Error('Volcengine task polling timed out');
}

async function generateImageToImage({
  credentials, model, prompt, imageUrls, n, size, width, height, watermark, scale, usePreLlm, seed, resolution, imageEditPrompt, loraWeight,
}) {
  if (!credentials?.accessKey || !credentials?.secretKey) {
    throw new Error('Volcengine credentials are required. Use AK:SK or VOLCENGINE_ACCESS_KEY/VOLCENGINE_SECRET_KEY');
  }

  const reqKey = normalizeModel(model);
  const isJimengT2IV3 = reqKey === 'jimeng_t2i_v30' || reqKey === 'jimeng_t2i_v31';
  const isJimengI2IV30 = reqKey === 'jimeng_i2i_v30';
  const isJimengUpscale = reqKey === 'jimeng_i2i_seed3_tilesr_cvtob';
  const isJimengInpainting = reqKey === 'jimeng_image2image_dream_inpaint';
  const isJimengMaterialPod = reqKey === 'i2i_material_extraction';
  const isJimengMaterialProduct = reqKey === 'jimeng_i2i_extract_tiled_images';
  const promptText = (prompt && prompt.trim()) ? prompt.trim() : 'Generate an image';

  const submitBody = { req_key: reqKey, prompt: promptText };
  if (isJimengI2IV30) {
    if (!Array.isArray(imageUrls) || imageUrls.length !== 1) {
      throw new Error('jimeng_i2i_v30 requires exactly 1 image URL');
    }
    submitBody.image_urls = [imageUrls[0]];
  } else if (isJimengUpscale) {
    if (!Array.isArray(imageUrls) || imageUrls.length !== 1) {
      throw new Error('jimeng_i2i_seed3_tilesr_cvtob requires exactly 1 image URL');
    }
    submitBody.image_urls = [imageUrls[0]];
  } else if (isJimengInpainting) {
    if (!Array.isArray(imageUrls) || imageUrls.length !== 2) {
      throw new Error('jimeng_image2image_dream_inpaint requires exactly 2 image URLs (origin + mask)');
    }
    submitBody.image_urls = [imageUrls[0], imageUrls[1]];
  } else if (isJimengMaterialPod || isJimengMaterialProduct) {
    if (!Array.isArray(imageUrls) || imageUrls.length !== 1) {
      throw new Error(`${reqKey} requires exactly 1 image URL`);
    }
    submitBody.image_urls = [imageUrls[0]];
  } else if (Array.isArray(imageUrls) && imageUrls.length) {
    submitBody.image_urls = imageUrls;
  }

  if (Number.isInteger(seed)) {
    submitBody.seed = seed;
  }
  if (isJimengT2IV3 && typeof usePreLlm === 'boolean') {
    submitBody.use_pre_llm = usePreLlm;
  }

  if (Number.isInteger(width) && Number.isInteger(height) && width > 0 && height > 0) {
    submitBody.width = width;
    submitBody.height = height;
  } else if (!isJimengT2IV3 && typeof size === 'number' && Number.isFinite(size)) {
    submitBody.size = size;
  }
  if (typeof scale === 'number' && Number.isFinite(scale)) submitBody.scale = scale;
  if (typeof resolution === 'string' && (resolution === '4k' || resolution === '8k')) {
    submitBody.resolution = resolution;
  }
  if (isJimengMaterialPod || isJimengMaterialProduct) {
    const normalizedEditPrompt = typeof imageEditPrompt === 'string' ? imageEditPrompt.trim() : '';
    if (!normalizedEditPrompt) {
      throw new Error(`${reqKey} requires image_edit_prompt`);
    }
    submitBody.image_edit_prompt = normalizedEditPrompt;
    if (isJimengMaterialProduct) {
      submitBody.edit_prompt = normalizedEditPrompt;
    }
    if (typeof loraWeight === 'number' && Number.isFinite(loraWeight)) {
      submitBody.lora_weight = loraWeight;
    }
  }
  if (watermark === true) {
    submitBody.logo_info = JSON.stringify({ add_logo: true, position: 0, language: 0, opacity: 1 });
  }

  const baseUrl = `https://${VOLCENGINE_HOST}`;
  const submitQuery = { Action: 'CVSync2AsyncSubmitTask', Version: VOLCENGINE_VERSION };
  const submitBodyText = JSON.stringify(submitBody);

  const submitAuth = volcengineSign({
    accessKey: credentials.accessKey,
    secretKey: credentials.secretKey,
    sessionToken: credentials.sessionToken || '',
    bodyText: submitBodyText,
    queryParams: submitQuery,
    host: VOLCENGINE_HOST,
    service: VOLCENGINE_SERVICE,
    region: VOLCENGINE_REGION,
  });

  const submitQueryString = volcengineCanonicalQuery(submitQuery);
  const submitRes = await fetchWithTimeout(
    `${baseUrl}/?${submitQueryString}`,
    { method: 'POST', headers: submitAuth.headers, body: submitBodyText },
    VOLCENGINE_TIMEOUT_MS
  );
  const submitText = await submitRes.text().catch(() => '');
  let submitData;
  try {
    submitData = submitText ? JSON.parse(submitText) : {};
  } catch (e) {
    submitData = {};
  }

  if (submitData?.code !== 10000) {
    if (submitRes.status === 401 || submitData?.ResponseMetadata?.Error?.Code === 'SignatureDoesNotMatch') {
      const err = submitData?.ResponseMetadata?.Error || {};
      const requestId = submitData?.request_id || submitData?.ResponseMetadata?.RequestId || '';
      throw new Error(
        `Volcengine 鉴权失败(401): ${err.Message || 'Sign error'}` +
        `${requestId ? `, request_id=${requestId}` : ''}` +
        '。请确认使用的是火山引擎 AccessKey/SecretKey（不是 Ark API Key）；若为临时凭证还需携带 SessionToken。并检查账号权限、VOLCENGINE_REGION/VOLCENGINE_SERVICE 及服务器时间。'
      );
    }
    throw new Error(submitData?.message || submitData?.ResponseMetadata?.Error?.Message || `Volcengine submit failed (${submitRes.status})`);
  }
  const taskId = submitData?.data?.task_id;
  if (!taskId) throw new Error('Volcengine submit success but task_id is missing');

  const getResultQuery = { Action: 'CVSync2AsyncGetResult', Version: VOLCENGINE_VERSION };
  const getResultBody = {
    req_key: reqKey,
    task_id: taskId,
    req_json: JSON.stringify({ return_url: true }),
  };

  for (let attempt = 0; attempt < VOLCENGINE_MAX_POLL_ATTEMPTS; attempt += 1) {
    await new Promise(resolve => setTimeout(resolve, VOLCENGINE_POLL_INTERVAL_MS));

    const getResultBodyText = JSON.stringify(getResultBody);
    const getResultAuth = volcengineSign({
      accessKey: credentials.accessKey,
      secretKey: credentials.secretKey,
      sessionToken: credentials.sessionToken || '',
      bodyText: getResultBodyText,
      queryParams: getResultQuery,
      host: VOLCENGINE_HOST,
      service: VOLCENGINE_SERVICE,
      region: VOLCENGINE_REGION,
    });
    const getResultQueryString = volcengineCanonicalQuery(getResultQuery);

    const resultRes = await fetchWithTimeout(
      `${baseUrl}/?${getResultQueryString}`,
      { method: 'POST', headers: getResultAuth.headers, body: getResultBodyText },
      VOLCENGINE_TIMEOUT_MS
    );
    const resultData = await resultRes.json();

    if (!resultRes.ok || resultData?.code !== 10000) {
      throw new Error(resultData?.message || resultData?.ResponseMetadata?.Error?.Message || `Volcengine get result failed (${resultRes.status})`);
    }

    const status = resultData?.data?.status;
    if (status === 'done') {
      const urls = extractImageUrls(resultData);
      if (!urls.length) throw new Error('Volcengine task done but no image_urls returned');
      return urls;
    }

    if (status === 'failed') {
      throw new Error(resultData?.data?.msg || resultData?.message || 'Volcengine task failed');
    }
  }

  throw new Error('Volcengine task polling timed out');
}

module.exports = {
  generateTextToImage,
  generateImageToImage,
  normalizeModel,
  parseCredentials,
};
