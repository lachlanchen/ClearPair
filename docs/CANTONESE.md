# Cantonese: seventh ClearPair course

`cantonese` / `art.lazying.clearpair.cantonese` is a separate Cantonese course,
not a Mandarin voice or a UI-language setting. Its original teaching copy uses
Traditional characters and Jyutping. UI language does not change the practice language.

## Initial curriculum

Eight lessons, sixteen pairs: tones 1/3, 2/5 and 4/6; aa/a; final n/ng;
initial b/p aspiration; unreleased final p/t; and an ungraded initial n/l guide.
The n/l guide acknowledges speaker variation and is excluded from right/wrong games.
Tone drawings are relative reference contours, not prescribed absolute pitch.
The sin/sing lesson explicitly notes the accompanying vowel-quality change.

Linguistic checks use the [LSHK Jyutping scheme](https://jyutping.org/en/jyutping/),
[CUHK Cantonese syllable table](https://humanum.arts.cuhk.edu.hk/Lexis/lexi-can/syllables.htm),
and [CUHK Cantonese phonology and tone-change examples](https://www.cuhk.edu.hk/lin/cbrc/CantoneseGrammar/multimedia/01.htm).
These are references, not redistributed recordings. No audio was downloaded or bundled.

Build 9 replaces the ambiguous 波/坡 aspiration example with
標 `biu1` / 飄 `piu1`. CUHK lists 坡 under both `bo1` and `po1`; our iOS device
voice produced identical recordings for 波 and 坡. The uncertainty guard therefore
correctly refused to grade that pair. The replacement preserves vowel and tone
while changing aspiration. See the CUHK [b-initial, tone-1 entries](https://humanum.arts.cuhk.edu.hk/Lexis/lexi-can/pho-rel.php?s1=b&s3=1)
and [p-initial, tone-1 entries](https://humanum.arts.cuhk.edu.hk/Lexis/lexi-can/pho-rel.php?s1=p&s3=1).
Existing recordings retain their original word/prompt; a changed prompt is not
silently reinterpreted during reassessment.

## Voice and scoring safeguards

Web, Swift and Java voice selection require an explicit Cantonese tag (`zh-HK`,
`zh-Hant-HK`, or `yue` and its subtags). Mandarin-only installations show a setup
message instead of playing Mandarin. Synthetic voices still require native-speaker
audition; tone mergers, heteronyms and context can affect a device voice.

Tone assessment plans retain all six alternatives, context and speaker normalization;
vowel plans combine quality and duration; consonant plans require target alignment.
These are calibrated-model requirements, not completed validation. Native builds
provide a separately labelled experimental comparison with both device-voice
references, not a calibrated pronunciation correctness percentage. Calibrated
grades remain disabled. Game stars measure completed recall exercises only.

## Learning pictures

The Learn tab uses original schematic vowel maps, relative tone contours and
selected side-view articulation cues. Motion is optional and honors reduced-motion
settings. Illustrations are not anatomical measurements or speaker-specific diagnoses.
The b/p picture shows the post-release phase; the English R picture shows one
bunched configuration, not the only valid R. A light-L picture is not reused for
the final-L lesson. Articulatory reference:
[Seeing Speech, University of Glasgow](https://www.seeingspeech.ac.uk/ipa-charts/).

## Release boundary

All eight apps, including Cantonese and Japanese, have signed **1.0.0 (9)** builds
available in internal TestFlight and Google Play testing. Their eight iOS formal
submissions still use build 8 and are Waiting for Review; Google production
submission is not complete. Testing or
review submission is not approval or verified public retail availability.
The scoped PWA is live at https://language-agent.lazying.art/cantonese/.
See [the beta receipt and device-check scope](BETA-1.0.0-9.md). Earlier icons,
builds and release evidence are retained. Formal review is a separate release step.
