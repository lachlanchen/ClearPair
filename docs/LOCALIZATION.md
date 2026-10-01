# Eleven interface languages

All seven ClearPair apps share one interface catalog: English, Arabic, Spanish,
French, Japanese, Korean, Vietnamese, Simplified Chinese, Traditional Chinese,
German and Russian. Selecting it does not alter the practice language, target
words, IPA, selected contrast, recording data or listening-game answers.

Navigation, recording/playback states, games, storage/privacy text and diagram UI
labels are translated. Arabic uses right-to-left interface layout; pronunciation
coordinates and target-word direction stay independent. Locale selection persists
on the device, with a device-language default and an English fallback.

## Specialist notes are not silently relabeled

Detailed phonetic lesson notes currently have English and Chinese source copy.
Chinese variants are converted for Simplified/Traditional presentation without
changing target characters or phonemes. In other UI languages, untranslated
specialist notes remain English and show a localized **Reference notes · English**
label. This release does **not** claim eleven fully translated phonetics courses.
Unreviewed translation drafts are not shipped.

`src/i18n.test.ts` audits every static interface key. Browser tests exercise all
eleven languages in each product, including 320-pixel layouts, Arabic direction,
saved preference and invariant practice words. These test UI behavior, not
real-device microphone fidelity or pronunciation accuracy.

The V4 icon originals are used by every PWA, iOS app icon and Android export.
V2/V3 originals remain in `assets/icons/art-v2` and `assets/icons/art-v3`; generated
originals are retained, not replaced by a recreated approximation. Previous beta
binaries and their receipts remain available separately from new release work.
