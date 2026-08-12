import { createSpreadPlan } from './layout.js';

function drawPlacement(page, placement) {
  if (!placement) return;
  const { pageIndex: _pageIndex, ...options } = placement;
  page.target.drawPage(page.embedded, options);
}

export async function transformPdfWithLibrary(inputBytes, PDFDocument) {
  const source = await PDFDocument.load(inputBytes);
  const sourcePages = source.getPages();
  if (sourcePages.length === 0) {
    throw new Error('PDF must contain at least one page.');
  }

  const output = await PDFDocument.create();
  const embeddedPages = await output.embedPages(sourcePages);
  const pageSizes = sourcePages.map((page) => page.getSize());
  const plan = createSpreadPlan(pageSizes);

  for (const spread of plan.spreads) {
    const target = output.addPage([plan.sheet.width, plan.sheet.height]);

    if (spread.left) {
      drawPlacement({ target, embedded: embeddedPages[spread.left.pageIndex] }, spread.left);
    }
    drawPlacement({ target, embedded: embeddedPages[spread.right.pageIndex] }, spread.right);
  }

  return output.save();
}
