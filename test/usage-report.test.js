import test from 'node:test';
import assert from 'node:assert/strict';
import { createUsageRecorder, summarizeUsage, USAGE_KEY } from '../src/usage-report.js';

test('records concurrent successful uses and resets today on a new local date', async () => {
  let data = {};
  const storage = {
    async get() { await new Promise((resolve) => setTimeout(resolve, 1)); return data; },
    async set(value) { data = { ...data, ...value }; }
  };
  const record = createUsageRecorder(storage);
  const day = new Date(2026, 10, 21, 23);
  await Promise.all([record('rtl', day), record('ltr', day), record('rtl', day)]);
  assert.deepEqual(summarizeUsage(data[USAGE_KEY], day), { total: 3, rtl: 2, ltr: 1, today: 3 });
  const tomorrow = new Date(2026, 10, 22);
  assert.equal(summarizeUsage(data[USAGE_KEY], tomorrow).today, 0);
  await record('ltr', tomorrow);
  assert.deepEqual(summarizeUsage(data[USAGE_KEY], tomorrow), { total: 4, rtl: 2, ltr: 2, today: 1 });
});

test('recording can recover after a storage failure', async () => {
  let attempts = 0;
  const record = createUsageRecorder({
    async get() { if (++attempts === 1) throw new Error('unavailable'); return {}; },
    async set() {}
  });
  await assert.rejects(record('rtl'));
  await assert.doesNotReject(record('rtl'));
});
