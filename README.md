# 国語用 2in1印刷

Chromeで開いているPDFを2in1へ変換するManifest V3拡張機能です。東進学力POSの印刷画面では、国語用（右→左）と通常（左→右）を選べます。

- **国語用 2in1**：`[2 | 1]`, `[4 | 3]` …。奇数ページの最後は `[空白 | 最終ページ]` です。
- **通常 2in1**：`[1 | 2]`, `[3 | 4]` …。奇数ページの最後は `[最終ページ | 空白]` です。

変換後はChrome標準のPDF Viewer / 印刷画面を使います。拡張機能のツールバーからの変換は従来どおり国語用です。

## Macでのセットアップ

1. このフォルダを展開します。
2. `setup.command` を実行します。macOSに止められた場合は右クリックして「開く」を選びます。
3. `extension` フォルダが生成されます。
4. Chromeで `chrome://extensions` を開きます。
5. 「デベロッパー モード」をONにします。
6. 「パッケージ化されていない拡張機能を読み込む」から `extension` を選びます。

`setup.command` は `pdf-lib 1.17.1` をcdnjsから取得し、Git blob SHA-1 (`edb12c72cdaa11b608eb5967cf1531892b7f3b31`) が一致した場合だけ同梱します。拡張機能の実行時には外部スクリプトを読み込みません。

## Web上のPDFでの使い方

1. PDF、またはPDFが埋め込まれているWebページをChromeで開きます。東進学力POSの `GetMondaiPdf` のように `.pdf` 拡張子がないPDF配信URLにも対応しています。
2. ツールバーの「国語用 2in1印刷」を押します。
3. 「国語用で開く」を押します。
4. PDFが別ドメインにある場合だけ、そのPDF配信元へのアクセス許可を求めます。
5. 変換済みPDFは、変換を開始したChromeウィンドウ内の新しいタブで開き、そのウィンドウを前面にします。
6. `⌘P` でChrome標準の印刷画面を開き、通常どおり印刷します。「1枚あたりのページ数」は1のままで構いません。

## 東進学力POSでの使用

`https://pos.toshin.com/.../MondaiKaitoInsatsu` を開くと、画面右下に **「国語用 2in1」** と **「通常 2in1」** のボタンが横並びで表示されます。

国語用ボタンでは右→左、通常ボタンでは左→右の順に、ページ内の `GetMondaiPdf` を2in1に変換します。東進の印刷画面が単一タブの別ウィンドウで開いている場合も、変換後PDFをそのウィンドウ内の新規タブで開き、そのウィンドウを前面にします。

## ローカルPDFでの使用（v0.2.0）

最初に1回だけ、Chromeで次の設定を有効にしてください。

1. `chrome://extensions` を開きます。
2. 「国語用 2in1印刷」の「詳細」を開きます。
3. **「ファイルの URL へのアクセスを許可」** をONにします。

その後は次の手順です。

1. FinderなどからPDFをChromeで開きます。
2. Chrome内蔵PDF ViewerでPDFが表示された状態で、ツールバーの「国語用 2in1印刷」を押します。
3. 「国語用で開く」を押します。
4. 変換後PDFが同じChromeウィンドウ内の新規タブで開きます。

「ファイルの URL へのアクセスを許可」がOFFの場合は、拡張機能側で検知して設定をONにするよう案内します。

## 制限

- `blob:` URLで埋め込まれたPDFには未対応です。
- 暗号化・コピー制限等があるPDFでは変換できない場合があります。
- ログイン状態や短時間で失効するURLなど、拡張機能からPDF本体を再取得できないサイトでは失敗する場合があります。
- ローカルファイルは `file://` でChromeに直接開いた `.pdf` ファイルのみ対象です。
- 出力用紙サイズは最初のページの表示範囲と回転を基準にします。縦長PDFなら横向きへして左右に配置します。元PDFの回転指定と表示範囲（CropBox）を反映します。

## 開発

Node.jsがある場合:

```bash
npm test
npm run vendor
npm run build
```

`npm run build` の出力は `extension/` です。

## v0.2.1 の変更

- 元PDFの回転指定を反映し、縦書き本文が横倒しになる問題と不要な余白を修正しました。
- 表示範囲（CropBox）と原点のずれを反映して配置します。


## Chrome Web Store向けZIPの生成（GitHub Actions）

`main` ブランチにpushすると、GitHub Actionsの **Chrome Web Store package** が自動実行されます。
ローカルでZIPを用意する必要はありません。

1. [Actions](https://github.com/shougayaki-1/chrome-extension-2-in-1/actions/workflows/chrome-web-store.yml) から成功した実行を開きます。
2. **Artifacts** の `chrome-web-store-package` をダウンロードします。
3. ダウンロードしたアーティファクトZIPを展開し、その中の `chrome-2in1-vX.Y.Z.zip` を使用します。**外側のアーティファクトZIPをアップロードしないでください。**
4. [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) で既存の「国語用 2in1印刷」を開き、**パッケージ → 新しいパッケージをアップロード** から上記のZIPを選択します。
5. ストア掲載情報に変更があれば更新し、**審査のために送信**します。承認後の自動公開を選択できます。

GitHub Actionsでは、固定バージョンのpdf-libをSHA-1検証して取得し、`npm run check` でテストとビルドを実行します。成果物ZIPの直下には `manifest.json` があり、`BUILD_INFO.txt` は含めません。

## Chrome Web Store の更新

1. `static/manifest.json` と `package.json` のバージョンを、公開済みバージョンより大きくします。
2. `npm run check` を実行します。
3. `extension/` の中身をZIPにします。ZIPの直下に `manifest.json` がある状態にし、`BUILD_INFO.txt` は除外します。
4. [デベロッパーダッシュボード](https://chrome.google.com/webstore/devconsole)で既存の「国語用 2in1印刷」を選びます。
5. 「パッケージ」→「新しいパッケージをアップロード」からZIPをアップロードします。
6. バージョンを確認して「審査のために送信」を押します。審査後に自動公開する設定なら、承認後に更新が公開されます。

詳細は[公式の更新手順](https://developer.chrome.com/docs/webstore/update)を参照してください。
