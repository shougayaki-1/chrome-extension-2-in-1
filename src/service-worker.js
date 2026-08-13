import { validateToshinTransformRequest } from './toshin-message.js';
import { openResultInSourceWindow, resolveSourceWindowId } from './window-target.js';

async function hasOffscreenDocument(chromeApi) {
  if (chromeApi.runtime.getContexts) {
    const contexts = await chromeApi.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [chromeApi.runtime.getURL('offscreen.html')]
    });
    return contexts.length > 0;
  }

  const clientsList = await clients.matchAll();
  const offscreenUrl = chromeApi.runtime.getURL('offscreen.html');
  return clientsList.some((client) => client.url === offscreenUrl);
}

let creatingOffscreen = null;

async function ensureOffscreenDocument(chromeApi) {
  if (await hasOffscreenDocument(chromeApi)) return;
  if (!creatingOffscreen) {
    creatingOffscreen = chromeApi.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['BLOBS'],
      justification: '変換したPDFのBlob URLを保持するため'
    }).finally(() => {
      creatingOffscreen = null;
    });
  }
  await creatingOffscreen;
}

async function transformRequest(message, sender, chromeApi) {
  const isStagedFileRequest = message?.type === 'TRANSFORM_STAGED_PDF';
  const sourceWindowId = resolveSourceWindowId(message?.windowId, sender?.tab?.windowId);
  await ensureOffscreenDocument(chromeApi);
  const result = await chromeApi.runtime.sendMessage(isStagedFileRequest
    ? { type: 'OFFSCREEN_TRANSFORM_STAGED_PDF', fileId: message.fileId }
    : { type: 'OFFSCREEN_TRANSFORM_PDF', url: message.url });
  if (!result?.ok) {
    throw new Error(result?.error || 'PDFの変換に失敗しました。');
  }
  await openResultInSourceWindow(result.url, sourceWindowId, chromeApi);
  return { ok: true };
}

export async function transformStagedPdfRequest(message, chromeApi = chrome) {
  return transformRequest({ ...message, type: 'TRANSFORM_STAGED_PDF' }, undefined, chromeApi);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const isPopupRequest = message?.type === 'TRANSFORM_PDF';
  const isToshinRequest = message?.type === 'TRANSFORM_TOSHIN_PDF';
  const isStagedFileRequest = message?.type === 'TRANSFORM_STAGED_PDF';
  if (!isPopupRequest && !isToshinRequest && !isStagedFileRequest) return undefined;

  if (isToshinRequest && !validateToshinTransformRequest(message.url, sender?.tab?.url || '')) {
    sendResponse({ ok: false, error: '東進の問題PDFとして確認できないURLです。' });
    return false;
  }

  transformRequest(message, sender, chrome)
    .then(sendResponse)
    .catch((error) => sendResponse({ ok: false, error: error?.message || String(error) }));

  return true;
});
