import test from 'node:test';
import assert from 'node:assert/strict';
import { transformPdfWithLibrary } from '../src/pdf-transform.js';

function createFakePdfLibrary(pageSizes) {
  const calls = { drawPage: [], addPage: [], embedPages: null };
  const sourcePages = pageSizes.map((size, index) => ({ index, getSize: () => ({ ...size }) }));
  const embeddedPages = sourcePages.map((page) => ({ embeddedIndex: page.index }));
  const output = {
    async embedPages(pages) { calls.embedPages = pages; return embeddedPages; },
    addPage(size) {
      calls.addPage.push(size);
      return { drawPage(page, options) { calls.drawPage.push({ page, options }); } };
    },
    async save() { return new Uint8Array([37, 80, 68, 70]); }
  };
  return {
    calls,
    PDFDocument: {
      async load() { return { getPages: () => sourcePages }; },
      async create() { return output; }
    }
  };
}

test('transformPdfWithLibrary draws pages in right-to-left pairs', async () => {
  const { PDFDocument, calls } = createFakePdfLibrary([
    { width: 595, height: 842 }, { width: 595, height: 842 }, { width: 595, height: 842 }
  ]);
  const result = await transformPdfWithLibrary(new Uint8Array([1, 2, 3]), PDFDocument);
  assert.deepEqual([...result], [37, 80, 68, 70]);
  assert.deepEqual(calls.addPage, [[842, 595], [842, 595]]);
  assert.deepEqual(calls.drawPage.map(({ page }) => page.embeddedIndex), [1, 0, 2]);
  const [left, right, lastRight] = calls.drawPage.map(({ options }) => options);
  assert.equal(left.x >= 0 && left.x < 1, true);
  assert.equal(right.x >= 421, true);
  assert.equal(lastRight.x >= 421, true);
});

test('transformPdfWithLibrary rejects a PDF with no pages', async () => {
  const { PDFDocument } = createFakePdfLibrary([]);
  await assert.rejects(transformPdfWithLibrary(new Uint8Array([1]), PDFDocument), /at least one page/i);
});
