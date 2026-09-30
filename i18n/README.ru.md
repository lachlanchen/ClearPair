[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# ClearPair by LazyingArt

*Тренируйте то, что путаете. Учитесь различать.*

Шесть приложений для легко смешиваемых звуков и букв на iOS, Android и PWA. ClearPair — рабочее название; L & N остаётся отдельным приложением.

## Шесть специализированных приложений

| ClearPair | Шесть специализированных приложений |
| --- | --- |
| H & F | h/f в английском и путунхуа |
| L & R | Английские l/r и сочетания согласных |
| English | Гласные, TH, звонкость и конечные звуки |
| Mandarin | Инициали, финали, придыхание и тоны |
| Korean | Запоминание хангыля и похожие звуки |
| Arabic Letters | Формы, точки, соединения и звуки |

## Предварительная версия

Реализованы слуховые задания, воспроизведение пар и циклы, инструкции, интервальное повторение, волновые формы, история и экспорт записей. Английский и упрощённый китайский языки интерфейса выбираются независимо от языка практики.

**Оценки произношения отключены до интеграции моделей и проверки на людях.** Качество сигнала не равно точности произношения. Capacitor объединяет React с нативной записью и речью Swift/Java; это не отдельные интерфейсы SwiftUI/Compose.

## Сборка и тестирование

Нужны Node 22+, npm, Android SDK/JDK 21 и Mac с Xcode для iOS. Сборки выполняются последовательно. Браузерные тесты проверяют поведение, а не фонетическую точность.

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

ID приложений: `handf`, `landr`, `english`, `chinese`, `korean`, `arabic`; идентификаторы пакетов: `art.lazying.clearpair.<id>`. PWA собираются в `dist/site`. Отладочные APK не являются релизами Play. Доступность тестирования должна подтверждаться проверенным ответом магазина.

## Аудио и конфиденциальность

Записи микрофона остаются на устройстве; приложение их не загружает на сервер. Экспорт открывает нативное меню обмена или скачивание в браузере. Получателя выбираете вы. Сохранение может не сработать; очистка данных или удаление приложения могут стереть записи. Экспортируйте важные файлы.

Встроенные образцы — синтетическая речь по оригинальным текстам уроков; их качество ещё требует прослушивания человеком. При отсутствии образца голоса устройства могут обращаться к сетевым сервисам.

## Исследования и ограничения

См. [план сборки](../docs/BUILD-PLAN.md), [схему оценки](../docs/SCORING-DESIGN.md) и [источники курса](../docs/CURRICULUM-SOURCES.md). Каждому противопоставлению нужны калиброванные данные; тишина, неизвестное содержание и совпадающие в диалекте звуки не должны получать выдуманные баллы.

Планируется сайт [language-agent.lazying.art](https://language-agent.lazying.art/), но развёртывание пока не подтверждено. Это учебный инструмент, не терапия и не диагностика. Проверка товарного знака и выбор открытой лицензии не завершены.

## Поддержка

Поддержать разработку можно через [GitHub Sponsors](https://github.com/sponsors/lachlanchen) или кнопки ниже.

| Donate | PayPal | Stripe |
| --- | --- | --- |
| [![Donate](https://img.shields.io/badge/Donate-LazyingArt-0EA5E9?style=for-the-badge&logo=kofi&logoColor=white)](https://chat.lazying.art/donate) | [![PayPal](https://img.shields.io/badge/PayPal-RongzhouChen-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/RongzhouChen) | [![Stripe](https://img.shields.io/badge/Stripe-Donate-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |

## Цитирование

GitHub читает [CITATION.cff](../CITATION.cff) и показывает «Cite this repository». Цитируйте программу так:

```bibtex
@software{chen_clearpair_2026,
  author = {Chen, Lachlan},
  title = {ClearPair: Practise What You Mix Up},
  year = {2026},
  version = {0.1.0},
  url = {https://github.com/lachlanchen/ClearPair}
}
```
