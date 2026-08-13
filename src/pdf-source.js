const PDF_SIGNATURE = new TextEncoder().encode('%PDF-');

export function isPdfBytes(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const scanLength = Math.min(bytes.length, 1024);

  outer:
  for (let index = 0; index <= scanLength - PDF_SIGNATURE.length; index += 1) {
    for (let offset = 0; offset < PDF_SIGNATURE.length; offset += 1) {
      if (bytes[index + offset] !== PDF_SIGNATURE[offset]) continue outer;
    }
    return true;
  }

  return false;
}

export async function fetchPdfBytes(url, fetchImpl = fetch) {
  const response = await fetchImpl(url, {
    credentials: 'include',
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`PDFの取得に失敗しました（HTTP ${response.status}）。`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!isPdfBytes(bytes)) {
    throw new Error('取得したデータはPDFではありません。ログイン状態やPDFのURLを確認してください。');
  }

  return bytes;
}
