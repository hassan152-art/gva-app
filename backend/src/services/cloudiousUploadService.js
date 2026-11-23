import env from '../config.js';
import { CLOUDIOUS_FOLDER_NAME } from '../constants/cloudious.js';

const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stubUpload({ buffer, originalname, mimetype }) {
  const id = `GVA_DEV_${Date.now()}_${Math.round(Math.random() * 1e6)}`;
  return {
    path: `https://drive.google.com/file/d/${id}/view`,
    originalname,
    filename: originalname,
    size: buffer.length,
    mimetype,
  };
}

/**
 * Upload one file buffer to Cloudious (Google Drive folder `GVA-APP`).
 * @returns {Promise<{ path: string, originalname: string, filename: string, size: number, mimetype?: string }>}
 */
export async function uploadToCloudious({ buffer, originalname, mimetype }) {
  if (!buffer?.length) {
    throw new Error('No file data to upload');
  }

  if (env.cloudious.devStub) {
    return stubUpload({ buffer, originalname, mimetype });
  }

  const apiKey = env.cloudious.apiKey;
  if (!apiKey) {
    throw new Error('CLOUDIOUS_API_KEY is not configured');
  }

  const buildForm = () => {
    const form = new FormData();
    form.append('folderName', CLOUDIOUS_FOLDER_NAME);
    form.append('file', new Blob([buffer], { type: mimetype || 'application/octet-stream' }), originalname);
    return form;
  };

  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const res = await fetch(env.cloudious.uploadUrl, {
        method: 'POST',
        headers: { 'x-api-key': apiKey },
        body: buildForm(),
        signal: AbortSignal.timeout(env.cloudious.timeoutMs),
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Cloudious returned non-JSON (${res.status})`);
      }

      if (!res.ok) {
        const err = new Error(data?.message || data?.error || `Cloudious upload failed (${res.status})`);
        err.status = res.status;
        throw err;
      }

      if (data?.status !== 'success' || !data.myresp?.[0]) {
        throw new Error(`Upload failed: ${JSON.stringify(data).slice(0, 300)}`);
      }

      const item = data.myresp[0];
      if (!item.path && (item.url || item.webViewLink || item.link)) {
        item.path = item.url || item.webViewLink || item.link;
      }
      if (!item.path) {
        throw new Error('Upload failed: missing path in response');
      }
      return item;
    } catch (err) {
      lastError = err;
      const status = err.status;
      if (attempt < MAX_ATTEMPTS && status && RETRYABLE.has(status)) {
        await sleep(500 * attempt);
        continue;
      }
      if (attempt < MAX_ATTEMPTS && err.name === 'TimeoutError') {
        await sleep(500 * attempt);
        continue;
      }
      throw err;
    }
  }
  throw lastError || new Error('Cloudious upload failed');
}
