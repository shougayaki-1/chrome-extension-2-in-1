import { fetchPdfBytes } from './pdf-source.js';
import { transformPdf } from './pdf-transform-browser.js';

const objectUrls = new Set();

async function transformUrl(url) {
  const inputBytes = await fetchPdfBytes(url);
  const outputBytes = await transformPdf(inputBytes);
  const blob = new Blob([outputBytes], { type: 'application/pdf' });
  const objectUrl = URL.createObjectURL(blob);
  objectUrls.add(objectUrl);
  return objectUrl;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'OFFSCREEN_TRANSFORM_PDF') return undefined;

  transformUrl(message.url)
    .then((url) => sendResponse({ ok: true, url }))
    .catch((error) => sendResponse({ ok: false, error: error?.message || String(error) }));
  return true;
});

addEventListener('unload', () => {
  for (const url of objectUrls) URL.revokeObjectURL(url);
  objectUrls.clear();
});
