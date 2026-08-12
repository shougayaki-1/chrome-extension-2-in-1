import test from 'node:test';
import assert from 'node:assert/strict';
import { detectPdfInPage } from '../src/detect-pdf.js';

function fakeElement({ rawUrl, type = '', width = 100, height = 100, attribute, textContent = '' }) {
  return {
    type,
    textContent,
    getAttribute(name) {
      return name === attribute ? rawUrl : null;
    },
    getBoundingClientRect() {
      return { width, height };
    }
  };
}

function withFakeDocument({ baseURI = 'https://example.com/lesson/', selectors = {} }, fn) {
  const original = globalThis.document;
  globalThis.document = {
    baseURI,
    querySelectorAll(selector) {
      return selectors[selector] ?? [];
    }
  };
  try {
    return fn();
  } finally {
    globalThis.document = original;
  }
}

test('detectPdfInPage returns the largest embedded PDF candidate', () => {
  const result = withFakeDocument({ selectors: { 'embed[src]': [
    fakeElement({ rawUrl: 'small.pdf', type: 'application/pdf', width: 200, height: 200, attribute: 'src' }),
    fakeElement({ rawUrl: '/big.pdf', type: 'application/pdf', width: 900, height: 700, attribute: 'src' })
  ] } }, detectPdfInPage);
  assert.equal(result.url, 'https://example.com/big.pdf');
  assert.equal(result.kind, 'embed');
});

test('detectPdfInPage detects object[data] and iframe PDF URLs by extension', () => {
  const result = withFakeDocument({ selectors: {
    'object[data]': [fakeElement({ rawUrl: 'notes.pdf?token=abc', width: 300, height: 300, attribute: 'data' })],
    'iframe[src]': [fakeElement({ rawUrl: 'https://cdn.example.org/problem.PDF#page=2', width: 500, height: 500, attribute: 'src' })]
  } }, detectPdfInPage);
  assert.equal(result.url, 'https://cdn.example.org/problem.PDF#page=2');
  assert.equal(result.kind, 'iframe');
});

test('detectPdfInPage ignores non-PDF embeds', () => {
  const result = withFakeDocument({ selectors: { 'iframe[src]': [fakeElement({ rawUrl: 'https://video.example.org/watch', width: 1000, height: 800, attribute: 'src' })] } }, detectPdfInPage);
  assert.equal(result, null);
});

test('detectPdfInPage keeps blob PDF candidates when type identifies them', () => {
  const result = withFakeDocument({ selectors: { 'embed[src]': [fakeElement({ rawUrl: 'blob:https://example.com/abc', type: 'application/pdf', width: 600, height: 800, attribute: 'src' })] } }, detectPdfInPage);
  assert.equal(result.url, 'blob:https://example.com/abc');
});

test('detectPdfInPage detects PDF endpoints without a .pdf extension used by Toshin', () => {
  const result = withFakeDocument({
    baseURI: 'https://pos.toshin.com/OPSTTS/OPSTTS_Student/MondaiKaitoInsatsu',
    selectors: { 'object[data]': [fakeElement({ rawUrl: '/OPSTTS/OPSTTS_Student/Contents/GetMondaiPdf?daimonId=abc&kozaCd=2683', width: 900, height: 700, attribute: 'data' })] }
  }, detectPdfInPage);
  assert.equal(result.url, 'https://pos.toshin.com/OPSTTS/OPSTTS_Student/Contents/GetMondaiPdf?daimonId=abc&kozaCd=2683');
  assert.equal(result.kind, 'object');
});

test('detectPdfInPage falls back to a direct PDF download link like the Toshin print page', () => {
  const result = withFakeDocument({
    baseURI: 'https://pos.toshin.com/OPSTTS/OPSTTS_Student/MondaiKaitoInsatsu',
    selectors: {
      'object[data]': [fakeElement({ rawUrl: './saved/GetMondaiPdf.html', width: 900, height: 700, attribute: 'data' })],
      'a[href]': [fakeElement({ rawUrl: '/OPSTTS/OPSTTS_Student/Contents/GetMondaiPdf?daimonId=abc&kozaCd=2683', attribute: 'href', textContent: 'PDFダウンロード' })]
    }
  }, detectPdfInPage);
  assert.equal(result.url, 'https://pos.toshin.com/OPSTTS/OPSTTS_Student/Contents/GetMondaiPdf?daimonId=abc&kozaCd=2683');
  assert.equal(result.kind, 'link');
});
