[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# ClearPair by LazyingArt

*混同しやすいところを練習し、違いを身につける。*

紛らわしい音や文字に特化した六つのアプリ。iOS、Android、PWAに対応します。ClearPairは仮称であり、既存のL & Nとは別のアプリ群です。一般的な単語練習ではなく、聞き分けと発音の対比を中心にしています。

## 六つの専門アプリ

| ClearPair | 六つの専門アプリ |
| --- | --- |
| H & F | 英語と中国語のh/fの区別 |
| L & R | 英語のl/rと子音連続 |
| English | 英語の母音、TH、有声・無声、語末 |
| Mandarin | 中国語の声母、韻母、気息、声調 |
| Korean | ハングルの記憶と紛らわしい音 |
| Arabic Letters | アラビア文字の形、点、連結、音 |

## 開発プレビュー

聞き取りクイズ、ペアの連続再生とループ、学習ガイド、間隔反復、波形表示、録音履歴、書き出しを実装しています。英語・簡体字中国語の表示言語と、練習する言語は独立して選択できます。

**発音点数は、モデルの組み込みと人による検証が完了するまで無効です。** 信号品質は発音の正確さではありません。CapacitorのReact画面にSwift/Javaによるネイティブ録音・音声再生を組み合わせています。個別のSwiftUI/Compose画面ではありません。

## ビルドとテスト

Node 22+、npm、Android SDK/JDK 21が必要です。iOSにはXcodeを備えたMacを使用します。重いビルドは順番に実行します。ブラウザテストで確認するのは動作であり、実際の発音評価精度ではありません。

```sh
npm ci --legacy-peer-deps
npm run dev
npm test
npm run build
npm run test:e2e
npm run native:sync -- handf android
npm run native:sync -- handf ios
node tools/native-family.mjs --android-build
```

アプリIDは`handf`、`landr`、`english`、`chinese`、`korean`、`arabic`です。バンドルIDは`art.lazying.clearpair.<id>`。PWAは`dist/site`に出力します。デバッグAPKはPlay公開版ではありません。テスト配信の利用可否はストアの確認結果で判断します。

## 音声とプライバシー

マイク録音は端末内に保存され、アプリからアップロードされません。書き出しはネイティブ共有画面またはウェブのダウンロードを開き、保存先は利用者が選びます。保存に失敗する場合があり、データ消去やアンインストールで録音が失われることもあります。大切な録音は書き出してください。

同梱の見本は独自の教材文を読み上げた合成音声です。発音品質については人による試聴が必要です。同梱されていない見本を端末の音声で再生する場合、音声サービスがネットワークを利用することがあります。

## 研究と制限

[ビルド計画](../docs/BUILD-PLAN.md)、[評価設計](../docs/SCORING-DESIGN.md)、[教材の出典](../docs/CURRICULUM-SOURCES.md)を参照してください。対比ごとに校正した根拠が必要です。無音、内容不明の音声、方言で区別しない音に架空の点数を付けません。

予定サイトは[language-agent.lazying.art](https://language-agent.lazying.art/)ですが、公開稼働は未確認です。教育用の開発版であり、治療や診断には使用しません。商標の確認とオープンソースライセンスの設定は完了していません。

## 開発支援

[GitHub Sponsors](https://github.com/sponsors/lachlanchen)または下のボタンから開発をご支援いただけます。

| Donate | PayPal | Stripe |
| --- | --- | --- |
| [![Donate](https://img.shields.io/badge/Donate-LazyingArt-0EA5E9?style=for-the-badge&logo=kofi&logoColor=white)](https://chat.lazying.art/donate) | [![PayPal](https://img.shields.io/badge/PayPal-RongzhouChen-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/RongzhouChen) | [![Stripe](https://img.shields.io/badge/Stripe-Donate-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |

## 引用

GitHubは[CITATION.cff](../CITATION.cff)を読み、「Cite this repository」を表示します。ソフトウェアの引用には次の情報を使用してください。

```bibtex
@software{chen_clearpair_2026,
  author = {Chen, Lachlan},
  title = {ClearPair: Practise What You Mix Up},
  year = {2026},
  version = {0.1.0},
  url = {https://github.com/lachlanchen/ClearPair}
}
```
