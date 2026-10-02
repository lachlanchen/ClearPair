import {readFileSync} from 'node:fs';
export const listings=JSON.parse(readFileSync('store/listings.json','utf8'));
export function betaDescription(app){
 const row=listings[app];if(!row)throw Error('Unknown course');
 return `${row.name}: practise the sounds and letters that are easy to confuse.\n\n${row.focus}\n\nThis is a standalone app with its own course, recordings and progress. Learn the contrast, listen to pairs, play short recall rounds, and record privately with waveform and local History/replay. Eleven interface languages are separate from the course language. Spoken contrasts have automatic experimental on-device practice matching, not calibrated speech accuracy scoring. Game stars and recording signal quality are separate from the match. Device reference voice quality and offline availability vary. No microphone uploads.`;
}
export function betaNotes(app,build=4){
 const row=listings[app];if(!row)throw Error('Unknown course');
 if(app==='handf'&&build>=7)return `${row.name}\n\nRecord once, say the word, then pause. Scoring starts automatically after silence or when you tap Stop and score. The Record button stays in place for repeated attempts.\n\nNew consonant-focused on-device scoring compares H/F separately from the vowel and word. English H/F, Mandarin H/F and final F/V have separate acoustic handling. Results show target sound, word match and relative timing, with specific mouth/airflow advice. Sentence mode searches for the displayed word inside the recording. Fourier-derived spectral features and vowel-relative normalization reduce gain and microphone differences.\n\nExperimental reference comparison; human pronunciation accuracy is still being evaluated. No microphone uploads. Keep an offline practice-language voice installed. Please try each word and its opposite, a very short word, an immediate start, a pause inside a sentence, repeated takes and History/replay. Update without uninstalling.`;
 if(build>=7)return `${row.name}\n\n${row.focus}\n\nRecord, speak, then pause: spoken contrast exercises stop after silence and start on-device scoring automatically. Stop and score is also available. The Record button stays in place; repeated takes and their results remain in History. Visual or same-sound script exercises remain explicitly ungraded.\n\nThe experimental 0–100 practice match uses spectral, timing and relative pitch evidence against both displayed reference words. It is reference similarity, not a pronunciation accuracy percentage. An installed offline practice-language voice is required. No microphone uploads. Try the selected word and its opposite, short words, sentences, repeated recording, cancel/retry and History/replay. Update without uninstalling.`;
 if(build>=6)return `${row.name}\n\n${row.focus}\n\nNew experimental on-device practice score: record, finish, then tap Assess my pronunciation. The 0–100 beta match compares your sound with both reference words using spectrum, timing and relative pitch. It is reference similarity, not a pronunciation accuracy percentage or a calibrated grade. No microphone uploads. An installed offline practice-language voice is required.\n\nPlease try a correct word, its opposite, silence, a short word and the sentence option. Repeat several times, cancel an assessment, change cards, and check History/replay. Tell us the selected word, your spoken word and the score. Listening stars stay separate. Update in place; do not uninstall. Internal test only; formal speech accuracy scoring remains under validation.`;
 const changes=build>=5
  ?`Reference playback hardening: correct practice-language voices, no iOS novelty/personal voices, and installed Android voices only.${app==='japanese'?' Isolated kana use explicit Japanese sound readings; displayed kana and contextual furigana stay unchanged.':''}`
  :app==='japanese'
  ?'First standalone Japanese beta: confusing kana, contextual furigana, mora beats and modern stroke replay. Learn cues follow the selected word pair.'
  :'Updated on-device runtime integration, V4 artwork and eleven interface languages, independent of the practice language.';
 return `${row.name}\n\n${row.focus}\n\n${changes}\n\nPlease test repeated pair replay/loop/stop, consecutive microphone takes, waveform, local History/replay and export on iPhone/iPad. On-device scoring remains under validation: game stars and signal quality are not pronunciation grades; speech accuracy scoring is disabled. Device reference voice quality and offline availability vary. No microphone uploads. Internal test build, not a public release. Update in place to preserve earlier recordings; do not uninstall.`;
}
export function fullDescription(app){
 const row=listings[app];if(!row)throw Error('Unknown course');
 return `${row.name}: practise what you mix up. Learn the difference.

${row.focus}

LEARN THE CONTRAST
${app==='japanese'?'Compare easily confused kana, explicit furigana readings and mora beats. Replay modern stroke order from attributed KanjiVG data. Source-backed kana origins are distinct from memory cues; the animation does not reconstruct historical handwriting.':'Explore clear, original schematic pictures and optional learning motion. Use short cues to compare the part that is easy to confuse. Pictures illustrate a principle, not your individual anatomy.'}

LISTEN, REPEAT, REMEMBER
Play both sides back to back. Repeat a pair until you stop, slow the reference, or use a sentence. Short, untimed five-question rounds reward listening or visual recall. Review prioritizes contrasts you have practised.

RECORD AND COMPARE
Record up to 12 seconds with a live waveform. Spoken contrast exercises stop after a short silence and start an on-device practice match automatically; you can also stop manually. Replay your own take beside the reference, keep a local recording history, and export a backup. The experimental match compares acoustic features with both displayed device-voice references. It is not a pronunciation accuracy percentage or a calibrated assessment. ${app==='handf'?'H/F and final F/V results separately show target-sound evidence, word match and relative timing. ':''}Visual and same-sound script exercises do not receive a spoken distinction score. Recording-signal feedback and listening stars are separate.

YOUR INTERFACE, YOUR PRACTICE LANGUAGE
Choose from eleven interface languages: English, Arabic, Spanish, French, Japanese, Korean, Vietnamese, Simplified Chinese, Traditional Chinese, German or Russian. This does not change the course's practice language. Specialist explanations are English/Chinese; other interfaces label the English fallback.

PRIVATE BY DESIGN
No account, ads or recording uploads. Recordings, review progress and stars stay on your device. Device speech providers may use a network voice; voice availability, quality and offline support vary. Install the practice-language voice when needed. ${app==='cantonese'?'Cantonese needs a Cantonese voice; Mandarin is not substituted. ':''}Clearing app or website data can remove recordings, so export anything you want to keep.

An educational practice tool, not speech therapy or a validated diagnostic assessment.
Support: support@lazying.art
Privacy: https://language-agent.lazying.art/privacy.html`;
}
