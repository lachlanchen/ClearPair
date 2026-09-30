// Prepare a bounded, PRIVATE DEVELOPMENT probe from a pinned public corpus.
// No test audio is fetched; no app recording is uploaded; no model is approved.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const revision='613968e3b0b789fc33936fb5eba1973176ba7d11';
const base=`https://raw.githubusercontent.com/jimbozhang/speechocean762/${revision}`;
const directory='.runtime/benchmarks/speechocean762';
await mkdir(directory,{recursive:true});
const hashes={};
async function source(name) {
  const filename=`${directory}/${name.replaceAll('/','-')}`;
  let data;
  try{data=await readFile(filename);}catch(error){
    if(error.code!=='ENOENT')throw error;
    const response=await fetch(`${base}/${name}`,{signal:AbortSignal.timeout(45_000)});
    if(!response.ok)throw new Error(`${name}: HTTP ${response.status}`);
    data=Buffer.from(await response.arrayBuffer());
    if(data.length>25*1024*1024)throw new Error('Metadata exceeds bounded download size');
    await writeFile(filename,data);
  }
  hashes[name]=createHash('sha256').update(data).digest('hex');
  return data.toString('utf8');
}
await source('README.md');
const scores=JSON.parse(await source('resource/scores.json'));
const parseMap=text=>new Map(text.trim().split('\n').map(line=>line.trim().split(/\s+/,2)));
const train=parseMap(await source('train/utt2spk'));
const test=parseMap(await source('test/utt2spk'));
const ages=parseMap(await source('train/spk2age'));
const heldOut=new Set(test.values());
if([...train.values()].some(speaker=>heldOut.has(speaker)))throw new Error('Corpus split is not speaker-disjoint');
const desired=new Set(['HH','F','L','R','TH','S','DH','Z','D','IY','IH','EH','AE','UH','UW','AH','AA','V','W','N','NG','SH','CH','T']);
const counts={},selected=[],perSpeaker=new Map();
for(const [clipId,speakerId] of [...train].sort(([a],[b])=>a.localeCompare(b))) {
  if(!/^\d+$/.test(clipId)||!/^\d+$/.test(speakerId))throw new Error('Unexpected corpus identity');
  const age=Number(ages.get(speakerId));
  if(!Number.isFinite(age)||age<18||!ages.has(speakerId))continue;
  const entry=scores[clipId];
  if(!entry?.words)continue;
  const targets=[];
  for(const [wordIndex,word] of entry.words.entries()) {
    const phones=Array.isArray(word.phones)?word.phones:word.phones.split(/\s+/);
    for(const [phoneIndex,phone] of phones.entries()) {
      const category=phone.replace(/[012]$/,'');
      if(!desired.has(category))continue;
      const average=word['phones-accuracy']?.[phoneIndex];
      if(!Number.isFinite(average)||average<0||average>2)throw new Error('Invalid expert phone rating');
      const group=average>=1.8?'high-rated':average<=.4?'low-rated':'unresolved';
      counts[category]??={'high-rated':0,'low-rated':0,unresolved:0};counts[category][group]++;
      const actual=word.mispronunciations?.find(m=>m.index===phoneIndex)?.['pronounced-phone']??null;
      targets.push({wordIndex,phoneIndex,category,expertMean:average,group,annotatedRealization:actual});
    }
  }
  // A small diagnostic sample, not a balanced test set or calibrated accuracy claim.
  // Prefer utterances containing an expert-marked problem, at most 2 per speaker.
  if(selected.length<40&&targets.some(t=>t.group==='low-rated')&&(perSpeaker.get(speakerId)||0)<2) {
    perSpeaker.set(speakerId,(perSpeaker.get(speakerId)||0)+1);
    selected.push({clipId,speakerId,sourceSplit:'train',purpose:'development-only',
      audioUrl:`${base}/WAVE/SPEAKER${speakerId}/${clipId}.WAV`,
      text:entry.text,words:entry.words,targets});
  }
}
await writeFile(`${directory}/development-probe.json`,JSON.stringify({
  corpus:'speechocean762',revision,
  source:'https://github.com/jimbozhang/speechocean762',
  rights:'Author README permits commercial/noncommercial download; retain attribution. Not bundled in apps.',
  citation:'Zhang et al. (2021), speechocean762: An Open-Source Non-native English Speech Corpus For Pronunciation Assessment, Interspeech.',
  restrictions:['Adult training-split development probe only','Official test audio remains untouched',
    'Expert means are not adjudication','An accented-but-correct label is not automatically an error',
    'Not a contrast-balanced or deployment-device validation set','No released calibration'],
  files:hashes,counts,selected,
},null,2)+'\n');
console.log(`Prepared ${selected.length} adult development utterances from ${perSpeaker.size} speakers. Metadata only; no audio downloaded, no scoring approved.`);
console.log(JSON.stringify(counts));
