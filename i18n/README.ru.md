[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# ClearPair by LazyingArt

[![11 UI languages](https://img.shields.io/badge/UI-11_languages-456BA4?style=for-the-badge)](../docs/LOCALIZATION.md) [![GitHub Sponsors](https://img.shields.io/badge/Sponsor-lachlanchen-EA4AAA?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/lachlanchen)

*Тренируйте то, что путаете. Учитесь различать.*

Семь приложений для легко смешиваемых звуков и букв на iOS, Android и PWA. ClearPair — рабочее название; L & N остаётся отдельным приложением.

![ClearPair](../docs/assets/seven-icons.png)

## Семь специализированных приложений

| ClearPair | Семь специализированных приложений |
| --- | --- |
| H & F | h/f в английском и путунхуа |
| L & R | Английские l/r и сочетания согласных |
| English | Гласные, TH, звонкость и конечные звуки |
| Mandarin | Инициали, финали, придыхание и тоны |
| Cantonese | Ютпхин, тоны, гласные, придыхание и конечные звуки |
| Korean | Запоминание хангыля и похожие звуки |
| Arabic Letters | Формы, точки, соединения и звуки |

## Предварительная версия

Реализованы слуховые задания, воспроизведение/повтор пар, учебные схемы, интервальное повторение, волны, история и экспорт записей. Исходный код поддерживает все 11 языков профиля независимо от языка практики. Специальные фонетические заметки остаются на английском/китайском; непереведённые явно помечены как английские.

Иконки V4 задают палитру: светлый фон, плавный цвет, аккуратные карточки и стабильное положение управления записью/воспроизведением. Старые иконки сохранены. Необязательные анимации и игры из пяти вопросов дают локальные звёзды за слушание/память, а не непроверенные оценки произношения. См. [языковой охват](../docs/LOCALIZATION.md) и [заметки о кантонском](../docs/CANTONESE.md). [Текущая бета шести приложений](../docs/BETA-0.1.0.md) ещё не содержит эту переработку или седьмое приложение.

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

ID приложений: `handf`, `landr`, `english`, `chinese`, `korean`, `arabic`, `cantonese`; идентификаторы пакетов: `art.lazying.clearpair.<id>`. PWA собираются в `dist/site`. Отладочные APK не являются релизами Play. Доступность тестирования должна подтверждаться проверенным ответом магазина.

## Аудио и конфиденциальность

Записи микрофона остаются на устройстве; приложение их не загружает на сервер. Экспорт открывает нативное меню обмена или скачивание в браузере. Получателя выбираете вы. Сохранение может не сработать; очистка данных или удаление приложения могут стереть записи. Экспортируйте важные файлы.

Временные синтетические исследовательские записи не включены: права на распространение и проверка произношения человеком не подтверждены. Тестовые сборки используют установленные голоса устройства. Качество, языки и работа без сети различаются; поставщики голосов могут использовать сетевые сервисы.

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
  version = {0.2.0},
  url = {https://github.com/lachlanchen/ClearPair}
}
```
