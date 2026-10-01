[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# ClearPair by LazyingArt

[![11 UI languages](https://img.shields.io/badge/UI-11_languages-456BA4?style=for-the-badge)](../docs/LOCALIZATION.md) [![GitHub Sponsors](https://img.shields.io/badge/Sponsor-lachlanchen-EA4AAA?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/lachlanchen)

*Übe, was du verwechselst. Lerne den Unterschied.*

Sieben gezielte Apps für leicht verwechselbare Laute und Buchstaben auf iOS, Android und als PWA. ClearPair ist ein Arbeitsname; L & N bleibt eine eigenständige App.

![ClearPair](../docs/assets/seven-icons.png)

## Sieben spezialisierte Apps

| ClearPair | Sieben spezialisierte Apps |
| --- | --- |
| H & F | Englisches und mandarinchinesisches h/f |
| L & R | Englisches l/r und Konsonantengruppen |
| English | Vokale, TH, Stimmhaftigkeit und Endlaute |
| Mandarin | Anlaute, Auslaute, Aspiration und Töne |
| Cantonese | Jyutping, Töne, Vokale, Aspiration und Endlaute |
| Korean | Hangul-Merktraining und verwechselbare Laute |
| Arabic Letters | Formen, Punkte, Verbindungen und Laute |

## Entwicklungsvorschau

Hörquiz, Paarwiedergabe/Schleifen, Lernguides, zeitversetzte Wiederholung, Wellenformen, Aufnahmeverlauf und Export sind implementiert. Der Quellcode unterstützt alle 11 Profilsprachen unabhängig von der Übungssprache. Fachliche Phonetikhinweise bleiben Englisch/Chinesisch; unübersetzte Hinweise sind ausdrücklich als Englisch gekennzeichnet.

V4-Icons prägen die Palette: helle Hintergründe, fließende Farben, aufgeräumte Karten und stabile Aufnahme-/Wiedergabesteuerung. Frühere Icons bleiben erhalten. Optionale Animationen und Fünf-Fragen-Spiele vergeben lokale Sterne fürs Hören/Erinnern, nie unvalidierte Aussprachenoten. Siehe [Sprachumfang](../docs/LOCALIZATION.md) und [kantonesische Hinweise](../docs/CANTONESE.md). Die [bestehende Sechs-App-Beta](../docs/BETA-0.1.0.md) enthält diese Überarbeitung und die siebte App noch nicht.

**Aussprachebewertungen bleiben bis zur Modellintegration und menschlichen Validierung deaktiviert.** Signalqualität ist keine Aussprachegenauigkeit. Capacitor verbindet React mit nativer Swift/Java-Aufnahme und Sprachausgabe; es sind keine getrennten SwiftUI/Compose-Oberflächen.

## Bauen und testen

Benötigt Node 22+, npm, Android SDK/JDK 21 und für iOS einen Xcode-Mac. Builds laufen nacheinander. Browsertests prüfen Verhalten, nicht phonetische Genauigkeit.

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

App-IDs: `handf`, `landr`, `english`, `chinese`, `korean`, `arabic`, `cantonese`; Bundle-IDs: `art.lazying.clearpair.<id>`. PWAs entstehen in `dist/site`. Debug-APKs sind keine Play-Veröffentlichungen. Testverfügbarkeit benötigt einen verifizierten Store-Beleg.

## Audio und Datenschutz

Mikrofonaufnahmen bleiben auf dem Gerät; die App lädt sie nicht hoch. Export öffnet das native Teilen-Menü oder einen Webdownload. Du wählst das Ziel. Speichern kann fehlschlagen; Datenlöschung oder Deinstallation können Aufnahmen entfernen. Exportiere wichtige Dateien.

Vorläufige synthetische Forschungsclips werden nicht mitgeliefert: Weitergaberechte und menschliche Ausspracheprüfung sind ungeklärt. Testversionen nutzen installierte Gerätestimmen. Qualität, Sprachen und Offline-Verfügbarkeit variieren; Anbieter können Netzwerkdienste verwenden.

## Forschung und Grenzen

Siehe [Bauplan](../docs/BUILD-PLAN.md), [Bewertungsdesign](../docs/SCORING-DESIGN.md) und [Lehrplanquellen](../docs/CURRICULUM-SOURCES.md). Jeder Kontrast braucht kalibrierte Belege; Stille, unbekannter Inhalt und dialektale Zusammenfälle dürfen keine erfundenen Noten erhalten.

Geplant ist [language-agent.lazying.art](https://language-agent.lazying.art/), noch ohne verifizierte Bereitstellung. Dies ist ein Lernwerkzeug, keine Therapie oder Diagnose. Markenfreigabe und Open-Source-Lizenz stehen noch nicht fest.

## Unterstützung

Unterstütze die Entwicklung über [GitHub Sponsors](https://github.com/sponsors/lachlanchen) oder die Schaltflächen unten.

| Donate | PayPal | Stripe |
| --- | --- | --- |
| [![Donate](https://img.shields.io/badge/Donate-LazyingArt-0EA5E9?style=for-the-badge&logo=kofi&logoColor=white)](https://chat.lazying.art/donate) | [![PayPal](https://img.shields.io/badge/PayPal-RongzhouChen-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/RongzhouChen) | [![Stripe](https://img.shields.io/badge/Stripe-Donate-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |

## Zitation

GitHub liest [CITATION.cff](../CITATION.cff) für „Cite this repository“. So wird die Software zitiert:

```bibtex
@software{chen_clearpair_2026,
  author = {Chen, Lachlan},
  title = {ClearPair: Practise What You Mix Up},
  year = {2026},
  version = {0.2.0},
  url = {https://github.com/lachlanchen/ClearPair}
}
```
