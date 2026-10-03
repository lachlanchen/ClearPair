import {pronunciationText} from './pronunciation-text';
import type {Language,Word} from './types';
/** Authored surrounding speech, not target hints supplied to transcription.
 * Choose the final occurrence: 字 and Korean 다/말 can occur in the carrier
 * itself. Punctuation-only edges need no synthesized speech reference. */
export function carrierContext(word:Word,language:Language):{prefix:string;suffix:string}|null{
 const prompt=pronunciationText(word,language,true),target=pronunciationText(word,language),at=prompt.lastIndexOf(target);
 if(at<0)return null;
 const spoken=(value:string)=>/\p{Letter}|\p{Number}/u.test(value)?value.trim():'';
 return {prefix:spoken(prompt.slice(0,at)),suffix:spoken(prompt.slice(at+target.length))};
}
