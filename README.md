[English](README.md) · [العربية](i18n/README.ar.md) · [Español](i18n/README.es.md) · [Français](i18n/README.fr.md) · [日本語](i18n/README.ja.md) · [한국어](i18n/README.ko.md) · [Tiếng Việt](i18n/README.vi.md) · [中文 (简体)](i18n/README.zh-Hans.md) · [中文（繁體）](i18n/README.zh-Hant.md) · [Deutsch](i18n/README.de.md) · [Русский](i18n/README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# ClearPair by LazyingArt

[![11 UI languages](https://img.shields.io/badge/UI-11_languages-456BA4?style=for-the-badge)](docs/LOCALIZATION.md) [![GitHub Sponsors](https://img.shields.io/badge/Sponsor-lachlanchen-EA4AAA?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/lachlanchen)

*Practise what you mix up. Learn the difference.*

Seven focused apps for easily confused sounds and letters, on iOS, Android and PWA. ClearPair is a working name; L & N is a separate app.

![ClearPair](docs/assets/seven-icons.png)

## Seven focused apps

| ClearPair | Focus |
| --- | --- |
| H & F | English and Mandarin h/f |
| L & R | English l/r and clusters |
| English | Vowels, TH, voicing and endings |
| Mandarin | Initials, finals, aspiration and tones |
| Cantonese | Jyutping, tone contrasts, vowels, aspiration and endings |
| Korean | Hangul memory and confusing sounds |
| Arabic Letters | Shapes, dots, joins and sounds |

## Development preview

Listening quizzes, pair playback/looping, learning guides, spaced review, waveforms, recording history and export are implemented. The source supports all 11 profile UI languages, independent of practice language. Specialist phonetic notes remain English/Chinese; untranslated notes are explicitly labeled English.

V4 icons now guide the in-app palette: light backgrounds, flowing color, tidy cards and steady recording/playback controls. Earlier icon versions are retained. Optional animations and five-question games award local stars for listening/recall, never unvalidated pronunciation scores. See the [localization scope](docs/LOCALIZATION.md) and [Cantonese notes](docs/CANTONESE.md). The [existing six-app beta](docs/BETA-0.1.0.md) does not yet include this redesign or the seventh app.

**Pronunciation grades are disabled pending model integration and human validation.** Signal quality is not pronunciation accuracy. Capacitor combines a React interface with native Swift/Java recording and speech playback; these are not separate SwiftUI/Compose interfaces.

## Build and test

Requires Node 22+, npm, Android SDK/JDK 21, and an Xcode Mac for iOS. Builds run sequentially. Browser tests verify behaviour, not speech accuracy.

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

The seven app IDs are `handf`, `landr`, `english`, `chinese`, `korean`, `arabic`, `cantonese`; bundle IDs use `art.lazying.clearpair.<id>`. PWAs build into `dist/site`. Debug APKs are not Play releases. Test availability requires a verified store receipt.

## Audio and privacy

Microphone recordings stay on the device; the app does not upload them. Export opens the native share sheet or a web download. You choose the destination. Storage can fail; clearing data or uninstalling can delete recordings, so export favourites.

Temporary synthetic research clips are not bundled: redistribution permission and phonetic audition are unverified. Test builds use installed device voices. Quality and offline/language availability vary, and voice providers may use network services.

## Research and limits

See the [build plan](docs/BUILD-PLAN.md), [scoring design](docs/SCORING-DESIGN.md) and [curriculum sources](docs/CURRICULUM-SOURCES.md). Each contrast needs calibrated evidence; silence, unknown content and accent mergers must not receive invented scores.

The planned home is [language-agent.lazying.art](https://language-agent.lazying.art/), not yet a verified deployment. This preview is educational, not therapy or diagnosis. Trademark clearance and an open-source licence have not been established.

## Support

Support development through [GitHub Sponsors](https://github.com/sponsors/lachlanchen) or the buttons below.

| Donate | PayPal | Stripe |
| --- | --- | --- |
| [![Donate](https://img.shields.io/badge/Donate-LazyingArt-0EA5E9?style=for-the-badge&logo=kofi&logoColor=white)](https://chat.lazying.art/donate) | [![PayPal](https://img.shields.io/badge/PayPal-RongzhouChen-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/RongzhouChen) | [![Stripe](https://img.shields.io/badge/Stripe-Donate-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |

## Citation

GitHub reads [CITATION.cff](CITATION.cff) to show “Cite this repository”. Cite the software as follows:

```bibtex
@software{chen_clearpair_2026,
  author = {Chen, Lachlan},
  title = {ClearPair: Practise What You Mix Up},
  year = {2026},
  version = {0.2.0},
  url = {https://github.com/lachlanchen/ClearPair}
}
```
