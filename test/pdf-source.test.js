import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchPdfBytes, isPdfBytes } from '../src/pdf-source.js';

const encoder = new TextEncoder();

test('isPdfBytes accepts a normal PDF header', () => assert.equal(isPdfBytes(encoder.encode('%PDF-1.7\nhello')), true));
test('isPdfBytes accepts a PDF header found within the first 1024 bytes', () => assert.equal(isPdfBytes(encoder.encode(`${'x'.repeat(40)}%PDF-1.4\nhello`)), true));
test('isPdfBytes rejects HTML', () => assert.equal(isPdfBytes(encoder.encode('<!doctype html><html></html>')), false));

test('fetchPdfBytes includes credentials and accepts PDF bytes even with generic content type', async () => {
  let received;
  const bytes = encoder.encode('%PDF-1.7\nhello');
  const fakeFetch = async (url, options) => {
    received = { url, options };
    return new Response(bytes, { status: 200, headers: { 'content-type': 'application/octet-stream' } });
  };
  const result = await fetchPdfBytes('https://example.com/file', fakeFetch);
  assert.equal(received.url, 'https://example.com/file');
  assert.equal(received.options.credentials, 'include');
  assert.deepEqual(new Uint8Array(result), bytes);
});

test('fetchPdfBytes reports HTTP failures', async () => {
  const fakeFetch = async () => new Response('no', { status: 403 });
  await assert.rejects(fetchPdfBytes('https://example.com/file.pdf', fakeFetch), /403/);
});

test('fetchPdfBytes rejects successful non-PDF responses', async () => {
  const fakeFetch = async () => new Response('<html>login</html>', { status: 200, headers: { 'content-type': 'text/html' } });
  await assert.rejects(fetchPdfBytes('https://example.com/file.pdf', fakeFetch), /PDF/i);
});
