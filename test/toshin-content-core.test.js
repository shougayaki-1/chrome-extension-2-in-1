import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

async function loadCore() {
  const source = await readFile(new URL('../src/toshin-content-core.js', import.meta.url), 'utf8');
  const context = { URL, globalThis: {} };
  vm.runInNewContext(source, context, { filename: 'toshin-content-core.js' });
  return context.globalThis.KokugoToshinCore;
}

function fakeElement({ attribute, rawUrl, textContent = '' }) {
  return { textContent, getAttribute(name) { return name === attribute ? rawUrl : null; } };
}

test('Toshin print page matcher accepts both OPSTTS and OPCTTS paths', async () => {
  const core = await loadCore();
  assert.equal(core.isToshinPrintPage('https://pos.toshin.com/OPSTTS/OPSTTS_Student/MondaiKaitoInsatsu?x=1'), true);
  assert.equal(core.isToshinPrintPage('https://pos.toshin.com/TGT/OPCTTS/OPCTTS_Student/MondaiKaitoInsatsu?x=1'), true);
  assert.equal(core.isToshinPrintPage('https://pos.toshin.com/TGT/OPCTTS/OPCTTS_Student/Home'), false);
});

test('findPdfUrlFromDocument detects GetMondaiPdf from object[data]', async () => {
  const core = await loadCore();
  const doc = {
    baseURI: 'https://pos.toshin.com/TGT/OPCTTS/OPCTTS_Student/MondaiKaitoInsatsu?x=1',
    querySelectorAll(selector) {
      if (selector === 'object[data], embed[src], iframe[src]') return [fakeElement({ attribute: 'data', rawUrl: '/TGT/OPCTTS/OPCTTS_Student/Contents/GetMondaiPdf?daimonId=abc' })];
      return [];
    }
  };
  assert.equal(core.findPdfUrlFromDocument(doc), 'https://pos.toshin.com/TGT/OPCTTS/OPCTTS_Student/Contents/GetMondaiPdf?daimonId=abc');
});

test('findPdfUrlFromDocument falls back to hidden PDF download link', async () => {
  const core = await loadCore();
  const doc = {
    baseURI: 'https://pos.toshin.com/TGT/OPCTTS/OPCTTS_Student/MondaiKaitoInsatsu?x=1',
    querySelectorAll(selector) {
      if (selector === 'object[data], embed[src], iframe[src]') return [];
      if (selector === 'a[href]') return [fakeElement({ attribute: 'href', rawUrl: '/TGT/OPCTTS/OPCTTS_Student/Contents/GetMondaiPdf?daimonId=xyz', textContent: 'PDFダウンロード' })];
      return [];
    }
  };
  assert.equal(core.findPdfUrlFromDocument(doc), 'https://pos.toshin.com/TGT/OPCTTS/OPCTTS_Student/Contents/GetMondaiPdf?daimonId=xyz');
});
