# PDF Source Selection and Result Focus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert extensionless PDFs in the current tab, convert a PDF selected from Finder/Explorer, and activate the resulting PDF tab.

**Architecture:** Retain DOM-based embedded-PDF detection as the preferred source. If none is found, allow a current HTTP(S) or `file:` tab URL to reach existing byte-level PDF validation. A selected file sends bytes through the service worker and offscreen transformer; both input paths reuse the result-tab opener.

**Tech Stack:** Chrome Extension Manifest V3, JavaScript ES modules, Chrome tabs/windows APIs, offscreen documents, Node.js built-in test runner, pdf-lib.

## Global Constraints

- Support Chrome 109 or later and retain Manifest V3.
- Do not add dependencies.
- Keep byte-header validation as the definitive PDF validation.
- Preserve existing remote-origin permission and `file:` URL guidance.
- Result tabs must be created with `active: true`, then receive `windows.update(windowId, { focused: true })`.

---

### Task 1: Accept extensionless current-tab PDF endpoints

**Files:**
- Modify: `src/popup-logic.js`
- Modify: `src/popup.js`
- Test: `test/popup-logic.test.js`

**Interfaces:**
- Produces: `isFetchablePdfCandidate(value): boolean`, true only for `http:`, `https:`, or `file:` URLs.
- Consumes: `choosePdfUrl(tab.url, detected)` and downstream byte validation.

- [ ] **Step 1: Write the failing test**

```js
test('isFetchablePdfCandidate accepts an extensionless HTTPS PDF endpoint', () => {
  assert.equal(isFetchablePdfCandidate('https://pos.toshin.com/Contents/GetMondaiPdf?daimonId=abc'), true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/popup-logic.test.js`

Expected: FAIL because `isFetchablePdfCandidate` is not exported.

- [ ] **Step 3: Write minimal implementation**

```js
export function isFetchablePdfCandidate(value) {
  try {
    return ['http:', 'https:', 'file:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}
```

Replace the popup's `.pdf` suffix gate with this function. If there is no embedded candidate, display the current URL as unverified and allow `fetchPdfBytes` to report any non-PDF response.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/popup-logic.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add src/popup-logic.js src/popup.js test/popup-logic.test.js && git commit -m "fix: accept extensionless PDF endpoints"`

### Task 2: Add local PDF selection and byte transformation routing

**Files:**
- Modify: `static/popup.html`
- Modify: `src/popup.js`
- Modify: `src/service-worker.js`
- Modify: `src/offscreen.js`
- Test: `test/pdf-source.test.js`
- Test: `test/window-target.test.js`

**Interfaces:**
- Consumes: `{ type: 'TRANSFORM_PDF_BYTES', bytes: ArrayBuffer, windowId: number }`.
- Produces: `{ type: 'OFFSCREEN_TRANSFORM_PDF_BYTES', bytes: ArrayBuffer }` and `{ ok: true, url: string }`.
- Consumes: `fetchPdfBytes(url)` for URLs and `isPdfBytes(bytes)` for selected files.

- [ ] **Step 1: Write failing tests**

```js
test('isPdfBytes rejects a selected non-PDF file', () => {
  assert.equal(isPdfBytes(encoder.encode('plain text')), false);
});
```

Add a result-opening test that asserts the byte-originated result calls `tabs.create` with `{ windowId: 42, url: 'blob:result', active: true }`, followed by `windows.update(42, { focused: true })`.

- [ ] **Step 2: Run tests to verify the new route is absent**

Run: `node --test test/pdf-source.test.js test/window-target.test.js`

Expected: route-specific test FAILS because `TRANSFORM_PDF_BYTES` and `OFFSCREEN_TRANSFORM_PDF_BYTES` do not yet exist.

- [ ] **Step 3: Write minimal implementation**

Add a visible `PDFファイルを選ぶ` button and hidden `<input type="file" accept="application/pdf,.pdf">`. On selection, read `await file.arrayBuffer()`, send `TRANSFORM_PDF_BYTES` with the active tab window ID, and show the filename.

Route the bytes request in the service worker to the offscreen document. In the offscreen document, validate `isPdfBytes(new Uint8Array(bytes))`, call `transformPdf(bytes)`, wrap it as an `application/pdf` Blob, and return its object URL. Both request kinds call `openResultInSourceWindow`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/pdf-source.test.js test/window-target.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add static/popup.html src/popup.js src/service-worker.js src/offscreen.js test/pdf-source.test.js test/window-target.test.js && git commit -m "feat: convert a selected local PDF"`

### Task 3: Build and regression verification

**Files:**
- Modify: `test/manifest.test.js` only if the popup asset or manifest contract changes.

**Interfaces:**
- Consumes: Tasks 1-2.
- Produces: `extension/` build output with updated popup and runtime modules.

- [ ] **Step 1: Add a build-facing assertion if needed**

```js
test('manifest remains MV3 and ships the popup entry point', async () => {
  const manifest = await readManifest();
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.action.default_popup, 'popup.html');
});
```

- [ ] **Step 2: Run all automated tests**

Run: `npm test`

Expected: PASS with no failures.

- [ ] **Step 3: Build the unpacked extension**

Run: `npm run build`

Expected: `Built extension at .../extension`.

- [ ] **Step 4: Manually verify in Chrome**

1. Reload `extension/` from `chrome://extensions`.
2. Open an extensionless PDF endpoint. The current-tab action is enabled and opens the result in front.
3. On a normal HTML page, the current-tab action reports a non-PDF response, not “PDFを見つけられませんでした”.
4. Choose a PDF through `PDFファイルを選ぶ`. The converted PDF becomes the active tab in the original Chrome window.

- [ ] **Step 5: Commit any Task 3 test change**

Run: `git add test/manifest.test.js && git commit -m "test: cover popup build contract"`
