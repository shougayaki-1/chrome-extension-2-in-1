import test from 'node:test';
import assert from 'node:assert/strict';
import { createSelectedPdfStore } from '../src/selected-pdf-store.js';

function createMemoryDatabase() {
  const records = new Map();
  return {
    async put(record) { records.set(record.id, record); },
    async get(id) { return records.get(id); },
    async delete(id) { records.delete(id); }
  };
}

test('staged selected files are addressed by an identifier and can be removed', async () => {
  const database = createMemoryDatabase();
  const store = createSelectedPdfStore({ database, createId: () => 'selected-pdf-42' });
  const file = new Blob([new TextEncoder().encode('%PDF-1.7')], { type: 'application/pdf' });

  const id = await store.stage(file);
  assert.equal(id, 'selected-pdf-42');
  assert.equal(await store.retrieve(id), file);

  await store.delete(id);
  assert.equal(await store.retrieve(id), undefined);
});
