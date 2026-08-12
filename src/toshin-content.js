(function initToshinButton() {
  const core = globalThis.KokugoToshinCore;
  if (!core?.isToshinPrintPage(location.href)) return;
  if (document.querySelector('#kokugo-2in1-extension-host')) return;

  const host = document.createElement('div');
  host.id = 'kokugo-2in1-extension-host';
  Object.assign(host.style, {
    position: 'fixed',
    right: '24px',
    bottom: '24px',
    zIndex: '2147483647'
  });

  const shadow = host.attachShadow({ mode: 'open' });
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <style>
      .panel {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 8px;
      }
      button {
        appearance: none;
        border: 0;
        border-radius: 999px;
        background: #202124;
        color: #fff;
        font-size: 15px;
        font-weight: 700;
        line-height: 1;
        padding: 14px 20px;
        cursor: pointer;
        box-shadow: 0 4px 16px rgba(0,0,0,.24);
      }
      button:hover { background: #303134; }
      button:disabled { cursor: wait; opacity: .72; }
      .status {
        max-width: 320px;
        box-sizing: border-box;
        border-radius: 10px;
        background: rgba(32,33,36,.94);
        color: #fff;
        font-size: 12px;
        line-height: 1.45;
        padding: 8px 10px;
        box-shadow: 0 3px 12px rgba(0,0,0,.2);
      }
      .status:empty { display: none; }
    </style>
    <div class="panel">
      <div class="status" role="status"></div>
      <button type="button">国語用 2in1</button>
    </div>
  `;
  shadow.appendChild(wrap);
  document.documentElement.appendChild(host);

  const button = shadow.querySelector('button');
  const status = shadow.querySelector('.status');

  function setStatus(text) {
    status.textContent = text;
  }

  button.addEventListener('click', async () => {
    button.disabled = true;
    setStatus('PDFを確認しています…');

    try {
      const pdfUrl = core.findPdfUrlFromDocument(document);
      if (!pdfUrl) {
        throw new Error('この画面から問題PDFのURLを取得できませんでした。');
      }

      setStatus('右→左の2in1に変換しています…');
      const result = await chrome.runtime.sendMessage({
        type: 'TRANSFORM_TOSHIN_PDF',
        url: pdfUrl
      });
      if (!result?.ok) throw new Error(result?.error || 'PDFの変換に失敗しました。');

      setStatus('変換後のPDFを新しいタブで開きました。');
      setTimeout(() => setStatus(''), 2500);
    } catch (error) {
      setStatus(error?.message || String(error));
    } finally {
      button.disabled = false;
    }
  });
})();
