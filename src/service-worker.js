import { validateToshinTransformRequest } from './toshin-message.js';
import { openResultInSourceWindow, resolveSourceWindowId } from './window-target.js';

async function hasOffscreenDocument() {
  if (chrome.runtime.getContexts) {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [chrome.runtime.getURL('offscreen.html')]
    });
    return contexts.length > 0;
  }

  const clientsList = await clients.matchAll();
  const offscreenUrl = chrome.runtime.getURL('offscreen.html');
  return clientsList.some((client) => client.url === offscreenUrl);
}

let creatingOffscreen = null;

async function ensureOffscreenDocument() {
  if (await hasOffscreenDocument()) return;
  if (!creatingOffscreen) {
    creatingOffscreen = chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['BLOBS'],
      justification: '変換したPDFのBlob URLを保持するため'
    }).finally(() => {
      creatingOffscreen = null;
    });
  }
  await creatingOffscreen;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const isPopupRequest = message?.type === 'TRANSFORM_PDF';
  const isToshinRequest = message?.type === 'TRANSFORM_TOSHIN_PDF';
  if (!isPopupRequest && !isToshinRequest) return undefined;

  if (isToshinRequest && !validateToshinTransformRequest(message.url, sender?.tab?.url || '')) {
    sendResponse({ ok: false, error: '東進の問題PDFとして確認できないURLです。' });
    return false;
  }

  (async () => {
    const sourceWindowId = resolveSourceWindowId(message?.windowId, sender?.tab?.windowId);
    await ensureOffscreenDocument();
    const result = await chrome.runtime.sendMessage({
      type: 'OFFSCREEN_TRANSFORM_PDF',
      url: message.url
    });
    if (!result?.ok) {
      throw new Error(result?.error || 'PDFの変換に失敗しました。');
    }
    await openResultInSourceWindow(result.url, sourceWindowId);
    return { ok: true };
  })()
    .then(sendResponse)
    .catch((error) => sendResponse({ ok: false, error: error?.message || String(error) }));

  return true;
});
