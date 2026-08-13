import { decodePdfBytes, fetchPdfBytes, isPdfBytes } from './pdf-source.js';
import { transformPdf } from './pdf-transform-browser.js';

const objectUrls = new Set();

async function transformBytes(bytes) {
  const inputBytes = new Uint8Array(bytes);
  if (!isPdfBytes(inputBytes)) {
    throw new Error('選択したファイルはPDFではありません。');
  }
  const outputBytes = await transformPdf(inputBytes);
  const blob = new Blob([outputBytes], { type: 'application/pdf' });
  const objectUrl = URL.createObjectURL(blob);
  objectUrls.add(objectUrl);
  return objectUrl;
}

async function transformUrl(url) {
  return transformBytes(await fetchPdfBytes(url));
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const isUrlRequest = message?.type === 'OFFSCREEN_TRANSFORM_PDF';
  const isBytesRequest = message?.type === 'OFFSCREEN_TRANSFORM_PDF_BYTES';
  if (!isUrlRequest && !isBytesRequest) return undefined;

  (isBytesRequest ? transformBytes(decodePdfBytes(message.bytes)) : transformUrl(message.url))
    .then((url) => sendResponse({ ok: true, url }))
    .catch((error) => sendResponse({ ok: false, error: error?.message || String(error) }));
  return true;
});

addEventListener('unload', () => {
  for (const url of objectUrls) URL.revokeObjectURL(url);
  objectUrls.clear();
});
