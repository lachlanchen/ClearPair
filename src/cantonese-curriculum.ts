import type { Lesson, Text, Word } from './types';

const t = (en: string, zh: string): Text => ({ en, zh });
const w = (text: string, jyutping: string, gloss: string): Word => ({
  text, ipa: jyutping, gloss, sentence: `呢個字係「${text}」。`,
});
const pair = (a: Word, b: Word): [Word, Word] => [a, b];
const base = (id: string, title: Text, sounds: [string, string], cue: Text,
  sides: [Text, Text], tip: Text, pairs: [Word, Word][], extra: Partial<Lesson> = {}): Lesson => ({
  id, title, sounds, cue, sides, tip, pairs, language: 'zh-HK', group: 'Cantonese',
  diagram: 'tongue', difficulty: 1, ...extra,
});
const toneTip = t('The number after a Jyutping syllable is its tone, not a syllable number. Match the relative shape, not someone else’s absolute pitch.', '粵拼音節後的數字表示聲調。比較相對音高及走勢，不必模仿別人的絕對音高。');
const variation = t('Hong Kong Cantonese varies between speakers. These are reference contrasts, not a test of whether an accent is “proper”. Device voices may merge some contrasts.', '香港粵語因人而異。這些是參考對比，不用來判定口音是否「正確」。部分設備語音可能合併某些對比。');

// Original teaching copy. See docs/CANTONESE.md for linguistic sources and QA limits.
export const cantoneseLessons: Lesson[] = [
  base('yue-tone-1-3', t('High or middle?', '高平還是中平？'), ['1', '3'],
    t('Two level tones. Keep the height different.', '兩個平調，音高不同。'),
    [t('Tone 1 stays high.', '第一聲保持高平。'), t('Tone 3 stays around the middle of your range.', '第三聲保持中平。')], toneTip,
    [pair(w('夫', 'fu1', 'husband'), w('副', 'fu3', 'deputy')), pair(w('詩', 'si1', 'poem'), w('試', 'si3', 'try'))],
    { diagram: 'tone', tones: [[.9,.9,.9], [.5,.5,.5]], caution: variation }),
  base('yue-tone-2-5', t('Two different rises', '分清兩個升調'), ['2', '5'],
    t('Listen to where the rise starts and ends.', '留意升調的起點與終點。'),
    [t('Tone 2 rises to a high endpoint.', '第二聲升到較高位置。'), t('Tone 5 starts lower and rises less high.', '第五聲起點較低，終點也較低。')], toneTip,
    [pair(w('虎', 'fu2', 'tiger'), w('婦', 'fu5', 'woman')), pair(w('史', 'si2', 'history'), w('市', 'si5', 'market'))],
    { diagram: 'tone', tones: [[.45,.65,.9], [.15,.3,.5]], difficulty: 2, caution: variation }),
  base('yue-tone-4-6', t('Low fall or low level?', '低降還是低平？'), ['4', '6'],
    t('Stay low; notice whether the pitch falls.', '保持低音，留意是否下降。'),
    [t('Tone 4 typically falls within the low range.', '第四聲通常在低音區下降。'), t('Tone 6 is relatively level and low.', '第六聲相對低而平。')], toneTip,
    [pair(w('扶', 'fu4', 'support'), w('父', 'fu6', 'father')), pair(w('時', 'si4', 'time'), w('事', 'si6', 'matter'))],
    { diagram: 'tone', tones: [[.3,.2,.1], [.3,.3,.3]], difficulty: 2, caution: variation }),
  base('yue-aa-a', t('A little more space', '口腔多一點空間'), ['aa', 'a'],
    t('Change vowel quality as well as length.', '不只改長短，也要改元音音色。'),
    [t('aa [aː]: open the mouth more; a longer, more open vowel.', 'aa [aː]：開口較大，元音較長、較開。'), t('a [ɐ]: a shorter, more central vowel.', 'a [ɐ]：較短，舌位較中央。')],
    t('Keep the initial and tone steady. Do not simply stretch a into aa.', '保持聲母與聲調不變，不要只把 a 拉長當作 aa。'),
    [pair(w('街', 'gaai1', 'street'), w('雞', 'gai1', 'chicken')), pair(w('山', 'saan1', 'mountain'), w('新', 'san1', 'new'))],
    { diagram: 'vowel', positions: [[45,90], [50,67]] }),
  base('yue-n-ng', t('Tip or back at the end?', '韻尾：舌尖還是舌後？'), ['n', 'ng'],
    t('Close the nasal ending at a different place.', '用不同的舌頭部位形成鼻音韻尾。'),
    [t('Final n: the tongue tip contacts the ridge behind the upper teeth.', 'n 韻尾：舌尖接觸上齒後的齒齦。'), t('Final ng [ŋ]: the back of the tongue contacts the soft palate.', 'ng [ŋ] 韻尾：舌後部接觸軟腭。')],
    t('Do not add a separate g release. In sin/sing the vowel quality also changes; listen to the whole rhyme.', '不要額外加一個 g 的爆破音。sin/sing 的元音音色也會變，請聽整個韻母。'),
    [pair(w('真', 'zan1', 'true'), w('增', 'zang1', 'increase')), pair(w('先', 'sin1', 'first'), w('星', 'sing1', 'star'))], { difficulty: 2 }),
  base('yue-b-p', t('A small puff changes the word', '一口氣，改變一個字'), ['b', 'p'],
    t('Both start at the lips. P has more aspiration.', '兩者都從雙唇開始，p 有較強送氣。'),
    [t('b [p]: close and release the lips with little aspiration.', 'b [p]：雙唇閉合再放開，送氣較少。'), t('p [pʰ]: use the same closure, then a stronger puff of air.', 'p [pʰ]：同樣雙唇閉合，放開時送出較強氣流。')],
    t('Hold a hand in front of your lips. The contrast is aspiration, not English-style b voicing.', '把手放在唇前感受氣流。主要区别是送氣，不是英語 b 那樣的濁音。'),
    // 坡 also has a bo1 reading: some Cantonese device voices therefore make
    // 波/坡 identical. Use an unambiguous same-rhyme contrast instead.
    [pair(w('標', 'biu1', 'mark'), w('飄', 'piu1', 'drift')), pair(w('杯', 'bui1', 'cup'), w('胚', 'pui1', 'embryo'))], { diagram: 'air' }),
  base('yue-p-t', t('A quiet stop at the end', '輕輕收住韻尾'), ['p', 't'],
    t('Close the ending without adding another vowel.', '收住韻尾，不添加元音。'),
    [t('Final p: close the lips, usually without an audible release.', 'p 韻尾：雙唇閉合，通常沒有明顯爆破。'), t('Final t: close at the tongue tip behind the upper teeth, usually without an audible release.', 't 韻尾：舌尖在上齒後閉合，通常沒有明顯爆破。')],
    t('Keep the tone and vowel steady. A final stop is not an extra syllable.', '保持聲調與元音，不要把塞音韻尾讀成另一個音節。'),
    [pair(w('濕', 'sap1', 'wet'), w('失', 'sat1', 'lose')), pair(w('十', 'sap6', 'ten'), w('實', 'sat6', 'solid / real'))], { difficulty: 2 }),
  base('yue-n-l', t('N and L: notice the variation', 'N 與 L：留意變體'), ['n', 'l'],
    t('Explore nasal versus lateral airflow.', '探索鼻腔氣流與舌側氣流。'),
    [t('n: tongue-tip contact, with air through the nose.', 'n：舌尖接觸齒齦，氣流通過鼻腔。'), t('l: tongue-tip contact, with air around the sides of the tongue.', 'l：舌尖接觸齒齦，氣流從舌側通過。')],
    t('Many speakers merge initial n/l. Explore the reference difference without a right/wrong quiz.', '不少說話者會合併聲母 n/l。本課探索參考區別，不設對錯測驗。'),
    [pair(w('南', 'naam4', 'south'), w('藍', 'laam4', 'blue')), pair(w('年', 'nin4', 'year'), w('連', 'lin4', 'connect'))],
    { quizMode: 'none', caution: variation }),
];
