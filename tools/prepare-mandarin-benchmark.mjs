// Pinned expert-rated Mandarin corpus audit. No model approval or audio upload.
import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
const revision='c3aaa9e892e4b1c2a25b637401f52f6e35b53e74';
const base=`https://raw.githubusercontent.com/phantomhsieh/OMPAL-corpus/${revision}`;
const directory='.runtime/benchmarks/ompal';
await mkdir(directory,{recursive:true});
const hashes={};
async function source(name){
  const file=`${directory}/${name.replaceAll('/','-')}`;
  let data;
  try{data=await readFile(file);}catch(error){
    if(error.code!=='ENOENT')throw error;
    const response=await fetch(`${base}/${name}`,{signal:AbortSignal.timeout(45000)});
    if(!response.ok)throw Error(`${name}: HTTP${response.status}`);
    data=Buffer.from(await response.arrayBuffer());
    if(data.length>25*1024*1024)throw Error('Oversized annotation file');
    await writeFile(file,data,{flag:'wx'});
  }
  hashes[name]=createHash('sha256').update(data).digest('hex');
  return data.toString('utf8');
}
await source('README.md');
const license=await source('LICENSE');
if(!license.includes('Attribution 4.0 International'))throw Error('Unexpected corpus license');
const detail=JSON.parse(await source('non-native_scores-detail.json'));
const train=JSON.parse(await source('train/train_1_scores.json'));
const test=JSON.parse(await source('test/test_1_scores.json'));
const canonical=JSON.parse(await source('non-native_scores.json'));
const speaker=clip=>{if(!/^\d{8}$/.test(clip))throw Error('Unexpected corpus identity');return clip.slice(1,6);};
const trainSpeakers=new Set(Object.keys(train).map(speaker));
const testSpeakers=new Set(Object.keys(test).map(speaker));
if([...trainSpeakers].some(s=>testSpeakers.has(s)))throw Error('Speaker overlap in official split');
const counts={},raters={},rows=[],identityProblems=[],canonicalCounts={};
const heads=['phoneme_consonant','phoneme_vowel','tone'];
for(const [clip,entry] of Object.entries(canonical)){
  const split=Object.hasOwn(test,clip)?'test':Object.hasOwn(train,clip)?'train':'unassigned';
  for(const word of entry.words)for(const head of heads){
    if(![0,1].includes(word[head]))throw Error('Unexpected canonical component label');
    const key=`${split}/${head}`;
    canonicalCounts[key]??={correct:0,incorrect:0};
    canonicalCounts[key][word[head]?'correct':'incorrect']++;
  }
}
for(const [clip,entry] of Object.entries(detail)){
  const split=Object.hasOwn(test,clip)?'test':Object.hasOwn(train,clip)?'train':'unassigned';
  const reference=canonical[clip];
  const identityVerified=!!reference&&reference.text===entry.text&&
    JSON.stringify(reference.words.map(w=>w.text))===JSON.stringify(entry.words.map(w=>w.text));
  if(!identityVerified)identityProblems.push({clip,reason:reference?'reference-text-mismatch':'missing-canonical-annotation'});
  for(const [index,word] of entry.words.entries())for(const head of heads){
    const raw=word[head];
    if(!Array.isArray(raw)||!raw.length||raw.some(r=>![0,1,'0','1'].includes(r)))throw Error('Invalid expert component ratings');
    const ratings=raw.map(Number);
    if(identityVerified&&reference.words[index][head]!==Number(ratings.reduce((a,b)=>a+b,0)/ratings.length>=.5))
      throw Error('Canonical label differs from detailed majority; mapping needs review');
    raters[ratings.length]=(raters[ratings.length]||0)+1;
    const correct=ratings.every(r=>r===1),incorrect=ratings.every(r=>r===0);
    const label=correct?'unanimous-correct':incorrect?'unanimous-incorrect':'disagreement';
    const key=`${split}/${head}`;
    counts[key]??={'unanimous-correct':0,'unanimous-incorrect':0,disagreement:0};counts[key][label]++;
    rows.push({clip,speaker:speaker(clip),split,identityVerified,word:index,text:word.text.join(''),head,
      independentRaters:ratings.length,label,mean:ratings.reduce((a,b)=>a+b,0)/ratings.length});
  }
}
const report={corpus:'OMPAL',revision,source:'https://github.com/phantomhsieh/OMPAL-corpus',
  citation:'Hsieh et al. (2025), OMPAL: Bridging Speech and Learning with an Open-Source Mandarin Pronunciation Assessment Corpus for Global Learners, Interspeech, DOI 10.21437/Interspeech.2025-983.',
  license:'CC-BY-4.0',files:hashes,learnerUtterances:Object.keys(detail).length,
  detailSpeakerIds:new Set(Object.keys(detail).map(speaker)).size,
  canonicalLearnerSpeakers:new Set(Object.keys(canonical).map(speaker)).size,
  identityProblems,canonicalCounts,
  officialSplit:{trainSpeakers:trainSpeakers.size,testSpeakers:testSpeakers.size,speakerOverlap:0},
  actualRaterCounts:raters,counts,
  unassignedClips:[...new Set(rows.filter(r=>r.split==='unassigned').map(r=>r.clip))],
  caveats:['Use the actual per-item rater count, not a blanket four-rater claim',
    'Disagreements remain unresolved; averaged labels are not adjudication',
    'Component correctness does not identify the substituted consonant or vowel',
    '656 detailed clip IDs were absent from canonical metadata at initial audit; do not infer a renumbering',
    'Detailed identities and majority labels must match canonical metadata before pairing ratings with audio; unresolved rows are not usable validation',
    'Canonical labels are aggregate binary judgments, not counts of independently unanimous ratings',
    'French-L1 learner corpus; no claim of all learner backgrounds or Cantonese support',
    'Official split1 contains fewer held-out speakers than the ClearPair release target'],
  audioFetched:false,modelEvaluated:false,approved:false,rows};
await writeFile(`${directory}/annotation-audit.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({detailSpeakerIds:report.detailSpeakerIds,canonicalLearnerSpeakers:report.canonicalLearnerSpeakers,
  unresolvedIdentities:identityProblems.length,utterances:report.learnerUtterances,
  officialSplit:report.officialSplit,actualRaterCounts:raters,canonicalCounts,counts,approved:false},null,2));
