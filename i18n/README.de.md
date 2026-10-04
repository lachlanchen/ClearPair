[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# ClearPair by LazyingArt

[![11 UI languages](https://img.shields.io/badge/UI-11_languages-456BA4?style=for-the-badge)](../docs/LOCALIZATION.md) [![GitHub Sponsors](https://img.shields.io/badge/Sponsor-lachlanchen-EA4AAA?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/lachlanchen)

*Übe, was du verwechselst. Lerne den Unterschied.*

Acht gezielte Kurse für leicht verwechselbare Laute und Buchstaben auf iOS, Android und als PWA. ClearPair ist ein Arbeitsname; L & N bleibt eine eigenständige App.

![ClearPair](../docs/assets/eight-icons-v4.png)

Der [aktuelle Release-Beleg](../docs/RELEASE-20261004.md) bestätigt TestFlight und den internen Google-Play-Test für alle acht Apps in Version 1.0.0: H & F **15**, L & R **11**, Englisch **11**, Mandarin **10**, Kantonesisch **11**, Koreanisch **10**, Arabisch **10** und Japanisch **10**. Ohne Deinstallation aktualisieren, damit der Verlauf erhalten bleibt.

Dieselben acht Builds sind zur regulären Prüfung eingereicht. Am 4. Oktober 2026 geprüft: Apple **Waiting for Review**; Google **Changes in review**, mit allen **173 unterstützten Ländern und Regionen für kostenpflichtige Apps**. Automatische Veröffentlichung nach Freigabe und bisherige Preise bleiben erhalten. Einreichung bedeutet weder Freigabe noch öffentliche Verfügbarkeit.

Die [gemeinsame Feedback-Überarbeitung](../docs/PAIR-FEEDBACK-MIGRATION-20261003.md) bringt echte native Offline-Transkripte, unabhängige akustische Evidenz je Paar und kompakte, stabile Bedienelemente in die anderen Kurse. Technische Tests gespeicherter Audios zertifizieren keine Aussprachegenauigkeit bei Menschen. Die [Erweiterung der Lautübersichten und Tonkontraste](../docs/SOUND-COVERAGE-RESEARCH.md) ist separate Entwicklungsarbeit, nicht Bestandteil dieser Builds oder der aktuellen PWA.


## Acht spezialisierte Kurse

| ClearPair | Acht spezialisierte Kurse |
| --- | --- |
| H & F | Englisches und mandarinchinesisches h/f |
| L & R | Englisches l/r und Konsonantengruppen |
| English | Vokale, TH, Stimmhaftigkeit und Endlaute |
| Mandarin | Anlaute, Auslaute, Aspiration und Töne |
| Cantonese | Jyutping, Töne, Vokale, Aspiration und Endlaute |
| Korean | Hangul-Merktraining und verwechselbare Laute |
| Arabic Letters | Formen, Punkte, Verbindungen und Laute |
| Japanese | Verwechselbare Kana, Strichfolge, Furigana und Moren |

## Entwicklungsvorschau

Hörquiz, Paarwiedergabe/Schleifen, Lernguides, zeitversetzte Wiederholung, Wellenformen, Aufnahmeverlauf und Export sind implementiert. Der Quellcode unterstützt alle 11 Profilsprachen unabhängig von der Übungssprache. Fachliche Phonetikhinweise bleiben Englisch/Chinesisch; unübersetzte Hinweise sind ausdrücklich als Englisch gekennzeichnet.

V4-Icons prägen die Palette: helle Hintergründe, fließende Farben, aufgeräumte Karten und stabile Aufnahme-/Wiedergabesteuerung. Frühere Icons bleiben erhalten. Optionale Animationen und Fünf-Fragen-Spiele vergeben lokale Sterne fürs Hören/Erinnern, nie unvalidierte Aussprachenoten. Siehe [Sprachumfang](../docs/LOCALIZATION.md) und [kantonesische Hinweise](../docs/CANTONESE.md). Die [Sieben-App-Beta 0.2.0 (2)](../docs/BETA-0.2.0.md) enthält V4, alle 11 UI-Sprachen und Kantonesisch.

Aufnahme antippen, sprechen und dann pausieren oder Stoppen und bewerten wählen. Wenn verfügbar, bleibt das tatsächlich erkannte Wort sichtbar; Wortidentität und gemessene Lautmerkmale werden getrennt dargestellt. Der zentrierte Aufnahmebutton bleibt ohne Timer über den Ergebnissen. Die Werte sind lokale Übungsindizes, keine kalibrierten Genauigkeitsprozente. Eine Offline-Stimme der Übungssprache ist erforderlich; integrierte Worterkennungsmodelle sind nur nativ verfügbar. Siehe die [Feedback-Algorithmusnotizen](../docs/PAIR-FEEDBACK-MIGRATION-20261003.md). Capacitor verbindet React mit nativer Swift/Java-Aufnahme und Wiedergabe, nicht mit getrennten SwiftUI/Compose-Oberflächen.

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

App-IDs: `handf`, `landr`, `english`, `chinese`, `korean`, `arabic`, `cantonese`, `japanese`; Bundle-IDs: `art.lazying.clearpair.<id>`. PWAs entstehen in `dist/site`. Debug-APKs sind keine Play-Veröffentlichungen. Testverfügbarkeit benötigt einen verifizierten Store-Beleg.

## Audio und Datenschutz

Mikrofonaufnahmen bleiben auf dem Gerät; die App lädt sie nicht hoch. Export öffnet das native Teilen-Menü oder einen Webdownload. Du wählst das Ziel. Speichern kann fehlschlagen; Datenlöschung oder Deinstallation können Aufnahmen entfernen. Exportiere wichtige Dateien.

Vorläufige synthetische Forschungsclips werden nicht mitgeliefert: Weitergaberechte und menschliche Ausspracheprüfung sind ungeklärt. Testversionen nutzen installierte Gerätestimmen. Qualität, Sprachen und Offline-Verfügbarkeit variieren; Anbieter können Netzwerkdienste verwenden.

## Forschung und Grenzen

Siehe [Bauplan](../docs/BUILD-PLAN.md), [Bewertungsdesign](../docs/SCORING-DESIGN.md) und [Lehrplanquellen](../docs/CURRICULUM-SOURCES.md). Jeder Kontrast braucht kalibrierte Belege; Stille, unbekannter Inhalt und dialektale Zusammenfälle dürfen keine erfundenen Noten erhalten.

Die PWA-Vorschau ist unter [language-agent.lazying.art](https://language-agent.lazying.art/) verfügbar. Dies ist ein Lernwerkzeug, keine Therapie oder Diagnose. Markenfreigabe und Open-Source-Lizenz stehen noch nicht fest.

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
  version = {1.0.0},
  url = {https://github.com/lachlanchen/ClearPair}
}
```
