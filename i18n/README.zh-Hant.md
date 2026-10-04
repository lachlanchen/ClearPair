[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# ClearPair by LazyingArt

[![11 UI languages](https://img.shields.io/badge/UI-11_languages-456BA4?style=for-the-badge)](../docs/LOCALIZATION.md) [![GitHub Sponsors](https://img.shields.io/badge/Sponsor-lachlanchen-EA4AAA?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/lachlanchen)

*專練容易混淆的部分，真正學會分辨。*

八門針對易混淆語音與字母的專項課程，支援iOS、Android和PWA。ClearPair是暫定品牌名，原有L & N繼續作為獨立應用。這裡強調對比、辨音與區分，而不是泛泛的單字練習。

![ClearPair](../docs/assets/eight-icons-v4.png)

[最新發布記錄](../docs/RELEASE-20261004.md)驗證八款 1.0.0 應用均可透過 TestFlight 和 Google Play 內部測試取得：H & F **15**、L & R **11**、英語 **11**、普通話 **10**、粵語 **11**、韓語 **10**、阿拉伯語 **10**、日語 **10**。請直接更新，不要解除安裝，以保留歷史錄音。

已將同一批八個構建提交正式審核。2026 年 10 月 4 日驗證狀態：Apple **Waiting for Review**；Google **Changes in review**，已選擇全部 **173 個支援付費應用的國家和地區**。保留獲批後自動發布及現有價格。提交不代表獲批或公開上線。

[共享回饋升級](../docs/PAIR-FEEDBACK-MIGRATION-20261003.md)為其他課程提供真實原生離線轉寫、每個詞對獨立的聲學證據及緊湊穩定的操作佈局。已儲存音訊的工程測試不是真人發音準確率認證。[聲音字母表與聲調覆蓋擴展候選](../docs/SOUND-COVERAGE-RESEARCH.md)是獨立開發工作，不包含在這些已提交構建或目前 PWA 中。


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

點錄音、說話，隨後停頓或點「停止並評分」。能夠識別時，結果保留實際識別的詞，並將詞語身分與測量到的聲音證據分開顯示。置中的錄音按鈕始終位於結果上方，沒有計時器。分數是本機練習指標，不是經校準的準確率。需要練習語言的離線聲音；內建詞語識別模型僅用於原生應用。詳見[回饋演算法說明](../docs/PAIR-FEEDBACK-MIGRATION-20261003.md)。Capacitor 將 React 介面與 Swift/Java 原生錄音和播放結合，並非分別開發的 SwiftUI/Compose 介面。

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
