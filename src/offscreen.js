import { fetchPdfBytes, isPdfBytes } from './pdf-source.js';
import { transformPdf } from './pdf-transform-browser.js';
import { createSelectedPdfStore } from './selected-pdf-store.js';

const objectUrls = new Set();

async function transformBytes(bytes, direction = 'rtl') {
  const inputBytes = new Uint8Array(bytes);
  if (!isPdfBytes(inputBytes)) {
    throw new Error('選択したファイルはPDFではありません。');
  }
  const outputBytes = await transformPdf(inputBytes, direction);
  const blob = new Blob([outputBytes], { type: 'application/pdf' });
  const objectUrl = URL.createObjectURL(blob);
  objectUrls.add(objectUrl);
  return objectUrl;
}

async function transformUrl(url, direction = 'rtl') {
  return transformBytes(await fetchPdfBytes(url), direction);
}

export async function transformStagedPdf(fileId, {
  fileStore = createSelectedPdfStore(),
  transform = transformBytes,
  direction = 'rtl'
} = {}) {
  try {
    const file = await fileStore.retrieve(fileId);
    if (!file) throw new Error('選択したPDFが見つかりません。もう一度選択してください。');
    return await transform(await file.arrayBuffer(), direction);
  } finally {
    await fileStore.delete(fileId);
  }
}

function handleMessage(message, _sender, sendResponse) {
  const isUrlRequest = message?.type === 'OFFSCREEN_TRANSFORM_PDF';
  const isStagedFileRequest = message?.type === 'OFFSCREEN_TRANSFORM_STAGED_PDF';
  if (!isUrlRequest && !isStagedFileRequest) return undefined;

  (isStagedFileRequest
    ? transformStagedPdf(message.fileId, { direction: message.direction })
    : transformUrl(message.url, message.direction))
    .then((url) => sendResponse({ ok: true, url }))
    .catch((error) => sendResponse({ ok: false, error: error?.message || String(error) }));
  return true;
}

if (globalThis.chrome?.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener(handleMessage);
}

if (globalThis.addEventListener) {
  addEventListener('unload', () => {
    for (const url of objectUrls) URL.revokeObjectURL(url);
    objectUrls.clear();
  });
}
