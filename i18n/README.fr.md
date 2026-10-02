[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# ClearPair by LazyingArt

[![11 UI languages](https://img.shields.io/badge/UI-11_languages-456BA4?style=for-the-badge)](../docs/LOCALIZATION.md) [![GitHub Sponsors](https://img.shields.io/badge/Sponsor-lachlanchen-EA4AAA?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/lachlanchen)

*Entraînez ce que vous confondez. Apprenez la différence.*

Huit cours ciblant les sons et lettres faciles à confondre, pour iOS, Android et PWA. ClearPair est un nom provisoire ; L & N reste une application distincte.

![ClearPair](../docs/assets/eight-icons-v4.png)

Les huit applications autonomes, dont le [japonais](../docs/JAPANESE-COURSE.md), ont des [versions de test interne 1.0.0 (9) et des liens d’accès](../docs/BETA-1.0.0-9.md) sur TestFlight et Google Play. Les huit soumissions officielles iOS utilisent toujours le build 8 et attendent leur examen, avec publication automatique après approbation conservée ; la soumission de production Google n’est pas encore terminée. Les [paquets signés et les états des boutiques sont vérifiés](../store/artifacts/internal-beta-1.0.0-9.json). Cette mise à jour de test interne n’est ni une approbation ni une disponibilité publique. La PWA publique ne change pas.

## Huit cours ciblés

| ClearPair | Huit cours ciblés |
| --- | --- |
| H & F | h/f en anglais et mandarin |
| L & R | l/r et groupes consonantiques anglais |
| English | Voyelles, TH, voisement et finales |
| Mandarin | Initiales, finales, aspiration et tons |
| Cantonese | Jyutping, tons, voyelles, aspiration et finales |
| Korean | Mémorisation du hangeul et sons proches |
| Arabic Letters | Formes, points, liaisons et sons |
| Japanese | Kana proches, ordre des traits, furigana et mores |

## Version de développement

Quiz d’écoute, lecture/boucle de paires, guides, révision espacée, formes d’onde, historique et export sont disponibles. Le code prend en charge les 11 langues du profil, indépendamment de la langue étudiée. Les notes phonétiques spécialisées restent en anglais/chinois ; les notes non traduites sont explicitement signalées en anglais.

Les icônes V4 inspirent la palette : fonds clairs, couleurs fluides, cartes ordonnées et commandes stables d’enregistrement/lecture. Les anciennes icônes sont conservées. Animations facultatives et jeux de cinq questions attribuent des étoiles locales pour l’écoute/le rappel, jamais pour une prononciation non validée. Voir la [portée linguistique](../docs/LOCALIZATION.md) et les [notes cantonaises](../docs/CANTONESE.md). La [bêta 0.2.0 (2) des sept apps](../docs/BETA-0.2.0.md) inclut V4, les 11 langues d’interface et le cantonais.

**Le build 9 améliore le score natif automatique de correspondance.** Touchez Enregistrer, parlez, puis faites une pause ou touchez Arrêter et évaluer. Les mots courts et faibles conservent leurs consonnes peu audibles au début et à la fin ; l’analyse donne plus de poids à l’initiale, à la voyelle ou à la finale confondue qu’aux sons communs. H & F affiche le son, la voyelle/le mot et la durée relative ; les autres cours affichent la correspondance du mot, le contraste et la durée de parole. Les commandes d’enregistrement restent au-dessus des résultats. Ce sont des indices locaux de similarité, pas des pourcentages calibrés de prononciation correcte. Une voix hors ligne installée est nécessaire ; les notes phonétiques calibrées et la notation PWA restent désactivées. Consultez les [notes sur l’algorithme](../docs/SCORING-UPDATE-20261002.md). Capacitor associe React à l’enregistrement et à la parole natifs Swift/Java ; il ne s’agit pas d’interfaces SwiftUI/Compose séparées.

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

Identifiants : `handf`, `landr`, `english`, `chinese`, `korean`, `arabic`, `cantonese`, `japanese` ; paquets `art.lazying.clearpair.<id>`. Les PWA sont produites dans `dist/site`. Les APK de débogage ne sont pas des versions Play. Une confirmation vérifiée du magasin est nécessaire pour annoncer les tests disponibles.

## Audio et confidentialité

Les enregistrements restent sur l'appareil ; l'application ne les téléverse pas. L'export ouvre le partage natif ou un téléchargement web. Vous choisissez la destination. Le stockage peut échouer ; effacer les données ou désinstaller peut supprimer les enregistrements. Exportez vos favoris.

Les extraits synthétiques de recherche ne sont pas inclus : droits de redistribution et contrôle phonétique humain restent non vérifiés. Les versions de test utilisent les voix installées. Qualité, langues et disponibilité hors ligne varient ; le fournisseur peut utiliser le réseau.

## Recherche et limites

Voir le [plan](../docs/BUILD-PLAN.md), la [conception du score](../docs/SCORING-DESIGN.md) et les [sources](../docs/CURRICULUM-SOURCES.md). Chaque contraste nécessite des preuves calibrées ; silence, contenu inconnu et fusions dialectales ne doivent pas recevoir de notes inventées.

La préversion PWA est disponible sur [language-agent.lazying.art](https://language-agent.lazying.art/). Outil éducatif, ni thérapie ni diagnostic. La disponibilité juridique du nom et une licence libre n’ont pas été établies.

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
  version = {1.0.0},
  url = {https://github.com/lachlanchen/ClearPair}
}
```
