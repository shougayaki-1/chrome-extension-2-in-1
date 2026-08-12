export function validateToshinTransformRequest(pdfUrl, senderUrl) {
  try {
    const pdf = new URL(pdfUrl);
    const sender = new URL(senderUrl);
    if (sender.protocol !== 'https:' || sender.hostname !== 'pos.toshin.com') return false;
    if (pdf.protocol !== 'https:' || pdf.origin !== sender.origin) return false;
    const path = pdf.pathname.toLowerCase();
    return path.includes('getmondaipdf') || path.endsWith('.pdf');
  } catch {
    return false;
  }
}
