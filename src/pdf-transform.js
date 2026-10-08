import { createSpreadPlan } from './layout.js';

function getPageGeometry(page) {
  // Viewers display the intersection of CropBox and MediaBox, after /Rotate.
  const media = page.getMediaBox();
  const crop = page.getCropBox();
  const left = Math.max(media.x, crop.x);
  const bottom = Math.max(media.y, crop.y);
  const right = Math.min(media.x + media.width, crop.x + crop.width);
  const top = Math.min(media.y + media.height, crop.y + crop.height);
  const rotation = ((page.getRotation().angle % 360) + 360) % 360;
  if (![0, 90, 180, 270].includes(rotation)) {
    throw new Error('PDF page rotation must be a multiple of 90 degrees.');
  }
  const width = right - left;
  const height = top - bottom;
  if (width <= 0 || height <= 0) {
    throw new Error('PDF page display area must have positive dimensions.');
  }
  return {
    boundingBox: { left, bottom, right, top },
    rotation,
    size: rotation % 180 === 0 ? { width, height } : { width: height, height: width }
  };
}

function drawPlacement(page, placement, rotation) {
  if (!placement) return;
  const { pageIndex: _pageIndex, ...options } = placement;
  // PDF /Rotate is clockwise; drawPage's angle is counterclockwise.
  // Move the drawing origin so the rotated page stays inside its fitted box.
  if (rotation === 90 || rotation === 270) {
    options.width = placement.height;
    options.height = placement.width;
  }
  if (rotation === 90) options.y += placement.height;
  if (rotation === 180) {
    options.x += placement.width;
    options.y += placement.height;
  }
  if (rotation === 270) options.x += placement.width;
  options.rotate = { type: 'degrees', angle: -rotation };
  page.target.drawPage(page.embedded, options);
}

export async function transformPdfWithLibrary(inputBytes, PDFDocument) {
  const source = await PDFDocument.load(inputBytes);
  const sourcePages = source.getPages();
  if (sourcePages.length === 0) {
    throw new Error('PDF must contain at least one page.');
  }

  const output = await PDFDocument.create();
  const geometries = sourcePages.map(getPageGeometry);
  const embeddedPages = await output.embedPages(sourcePages, geometries.map(({ boundingBox }) => boundingBox));
  const plan = createSpreadPlan(geometries.map(({ size }) => size));

  for (const spread of plan.spreads) {
    const target = output.addPage([plan.sheet.width, plan.sheet.height]);

    if (spread.left) {
      drawPlacement({ target, embedded: embeddedPages[spread.left.pageIndex] }, spread.left,
        geometries[spread.left.pageIndex].rotation);
    }
    drawPlacement({ target, embedded: embeddedPages[spread.right.pageIndex] }, spread.right,
      geometries[spread.right.pageIndex].rotation);
  }

  return output.save();
}
