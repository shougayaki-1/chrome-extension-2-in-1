import { transformPdfWithLibrary } from './pdf-transform.js';

export async function transformPdf(inputBytes, direction = 'rtl') {
  const PDFDocument = globalThis.PDFLib?.PDFDocument;
  if (!PDFDocument) {
    throw new Error('PDF変換ライブラリを読み込めませんでした。拡張機能を再インストールしてください。');
  }
  return transformPdfWithLibrary(inputBytes, PDFDocument, direction);
}
