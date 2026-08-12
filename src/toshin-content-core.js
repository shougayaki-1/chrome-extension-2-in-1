(function attachToshinCore(global) {
  function toUrl(raw, baseURI) {
    if (!raw) return null;
    try {
      return new URL(raw, baseURI);
    } catch {
      return null;
    }
  }

  function isToshinPrintPage(href) {
    const url = toUrl(href, href);
    return Boolean(
      url &&
      url.protocol === 'https:' &&
      url.hostname === 'pos.toshin.com' &&
      /\/MondaiKaitoInsatsu\/?$/i.test(url.pathname)
    );
  }

  function isUsablePdfUrl(url, pageOrigin) {
    if (!url || url.protocol !== 'https:' || url.origin !== pageOrigin) return false;
    const pathname = url.pathname.toLowerCase();
    const lastSegment = pathname.split('/').pop() || '';
    return pathname.includes('getmondaipdf') || lastSegment.endsWith('.pdf');
  }

  function findPdfUrlFromDocument(doc) {
    const base = toUrl(doc.baseURI, doc.baseURI);
    if (!base) return null;

    for (const element of doc.querySelectorAll('object[data], embed[src], iframe[src]')) {
      const raw = element.getAttribute('data') || element.getAttribute('src');
      const url = toUrl(raw, doc.baseURI);
      if (isUsablePdfUrl(url, base.origin)) return url.href;
    }

    for (const element of doc.querySelectorAll('a[href]')) {
      const url = toUrl(element.getAttribute('href'), doc.baseURI);
      if (!isUsablePdfUrl(url, base.origin)) continue;

      const label = String(element.textContent || '').toLowerCase();
      const pathname = url.pathname.toLowerCase();
      if (pathname.includes('getmondaipdf') || label.includes('pdf')) return url.href;
    }

    return null;
  }

  global.KokugoToshinCore = {
    isToshinPrintPage,
    findPdfUrlFromDocument
  };
})(globalThis);
