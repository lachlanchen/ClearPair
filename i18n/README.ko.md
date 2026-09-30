[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# ClearPair by LazyingArt

*헷갈리는 부분을 연습하고, 차이를 익히세요.*

혼동하기 쉬운 소리와 글자에 집중하는 여섯 앱으로, iOS·Android·PWA를 지원합니다. ClearPair는 임시 이름이며 기존 L & N과 별개입니다.

## 여섯 가지 전문 앱

| ClearPair | 여섯 가지 전문 앱 |
| --- | --- |
| H & F | 영어와 중국어의 h/f |
| L & R | 영어 l/r 및 자음군 |
| English | 모음, TH, 유성·무성, 어말 소리 |
| Mandarin | 성모, 운모, 기식, 성조 |
| Korean | 한글 기억과 헷갈리는 소리 |
| Arabic Letters | 아랍 문자 모양, 점, 연결, 소리 |

## 개발 미리보기

듣기 퀴즈, 쌍 재생과 반복, 학습 안내, 간격 반복, 파형, 녹음 기록과 내보내기를 구현했습니다. 영어·중국어 간체 UI 언어는 연습 언어와 별도로 설정합니다.

**발음 점수는 모델 통합과 사람의 검증이 끝날 때까지 비활성화됩니다.** 신호 품질은 발음 정확도가 아닙니다. Capacitor는 React 화면에 Swift/Java 네이티브 녹음과 음성을 결합합니다. 별도의 SwiftUI/Compose 인터페이스는 아닙니다.

## 빌드와 테스트

Node 22+, npm, Android SDK/JDK 21이 필요하며 iOS에는 Xcode Mac이 필요합니다. 빌드는 순차 실행합니다. 브라우저 테스트는 동작을 확인할 뿐, 실제 발음 정확도를 검증하지 않습니다.

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

앱 ID는 `handf`, `landr`, `english`, `chinese`, `korean`, `arabic`이며 번들 ID는 `art.lazying.clearpair.<id>`입니다. PWA는 `dist/site`에 생성됩니다. 디버그 APK는 Play 출시본이 아닙니다. 테스트 배포 여부는 검증된 스토어 응답으로 확인해야 합니다.

## 오디오와 개인정보

마이크 녹음은 기기에 남으며 앱이 업로드하지 않습니다. 내보내기는 네이티브 공유 창이나 웹 다운로드를 열고 목적지는 사용자가 선택합니다. 저장이 실패할 수 있고 데이터 삭제나 앱 제거로 녹음이 사라질 수 있으므로 중요한 파일은 내보내세요.

임시 합성 연구 음성은 재배포 허가와 사람의 발음 검증이 확인되지 않아 포함하지 않습니다. 테스트 빌드는 기기에 설치된 음성을 사용합니다. 품질, 지원 언어와 오프라인 사용 가능 여부는 기기마다 다르며 음성 제공자가 네트워크 서비스를 사용할 수 있습니다.

## 연구와 한계

[빌드 계획](../docs/BUILD-PLAN.md), [평가 설계](../docs/SCORING-DESIGN.md), [교육 자료 출처](../docs/CURRICULUM-SOURCES.md)를 참고하세요. 각 대조에는 보정된 근거가 필요합니다. 무음, 알 수 없는 내용, 방언에서 합쳐진 소리에 임의 점수를 주지 않습니다.

예정 사이트는 [language-agent.lazying.art](https://language-agent.lazying.art/)이나 배포는 아직 확인되지 않았습니다. 교육용이며 치료·진단 도구가 아닙니다. 상표 검토와 오픈소스 라이선스는 확정되지 않았습니다.

## 후원

[GitHub Sponsors](https://github.com/sponsors/lachlanchen) 또는 아래 버튼으로 개발을 후원할 수 있습니다.

| Donate | PayPal | Stripe |
| --- | --- | --- |
| [![Donate](https://img.shields.io/badge/Donate-LazyingArt-0EA5E9?style=for-the-badge&logo=kofi&logoColor=white)](https://chat.lazying.art/donate) | [![PayPal](https://img.shields.io/badge/PayPal-RongzhouChen-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/RongzhouChen) | [![Stripe](https://img.shields.io/badge/Stripe-Donate-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |

## 인용

GitHub는 [CITATION.cff](../CITATION.cff)를 읽어 “Cite this repository”를 표시합니다. 다음 형식으로 인용하세요:

```bibtex
@software{chen_clearpair_2026,
  author = {Chen, Lachlan},
  title = {ClearPair: Practise What You Mix Up},
  year = {2026},
  version = {0.1.0},
  url = {https://github.com/lachlanchen/ClearPair}
}
```
