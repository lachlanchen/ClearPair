/** Highlight the authored pronunciation contrast, not an inferred phoneme
 * boundary or phonetic transcription of the user's recording. */
export interface ContrastText {before:string;contrast:string;after:string}
export function pairContrastText(a:string,b:string):[ContrastText,ContrastText]{
 const left=Array.from(a),right=Array.from(b);let start=0,ae=left.length,be=right.length;
 while(start<ae&&start<be&&left[start]===right[start])start++;
 while(ae>start&&be>start&&left[ae-1]===right[be-1]){ae--;be--;}
 if(start===left.length&&start===right.length)return [{before:a,contrast:'',after:''},{before:b,contrast:'',after:''}];
 // For a length/aspiration insertion, keep the preceding vowel/consonant in
 // both highlights so a missing length mark is still a visible comparison.
 if(ae===start||be===start)start=Math.max(0,start-1);
 const parts=(letters:string[],end:number):ContrastText=>({before:letters.slice(0,start).join(''),contrast:letters.slice(start,end).join(''),after:letters.slice(end).join('')});
 return [parts(left,ae),parts(right,be)];
}
