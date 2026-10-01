/** Orthographic mora aid, not an audio boundary detector or pitch-accent model.
 * Normal-size kana, ん, っ and ー each add a beat; combining small vowels/y kana
 * join the preceding beat. Kanji must be supplied with its contextual reading. */
export function morae(reading: string): string[] {
  const result: string[] = [];
  for (const c of Array.from(reading.normalize('NFC'))) {
    if (/^[ぁぃぅぇぉゃゅょゎァィゥェォャュョヮ]$/.test(c)) {
      if (!result.length) throw Error('Small kana needs a preceding kana');
      result[result.length-1] += c;
    } else if (/^[\p{Script=Hiragana}\p{Script=Katakana}ー]$/u.test(c)) {
      result.push(c);
    } else if (!/^[\s。、！？!?・]$/.test(c)) {
      throw Error('Provide a kana reading, not a guessed kanji pronunciation');
    }
  }
  return result;
}
