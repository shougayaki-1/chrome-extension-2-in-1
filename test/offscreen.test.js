import test from 'node:test';
import assert from 'node:assert/strict';
import { transformStagedPdf } from '../src/offscreen.js';

test('a staged PDF is deleted when its transformation fails', async () => {
  const deleted = [];
  const fileStore = {
    async retrieve(id) {
      assert.equal(id, 'selected-pdf-42');
      return new Blob([new TextEncoder().encode('%PDF-1.7')], { type: 'application/pdf' });
    },
    async delete(id) {
      deleted.push(id);
    }
  };

  await assert.rejects(
    transformStagedPdf('selected-pdf-42', {
      fileStore,
      transform: async () => { throw new Error('transform failed'); }
    }),
    /transform failed/
  );
  assert.deepEqual(deleted, ['selected-pdf-42']);
});

test('a staged PDF passes the requested reading direction to the transformer', async () => {
  const seen = [];
  const result = await transformStagedPdf('selected-pdf-42', {
    direction: 'ltr',
    fileStore: {
      async retrieve() { return new Blob([new TextEncoder().encode('%PDF-1.7')]); },
      async delete() { seen.push('deleted'); }
    },
    async transform(_bytes, direction) {
      seen.push(direction);
      return 'blob:converted';
    }
  });
  assert.equal(result, 'blob:converted');
  assert.deepEqual(seen, ['ltr', 'deleted']);
});
