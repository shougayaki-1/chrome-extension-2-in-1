import test from 'node:test';
import assert from 'node:assert/strict';
import { openResultInSourceWindow, resolveSourceWindowId } from '../src/window-target.js';

test('resolveSourceWindowId prefers explicit popup window id', () => assert.equal(resolveSourceWindowId(42, 7), 42));
test('resolveSourceWindowId uses sender tab window id for content script requests', () => assert.equal(resolveSourceWindowId(undefined, 7), 7));
test('resolveSourceWindowId accepts zero as a concrete Chrome window id', () => {
  assert.equal(resolveSourceWindowId(0, undefined), 0);
  assert.equal(resolveSourceWindowId(undefined, 0), 0);
});
test('resolveSourceWindowId returns null for missing or sentinel window ids', () => {
  assert.equal(resolveSourceWindowId(undefined, undefined), null);
  assert.equal(resolveSourceWindowId(-1, -2), null);
});

test('openResultInSourceWindow creates an active tab in source window and focuses it', async () => {
  const calls = [];
  const chromeApi = {
    tabs: { create: async (options) => { calls.push(['tabs.create', options]); return { id: 123 }; } },
    windows: { update: async (windowId, options) => { calls.push(['windows.update', windowId, options]); } }
  };
  await openResultInSourceWindow('blob:result', 42, chromeApi);
  assert.deepEqual(calls, [
    ['tabs.create', { windowId: 42, url: 'blob:result', active: true }],
    ['windows.update', 42, { focused: true }]
  ]);
});

test('openResultInSourceWindow falls back when source window no longer exists', async () => {
  const calls = [];
  let first = true;
  const chromeApi = {
    tabs: { create: async (options) => { calls.push(['tabs.create', options]); if (first) { first = false; throw new Error('No window with id: 42.'); } return { id: 124 }; } },
    windows: { update: async () => { throw new Error('should not be called after failed targeted create'); } }
  };
  await openResultInSourceWindow('blob:result', 42, chromeApi);
  assert.deepEqual(calls, [
    ['tabs.create', { windowId: 42, url: 'blob:result', active: true }],
    ['tabs.create', { url: 'blob:result', active: true }]
  ]);
});

test('openResultInSourceWindow does not fail conversion when focusing the window fails', async () => {
  const chromeApi = {
    tabs: { create: async () => ({ id: 123 }) },
    windows: { update: async () => { throw new Error('focus denied'); } }
  };
  await assert.doesNotReject(() => openResultInSourceWindow('blob:result', 42, chromeApi));
});

test('a byte-originated result opens as the active tab in its source window and focuses it', async () => {
  const sent = [];
  const calls = [];
  globalThis.chrome = {
    runtime: {
      getContexts: async () => [{}],
      getURL: (path) => `chrome-extension://test/${path}`,
      onMessage: { addListener: () => {} },
      sendMessage: async (message) => {
        sent.push(message);
        return { ok: true, url: 'blob:result' };
      }
    },
    tabs: { create: async (options) => { calls.push(['tabs.create', options]); } },
    windows: { update: async (windowId, options) => { calls.push(['windows.update', windowId, options]); } }
  };
  const serviceWorker = await import(`../src/service-worker.js?byte-route=${Date.now()}`);
  assert.equal(typeof serviceWorker.transformPdfBytesRequest, 'function');

  const bytes = [37, 80, 68, 70];
  const result = await serviceWorker.transformPdfBytesRequest({ bytes, windowId: 42 }, globalThis.chrome);

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(sent, [{ type: 'OFFSCREEN_TRANSFORM_PDF_BYTES', bytes }]);
  assert.deepEqual(calls, [
    ['tabs.create', { windowId: 42, url: 'blob:result', active: true }],
    ['windows.update', 42, { focused: true }]
  ]);
});
