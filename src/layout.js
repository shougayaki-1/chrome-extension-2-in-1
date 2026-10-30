export function fitPage(sourceWidth, sourceHeight, box) {
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    throw new Error('Page dimensions must be positive.');
  }

  const scale = Math.min(box.width / sourceWidth, box.height / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;

  return {
    x: box.x + (box.width - width) / 2,
    y: box.y + (box.height - height) / 2,
    width,
    height
  };
}

export function createSpreadPlan(pageSizes, direction = 'rtl') {
  if (!Array.isArray(pageSizes) || pageSizes.length === 0) {
    throw new Error('PDF must contain at least one page.');
  }

  if (!['rtl', 'ltr'].includes(direction)) {
    throw new Error('Invalid page direction.');
  }

  const first = pageSizes[0];
  const sheet = first.height >= first.width
    ? { width: first.height, height: first.width }
    : { width: first.width, height: first.height };

  const halfWidth = sheet.width / 2;
  const leftBox = { x: 0, y: 0, width: halfWidth, height: sheet.height };
  const rightBox = { x: halfWidth, y: 0, width: halfWidth, height: sheet.height };
  const spreads = [];

  for (let pageIndex = 0; pageIndex < pageSizes.length; pageIndex += 2) {
    const leftIndex = direction === 'ltr' ? pageIndex : pageIndex + 1;
    const rightIndex = direction === 'rtl' ? pageIndex : pageIndex + 1;
    const place = (index, box) => index < pageSizes.length
      ? { pageIndex: index, ...fitPage(pageSizes[index].width, pageSizes[index].height, box) }
      : null;

    spreads.push({ left: place(leftIndex, leftBox), right: place(rightIndex, rightBox) });
  }

  return { sheet, spreads };
}
