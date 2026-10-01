[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# ClearPair by LazyingArt

[![11 UI languages](https://img.shields.io/badge/UI-11_languages-456BA4?style=for-the-badge)](../docs/LOCALIZATION.md) [![GitHub Sponsors](https://img.shields.io/badge/Sponsor-lachlanchen-EA4AAA?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/lachlanchen)

*專練容易混淆的部分，真正學會分辨。*

八門針對易混淆語音與字母的專項課程，支援iOS、Android和PWA。ClearPair是暫定品牌名，原有L & N繼續作為獨立應用。這裡強調對比、辨音與區分，而不是泛泛的單字練習。

![ClearPair](../docs/assets/eight-icons-v4.png)

包含獨立[日語應用](../docs/JAPANESE-COURSE.md)的八款應用，均已提供 TestFlight 和 Google Play [內部測試版 1.0.0 (5)](../docs/BETA-1.0.0-5.md)。包含各應用專屬說明、更嚴格的參考語音選擇及日語字母讀音修復。八門課程的 PWA 已驗證上線。本地模型仍在驗證，發音分數尚未啟用；參考音試聽和真機麥克風驗證尚未完成。正式審核尚未提交。

## 八門專項課程

| ClearPair | 八門專項課程 |
| --- | --- |
| H & F | 英語與普通話h/f對比 |
| L & R | 英語l/r與子音組合 |
| English | 英語母音、TH、清濁音與字尾 |
| Mandarin | 普通話聲母、韻母、送氣與聲調 |
| Cantonese | 粵拼、聲調對比、母音、送氣與韻尾 |
| Korean | 韓文字母記憶與易混淆語音 |
| Arabic Letters | 阿拉伯字母形狀、點位、連接與聲音 |
| Japanese | 易混假名、筆順、語境注音及拍的對比 |

## 開發預覽狀態

已實作聽辨測驗、詞對連讀與循環、學習指南、間隔複習、波形、錄音歷史與匯出。原始碼支援個人資料中的全部11種介面語言，獨立於練習語言。專業語音學說明仍為英中雙語；未翻譯的說明會明確標為英語。

V4圖示帶動應用程式配色：淺色背景、柔和流動色彩、整潔卡片及位置穩定的錄音/播放操作。舊版圖示均保留。可選動畫與五題遊戲為聽辨、記憶提供本機星星獎勵，絕不當作未驗證的發音分數。參閱[本地化範圍](../docs/LOCALIZATION.md)及[廣東話說明](../docs/CANTONESE.md)。[七應用程式測試版0.2.0 (2)](../docs/BETA-0.2.0.md)現已包含V4、全部11種介面語言及廣東話應用程式。

**構建6為原生應用增加實驗性的練習匹配分。** 透過頻譜、受限時間對齊及相對音高，在本機將錄音與詞對兩邊的裝置示範聲音比較。這是相似度指標，不是發音正確率。需要安裝練習語言的離線聲音；經過校準的音素評分和PWA評分仍未啟用。[測試記錄](../docs/BETA-1.0.0-6.md)區分功能檢查與真人準確率。應用採用Capacitor，將React介面與Swift/Java原生錄音及語音播放結合，並非分別開發的SwiftUI/Compose介面。

## 建置與測試

需要Node 22+、npm、Android SDK/JDK 21；iOS建置需配備Xcode的Mac。各項建置依次執行，避免同時啟動多個重型工作。瀏覽器測試驗證互動行為，不能證明真實語音品質或發音辨識準確率。

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

八個應用ID為`handf`、`landr`、`english`、`chinese`、`korean`、`arabic`、`cantonese`、`japanese`，套件名稱為`art.lazying.clearpair.<id>`。PWA建置輸出至`dist/site`。偵錯APK不是Google Play發布套件；測試版是否可安裝必須以核實過的商店回執為準，不能僅憑編譯成功判斷。

## 音訊與隱私

麥克風錄音保留在裝置上，應用不會上傳錄音。匯出時開啟原生分享面板或網頁下載，目的地由你選擇，不會自動傳送給任何收件人。儲存可能失敗；清除應用或網站資料、解除安裝可能刪除錄音，請預先匯出重要內容。

臨時產生的研究用合成音訊不會隨套件散布：其再散布許可尚未核實，也未完成人工發音試聽。測試版使用裝置已安裝的語音。不同裝置的音質、語言支援與離線可用性各不相同；語音提供方可能呼叫網路服務。研究音訊僅私下保留，不屬於可發布的參考素材。

## 研究與界線

參閱[建置計畫](../docs/BUILD-PLAN.md)、[評分設計](../docs/SCORING-DESIGN.md)與[教材來源](../docs/CURRICULUM-SOURCES.md)。每個對比都需要經過校準的證據；對於靜音、無法確認的內容，以及某些口音中已合併的音，不應憑空給出分數。

PWA預覽已上線：[language-agent.lazying.art](https://language-agent.lazying.art/)。本預覽用於學習，不提供言語治療或醫學診斷。品牌商標核查與開源授權條款尚未確定；公開程式碼並不自動表示取得任意再散布授權。

## 支持開發

可透過[GitHub Sponsors](https://github.com/sponsors/lachlanchen)或下方按鈕支持開發。

| Donate | PayPal | Stripe |
| --- | --- | --- |
| [![Donate](https://img.shields.io/badge/Donate-LazyingArt-0EA5E9?style=for-the-badge&logo=kofi&logoColor=white)](https://chat.lazying.art/donate) | [![PayPal](https://img.shields.io/badge/PayPal-RongzhouChen-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/RongzhouChen) | [![Stripe](https://img.shields.io/badge/Stripe-Donate-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |

## 引用

GitHub讀取[CITATION.cff](../CITATION.cff)以顯示「Cite this repository」入口。引用本軟體時請使用以下資訊：

```bibtex
@software{chen_clearpair_2026,
  author = {Chen, Lachlan},
  title = {ClearPair: Practise What You Mix Up},
  year = {2026},
  version = {1.0.0},
  url = {https://github.com/lachlanchen/ClearPair}
}
```
