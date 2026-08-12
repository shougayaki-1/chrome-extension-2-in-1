import test from 'node:test';
import assert from 'node:assert/strict';
import { validateToshinTransformRequest } from '../src/toshin-message.js';

test('allows same-origin GetMondaiPdf from a Toshin print tab', () => {
  assert.equal(validateToshinTransformRequest('https://pos.toshin.com/TGT/OPCTTS/OPCTTS_Student/Contents/GetMondaiPdf?x=1', 'https://pos.toshin.com/TGT/OPCTTS/OPCTTS_Student/MondaiKaitoInsatsu?x=1'), true);
});

test('rejects external URLs and non-Toshin sender tabs', () => {
  assert.equal(validateToshinTransformRequest('https://evil.example/file.pdf', 'https://pos.toshin.com/TGT/OPCTTS/OPCTTS_Student/MondaiKaitoInsatsu?x=1'), false);
  assert.equal(validateToshinTransformRequest('https://pos.toshin.com/file.pdf', 'https://evil.example/'), false);
});
