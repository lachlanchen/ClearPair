// Read-only model-emission comparison; writes only private research receipts.
// Synthetic references are pipeline probes, never human calibration examples.
import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const directory = '.runtime/model-audit/english';
for (const name of ['curriculum', 'contrast-lattice', 'ctc']) {
  await build({entryPoints:[`src/${name}.ts`], bundle:true, format:'esm', platform:'node', outfile:`${directory}/${name}.mjs`});
}
const { lessons, audioKey } = await import(pathToFileURL(resolve(`${directory}/curriculum.mjs`)).href);
const { contrastLatticeEvidence } = await import(pathToFileURL(resolve(`${directory}/contrast-lattice.mjs`)).href);
const { mergeCtcSeparators } = await import(pathToFileURL(resolve(`${directory}/ctc.mjs`)).href);
const report = JSON.parse(await readFile(`${directory}/report.json`, 'utf8'));
if (report.model !== 'vitouphy/wav2vec2-xls-r-300m-timit-phoneme' || report.revision !== 'efb7ae9b88f13db0d42eac8cedbba19739e2a278')
  throw new Error('This vocabulary adapter belongs to one pinned checkpoint.');
const vocabulary = Object.fromEntries(Object.entries(report.vocabulary).map(([id, token]) => [token, Number(id)]));
const phones = Object.keys(vocabulary).filter(token => !['|',' ','[UNK]','[PAD]'].includes(token));
const longest = phones.sort((a,b)=>b.length-a.length);
function tokenize(ipa) {
  // TIMIT's AH symbol here is ə (including stressed /ʌ/); stress is not modeled.
  // These explicit inventory aliases MUST NOT be used to score ə/ʌ or stress.
  let text=ipa.replaceAll('tʃ','ʧ').replaceAll('dʒ','ʤ').replaceAll('ʌ','ə').replace(/[ˈˌ]/g,'');
  const result=[];
  while(text) {
    const phone=longest.find(token=>text.startsWith(token));
    if(!phone) throw new Error(`Unsupported IPA segment in ${ipa}`);
    result.push(vocabulary[phone]);text=text.slice(phone.length);
  }
  return result;
}
const results=[];
for(const lesson of lessons.filter(lesson=>lesson.language==='en-US')) {
  const pair=lesson.pairs[0];
  if(lesson.quizMode==='none') {results.push({lesson:lesson.id,status:'excluded-ungraded-variant'});continue;}
  try {
    const sequences=pair.map(word=>tokenize(word.ipa));
    let prefix=0,suffix=0;
    while(prefix<Math.min(...sequences.map(s=>s.length))&&sequences[0][prefix]===sequences[1][prefix])prefix++;
    while(suffix<Math.min(...sequences.map(s=>s.length))-prefix&&sequences[0].at(-suffix-1)===sequences[1].at(-suffix-1))suffix++;
    const regions=sequences.map(s=>s.slice(prefix,s.length-suffix));
    if(regions.some(s=>!s.length))throw new Error('This probe requires nonempty contrast regions');
    const rows=[];
    for(const [referenceSide,word] of pair.entries()) {
      const input=report.results.find(r=>r.key===audioKey(word,lesson.language));
      if(!input?.jsonEmissions||!/^[a-zA-Z0-9_-]+\.json$/.test(input.jsonEmissions))throw new Error('Reference emissions missing');
      const raw=JSON.parse(await readFile(`${directory}/${input.jsonEmissions}`,'utf8'));
      // This checkpoint emits literal spaces and its configured word delimiter |.
      // Both are non-phone separators; retain their mass as blank, not as errors.
      const frames=mergeCtcSeparators(raw,report.blankId,[vocabulary[' '],vocabulary['|']]);
      for(const targetSide of [0,1]) {
        const start=performance.now();
        const result=contrastLatticeEvidence(frames,{
          inventory:phones.map(phone=>vocabulary[phone]), blank:report.blankId,
          prefix:sequences[0].slice(0,prefix), suffix:suffix?sequences[0].slice(-suffix):[],
          target:[regions[targetSide]], confusions:{displayed:[regions[1-targetSide]]}, insertions:true,
        });
        const displayed=result.classes.find(c=>c.id==='confusion:displayed');
        rows.push({reference:word.text,referenceSide,target:pair[targetSide].text,targetSide,
          decodedPhones:input.decodedPhones,
          cpuComparisonMs:Math.round((performance.now()-start)*10)/10,
          targetMinusDisplayed:result.targetLogLikelihood-displayed.logLikelihood,
          targetGivenListed:result.targetGivenListed,
          listedLogLikelihood:result.listedLogLikelihood,
          unlistedLogLikelihood:result.unlistedLogLikelihood,
          strongestListedClass:[...result.classes].sort((a,b)=>b.logLikelihood-a.logLikelihood)[0].id,
          score:null,humanAudited:false});
      }
    }
    results.push({lesson:lesson.id,status:'probed',rows});
    console.log(`${lesson.id}: ${rows.filter(r=>r.referenceSide===r.targetSide).map(r=>`${r.reference} Δ=${r.targetMinusDisplayed.toFixed(2)} top=${r.strongestListedClass}`).join('; ')}`);
  }catch(error){results.push({lesson:lesson.id,status:'unsupported',reason:error.message});console.log(`${lesson.id}: ${error.message}`);}
}
await writeFile(`${directory}/contrast-report.json`,JSON.stringify({at:new Date().toISOString(),
  model:report.model,revision:report.revision,modelSha256:report.modelSha256,
  purpose:'Uncalibrated synthetic-reference pipeline probes, not learner accuracy',
  inventoryAliases:['tʃ→ʧ','dʒ→ʤ','ʌ→ə','stress markers removed; no stress score','literal space and word delimiter | projected to blank; unknown mass retained'],
  released:false,results},null,2)+'\n');
