import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transformPdfWithLibrary } from '../src/pdf-transform.js';

function createFakePdfLibrary(pageSizes) {
  const calls = { drawPage: [], addPage: [], embedPages: null, boundingBoxes: null };
  const sourcePages = pageSizes.map(({ rotation = 0, crop, x = 0, y = 0, ...size }, index) => ({
    index,
    getMediaBox: () => ({ x, y, ...size }),
    getCropBox: () => crop ?? ({ x, y, ...size }),
    getRotation: () => ({ angle: rotation })
  }));
  const embeddedPages = sourcePages.map((page) => ({ embeddedIndex: page.index }));
  const output = {
    async embedPages(pages, boxes) { calls.embedPages = pages; calls.boundingBoxes = boxes; return embeddedPages; },
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

test('rotated landscape source pages are fitted using their displayed portrait dimensions', async () => {
  const { PDFDocument, calls } = createFakePdfLibrary([
    { width: 728.4, height: 516, rotation: 270 },
    { width: 728.4, height: 516, rotation: 270 }
  ]);
  await transformPdfWithLibrary(new Uint8Array([1]), PDFDocument);
  assert.deepEqual(calls.addPage, [[728.4, 516]]);
  const [left, right] = calls.drawPage.map(({ options }) => options);
  assert.equal(left.rotate.angle, -270);
  assert.equal(right.rotate.angle, -270);
  assert.ok(Math.abs(left.width - 728.4 * (364.2 / 516)) < 1e-9);
  assert.equal(left.height, 364.2);
  assert.equal(left.x, 364.2);
  assert.equal(right.x, 728.4);
});

test('rotation origins keep every quarter turn within its fitted box', async () => {
  const { PDFDocument, calls } = createFakePdfLibrary([0, 90, 180, -90].map((rotation) => ({
    width: 400, height: 600, rotation
  })));
  await transformPdfWithLibrary(new Uint8Array([1]), PDFDocument);
  for (const { page, options } of calls.drawPage) {
    const angle = options.rotate.angle * Math.PI / 180;
    const corners = [[0, 0], [options.width, 0], [0, options.height], [options.width, options.height]];
    const points = corners.map(([x, y]) => ({
      x: options.x + x * Math.cos(angle) - y * Math.sin(angle),
      y: options.y + x * Math.sin(angle) + y * Math.cos(angle)
    }));
    const boxX = page.embeddedIndex % 2 === 0 ? 300 : 0;
    for (const point of points) {
      assert.ok(point.x >= boxX - 1e-9 && point.x <= boxX + 300 + 1e-9);
      assert.ok(point.y >= -1e-9 && point.y <= 400 + 1e-9);
    }
  }
});

test('embedding clips to the visible crop area with a nonzero media origin', async () => {
  const { PDFDocument, calls } = createFakePdfLibrary([
    { x: 100, y: -50, width: 600, height: 800, crop: { x: 50, y: 0, width: 450, height: 600 } }
  ]);
  await transformPdfWithLibrary(new Uint8Array([1]), PDFDocument);
  assert.deepEqual(calls.boundingBoxes, [{ left: 100, bottom: 0, right: 500, top: 600 }]);
  assert.deepEqual(calls.addPage, [[600, 400]]);
});

test('real pdf-lib preserves rotation and crop bounds through saving and reloading', async () => {
  // Exercise the exact bundled library used by Chrome, without another dependency.
  const lib = {};
  const code = await readFile(new URL('../vendor/pdf-lib.min.js', import.meta.url), 'utf8');
  new Function('exports', 'module', code)(lib, { exports: lib });
  const source = await lib.PDFDocument.create();
  for (const angle of [0, 90, 180, 270]) {
    const page = source.addPage([800, 600]);
    page.setMediaBox(100, -50, 800, 600);
    page.setCropBox(150, 0, 600, 400);
    page.setRotation(lib.degrees(angle));
    page.drawRectangle({ x: 150, y: 0, width: 600, height: 400, color: lib.rgb(1, 0, 0) });
  }
  const bytes = await transformPdfWithLibrary(await source.save(), lib.PDFDocument);
  const result = await lib.PDFDocument.load(bytes);
  assert.equal(result.getPageCount(), 2);
  const rotations = [];
  for (const page of result.getPages()) {
    assert.deepEqual(page.getSize(), { width: 600, height: 400 });
    const objects = page.node.Resources().lookup(lib.PDFName.of('XObject'), lib.PDFDict);
    assert.equal(objects.entries().length, 2);
    for (const [, ref] of objects.entries()) {
      const form = result.context.lookup(ref);
      assert.deepEqual(form.dict.lookup(lib.PDFName.of('BBox'), lib.PDFArray).asArray().map((n) => n.asNumber()),
        [150, 0, 750, 400]);
      assert.deepEqual(form.dict.lookup(lib.PDFName.of('Matrix'), lib.PDFArray).asArray().map((n) => n.asNumber()),
        [1, 0, 0, 1, -150, 0]);
    }
    const streams = page.node.Contents();
    const content = Array.from({ length: streams.size() }, (_, i) =>
      new TextDecoder().decode(lib.decodePDFRawStream(streams.lookup(i)).decode())).join('\n');
    const matrices = [...content.matchAll(/^(.+) cm$/gm)].map((m) => m[1].split(' ').map(Number));
    // Each draw emits translation, rotation, scaling, skewing, then Do.
    rotations.push(matrices[1].slice(0, 4), matrices[5].slice(0, 4));
  }
  const expected = [[0, -1, 1, 0], [1, 0, 0, 1], [0, 1, -1, 0], [-1, 0, 0, -1]];
  rotations.forEach((matrix, i) => matrix.forEach((value, j) =>
    assert.ok(Math.abs(value - expected[i][j]) < 1e-9)));
});

test('invalid display areas are rejected rather than producing broken output', async () => {
  const { PDFDocument } = createFakePdfLibrary([
    { width: 400, height: 600, crop: { x: 500, y: 0, width: 100, height: 100 } }
  ]);
  await assert.rejects(transformPdfWithLibrary(new Uint8Array([1]), PDFDocument), /display area/);
});
