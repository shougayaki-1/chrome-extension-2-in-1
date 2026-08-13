import { detectPdfInPage } from './detect-pdf.js';
import {
  assertFileSchemeAccessAllowed,
  choosePdfUrl,
  getOptionalOriginPattern,
  isFetchablePdfCandidate,
  needsOptionalHostPermission
} from './popup-logic.js';

const status = document.querySelector('#status');
const source = document.querySelector('#source');
const button = document.querySelector('#open-kokugo');
const chooseFileButton = document.querySelector('#choose-pdf');
const fileInput = document.querySelector('#pdf-file');

let activeTab = null;
let pdfUrl = null;

function showStatus(message, kind = '') {
  status.textContent = message;
  status.dataset.kind = kind;
}

function shortUrl(value) {
  try {
    const url = new URL(value);
    return `${url.hostname}${url.pathname}`;
  } catch {
    return value;
  }
}

async function detectCurrentPdf() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) throw new Error('現在のタブを取得できませんでした。');
  activeTab = tab;

  let detected = null;
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: detectPdfInPage
    });
    detected = results?.[0]?.result || null;
  } catch {
  }

  pdfUrl = choosePdfUrl(tab.url, detected);
  if (!detected && !isFetchablePdfCandidate(pdfUrl)) {
    throw new Error('このページからPDFを見つけられませんでした。PDFを開いた状態で試してください。');
  }

  source.textContent = detected ? shortUrl(pdfUrl) : `${shortUrl(pdfUrl)}（未確認）`;
  button.disabled = false;
  showStatus('右→左の2in1に変換します。');
}

async function requestPermissionIfNeeded() {
  const parsedPdf = new URL(pdfUrl);
  if (parsedPdf.protocol === 'file:') {
    const allowed = await chrome.extension.isAllowedFileSchemeAccess();
    assertFileSchemeAccessAllowed(pdfUrl, allowed);
    return;
  }

  if (!needsOptionalHostPermission(activeTab.url, pdfUrl)) return;
  const origin = getOptionalOriginPattern(pdfUrl);
  const alreadyGranted = await chrome.permissions.contains({ origins: [origin] });
  if (alreadyGranted) return;

  const granted = await chrome.permissions.request({ origins: [origin] });
  if (!granted) throw new Error('PDFを取得するためのサイト権限が必要です。');
}

button.addEventListener('click', async () => {
  button.disabled = true;
  showStatus('変換しています…');
  try {
    await requestPermissionIfNeeded();
    const result = await chrome.runtime.sendMessage({
      type: 'TRANSFORM_PDF',
      url: pdfUrl,
      windowId: activeTab.windowId
    });
    if (!result?.ok) throw new Error(result?.error || 'PDFの変換に失敗しました。');
    showStatus('新しいタブで開きました。', 'success');
    setTimeout(() => window.close(), 350);
  } catch (error) {
    showStatus(error?.message || String(error), 'error');
    button.disabled = false;
  }
});

chooseFileButton.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', async () => {
  const [file] = fileInput.files;
  if (!file) return;

  chooseFileButton.disabled = true;
  source.textContent = file.name;
  showStatus('変換しています…');
  try {
    if (!activeTab) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) throw new Error('現在のタブを取得できませんでした。');
      activeTab = tab;
    }
    const result = await chrome.runtime.sendMessage({
      type: 'TRANSFORM_PDF_BYTES',
      bytes: await file.arrayBuffer(),
      windowId: activeTab.windowId
    });
    if (!result?.ok) throw new Error(result?.error || 'PDFの変換に失敗しました。');
    showStatus('新しいタブで開きました。', 'success');
    setTimeout(() => window.close(), 350);
  } catch (error) {
    showStatus(error?.message || String(error), 'error');
    chooseFileButton.disabled = false;
  } finally {
    fileInput.value = '';
  }
});

detectCurrentPdf().catch((error) => {
  showStatus(error?.message || String(error), 'error');
  button.disabled = true;
});
