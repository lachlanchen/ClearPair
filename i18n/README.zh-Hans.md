[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# ClearPair by LazyingArt

[![11 UI languages](https://img.shields.io/badge/UI-11_languages-456BA4?style=for-the-badge)](../docs/LOCALIZATION.md) [![GitHub Sponsors](https://img.shields.io/badge/Sponsor-lachlanchen-EA4AAA?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/lachlanchen)

*专练容易混淆的部分，真正学会分辨。*

八门针对易混淆语音与字母的专项课程，支持iOS、Android和PWA。ClearPair是暂定品牌名，原有L & N继续作为独立应用。这里强调对比、辨音与区分，而不是泛泛的单词练习。

![ClearPair](../docs/assets/eight-icons-v4.png)

包含独立[日语应用](../docs/JAPANESE-COURSE.md)的八款应用，均已提供 TestFlight 和 Google Play [内部测试版 1.0.0 (5)](../docs/BETA-1.0.0-5.md)。包含各应用专属说明、更严格的参考语音选择及日语字母读音修复。八门课程的 PWA 已验证上线。本地模型仍在验证，发音分数尚未启用；参考音试听和真机麦克风验证尚未完成。正式审核尚未提交。

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

**发音评分尚未启用，须先完成模型接入与真人标注验证。** 信号质量不是发音准确度，也不能作为评分替代品。应用采用Capacitor，将React界面与Swift/Java原生录音及语音播放结合，并非分别开发的SwiftUI/Compose界面。

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
