[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# ClearPair by LazyingArt

[![11 UI languages](https://img.shields.io/badge/UI-11_languages-456BA4?style=for-the-badge)](../docs/LOCALIZATION.md) [![GitHub Sponsors](https://img.shields.io/badge/Sponsor-lachlanchen-EA4AAA?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/lachlanchen)

*헷갈리는 부분을 연습하고, 차이를 익히세요.*

혼동하기 쉬운 소리와 글자에 집중하는 여덟 코스로, iOS·Android·PWA를 지원합니다. ClearPair는 임시 이름이며 기존 L & N과 별개입니다.

![ClearPair](../docs/assets/eight-icons-v4.png)

[일본어](../docs/JAPANESE-COURSE.md)를 포함한 독립 앱 8개가 TestFlight와 Google Play에서 [내부 테스트 1.0.0 (5)](../docs/BETA-1.0.0-5.md)로 제공돼요. 앱별 설명, 엄격한 음성 선택, 일본어 글자 읽기 수정이 포함돼요. 8개 코스의 PWA 공개도 확인했어요. 로컬 모델 검증 중이라 발음 점수는 아직 비활성화돼요. 참고 음성 청취와 실제 기기 마이크 검증은 미완료이며 정식 심사는 아직 제출하지 않았어요.

## 여덟 가지 전문 코스

| ClearPair | 여덟 가지 전문 코스 |
| --- | --- |
| H & F | 영어와 중국어의 h/f |
| L & R | 영어 l/r 및 자음군 |
| English | 모음, TH, 유성·무성, 어말 소리 |
| Mandarin | 성모, 운모, 기식, 성조 |
| Cantonese | 광둥어 월병(Jyutping), 성조, 모음, 기식 및 어말 소리 |
| Korean | 한글 기억과 헷갈리는 소리 |
| Arabic Letters | 아랍 문자 모양, 점, 연결, 소리 |
| Japanese | 헷갈리는 가나, 획순, 문맥별 후리가나와 모라 대비 |

## 개발 미리보기

듣기 퀴즈, 단어쌍 재생/반복, 학습 안내, 간격 복습, 파형, 녹음 기록과 내보내기를 구현했어요. 소스는 프로필의 11개 UI 언어를 지원하며 연습 언어와 독립적이에요. 전문 음성학 설명은 영어/중국어로 남아 있고, 미번역 설명은 영어라고 명시해요.

V4 아이콘에 맞춰 밝은 배경, 부드러운 색, 정돈된 카드와 위치가 안정된 녹음/재생 조작을 사용해요. 이전 아이콘도 보존했어요. 선택적 애니메이션과 5문항 게임은 듣기/기억에 로컬 별을 주며 검증되지 않은 발음 점수는 주지 않아요. [번역 범위](../docs/LOCALIZATION.md)와 [광둥어 설명](../docs/CANTONESE.md)을 확인하세요. [7개 앱 베타 0.2.0 (2)](../docs/BETA-0.2.0.md)에는 V4, 11개 UI 언어와 광둥어 앱이 포함돼요.

**빌드 6은 네이티브 앱에 실험적 연습 일치도 점수를 추가합니다.** 스펙트럼, 제한된 시간 정렬, 상대 음높이를 이용해 녹음을 기기의 두 참고 음성과 로컬로 비교합니다. 유사도 지수이지 발음 정답률이 아닙니다. 연습 언어의 오프라인 음성이 필요하며, 보정된 음소 평가와 PWA 점수는 아직 비활성화됩니다. [테스트 기록](../docs/BETA-1.0.0-6.md)은 기능 확인과 사람의 발음 정확도를 구분합니다. Capacitor는 React 화면에 Swift/Java 네이티브 녹음과 음성을 결합합니다. 별도의 SwiftUI/Compose 인터페이스는 아닙니다.

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

앱 ID는 `handf`, `landr`, `english`, `chinese`, `korean`, `arabic`, `cantonese`, `japanese`이며 번들 ID는 `art.lazying.clearpair.<id>`입니다. PWA는 `dist/site`에 생성됩니다. 디버그 APK는 Play 출시본이 아닙니다. 테스트 배포 여부는 검증된 스토어 응답으로 확인해야 합니다.

## 오디오와 개인정보

마이크 녹음은 기기에 남으며 앱이 업로드하지 않습니다. 내보내기는 네이티브 공유 창이나 웹 다운로드를 열고 목적지는 사용자가 선택합니다. 저장이 실패할 수 있고 데이터 삭제나 앱 제거로 녹음이 사라질 수 있으므로 중요한 파일은 내보내세요.

임시 합성 연구 음성은 재배포 허가와 사람의 발음 검증이 확인되지 않아 포함하지 않습니다. 테스트 빌드는 기기에 설치된 음성을 사용합니다. 품질, 지원 언어와 오프라인 사용 가능 여부는 기기마다 다르며 음성 제공자가 네트워크 서비스를 사용할 수 있습니다.

## 연구와 한계

[빌드 계획](../docs/BUILD-PLAN.md), [평가 설계](../docs/SCORING-DESIGN.md), [교육 자료 출처](../docs/CURRICULUM-SOURCES.md)를 참고하세요. 각 대조에는 보정된 근거가 필요합니다. 무음, 알 수 없는 내용, 방언에서 합쳐진 소리에 임의 점수를 주지 않습니다.

PWA 미리보기는 [language-agent.lazying.art](https://language-agent.lazying.art/)에서 사용할 수 있습니다. 교육용이며 치료·진단 도구가 아닙니다. 상표 검토와 오픈소스 라이선스는 확정되지 않았습니다.

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
  version = {1.0.0},
  url = {https://github.com/lachlanchen/ClearPair}
}
```
