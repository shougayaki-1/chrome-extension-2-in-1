export function choosePdfUrl(tabUrl, detectedPdf) {
  return detectedPdf?.url || tabUrl;
}

export function isDirectPdfTabUrl(value) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:', 'file:'].includes(url.protocol)) return false;
    return url.pathname.toLowerCase().endsWith('.pdf');
  } catch {
    return false;
  }
}

export function isFetchablePdfCandidate(value) {
  try {
    return ['http:', 'https:', 'file:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

export function assertFileSchemeAccessAllowed(pdfUrl, allowed) {
  const url = new URL(pdfUrl);
  if (url.protocol === 'file:' && !allowed) {
    throw new Error(
      'ローカルPDFを使用するには、Chromeの拡張機能設定で「ファイルの URL へのアクセスを許可」をONにしてください。'
    );
  }
}

export function getOptionalOriginPattern(pdfUrl) {
  const url = new URL(pdfUrl);
  if (url.protocol === 'blob:') {
    throw new Error('blob URLで埋め込まれたPDFは、この初期版では変換できません。');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('このPDFのURL形式には対応していません。');
  }
  return `${url.origin}/*`;
}

export function needsOptionalHostPermission(tabUrl, pdfUrl) {
  const page = new URL(tabUrl);
  const pdf = new URL(pdfUrl);

  if (pdf.protocol === 'file:') return false;
  if (pdf.protocol !== 'http:' && pdf.protocol !== 'https:') return true;

  return page.origin !== pdf.origin;
}
