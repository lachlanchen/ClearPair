[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# ClearPair by LazyingArt

[![11 UI languages](https://img.shields.io/badge/UI-11_languages-456BA4?style=for-the-badge)](../docs/LOCALIZATION.md) [![GitHub Sponsors](https://img.shields.io/badge/Sponsor-lachlanchen-EA4AAA?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/lachlanchen)

*Practica lo que confundes. Aprende la diferencia.*

Ocho cursos centrados en sonidos y letras fáciles de confundir, para iOS, Android y PWA. ClearPair es un nombre provisional; L & N es otra aplicación.

![ClearPair](../docs/assets/eight-icons-v4.png)

La [actualización de puntuación exclusiva de H & F](../docs/HANDF-NATIVE-SCORING-20261003.md) identifica audio guardado en inglés y mandarín de forma nativa en iOS, con un respaldo integrado sin conexión en lugar de depender del decodificador WebView. La identidad de la palabra y los detalles sonoros medidos siguen separados; los motivos de evaluación fallida se conservan junto al audio del historial. Los demás cursos y las revisiones oficiales existentes no cambian. Validar el código no implica disponibilidad en la tienda ni certificación de precisión con voces humanas.

[H & F 1.0.0 (14)](../docs/BETA-HANDF-1.0.0-14.md) está verificado en TestFlight y en las pruebas internas de Google Play. Actualiza sin desinstalar para conservar el historial. Es una versión de prueba, no una nueva publicación pública en las tiendas.

Las ocho apps independientes, incluido [japonés](../docs/JAPANESE-COURSE.md), tienen [pruebas internas 1.0.0 (9) y enlaces de acceso](../docs/BETA-1.0.0-9.md) en TestFlight y Google Play. Las ocho revisiones oficiales de iOS siguen usando la compilación 8 y esperan revisión, manteniendo la publicación automática tras la aprobación; el envío de producción a Google aún no está completo. Se verificaron [los paquetes firmados y los estados de las tiendas](../store/artifacts/internal-beta-1.0.0-9.json). Esta actualización de prueba interna no significa aprobación ni disponibilidad pública. La PWA pública no cambia.

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

**La compilación 9 mejora la puntuación nativa automática de similitud.** Toca Grabar, habla y haz una pausa, o toca Detener y puntuar. Las palabras cortas y suaves conservan las consonantes débiles al principio y al final; el análisis prioriza el sonido inicial, la vocal o la terminación que se confunden frente a los sonidos compartidos. H & F muestra sonido, vocal/palabra y duración relativa; los otros cursos muestran coincidencia de palabra, contraste y duración del habla. Los controles de grabación quedan encima de los resultados. Son índices locales de similitud, no porcentajes calibrados de pronunciación correcta. Requiere una voz sin conexión instalada; las notas fonéticas calibradas y la puntuación PWA siguen desactivadas. Consulta las [notas del algoritmo](../docs/SCORING-UPDATE-20261002.md). Capacitor combina React con grabación y voz nativas Swift/Java; no son interfaces SwiftUI/Compose independientes.

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
