import type { AppId, Language, Text, Word } from './types';
import { basicKana } from './japanese-curriculum';
import { cantoneseToneAnchors, mandarinToneAnchors } from './tone-curriculum';
import { mapTraditionalNotes } from './ui-map-catalog';

const t = (en: string, zh: string): Text => ({en, zh, hant:mapTraditionalNotes[en]});
export interface SoundItem { id: string; label: string; reading: string; example?: Word; name?: Word }
export interface SoundGroup { id: string; title: Text; note: Text; items: SoundItem[] }
export interface SoundMap { language: Language; scope: Text; groups: SoundGroup[] }
const sample = (text: string, reading: string, spoken = text): Word => ({text, ipa: reading, spoken, sentence: spoken});
function items(rows: [string,string,string][]): SoundItem[] {
  return rows.map(([label, text, reading]) => ({id: label, label, reading, example: sample(text, reading)}));
}
const group = (id: string, title: Text, note: Text, rows: [string,string,string][]): SoundGroup => ({id, title, note, items: items(rows)});
const named = (rows: [string,string,string,string,string][]): SoundItem[] => rows.map(([label,name,reading,example,exampleReading]) =>
  ({id:label,label,reading, name:sample(name,reading), example:sample(example,exampleReading)}));
const toneGroup = (language: 'zh-CN'|'zh-HK'): SoundGroup => ({id:'tones',title:t('Tones','声调'),
  note:t('Teaching contours use relative pitch, not a fixed Hz target. Word recognition is not tone measurement.', '声调示意使用相对音高，不是固定赫兹目标；识别词语不等于测量声调。'),
  items:(language==='zh-CN'?mandarinToneAnchors:cantoneseToneAnchors).map(a=>({id:String(a.number),label:String(a.number),reading:a.word.ipa,example:a.word}))});

const mandarin: SoundMap = {language:'zh-CN',scope:t('Standard Mandarin: Pinyin initials, common finals, four tones and spelling conventions. Not a list of every Han character.', '普通话：拼音声母、常用韵母、四声与拼写规则；不是所有汉字的列表。'),groups:[
  group('initials',t('Initials','声母'),t('Hear the initial inside a real syllable. Pinyin b/d/g contrast with p/t/k mainly through aspiration, not English-style voicing.', '在真实音节内听声母。b/d/g 与 p/t/k 主要区别在送气，不是英语式清浊。'),[
    ['b','八','bā'],['p','趴','pā'],['m','妈','mā'],['f','发','fā'],['d','搭','dā'],['t','他','tā'],['n','拿','ná'],['l','拉','lā'],
    ['g','哥','gē'],['k','科','kē'],['h','喝','hē'],['j','鸡','jī'],['q','七','qī'],['x','西','xī'],['zh','知','zhī'],['ch','吃','chī'],
    ['sh','诗','shī'],['r','日','rì'],['z','资','zī'],['c','词','cí'],['s','丝','sī'],
  ]),
  group('finals',t('Finals','韵母'),t('The label is Pinyin, not IPA. iu/ui/un abbreviate iou/uei/uen; j/q/x + u represents ü. Final i differs in zi, zhi and ji.', '标签是拼音，不是国际音标。iu/ui/un 分别缩写 iou/uei/uen；j/q/x 后的 u 表示 ü。zi、zhi、ji 的 i 音质不同。'),[
    ['a','啊','ā'],['o','波','bō'],['e','鹅','é'],['i','衣','yī'],['u','乌','wū'],['ü','鱼','yú'],
    ['ai','爱','ài'],['ei','杯','bēi'],['ui / uei','归','guī'],['ao','熬','áo'],['ou','欧','ōu'],['iu / iou','秋','qiū'],['ie','街','jiē'],['üe','月','yuè'],['er','儿','ér'],
    ['an','安','ān'],['en','恩','ēn'],['in','音','yīn'],['un / uen','温','wēn'],['ün','云','yún'],['ang','昂','áng'],['eng','灯','dēng'],['ing','英','yīng'],['ong','东','dōng'],
    ['ia','家','jiā'],['ua','瓜','guā'],['uo','锅','guō'],['iao','交','jiāo'],['uai','乖','guāi'],['ian','先','xiān'],['uan','关','guān'],['üan','圆','yuán'],
    ['iang','香','xiāng'],['uang','光','guāng'],['iong','穷','qióng'],['ueng','翁','wēng'],
  ]),
  group('spelling',t('Spelling and context','拼写与语境'),t('y/w are Pinyin spelling conventions. Neutral tone is light and context-dependent; it is not another fixed isolated contour.', 'y/w 是拼音拼写规则。轻声较轻，随语境变化，不是另一个固定孤立调型。'),[
    ['y','衣','yī'],['w','乌','wū'],['i · zi','资','zī'],['i · zhi','知','zhī'],['i · ji','鸡','jī'],['轻声','妈妈','māma'],['儿化','花儿','huār'],
  ]), toneGroup('zh-CN'),
]};

const cantonese: SoundMap = {language:'zh-HK',scope:t('Hong Kong Cantonese: Jyutping initials, common rhymes, codas, syllabic nasals and six tone categories. Rare rhymes without a verified spoken example stay silent.', '香港粤语：粤拼声母、常用韵母、韵尾、成音节鼻音与六个声调。没有核实例音的罕见韵母不播放。'),groups:[
  group('initials',t('Initials','声母'),t('Jyutping j is a y-like glide. n/l and initial ng vary between speakers; variation is not automatically an error.', '粤拼 j 是类似英语 y 的滑音。n/l 与声母 ng 因说话者而异，不自动判作错误。'),[
    ['b','巴','baa1'],['p','怕','paa3'],['m','媽','maa1'],['f','花','faa1'],['d','打','daa2'],['t','他','taa1'],['n','那','naa5'],['l','啦','laa1'],
    ['g','家','gaa1'],['k','卡','kaa1'],['ng','牙','ngaa4'],['h','蝦','haa1'],['gw','瓜','gwaa1'],['kw','誇','kwaa1'],['w','蛙','waa1'],['z','渣','zaa1'],['c','叉','caa1'],['s','沙','saa1'],['j','也','jaa5'],['∅','呀','aa1'],
  ]),
  group('rhymes',t('Rhymes','韵母'),t('The label is Jyutping. Vowel quality can change before a coda: sin/sing are not only n/ng. Stop codas are usually unreleased.', '标签是粤拼。元音在韵尾前可能改变：sin/sing 不只是 n/ng。塞音韵尾通常不释放。'),[
    ['aa','沙','saa1'],['aai','街','gaai1'],['aau','包','baau1'],['aam','三','saam1'],['aan','山','saan1'],['aang','生','saang1'],['aap','鴨','aap3'],['aat','八','baat3'],['aak','百','baak3'],
    ['ai','雞','gai1'],['au','手','sau2'],['am','心','sam1'],['an','新','san1'],['ang','增','zang1'],['ap','濕','sap1'],['at','失','sat1'],['ak','塞','sak1'],
    ['i','詩','si1'],['iu','小','siu2'],['im','閃','sim2'],['in','先','sin1'],['ing','星','sing1'],['ip','葉','jip6'],['it','熱','jit6'],['ik','識','sik1'],
    ['u','夫','fu1'],['ui','杯','bui1'],['un','歡','fun1'],['ung','風','fung1'],['ut','闊','fut3'],['uk','福','fuk1'],
    ['e','寫','se2'],['ei','四','sei3'],['eng','鄭','zeng6'],['ek','石','sek6'],['o','歌','go1'],['oi','開','hoi1'],['ou','好','hou2'],['on','看','hon3'],['ong','康','hong1'],['ot','喝','hot3'],['ok','學','hok6'],
    ['oe','鋸','goe3'],['oeng','香','hoeng1'],['oek','腳','goek3'],['eoi','需','seoi1'],['eon','春','ceon1'],['eot','出','ceot1'],['yu','書','syu1'],['yun','孫','syun1'],['yut','雪','syut3'],
  ]),
  {id:'rare-rhymes',title:t('Rare rhymes','罕见韵母'),note:t('Listed in the Jyutping scheme; no unverified device pronunciation is played here.', '粤拼方案所列韵母；这里不播放未经核实的设备读音。'),items:['a','eu','em','en','ep','et','um','up','oet'].map(label=>({id:label,label,reading:label}))},
  group('codas',t('Codas and syllabic nasals','韵尾与成音节鼻音'),t('p/t/k stop the syllable without an extra vowel. Checked tones use 1/3/6, not three additional pitch categories.', 'p/t/k 收住音节，不添加元音。入声用 1/3/6，不是额外三个音高类别。'),[
    ['-m','心','sam1'],['-n','新','san1'],['-ng','增','zang1'],['-p','濕','sap1'],['-t','失','sat1'],['-k','塞','sak1'],['m̩','唔','m4'],['ŋ̩','吳','ng4'],
  ]), toneGroup('zh-HK'),
]};

const english: SoundMap = {language:'en-US',scope:t('General American reference: 26 letter names, consonants and vowel examples. Letter names are not the sounds of every word. Regional vowel mergers are accepted variation.', '通用美式参考：26 个字母名称、辅音和元音例词。字母名称不等于每个词里的读音；地域元音合流是允许变体。'),groups:[
  {id:'alphabet',title:t('Alphabet names','字母名称'),note:t('Hear the complete letter name, not a phoneme accuracy test.', '听完整字母名称，不作为音位准确度测验。'),items:[
    ['A','eɪ'],['B','bi'],['C','si'],['D','di'],['E','i'],['F','ɛf'],['G','dʒi'],['H','eɪtʃ'],['I','aɪ'],['J','dʒeɪ'],['K','keɪ'],['L','ɛl'],['M','ɛm'],['N','ɛn'],['O','oʊ'],['P','pi'],['Q','kju'],['R','ɑɹ'],['S','ɛs'],['T','ti'],['U','ju'],['V','vi'],['W','ˈdʌbəlju'],['X','ɛks'],['Y','waɪ'],['Z','zi'],
  ].map(([label,reading])=>({id:label,label,reading,name:sample(label,reading,`The letter ${label}.`)}))},
  group('consonants',t('Consonants','辅音'),t('Compare place, airflow, voicing and position. A word example keeps a short sound audible; it is not an isolated-letter recording.', '比较部位、气流、清浊与位置。短音放在例词中更易听，不是孤立字母录音。'),[
    ['p','pat','pæt'],['b','bat','bæt'],['t','ten','tɛn'],['d','den','dɛn'],['k','coat','koʊt'],['ɡ','goat','ɡoʊt'],['f','fan','fæn'],['v','van','væn'],['θ','thin','θɪn'],['ð','this','ðɪs'],['s','sip','sɪp'],['z','zip','zɪp'],['ʃ','ship','ʃɪp'],['ʒ','measure','ˈmɛʒɚ'],['h','hat','hæt'],['tʃ','cheap','tʃip'],['dʒ','jeep','dʒip'],['m','sum','sʌm'],['n','sin','sɪn'],['ŋ','sing','sɪŋ'],['l','light','laɪt'],['ɹ','right','ɹaɪt'],['w','west','wɛst'],['j','yes','jɛs'],
  ]),
  group('vowels',t('Vowels and glides','元音与滑动'),t('Quality, lip shape and movement matter as well as duration. ɔ/ɑ can merge. ə and ɚ normally occur unstressed.', '音质、唇形和滑动与时长同样重要。ɔ/ɑ 可合流；ə 与 ɚ 通常不重读。'),[
    ['i','sheep','ʃip'],['ɪ','ship','ʃɪp'],['eɪ','late','leɪt'],['ɛ','bed','bɛd'],['æ','bad','bæd'],['ɑ','cot','kɑt'],['ɔ','caught','kɔt'],['oʊ','coat','koʊt'],['ʊ','full','fʊl'],['u','fool','ful'],['ʌ','cup','kʌp'],['ə','about','əˈbaʊt'],['ɝ','bird','bɝd'],['ɚ','teacher','ˈtitʃɚ'],['aɪ','ride','ɹaɪd'],['aʊ','out','aʊt'],['ɔɪ','boy','bɔɪ'],
  ]),
]};

const korean: SoundMap = {language:'ko-KR',scope:t('Modern Hangul: 19 initial letters, 21 vowel letters, 27 final spellings and seven final sound categories. Spelling does not uniquely determine connected-speech pronunciation.', '现代韩文：19 个声母字母、21 个元音字母、27 个韵尾写法与七类收尾声音。拼写不唯一决定连续语流发音。'),groups:[
  {id:'initials',title:t('Initial letters','声母字母'),note:t('Choose a letter name or a syllable example. Initial ㅇ is silent; ㄹ changes with position. Plain, aspirated and tense are three categories.', '可听字母名称或音节例子。声母 ㅇ 不发音；ㄹ 随位置变化。松音、送气音、紧音是三类。'),items:named([
    ['ㄱ','기역','giyeok','가','ga'],['ㄲ','쌍기역','ssanggiyeok','까','kka'],['ㄴ','니은','nieun','나','na'],['ㄷ','디귿','digeut','다','da'],['ㄸ','쌍디귿','ssangdigeut','따','tta'],['ㄹ','리을','rieul','라','ra'],['ㅁ','미음','mieum','마','ma'],['ㅂ','비읍','bieup','바','ba'],['ㅃ','쌍비읍','ssangbieup','빠','ppa'],['ㅅ','시옷','siot','사','sa'],['ㅆ','쌍시옷','ssangsiot','싸','ssa'],['ㅇ','이응','ieung','아','a'],['ㅈ','지읒','jieut','자','ja'],['ㅉ','쌍지읒','ssangjieut','짜','jja'],['ㅊ','치읓','chieut','차','cha'],['ㅋ','키읔','kieuk','카','ka'],['ㅌ','티읕','tieut','타','ta'],['ㅍ','피읖','pieup','파','pa'],['ㅎ','히읗','hieut','하','ha'],
  ])},
  group('vowels',t('Vowel letters','元音字母'),t('Romanization is a reading aid, not English pronunciation. ㅐ/ㅔ often merge; ㅚ/ㅟ and ㅢ have accepted contextual variants.', '罗马字是读音辅助，不按英语读。ㅐ/ㅔ 常合流；ㅚ/ㅟ 与 ㅢ 有允许的语境变体。'),[
    ['ㅏ','아','a'],['ㅐ','애','ae'],['ㅑ','야','ya'],['ㅒ','얘','yae'],['ㅓ','어','eo'],['ㅔ','에','e'],['ㅕ','여','yeo'],['ㅖ','예','ye'],['ㅗ','오','o'],['ㅘ','와','wa'],['ㅙ','왜','wae'],['ㅚ','외','oe'],['ㅛ','요','yo'],['ㅜ','우','u'],['ㅝ','워','wo'],['ㅞ','웨','we'],['ㅟ','위','wi'],['ㅠ','유','yu'],['ㅡ','으','eu'],['ㅢ','의','ui'],['ㅣ','이','i'],
  ]),
  group('final-sounds',t('Final sound categories','韵尾音类'),t('Before a pause there are seven consonant endings. A following vowel or consonant can change their realization.', '停顿前有七类辅音收尾；后接元音或辅音会改变实际读音。'),[
    ['ㄱ · k̚','각','gak'],['ㄴ · n','간','gan'],['ㄷ · t̚','닫','dat'],['ㄹ · l','갈','gal'],['ㅁ · m','감','gam'],['ㅂ · p̚','갑','gap'],['ㅇ · ŋ','강','gang'],
  ]),
  group('final-spelling',t('Final spellings','韵尾写法'),t('Examples are read as whole words. Complex finals need context; do not pronounce both written consonants as separate syllables.', '例子按整词读。复合韵尾需要语境，不把两个辅音读成额外音节。'),[
    ['ㄱ','각','gak'],['ㄲ','밖','bak'],['ㄳ','넋','neok'],['ㄴ','간','gan'],['ㄵ','앉다','antta'],['ㄶ','많다','manta'],['ㄷ','닫다','datta'],['ㄹ','달','dal'],['ㄺ','닭','dak'],['ㄻ','삶','sam'],['ㄼ','여덟','yeodeol'],['ㄽ','외곬','oegol'],['ㄾ','핥다','haltta'],['ㄿ','읊다','euptta'],['ㅀ','싫다','silta'],['ㅁ','밤','bam'],['ㅂ','밥','bap'],['ㅄ','값','gap'],['ㅅ','옷','ot'],['ㅆ','있다','itta'],['ㅇ','강','gang'],['ㅈ','낮','nat'],['ㅊ','꽃','kkot'],['ㅋ','부엌','bueok'],['ㅌ','밭','bat'],['ㅍ','앞','ap'],['ㅎ','좋다','jota'],
  ]),
]};

const arabic: SoundMap = {language:'ar-SA',scope:t('Modern Standard Arabic: 28 base letters, hamza, vowel length and marks. Dialect realizations may differ; letter names and syllables are separate tasks.', '现代标准阿拉伯语：28 个基础字母、hamza、元音长短与符号。方言音值可能不同；字母名称与音节是不同任务。'),groups:[
  {id:'alphabet',title:t('Letter names and sound examples','字母名称与例音'),note:t('Short a syllables make the consonant audible. Alif is not simply another consonant; hamza represents a glottal stop. Do not strain your throat.', '短 a 音节让辅音更易听。alif 不是简单的另一个辅音；hamza 表示声门塞音。不要用力挤喉。'),items:named([
    ['ا','أَلِف','alif','آ','ʔaː'],['ب','بَاء','bāʔ','بَ','ba'],['ت','تَاء','tāʔ','تَ','ta'],['ث','ثَاء','θāʔ','ثَ','θa'],['ج','جِيم','dʒīm','جَ','dʒa'],['ح','حَاء','ħāʔ','حَ','ħa'],['خ','خَاء','xāʔ','خَ','xa'],['د','دَال','dāl','دَ','da'],['ذ','ذَال','ðāl','ذَ','ða'],['ر','رَاء','rāʔ','رَ','ra'],['ز','زَاي','zāy','زَ','za'],['س','سِين','sīn','سَ','sa'],['ش','شِين','ʃīn','شَ','ʃa'],['ص','صَاد','sˤād','صَ','sˤa'],['ض','ضَاد','dˤād','ضَ','dˤa'],['ط','طَاء','tˤāʔ','طَ','tˤa'],['ظ','ظَاء','ðˤāʔ','ظَ','ðˤa'],['ع','عَيْن','ʕayn','عَ','ʕa'],['غ','غَيْن','ɣayn','غَ','ɣa'],['ف','فَاء','fāʔ','فَ','fa'],['ق','قَاف','qāf','قَ','qa'],['ك','كَاف','kāf','كَ','ka'],['ل','لَام','lām','لَ','la'],['م','مِيم','mīm','مَ','ma'],['ن','نُون','nūn','نَ','na'],['ه','هَاء','hāʔ','هَ','ha'],['و','وَاو','wāw','وَ','wa'],['ي','يَاء','yāʔ','يَ','ja'],
  ])},
  {id:'hamza',title:t('Hamza','Hamza'),note:t('The written seat and the sound are different layers. This example is a sound, not the name of the seat letter.', '字形承载位置与声音是两层内容。这里的例子是读音，不是承载字母名称。'),items:named([['ء','هَمْزَة','hamza','أَ','ʔa']])},
  group('vowels',t('Short and long vowels','短元音与长元音'),t('Keep quality similar and compare timing within a syllable, rather than using one fixed duration for every speaker.', '保持相近音质，在音节内比较时长，不给所有说话者设同一时长。'),[
    ['a','بَ','ba'],['ā','بَا','baː'],['i','بِ','bi'],['ī','بِي','biː'],['u','بُ','bu'],['ū','بُو','buː'],['ay','بَيْت','bajt'],['aw','يَوْم','jawm'],
  ]),
  group('marks',t('Marks and context','符号与语境'),t('Sukun means no vowel, not silence for the whole letter. Shadda holds a consonant. Tanwin and endings change at a pause.', 'sukun 表示没有元音，不是整个字母不发音。shadda 让辅音停留；tanwin 与词尾在停顿时会变化。'),[
    ['ْ · sukun','أَبْ','ʔab'],['ّ · shadda','رَبّ','rabb'],['ً · an','كِتَابًا','kitaːban'],['ٍ · in','كِتَابٍ','kitaːbin'],['ٌ · un','كِتَابٌ','kitaːbun'],['ة','مَدْرَسَة','madrasa'],['الـ','الشَّمْس','aʃʃams'],
  ]),
]};

const hiraganaToKatakana = (text:string) => [...text].map(c=>String.fromCharCode(c.charCodeAt(0)+0x60)).join('');
const voicedKana: [string,string][] = [
  ['がぎぐげご','ga gi gu ge go'],['ざじずぜぞ','za ji zu ze zo'],['だぢづでど','da ji zu de do'],['ばびぶべぼ','ba bi bu be bo'],['ぱぴぷぺぽ','pa pi pu pe po'],
].flatMap(([row,readings])=>[...row].map((c,i)=>[c,readings.split(' ')[i]] as [string,string]));
const contractedKana: [string,string][] = [
  ['き','k'],['ぎ','g'],['し','sh'],['じ','j'],['ち','ch'],['に','n'],['ひ','h'],['び','b'],['ぴ','p'],['み','m'],['り','r'],
].flatMap(([base,onset])=>['ゃ','ゅ','ょ'].map((end,i)=>[base+end,onset+['a','u','o'][i]] as [string,string]));
// k/g/n/h/b/p/m/r use kya etc., while sh/j/ch already contain the palatal cue.
for(const row of contractedKana) if(!/^(sh|j|ch)/.test(row[1])) row[1]=row[1].slice(0,-1)+'y'+row[1].slice(-1);
export const expandedKana = [
  ...basicKana.map(k=>({...k,kind:'basic' as const})),
  ...voicedKana.map(([hiragana,reading])=>({hiragana,katakana:hiraganaToKatakana(hiragana),reading,kind:'voiced' as const})),
  ...contractedKana.map(([hiragana,reading])=>({hiragana,katakana:hiraganaToKatakana(hiragana),reading,kind:'contracted' as const})),
];
const kanaGroup = (kind:'basic'|'voiced'|'contracted',script:'hiragana'|'katakana',title:Text): SoundGroup => ({id:`${script}-${kind}`,title,
  note:t('Kana examples use explicitly authored Japanese readings. Some spellings share a sound; the map is not a scored discrimination quiz.', '假名使用明确编写的日语读音。部分写法读音相同；本表不是评分辨音测验。'),
  items:expandedKana.filter(k=>k.kind===kind).map(k=>({id:k[script],label:k[script],reading:k.reading,example:{...sample(k[script],k.reading,k.hiragana),reading:k.hiragana}}))});
const japanese: SoundMap = {language:'ja-JP',scope:t('Modern kana: 46 basic forms per script, voiced/semi-voiced kana and standard contracted sounds. Common loanword combinations and mora timing are separate; this is not all kanji.', '现代假名：每套 46 个基本字形、浊音/半浊音与标准拗音。常用外来音组合和拍子另列；不包含所有汉字。'),groups:[
  kanaGroup('basic','hiragana',t('Hiragana','平假名')),kanaGroup('basic','katakana',t('Katakana','片假名')),
  kanaGroup('voiced','hiragana',t('Voiced and semi-voiced hiragana','浊音与半浊音平假名')),kanaGroup('voiced','katakana',t('Voiced and semi-voiced katakana','浊音与半浊音片假名')),
  kanaGroup('contracted','hiragana',t('Contracted hiragana','平假名拗音')),kanaGroup('contracted','katakana',t('Contracted katakana','片假名拗音')),
  group('loan-kana',t('Common loanword combinations','常用外来音组合'),t('Pronunciations vary with the word and speaker. ヴ may be realized like b; do not diagnose that variation as an error.', '读音随词语和说话者变化。ヴ 可读得接近 b，不将这种变体诊断为错误。'),[
    ['シェ','シェ','she'],['ジェ','ジェ','je'],['チェ','チェ','che'],['ティ','ティ','ti'],['ディ','ディ','di'],['トゥ','トゥ','tu'],['ドゥ','ドゥ','du'],['ファ','ファ','fa'],['フィ','フィ','fi'],['フェ','フェ','fe'],['フォ','フォ','fo'],['ウィ','ウィ','wi'],['ウェ','ウェ','we'],['ウォ','ウォ','wo'],['ツァ','ツァ','tsa'],['ツィ','ツィ','tsi'],['ツェ','ツェ','tse'],['ツォ','ツォ','tso'],['ヴ','ヴ','vu'],['ヴァ','ヴァ','va'],['ヴィ','ヴィ','vi'],['ヴェ','ヴェ','ve'],['ヴォ','ヴォ','vo'],
  ]),
]};

export const soundMaps: Partial<Record<AppId,SoundMap>> = {english,chinese:mandarin,cantonese,korean,arabic,japanese};
