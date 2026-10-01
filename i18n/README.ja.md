[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# ClearPair by LazyingArt

[![11 UI languages](https://img.shields.io/badge/UI-11_languages-456BA4?style=for-the-badge)](../docs/LOCALIZATION.md) [![GitHub Sponsors](https://img.shields.io/badge/Sponsor-lachlanchen-EA4AAA?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/lachlanchen)

*混同しやすいところを練習し、違いを身につける。*

紛らわしい音や文字に特化した八つのコース。iOS、Android、PWAに対応します。ClearPairは仮称であり、既存のL & Nとは別のアプリ群です。一般的な単語練習ではなく、聞き分けと発音の対比を中心にしています。

![ClearPair](../docs/assets/eight-icons-v4.png)

[日本語](../docs/JAPANESE-COURSE.md)を含む独立した8アプリの[内部テスト版1.0.0 (4)](../docs/BETA-1.0.0-4.md)がTestFlightとGoogle Playで利用できます。TestFlightの説明文も各アプリ専用に修正済みです。端末内モデルの検証中のため発音点数は無効です。その後の音声選択修正はソースのみで、ビルド4には含まれません。正式審査は未提出です。

## 八つの専門コース

| ClearPair | 八つの専門コース |
| --- | --- |
| H & F | 英語と中国語のh/fの区別 |
| L & R | 英語のl/rと子音連続 |
| English | 英語の母音、TH、有声・無声、語末 |
| Mandarin | 中国語の声母、韻母、気息、声調 |
| Cantonese | 広東語の粵拼、声調、母音、気息、語末音 |
| Korean | ハングルの記憶と紛らわしい音 |
| Arabic Letters | アラビア文字の形、点、連結、音 |
| Japanese | 紛らわしい仮名、筆順、文脈に合うふりがなと拍 |

## 開発プレビュー

聴き取りクイズ、ペアの再生・ループ、学習ガイド、間隔を空けた復習、波形、録音履歴、書き出しを実装しています。ソースはプロフィールの11表示言語に対応し、練習言語とは独立しています。専門的な音声学の説明は英語・中国語のままで、未翻訳の説明には英語と明示します。

V4アイコンに合わせ、明るい背景、なめらかな色、整ったカード、位置の安定した録音・再生操作を使います。以前のアイコンも保存しています。任意のアニメーションと5問ゲームは聴き取り・記憶に端末内の星を与え、未検証の発音点数にはしません。[翻訳範囲](../docs/LOCALIZATION.md)と[広東語の説明](../docs/CANTONESE.md)を参照してください。[7アプリのベータ0.2.0 (2)](../docs/BETA-0.2.0.md)には、V4、11言語のUI、広東語アプリが含まれます。

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

アプリIDは`handf`、`landr`、`english`、`chinese`、`korean`、`arabic`、`cantonese`、`japanese`です。バンドルIDは`art.lazying.clearpair.<id>`。PWAは`dist/site`に出力します。デバッグAPKはPlay公開版ではありません。テスト配信の利用可否はストアの確認結果で判断します。

## 音声とプライバシー

マイク録音は端末内に保存され、アプリからアップロードされません。書き出しはネイティブ共有画面またはウェブのダウンロードを開き、保存先は利用者が選びます。保存に失敗する場合があり、データ消去やアンインストールで録音が失われることもあります。大切な録音は書き出してください。

研究用に生成した一時的な合成音声は同梱しません。再配布の許可と人による発音確認が未検証のためです。テスト版では端末にインストールされた音声を使用します。音質、対応言語、オフラインでの利用可否は端末によって異なり、音声の提供元がネットワークサービスを使う場合があります。

## 研究と制限

[ビルド計画](../docs/BUILD-PLAN.md)、[評価設計](../docs/SCORING-DESIGN.md)、[教材の出典](../docs/CURRICULUM-SOURCES.md)を参照してください。対比ごとに校正した根拠が必要です。無音、内容不明の音声、方言で区別しない音に架空の点数を付けません。

PWAの開発版は[language-agent.lazying.art](https://language-agent.lazying.art/)で公開しています。教育用であり、治療や診断には使用しません。商標の確認とオープンソースライセンスの設定は完了していません。

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
  version = {1.0.0},
  url = {https://github.com/lachlanchen/ClearPair}
}
```
