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

export function createSpreadPlan(pageSizes) {
  if (!Array.isArray(pageSizes) || pageSizes.length === 0) {
    throw new Error('PDF must contain at least one page.');
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
    const rightSize = pageSizes[pageIndex];
    const right = {
      pageIndex,
      ...fitPage(rightSize.width, rightSize.height, rightBox)
    };

    let left = null;
    if (pageIndex + 1 < pageSizes.length) {
      const leftSize = pageSizes[pageIndex + 1];
      left = {
        pageIndex: pageIndex + 1,
        ...fitPage(leftSize.width, leftSize.height, leftBox)
      };
    }

    spreads.push({ left, right });
  }

  return { sheet, spreads };
}
