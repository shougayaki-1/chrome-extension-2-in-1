import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('the two Toshin buttons sit together and send distinct page directions', async () => {
  const source = await readFile(new URL('../src/toshin-content.js', import.meta.url), 'utf8');
  const handlers = {};
  const buttons = ['rtl', 'ltr'].map((direction) => ({
    dataset: { direction },
    disabled: false,
    addEventListener(_type, handler) { handlers[direction] = handler; }
  }));
  const status = { textContent: '' };
  const shadow = {
    appendChild() {},
    querySelectorAll() { return buttons; },
    querySelector() { return status; }
  };
  const host = { style: {}, attachShadow() { return shadow; } };
  const wrap = { innerHTML: '' };
  let created = 0;
  const document = {
    querySelector() { return null; },
    createElement() { return created++ === 0 ? host : wrap; },
    documentElement: { appendChild() {} }
  };
  const sent = [];
  const context = {
    globalThis: { KokugoToshinCore: {
      isToshinPrintPage: () => true,
      findPdfUrlFromDocument: () => 'https://pos.toshin.com/Contents/GetMondaiPdf?id=1'
    } },
    location: { href: 'https://pos.toshin.com/Student/MondaiKaitoInsatsu' },
    document,
    chrome: { runtime: { async sendMessage(message) {
      sent.push(message);
      return { ok: true };
    } } },
    setTimeout() {}
  };
  vm.runInNewContext(source, context, { filename: 'toshin-content.js' });
  assert.match(wrap.innerHTML, /data-direction="rtl">国語用 2in1/);
  assert.match(wrap.innerHTML, /data-direction="ltr">通常 2in1/);

  await handlers.rtl();
  await handlers.ltr();
  assert.deepEqual(sent.map(({ direction }) => direction), ['rtl', 'ltr']);
  assert.equal(sent[0].type, 'TRANSFORM_TOSHIN_PDF');
  assert.equal(sent[1].url, sent[0].url);
  assert.ok(buttons.every((button) => button.disabled === false));
});
