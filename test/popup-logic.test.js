import test from 'node:test';
import assert from 'node:assert/strict';
import { assertFileSchemeAccessAllowed, choosePdfUrl, getOptionalOriginPattern, isDirectPdfTabUrl, isFetchablePdfCandidate, needsOptionalHostPermission } from '../src/popup-logic.js';

test('choosePdfUrl prefers a detected embedded PDF over the tab URL', () => assert.equal(choosePdfUrl('https://school.example/page', { url: 'https://cdn.example/file.pdf' }), 'https://cdn.example/file.pdf'));
test('choosePdfUrl falls back to the current tab URL', () => assert.equal(choosePdfUrl('https://school.example/file.pdf', null), 'https://school.example/file.pdf'));
test('isFetchablePdfCandidate accepts an extensionless HTTPS PDF endpoint', () => {
  assert.equal(isFetchablePdfCandidate('https://pos.toshin.com/Contents/GetMondaiPdf?daimonId=abc'), true);
});
test('getOptionalOriginPattern scopes permission to the exact origin', () => assert.equal(getOptionalOriginPattern('https://cdn.example:8443/path/file.pdf'), 'https://cdn.example:8443/*'));
test('needsOptionalHostPermission is false for same-origin HTTP URLs', () => assert.equal(needsOptionalHostPermission('https://school.example/page', 'https://school.example/file.pdf'), false));
test('needsOptionalHostPermission is true for a cross-origin PDF', () => assert.equal(needsOptionalHostPermission('https://school.example/page', 'https://cdn.example/file.pdf'), true));
test('getOptionalOriginPattern rejects blob URLs with a clear error', () => assert.throws(() => getOptionalOriginPattern('blob:https://school.example/123'), /blob/i));
test('isDirectPdfTabUrl accepts a local PDF opened in Chrome', () => assert.equal(isDirectPdfTabUrl('file:///Users/student/Downloads/kokugo.PDF'), true));
test('isDirectPdfTabUrl rejects a non-PDF local file', () => assert.equal(isDirectPdfTabUrl('file:///Users/student/Downloads/notes.txt'), false));
test('needsOptionalHostPermission is false for a local PDF', () => assert.equal(needsOptionalHostPermission('file:///Users/student/Downloads/kokugo.pdf', 'file:///Users/student/Downloads/kokugo.pdf'), false));
test('assertFileSchemeAccessAllowed explains how to enable local PDF access', () => {
  assert.throws(() => assertFileSchemeAccessAllowed('file:///Users/student/Downloads/kokugo.pdf', false), /「ファイルの URL へのアクセスを許可」をON/);
  assert.doesNotThrow(() => assertFileSchemeAccessAllowed('file:///Users/student/Downloads/kokugo.pdf', true));
});
