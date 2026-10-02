[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# ClearPair by LazyingArt

[![11 UI languages](https://img.shields.io/badge/UI-11_languages-456BA4?style=for-the-badge)](../docs/LOCALIZATION.md) [![GitHub Sponsors](https://img.shields.io/badge/Sponsor-lachlanchen-EA4AAA?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/lachlanchen)

*Übe, was du verwechselst. Lerne den Unterschied.*

Acht gezielte Kurse für leicht verwechselbare Laute und Buchstaben auf iOS, Android und als PWA. ClearPair ist ein Arbeitsname; L & N bleibt eine eigenständige App.

![ClearPair](../docs/assets/eight-icons-v4.png)

Alle acht eigenständigen Apps, einschließlich [Japanisch](../docs/JAPANESE-COURSE.md), sind als [interne Testversion 1.0.0 (9) mit Testlinks](../docs/BETA-1.0.0-9.md) in TestFlight und Google Play verfügbar. Die acht regulären iOS-Prüfungen verwenden weiterhin Build 8 und warten auf Prüfung; die automatische Veröffentlichung nach Freigabe bleibt erhalten. Die Google-Produktionseinreichung ist noch nicht abgeschlossen. [Signierte Pakete und Anbieterstatus sind geprüft](../store/artifacts/internal-beta-1.0.0-9.json). Dieses interne Testupdate bedeutet weder Freigabe noch öffentliche Verfügbarkeit. Die öffentliche PWA bleibt unverändert.

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

**Build 9 verbessert die automatische native Übungsbewertung.** Aufnahme antippen, sprechen, dann pausieren oder Stoppen und bewerten antippen. Leise kurze Wörter behalten schwache Konsonanten am Anfang und Ende; der verwechselbare Anlaut, Vokal oder Auslaut zählt stärker als gemeinsame Laute. H & F zeigt Lautmerkmale, Vokal/Wort und relative Dauer; die übrigen Kurse zeigen Wortähnlichkeit, Kontrast und Sprechdauer. Aufnahmebedienelemente bleiben über den Ergebnissen. Die Werte sind lokale Referenzähnlichkeit, keine kalibrierten Prozentsätze korrekter Aussprache. Eine installierte Offline-Stimme ist erforderlich; kalibrierte Phonemnoten und PWA-Bewertung bleiben deaktiviert. Siehe die [Algorithmusnotizen](../docs/SCORING-UPDATE-20261002.md). Capacitor verbindet React mit nativer Swift/Java-Aufnahme und Sprachausgabe; es sind keine getrennten SwiftUI/Compose-Oberflächen.

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
