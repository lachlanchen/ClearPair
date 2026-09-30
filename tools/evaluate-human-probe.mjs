// Exploratory, expert-rated TRAIN-split diagnostic. Not a test-set evaluation,
// not a calibrated score, and never used to approve an app model automatically.
import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const directory='.runtime/model-audit/english-human-development';
for(const name of ['ctc','contrast-lattice'])await build({entryPoints:[`src/${name}.ts`],bundle:true,platform:'node',format:'esm',outfile:`${directory}/${name}.mjs`});
const {mergeCtcSeparators}=await import(pathToFileURL(resolve(`${directory}/ctc.mjs`)).href);
const {contrastLatticeEvidence}=await import(pathToFileURL(resolve(`${directory}/contrast-lattice.mjs`)).href);
const report=JSON.parse(await readFile(`${directory}/report.json`,'utf8'));
if(report.model!=='vitouphy/wav2vec2-xls-r-300m-timit-phoneme'||report.revision!=='efb7ae9b88f13db0d42eac8cedbba19739e2a278')throw new Error('Wrong model adapter');
const vocab=Object.fromEntries(Object.entries(report.vocabulary).map(([id,token])=>[token,Number(id)]));
const inventory=Object.entries(vocab).filter(([token])=>!['|',' ','[UNK]','[PAD]'].includes(token)).map(([,id])=>id);
const ipa={AA:'ɑ',AE:'æ',AH:'ə',AO:'ɑ',AW:'aʊ',AY:'aɪ',B:'b',CH:'ʧ',D:'d',DH:'ð',EH:'ɛ',ER:'ɝ',EY:'eɪ',F:'f',G:'g',HH:'h',IH:'ɪ',IY:'i',JH:'ʤ',K:'k',L:'l',M:'m',N:'n',NG:'ŋ',OW:'oʊ',OY:'ɔɪ',P:'p',R:'ɹ',S:'s',SH:'ʃ',T:'t',TH:'θ',UH:'ʊ',UW:'u',V:'v',W:'w',Y:'j',Z:'z'};
const competitors={HH:['F'],F:['HH','V'],L:['R','W'],R:['L','W'],IY:['IH'],IH:['IY','EH'],EH:['AE','IH'],AE:['EH','AH'],UH:['UW'],UW:['UH'],AH:['AA','AE'],AA:['AH'],TH:['S','F','T'],DH:['D','Z','V'],V:['W','F'],W:['V','R'],N:['NG'],NG:['N'],S:['TH','SH','Z'],SH:['S','CH'],CH:['SH','JH'],Z:['S','DH'],T:['D'],D:['T','DH']};
const rows=[],skipped=[];
for(const input of report.results) {
  if(input.annotation?.sourceSplit!=='train'||!/^[0-9]+\.json$/.test(input.jsonEmissions))throw new Error('Only development emissions permitted');
  const a=input.annotation, sequence=[],positions=new Map();
  let unsupported=false;
  for(const [wi,word] of a.words.entries()) {
    const labels=Array.isArray(word.phones)?word.phones:word.phones.split(/\s+/);
    for(const [pi,label] of labels.entries()) {
      const token=ipa[label.replace(/[012]$/,'')];
      if(vocab[token]===undefined){unsupported=true;break;}
      positions.set(`${wi}/${pi}`,sequence.length);sequence.push(vocab[token]);
    }
    if(unsupported)break;
  }
  if(unsupported){skipped.push({clipId:a.clipId,reason:'unsupported-context-phone'});continue;}
  const frames=mergeCtcSeparators(JSON.parse(await readFile(`${directory}/${input.jsonEmissions}`,'utf8')),report.blankId,[vocab[' '],vocab['|']]);
  // Bound work and prevent long utterances from dominating: at most three low
  // and three high ratings per clip. This deliberately selected probe is NOT a
  // representative deployment distribution or a final accuracy estimate.
  const eligible=a.targets.filter(t=>competitors[t.category]);
  const selected=['low-rated','high-rated'].flatMap(group=>eligible.filter(t=>t.group===group).slice(0,3));
  for(const target of selected) {
    const at=positions.get(`${target.wordIndex}/${target.phoneIndex}`);
    try {
      const result=contrastLatticeEvidence(frames,{blank:report.blankId,inventory,
        prefix:sequence.slice(0,at),suffix:sequence.slice(at+1),target:[[sequence[at]]],
        confusions:Object.fromEntries(competitors[target.category].map(c=>[c,[[vocab[ipa[c]]]]])),insertions:true});
      rows.push({clipId:a.clipId,speakerId:a.speakerId,category:target.category,
        wordIndex:target.wordIndex,phoneIndex:target.phoneIndex,group:target.group,
        expertMean:target.expertMean,annotatedRealization:target.annotatedRealization,
        targetGivenListed:result.targetGivenListed,listedLogLikelihood:result.listedLogLikelihood,
        strongestListedClass:[...result.classes].sort((a,b)=>b.logLikelihood-a.logLikelihood)[0].id,
        pronunciationScore:null});
    }catch(error){skipped.push({clipId:a.clipId,category:target.category,reason:error.message});}
  }
  console.log(`${a.clipId}: ${selected.length} selected phone probes processed`);
}
const summaries=[...new Set(rows.map(r=>r.category))].sort().map(category=>{
  const group=rows.filter(r=>r.category===category),finite=group.filter(r=>r.targetGivenListed!==null);
  const positive=finite.filter(r=>r.group==='high-rated'),negative=finite.filter(r=>r.group==='low-rated');
  let wins=0;for(const p of positive)for(const n of negative)wins+=p.targetGivenListed>n.targetGivenListed?1:p.targetGivenListed===n.targetGivenListed?.5:0;
  return {category,speakers:new Set(group.map(r=>r.speakerId)).size,highRated:positive.length,
    lowRated:negative.length,unassessable:group.length-finite.length,
    exploratoryAUC:positive.length>=5&&negative.length>=5?wins/(positive.length*negative.length):null,
    heldOut:false,approved:false};
});
await writeFile(`${directory}/contrast-report.json`,JSON.stringify({at:new Date().toISOString(),
  corpus:'speechocean762',sourceRevision:'613968e3b0b789fc33936fb5eba1973176ba7d11',
  model:report.model,modelRevision:report.revision,modelSha256:report.modelSha256,
  purpose:'Exploratory adult development probe. Deliberately selected expert-low/high examples; not held-out accuracy.',
  caveats:['At most 3 high/3 low phone ratings per utterance','Correlated phones/takes are not independent speakers',
    'A low expert rating can mean omission or another error, not necessarily the displayed confusion',
    'AO mapped to model ɑ only in context; no cot/caught scoring','AH/schwa and stress collapse limit applicability',
    'Other context errors can reduce all constrained hypotheses','No fitted calibration or released score'],
  summaries,rows,skipped,released:false},null,2)+'\n');
console.log(JSON.stringify(summaries,null,2));
