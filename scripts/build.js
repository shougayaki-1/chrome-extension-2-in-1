import { access, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const out = path.join(root, 'extension');
const vendor = path.join(root, 'vendor', 'pdf-lib.min.js');

try {
  await access(vendor);
} catch {
  throw new Error('vendor/pdf-lib.min.js がありません。先に `node scripts/fetch-vendor.js` を実行してください。');
}

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(path.join(root, 'src'), path.join(out, 'src'), { recursive: true });
await cp(path.join(root, 'vendor'), path.join(out, 'vendor'), { recursive: true });
await cp(path.join(root, 'static', 'manifest.json'), path.join(out, 'manifest.json'));
await cp(path.join(root, 'static', 'popup.html'), path.join(out, 'popup.html'));
await cp(path.join(root, 'static', 'popup.css'), path.join(out, 'popup.css'));
await cp(path.join(root, 'static', 'offscreen.html'), path.join(out, 'offscreen.html'));

const manifest = JSON.parse(await readFile(path.join(out, 'manifest.json'), 'utf8'));
if (manifest.manifest_version !== 3) throw new Error('Manifest V3 is required.');
await writeFile(path.join(out, 'BUILD_INFO.txt'), `Built: ${new Date().toISOString()}\npdf-lib: 1.17.1\n`);
console.log(`Built extension at ${out}`);
