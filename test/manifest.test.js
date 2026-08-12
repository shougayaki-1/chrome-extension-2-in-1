import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function readManifest() {
  return JSON.parse(await readFile(new URL('../static/manifest.json', import.meta.url), 'utf8'));
}

test('manifest injects the Toshin button and grants Toshin plus local file access', async () => {
  const manifest = await readManifest();
  assert.equal(manifest.version, '0.2.0');
  assert.deepEqual(manifest.host_permissions, ['https://pos.toshin.com/*', 'file:///*']);
  assert.deepEqual(manifest.content_scripts, [{
    matches: ['https://pos.toshin.com/*'],
    js: ['src/toshin-content-core.js', 'src/toshin-content.js'],
    run_at: 'document_idle'
  }]);
});
