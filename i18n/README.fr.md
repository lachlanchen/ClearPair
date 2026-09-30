[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# ClearPair by LazyingArt

*Entraînez ce que vous confondez. Apprenez la différence.*

Six applications ciblant les sons et lettres faciles à confondre, pour iOS, Android et PWA. ClearPair est un nom provisoire ; L & N reste une application distincte.

## Six applications ciblées

| ClearPair | Six applications ciblées |
| --- | --- |
| H & F | h/f en anglais et mandarin |
| L & R | l/r et groupes consonantiques anglais |
| English | Voyelles, TH, voisement et finales |
| Mandarin | Initiales, finales, aspiration et tons |
| Korean | Mémorisation du hangeul et sons proches |
| Arabic Letters | Formes, points, liaisons et sons |

## Version de développement

Quiz d'écoute, lecture et boucle de paires, guides, révision espacée, formes d'onde, historique et export sont disponibles. L'interface anglaise ou chinoise simplifiée est indépendante de la langue étudiée.

**Les notes de prononciation sont désactivées en attendant l'intégration des modèles et leur validation humaine.** La qualité du signal ne mesure pas la prononciation. Capacitor associe React à l'enregistrement et à la parole natifs Swift/Java ; il ne s'agit pas d'interfaces SwiftUI/Compose séparées.

## Compiler et tester

Nécessite Node 22+, npm, Android SDK/JDK 21 et un Mac Xcode pour iOS. Les compilations sont séquentielles. Les tests navigateur vérifient le comportement, pas la précision phonétique.

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

Identifiants : `handf`, `landr`, `english`, `chinese`, `korean`, `arabic` ; paquets `art.lazying.clearpair.<id>`. Les PWA sont produites dans `dist/site`. Les APK de débogage ne sont pas des versions Play. Une confirmation vérifiée du magasin est nécessaire pour annoncer les tests disponibles.

## Audio et confidentialité

Les enregistrements restent sur l'appareil ; l'application ne les téléverse pas. L'export ouvre le partage natif ou un téléchargement web. Vous choisissez la destination. Le stockage peut échouer ; effacer les données ou désinstaller peut supprimer les enregistrements. Exportez vos favoris.

Les références sont des voix synthétiques lisant des textes originaux ; une écoute humaine de contrôle reste nécessaire. Si une référence manque, les voix de l'appareil peuvent utiliser le réseau.

## Recherche et limites

Voir le [plan](../docs/BUILD-PLAN.md), la [conception du score](../docs/SCORING-DESIGN.md) et les [sources](../docs/CURRICULUM-SOURCES.md). Chaque contraste nécessite des preuves calibrées ; silence, contenu inconnu et fusions dialectales ne doivent pas recevoir de notes inventées.

Le site prévu est [language-agent.lazying.art](https://language-agent.lazying.art/), sans déploiement encore vérifié. Outil éducatif, ni thérapie ni diagnostic. La disponibilité juridique du nom et une licence libre n'ont pas été établies.

## Soutien

Soutenez le développement avec [GitHub Sponsors](https://github.com/sponsors/lachlanchen) ou les boutons ci-dessous.

| Donate | PayPal | Stripe |
| --- | --- | --- |
| [![Donate](https://img.shields.io/badge/Donate-LazyingArt-0EA5E9?style=for-the-badge&logo=kofi&logoColor=white)](https://chat.lazying.art/donate) | [![PayPal](https://img.shields.io/badge/PayPal-RongzhouChen-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/RongzhouChen) | [![Stripe](https://img.shields.io/badge/Stripe-Donate-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |

## Citation

GitHub utilise [CITATION.cff](../CITATION.cff) pour afficher « Cite this repository ». Référence du logiciel :

```bibtex
@software{chen_clearpair_2026,
  author = {Chen, Lachlan},
  title = {ClearPair: Practise What You Mix Up},
  year = {2026},
  version = {0.1.0},
  url = {https://github.com/lachlanchen/ClearPair}
}
```
