import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const url = 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js';
const expectedGitBlobSha = 'edb12c72cdaa11b608eb5967cf1531892b7f3b31';
const destination = path.resolve('vendor/pdf-lib.min.js');

function gitBlobSha(buffer) {
  const header = Buffer.from(`blob ${buffer.length}\0`);
  return createHash('sha1').update(header).update(buffer).digest('hex');
}

const response = await fetch(url);
if (!response.ok) throw new Error(`pdf-lib download failed: HTTP ${response.status}`);
const buffer = Buffer.from(await response.arrayBuffer());
const actualSha = gitBlobSha(buffer);
if (actualSha !== expectedGitBlobSha) {
  throw new Error(`pdf-lib checksum mismatch: expected ${expectedGitBlobSha}, got ${actualSha}`);
}
await mkdir(path.dirname(destination), { recursive: true });
await writeFile(destination, buffer);
console.log(`Saved pdf-lib 1.17.1 to ${destination}`);
