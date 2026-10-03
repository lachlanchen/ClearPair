[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# ClearPair by LazyingArt

[![11 UI languages](https://img.shields.io/badge/UI-11_languages-456BA4?style=for-the-badge)](../docs/LOCALIZATION.md) [![GitHub Sponsors](https://img.shields.io/badge/Sponsor-lachlanchen-EA4AAA?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/lachlanchen)

*专练容易混淆的部分，真正学会分辨。*

八门针对易混淆语音与字母的专项课程，支持iOS、Android和PWA。ClearPair是暂定品牌名，原有L & N继续作为独立应用。这里强调对比、辨音与区分，而不是泛泛的单词练习。

![ClearPair](../docs/assets/eight-icons-v4.png)

[共享反馈升级](../docs/PAIR-FEEDBACK-MIGRATION-20261003.md)已在源码中加入真实离线转写、每个词对的独立声音比较和紧凑稳定的操作布局。L & R 在 iOS、Android 均通过 55 项原生已保存音频检查，普通话在 Android 通过 161 项。上传新测试版前继续逐语言验证。这些工程检查不是人类发音准确率认证；现有商店版本和审核未改变。

[仅针对 H & F 的评分更新](../docs/HANDF-NATIVE-SCORING-20261003.md)在 iOS 上原生识别已保存的英语与普通话录音，并提供内置离线后备模型，不再只依赖 WebView 解码。词语识别与实际测量的发音细节保持独立；评分失败原因随历史录音保存。其他课程和现有正式审核保持不变。源码验证不代表商店可用或真人发音准确率已获认证。

[H & F 1.0.0 (15)](../docs/BETA-HANDF-1.0.0-15.md) 已验证可通过 TestFlight 和 Google Play 内部测试获取。请直接更新，不要卸载，以保留历史录音。这是测试版本，不是新的正式商店版本。

包含独立[日语应用](../docs/JAPANESE-COURSE.md)的八款应用，均已提供 TestFlight 和 Google Play [内部测试版 1.0.0 (9)及测试链接](../docs/BETA-1.0.0-9.md)。八款 iOS 正式审核仍使用构建8，均在等待审核，保留获批后自动发布；Google 正式生产提交尚未完成。[签名构建和商店状态均已验证](../store/artifacts/internal-beta-1.0.0-9.json)。本次内部测试更新不代表获批或公开上线。已上线的 PWA 保持不变。

## 八门专项课程

| ClearPair | 八门专项课程 |
| --- | --- |
| H & F | 英语与普通话h/f对比 |
| L & R | 英语l/r与辅音组合 |
| English | 英语元音、TH、清浊音与词尾 |
| Mandarin | 普通话声母、韵母、送气与声调 |
| Cantonese | 粤拼、声调对比、元音、送气与韵尾 |
| Korean | 韩文字母记忆与易混淆语音 |
| Arabic Letters | 阿拉伯字母形状、点位、连接与声音 |
| Japanese | 易混假名、笔顺、语境注音及拍的对比 |

## 开发预览状态

已实现听辨测验、词对连读与循环、学习指南、间隔复习、波形、录音历史与导出。源代码支持个人资料中的全部11种界面语言，独立于练习语言。专业语音学说明仍为英中双语；未翻译的说明会明确标为英语。

V4图标带动应用配色：浅色背景、柔和流动色彩、整洁卡片及位置稳定的录音/播放操作。旧版图标均保留。可选动画与五题游戏为听辨、记忆提供本地星星奖励，绝不当作未验证的发音分数。参阅[本地化范围](../docs/LOCALIZATION.md)及[粤语说明](../docs/CANTONESE.md)。[七应用测试版0.2.0 (2)](../docs/BETA-0.2.0.md)现已包含V4、全部11种界面语言及粤语应用。

**构建9改进了原生自动练习匹配分。** 点录音、说话，随后停顿或点“停止并评分”。轻声短词保留较弱的词首与词尾辅音，词对分析让容易混淆的词首音、元音或词尾音比共同声音占更大权重。H & F 显示目标音、元音/词语及相对时长；其他课程显示词语匹配、区别区域和有效发声时长。录音操作保持在结果上方。分数是本机参考声音的相似度指标，不是经过校准的发音正确率。需要安装练习语言的离线声音；经过校准的音素评分和 PWA 评分仍未启用。详见[算法说明](../docs/SCORING-UPDATE-20261002.md)。应用采用 Capacitor，将 React 界面与 Swift/Java 原生录音及语音播放结合，并非分别开发的 SwiftUI/Compose 界面。

## 构建与测试

需要Node 22+、npm、Android SDK/JDK 21；iOS构建需配有Xcode的Mac。各项构建依次运行，避免同时启动多个重型任务。浏览器测试验证交互行为，不能证明真实语音质量或发音识别准确率。

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

八个应用ID为`handf`、`landr`、`english`、`chinese`、`korean`、`arabic`、`cantonese`、`japanese`，包名为`art.lazying.clearpair.<id>`。PWA构建输出到`dist/site`。调试APK不是Google Play发布包；测试版是否可安装必须以核实过的商店回执为准，不能仅凭编译成功判断。

## 音频与隐私

麦克风录音保留在设备上，应用不会上传录音。导出时打开原生分享面板或网页下载，目的地由你选择，不会自动发送给任何收件人。存储可能失败；清除应用或网站数据、卸载应用可能删除录音，请提前导出重要内容。

临时生成的研究用合成音频不会随包分发：其再分发许可尚未核实，也未完成人工发音试听。测试版使用设备已安装的语音。不同设备的音质、语言支持与离线可用性各不相同；语音提供方可能调用网络服务。研究音频仅私下保留，不属于可发布的参考素材。

## 研究与边界

参阅[构建计划](../docs/BUILD-PLAN.md)、[评分设计](../docs/SCORING-DESIGN.md)与[教材来源](../docs/CURRICULUM-SOURCES.md)。每个对比都需要经过校准的证据；对于静音、无法确认的内容，以及某些口音中已合并的音，不应凭空给出分数。

PWA预览已上线：[language-agent.lazying.art](https://language-agent.lazying.art/)。本预览用于学习，不提供言语治疗或医学诊断。品牌商标核查与开源许可证尚未确定；公开代码并不自动表示获得任意再分发授权。

## 支持开发

可通过[GitHub Sponsors](https://github.com/sponsors/lachlanchen)或下方按钮支持开发。

| Donate | PayPal | Stripe |
| --- | --- | --- |
| [![Donate](https://img.shields.io/badge/Donate-LazyingArt-0EA5E9?style=for-the-badge&logo=kofi&logoColor=white)](https://chat.lazying.art/donate) | [![PayPal](https://img.shields.io/badge/PayPal-RongzhouChen-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/RongzhouChen) | [![Stripe](https://img.shields.io/badge/Stripe-Donate-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |

## 引用

GitHub读取[CITATION.cff](../CITATION.cff)以显示“Cite this repository”入口。引用本软件时请使用以下信息：

```bibtex
@software{chen_clearpair_2026,
  author = {Chen, Lachlan},
  title = {ClearPair: Practise What You Mix Up},
  year = {2026},
  version = {1.0.0},
  url = {https://github.com/lachlanchen/ClearPair}
}
```
