import { USAGE_KEY, summarizeUsage } from './usage-report.js';
import { detectPdfInPage } from './detect-pdf.js';
import { createConversionControlState } from './conversion-control-state.js';
import {
  assertFileSchemeAccessAllowed,
  choosePdfUrl,
  createStagedPdfTransformRequest,
  getOptionalOriginPattern,
  isFetchablePdfCandidate,
  needsOptionalHostPermission
} from './popup-logic.js';
import { createSelectedPdfStore } from './selected-pdf-store.js';

const status = document.querySelector('#status');
const source = document.querySelector('#source');
const button = document.querySelector('#open-kokugo');
const chooseFileButton = document.querySelector('#choose-pdf');
const fileInput = document.querySelector('#pdf-file');
const direction = document.querySelector('#direction');
const previewPages = document.querySelectorAll('.preview div');

direction.addEventListener('change', () => {
  const rtl = direction.value === 'rtl';
  previewPages[0].textContent = rtl ? '2' : '1';
  previewPages[1].textContent = rtl ? '1' : '2';
});

let activeTab = null;
let pdfUrl = null;
const controls = createConversionControlState({ urlButton: button, fileButton: chooseFileButton });
const selectedPdfStore = createSelectedPdfStore();

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
  controls.setUrlAvailable(true);
  showStatus('ページの順序を選んで変換できます。');
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
  if (!controls.start()) return;
  showStatus('変換しています…');
  try {
    await requestPermissionIfNeeded();
    const result = await chrome.runtime.sendMessage({
      type: 'TRANSFORM_PDF',
      url: pdfUrl,
      direction: direction.value,
      windowId: activeTab.windowId
    });
    if (!result?.ok) throw new Error(result?.error || 'PDFの変換に失敗しました。');
    showStatus('新しいタブで開きました。', 'success');
    setTimeout(() => window.close(), 350);
  } catch (error) {
    showStatus(error?.message || String(error), 'error');
  } finally {
    controls.finish();
  }
});

chooseFileButton.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', async () => {
  const [file] = fileInput.files;
  if (!file) return;

  if (!controls.start()) return;
  let fileId = null;
  source.textContent = file.name;
  showStatus('変換しています…');
  try {
    if (!activeTab) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) throw new Error('現在のタブを取得できませんでした。');
      activeTab = tab;
    }
    fileId = await selectedPdfStore.stage(file);
    const result = await chrome.runtime.sendMessage(createStagedPdfTransformRequest(fileId, activeTab.windowId, direction.value));
    if (!result?.ok) throw new Error(result?.error || 'PDFの変換に失敗しました。');
    showStatus('新しいタブで開きました。', 'success');
    setTimeout(() => window.close(), 350);
  } catch (error) {
    if (fileId) await selectedPdfStore.delete(fileId);
    showStatus(error?.message || String(error), 'error');
  } finally {
    controls.finish();
    fileInput.value = '';
  }
});

detectCurrentPdf().catch((error) => {
  showStatus(error?.message || String(error), 'error');
  controls.setUrlAvailable(false);
});

async function showUsageReport() {
  const reportElement = document.querySelector('#usage-report');
  try {
    const stored = await chrome.storage.local.get(USAGE_KEY);
    const report = summarizeUsage(stored[USAGE_KEY]);
    reportElement.textContent = `累計 ${report.total}回（今日 ${report.today}回） / 右→左 ${report.rtl}回・左→右 ${report.ltr}回`;
  } catch {
    reportElement.textContent = '利用回数を読み込めませんでした。';
  }
}

showUsageReport();
