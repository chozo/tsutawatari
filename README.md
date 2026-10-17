# ツタワタリ

Notionの案「くるり放して、ロープ飛び」（一意キー `2026-10-05-0300-09`）をもとにした、縦画面の振り子アクションゲームです。ツタを揺らし、離すタイミングを決め、景色の変わる世界を先へ進みます。行き先はゲームの最後まで明かしません。

## 遊ぶ

- PC: `npm run dev` を実行して `http://localhost:5173` を開きます。
- スマホ: PCと同じWi-Fiにつなぎ、起動時に表示されるネットワークURLをスマホで開きます。
- 単体ファイル: `game.html` は画像・CSS・JavaScriptを内包しています。ダウンロードしてオフラインでも遊べます。

Node.js 22以上が必要です。外部ライブラリやサーバー側のゲーム処理は使いません。

## 遊び方

1. 「旅をはじめる」を押すとタイム計測が始まります。BGMもこの操作から再生します。
2. ゲーム画面か下のパッドを長押しして揺れ、右へ振れたところで指を離してジャンプします。
3. 空中で次のツタを長押しすると、ツタの上から先端までどこでもつかめます。つかんだ高さから下へ滑り、次のジャンプへつなげます。
4. 落下しても最後につかんだツタから続けられます。ミス回数とタイムは旅のあいだ累計されます。
5. ゴールで到着タイムとミス回数を表示し、紙吹雪とファンファーレで祝います。行き先は到着して初めてわかります。

画面上部にはエリア、タイム、ミス回数を表示します。総距離や目的地はプレイ中に表示しません。難所は色とラベルで予告します。「自動キャッチ」は空中での押し直しを省く練習用設定、「軌道ヒント」はジャンプ先を予測する補助です。音量と2つの設定は同じブラウザ内に保存されます。タブを離れている間はゲームとタイマーが止まります。

## 旅のコース

草原、川と沼、集落、高層都市、雪国、溶岩帯、砂漠、海と、景色が移り変わります。コースは41本のツタと40回の飛び移りで構成し、最後の到着シーンで行き先が明かされます。動物や町並みは背景演出で、障害物ではありません。

8か所の難所は通常区間より狭いタイミングで飛ぶ必要があります。最大まで揺れた状態から離すタイミングを数値計算で配置し、全区間を通過できることをシミュレーションで確かめています。

## 音と素材

BGMとジャンプ・キャッチ・落下・ゴールの効果音はWeb Audio APIで合成しています。外部音源、外部フォント、アクセス解析、アカウント登録はありません。主人公のイラストはゲーム専用素材で、背景・ツタ・各地域はCanvasとSVGで描画します。

## ライセンス

[MIT License](./LICENSE)（Copyright (c) 2026 chozo）です。改変・再配布・商用利用ができます。利用するときは、著作権表示とライセンス文を残してください。ゲーム名や「chozo」の名称・ロゴは、作者が関わっているように見える形で使わないでください。

## 開発と配布

```sh
npm run check
npm test
npm run build
npm run browser-check
```

`npm run build` は次を生成します。

- `game.html`: オフラインで開ける単体ファイル。
- `dist/`: 静的ホスティング用のWebアプリ一式。Web manifestとService Workerを含み、HTTPSで開いた後はオフライン起動できます。

`npm run browser-check` は、実際のゲーム入力で全40区間を自動通過するブラウザ確認ページ `artifacts/journey-check.html` を作ります。日本がゴール前に表示されないこと、距離表示がないこともこの確認で調べます。Nodeの単体テストは成功範囲、ツタ全体の捕捉、失敗後の再開、タイム・ミスの累計などを検証します。画面サイズ別のPlaywright確認を行う場合は `npm install --save-dev playwright-core` の後 `npm run e2e` を実行してください。インストール済みのChromeが必要です。

### OGP画像

```sh
npm run ogp                     # 実際のゲーム画面を撮って public/ogp.png（1200×630）を作り直す
OGP_VINE=19 npm run ogp         # 背景を別のエリアにする（ツタの番号を指定）
```

`npm run build` で `public/` の中身が `dist/tsutawatari/` にコピーされ、`index.html` の `og:image` から `https://game.chozo.net/tsutawatari/ogp.png` として参照されます。

### 告知動画

```sh
npm install              # 初回のみ（playwright-core と ffmpeg-static）
npm run promo            # 全コマを撮影して書き出す
PROMO_EVERY=15 npm run promo       # 確認用: 15コマおきの一覧画像だけ作る
PROMO_ENCODE_ONLY=1 npm run promo  # 撮り直さずに音と書き出しだけやり直す
```

実際のゲーム画面をヘッドレスのChrome（インストール済みのもの）で1コマずつ撮り、縦型 1080×1920・30fps・約30秒・-14 LUFS の MP4 にします。出力はアプリの隣の `../video/` です（`tsutawatari-promo.mp4`、表紙 `tsutawatari-promo-cover.jpg`、確認用の一覧 `tsutawatari-promo-sheet.jpg`）。動画はリポジトリに含めません。

- `tools/promo/scenario.js`: 台本（場面・字幕・演出）。行き先は動画でも明かしません。
- `tools/promo/promo.css`: 背景・字幕・エンドカードの見た目。
- `tools/promo/record.mjs`, `stage.js`: 撮影と書き出しの道具。
- 音はゲームのBGM・効果音（Web Audio合成）と、BGMの拍に合わせて合成したリズムだけで、外部音源は使いません。
- ゲーム側の撮影用入口は `window.__game` の `manual` / `step` / `state()` / `touchDown` / `touchUp` / `drainEvents` / `audio` です。

### 主なファイル

- `physics.js`: 振り子、ジャンプ、ツタの当たり判定。
- `engine.js`: ゲーム状態、計時、ミス、再開、ゴール。
- `course.js`: 固定コース。`npm run calibrate` で到達範囲を再計測。
- `scenery.js`: 9エリアの背景。
- `game.js`: 描画、タッチ・キーボード入力、音、設定保存。
- `assets/explorer.png`: 主人公の透過イラスト。
- `public/`: 公開ルートにそのまま置くファイル。`favicon.svg`（ファビコン）と `ogp.png`（SNS共有用のOGP画像、`npm run ogp` で生成）。
- `tools/`: ビルド、難易度計測、ブラウザ確認。

## 公開状況

公開先はCloudflare Workersで、ゲームは次のURLでプレイできます。`npm run deploy` でビルドしてから `wrangler.jsonc` の設定（Worker名 `tsutawatari`、ルート `game.chozo.net/tsutawatari*`）で公開します。

- [ツタワタリをプレイ](https://game.chozo.net/tsutawatari/)

2026-10-07: Chromeで公開URLを開き、実際のゲーム画面とプレイ操作を確認。スマートフォン実機での表示・操作感・音量確認は未実施です。

## 確認記録

2026-10-06: 構文確認と単体テスト10件成功。Chromeで開始画面、操作中の主人公イラスト、全40区間の通しプレイ、到着記録、紙吹雪を確認。
