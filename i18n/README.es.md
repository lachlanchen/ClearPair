[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# ClearPair by LazyingArt

[![11 UI languages](https://img.shields.io/badge/UI-11_languages-456BA4?style=for-the-badge)](../docs/LOCALIZATION.md) [![GitHub Sponsors](https://img.shields.io/badge/Sponsor-lachlanchen-EA4AAA?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/lachlanchen)

*Practica lo que confundes. Aprende la diferencia.*

Ocho cursos centrados en sonidos y letras fáciles de confundir, para iOS, Android y PWA. ClearPair es un nombre provisional; L & N es otra aplicación.

![ClearPair](../docs/assets/eight-icons-v4.png)

Las ocho apps independientes, incluido [japonés](../docs/JAPANESE-COURSE.md), están disponibles en [prueba interna 1.0.0 (4)](../docs/BETA-1.0.0-4.md) en TestFlight y Google Play. Los textos de TestFlight ya describen cada app por separado. Las puntuaciones siguen desactivadas mientras se validan los modelos locales. Las correcciones posteriores de selección de voz están en el código, no en la versión 4. La revisión formal sigue pendiente.

## Ocho cursos especializados

| ClearPair | Ocho cursos especializados |
| --- | --- |
| H & F | h/f en inglés y mandarín |
| L & R | l/r y grupos consonánticos ingleses |
| English | Vocales, TH, sonoridad y terminaciones |
| Mandarin | Iniciales, finales, aspiración y tonos |
| Cantonese | Jyutping, tonos, vocales, aspiración y terminaciones |
| Korean | Memoria de hangul y sonidos confundibles |
| Arabic Letters | Formas, puntos, enlaces y sonidos |
| Japanese | Kana confundibles, trazos, furigana y contrastes de mora |

## Versión preliminar

Están implementados los cuestionarios auditivos, reproducción y bucle de pares, guías, repaso espaciado, ondas, historial y exportación. El código admite los 11 idiomas de interfaz del perfil, independientes del idioma practicado. Las notas fonéticas especializadas siguen en inglés/chino; las no traducidas se identifican como inglesas.

Los iconos V4 guían la paleta: fondos claros, color fluido, tarjetas ordenadas y controles estables de grabación/reproducción. Se conservan los iconos anteriores. Animaciones opcionales y juegos de cinco preguntas otorgan estrellas locales por escuchar/recordar, nunca notas de pronunciación no validadas. Consulta el [alcance de idiomas](../docs/LOCALIZATION.md) y las [notas cantonesas](../docs/CANTONESE.md). La [beta 0.2.0 (2) de siete apps](../docs/BETA-0.2.0.md) incluye V4, los 11 idiomas de interfaz y cantonés.

**Las notas de pronunciación están desactivadas hasta integrar y validar los modelos con personas.** La calidad de señal no mide pronunciación. Capacitor combina React con grabación y voz nativas Swift/Java; no son interfaces SwiftUI/Compose independientes.

## Compilar y probar

Requiere Node 22+, npm, Android SDK/JDK 21 y un Mac con Xcode para iOS. Las compilaciones son secuenciales. Las pruebas de navegador comprueban comportamiento, no precisión fonética.

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

Los identificadores son `handf`, `landr`, `english`, `chinese`, `korean`, `arabic`, `cantonese`, `japanese`; los paquetes usan `art.lazying.clearpair.<id>`. Las PWA se generan en `dist/site`. Los APK de depuración no son versiones Play. La disponibilidad para pruebas exige confirmación verificada del proveedor.

## Audio y privacidad

Las grabaciones quedan en el dispositivo; la aplicación no las sube. Exportar abre el menú nativo de compartir o una descarga web. Tú eliges el destino. El almacenamiento puede fallar; borrar datos o desinstalar puede eliminar grabaciones. Exporta tus favoritas.

Los clips sintéticos temporales de investigación no se incluyen: faltan permiso de redistribución verificado y revisión fonética humana. Las versiones de prueba usan voces instaladas. La calidad y disponibilidad de idiomas sin conexión varían; el proveedor puede utilizar la red.

## Investigación y límites

Consulta el [plan](../docs/BUILD-PLAN.md), el [diseño de evaluación](../docs/SCORING-DESIGN.md) y las [fuentes](../docs/CURRICULUM-SOURCES.md). Cada contraste requiere evidencia calibrada; el silencio, contenido desconocido y fusiones dialectales no deben recibir notas inventadas.

La versión preliminar PWA está disponible en [language-agent.lazying.art](https://language-agent.lazying.art/). Es una herramienta educativa, no terapia ni diagnóstico. No se ha establecido autorización de marca ni licencia de código abierto.

## Apoyo

Apoya el desarrollo con [GitHub Sponsors](https://github.com/sponsors/lachlanchen) o los botones siguientes.

| Donate | PayPal | Stripe |
| --- | --- | --- |
| [![Donate](https://img.shields.io/badge/Donate-LazyingArt-0EA5E9?style=for-the-badge&logo=kofi&logoColor=white)](https://chat.lazying.art/donate) | [![PayPal](https://img.shields.io/badge/PayPal-RongzhouChen-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/RongzhouChen) | [![Stripe](https://img.shields.io/badge/Stripe-Donate-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |

## Cita

GitHub lee [CITATION.cff](../CITATION.cff) para mostrar «Cite this repository». Cita el programa así:

```bibtex
@software{chen_clearpair_2026,
  author = {Chen, Lachlan},
  title = {ClearPair: Practise What You Mix Up},
  year = {2026},
  version = {1.0.0},
  url = {https://github.com/lachlanchen/ClearPair}
}
```
