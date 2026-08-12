export function detectPdfInPage() {
  const specs = [
    { selector: 'embed[src]', attribute: 'src', kind: 'embed' },
    { selector: 'object[data]', attribute: 'data', kind: 'object' },
    { selector: 'iframe[src]', attribute: 'src', kind: 'iframe' }
  ];
  const candidates = [];

  for (const spec of specs) {
    for (const element of document.querySelectorAll(spec.selector)) {
      const rawUrl = element.getAttribute(spec.attribute);
      if (!rawUrl) continue;

      let url;
      try {
        url = new URL(rawUrl, document.baseURI);
      } catch {
        continue;
      }

      const type = String(element.type || element.getAttribute?.('type') || '').toLowerCase();
      const isPdfType = type.includes('application/pdf');
      const lastPathSegment = url.pathname.toLowerCase().split('/').pop() || '';
      const isPdfPath = lastPathSegment.endsWith('.pdf') || lastPathSegment.endsWith('pdf');
      if (!isPdfType && !isPdfPath) continue;

      const rect = element.getBoundingClientRect();
      candidates.push({
        url: url.href,
        kind: spec.kind,
        area: Math.max(0, rect.width) * Math.max(0, rect.height)
      });
    }
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.area - a.area);
    const { url, kind } = candidates[0];
    return { url, kind };
  }

  for (const element of document.querySelectorAll('a[href]')) {
    const rawUrl = element.getAttribute('href');
    if (!rawUrl) continue;

    let url;
    try {
      url = new URL(rawUrl, document.baseURI);
    } catch {
      continue;
    }

    const lastPathSegment = url.pathname.toLowerCase().split('/').pop() || '';
    const label = String(element.textContent || '').toLowerCase();
    const isPdfFile = lastPathSegment.endsWith('.pdf');
    const isNamedPdfEndpoint = lastPathSegment.endsWith('pdf') && label.includes('pdf');
    if (!isPdfFile && !isNamedPdfEndpoint) continue;

    return { url: url.href, kind: 'link' };
  }

  return null;
}
