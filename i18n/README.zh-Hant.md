[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# ClearPair by LazyingArt

*專練容易混淆的部分，真正學會分辨。*

六款針對易混淆語音與字母的專項學習應用，支援iOS、Android和PWA。ClearPair是暫定品牌名，原有L & N繼續作為獨立應用。這裡強調對比、辨音與區分，而不是泛泛的單字練習。

## 六款專項應用

| ClearPair | 六款專項應用 |
| --- | --- |
| H & F | 英語與普通話h/f對比 |
| L & R | 英語l/r與子音組合 |
| English | 英語母音、TH、清濁音與字尾 |
| Mandarin | 普通話聲母、韻母、送氣與聲調 |
| Korean | 韓文字母記憶與易混淆語音 |
| Arabic Letters | 阿拉伯字母形狀、點位、連接與聲音 |

## 開發預覽狀態

已實作聽辨測驗、詞對連續播放和循環、學習指導、間隔複習、錄音波形、錄音歷史及匯出。英語、簡體中文兩種介面語言與練習語言分別設定，選擇中文介面並不意味著只能練習中文。

**發音評分尚未啟用，須先完成模型整合與真人標註驗證。** 訊號品質不是發音準確度，也不能作為評分替代品。應用採用Capacitor，將React介面與Swift/Java原生錄音及語音播放結合，並非分別開發的SwiftUI/Compose介面。

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

六個應用ID為`handf`、`landr`、`english`、`chinese`、`korean`、`arabic`，套件名稱為`art.lazying.clearpair.<id>`。PWA建置輸出至`dist/site`。偵錯APK不是Google Play發布套件；測試版是否可安裝必須以核實過的商店回執為準，不能僅憑編譯成功判斷。

## 音訊與隱私

麥克風錄音保留在裝置上，應用不會上傳錄音。匯出時開啟原生分享面板或網頁下載，目的地由你選擇，不會自動傳送給任何收件人。儲存可能失敗；清除應用或網站資料、解除安裝可能刪除錄音，請預先匯出重要內容。

內建參考音訊使用原創教材文字的合成語音，仍需真人試聽核驗發音品質。若缺少內建參考音訊，會使用裝置語音；語音提供方可能呼叫網路服務，離線可用性取決於裝置。

## 研究與界線

參閱[建置計畫](../docs/BUILD-PLAN.md)、[評分設計](../docs/SCORING-DESIGN.md)與[教材來源](../docs/CURRICULUM-SOURCES.md)。每個對比都需要經過校準的證據；對於靜音、無法確認的內容，以及某些口音中已合併的音，不應憑空給出分數。

計畫網站為[language-agent.lazying.art](https://language-agent.lazying.art/)，尚未核實上線部署。本預覽用於學習，不提供言語治療或醫學診斷。品牌商標核查與開源授權條款尚未確定；公開程式碼並不自動表示取得任意再散布授權。

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
  version = {0.1.0},
  url = {https://github.com/lachlanchen/ClearPair}
}
```
