import {readFileSync} from 'node:fs';
export const listings=JSON.parse(readFileSync('store/listings.json','utf8'));
export function fullDescription(app){
 const row=listings[app];if(!row)throw Error('Unknown course');
 return `${row.name}: practise what you mix up. Learn the difference.

${row.focus}

LEARN THE CONTRAST
Explore clear, original schematic pictures and optional learning motion. Use short cues to compare the part that is easy to confuse. Pictures illustrate a principle, not your individual anatomy.

LISTEN, REPEAT, REMEMBER
Play both sides back to back. Repeat a pair until you stop, slow the reference, or use a sentence. Short, untimed five-question rounds reward listening or visual recall. Review prioritizes contrasts you have practised.

RECORD AND COMPARE
Record up to 12 seconds with a live waveform. Replay your own take beside the reference, keep a local recording history, and export a backup. Recording-signal feedback is not a pronunciation grade. Speech accuracy scoring is not enabled in this release.

YOUR INTERFACE, YOUR PRACTICE LANGUAGE
Choose from eleven interface languages: English, Arabic, Spanish, French, Japanese, Korean, Vietnamese, Simplified Chinese, Traditional Chinese, German or Russian. This does not change the course's practice language. Specialist explanations are English/Chinese; other interfaces label the English fallback.

PRIVATE BY DESIGN
No account, ads or recording uploads. Recordings, review progress and stars stay on your device. Device speech providers may use a network voice; voice availability, quality and offline support vary. Install the practice-language voice when needed. ${app==='cantonese'?'Cantonese needs a Cantonese voice; Mandarin is not substituted. ':''}Clearing app or website data can remove recordings, so export anything you want to keep.

An educational practice tool, not speech therapy or a validated diagnostic assessment.
Support: support@lazying.art
Privacy: https://language-agent.lazying.art/privacy.html`;
}
