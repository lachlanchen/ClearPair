import {chromium} from 'playwright';
import {build} from 'esbuild';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const [output,appleFolder]=process.argv.slice(2);
if(!output||!resolve(output).startsWith(resolve('.runtime')+'/'))throw Error('Private fresh output required');
await mkdir(output,{recursive:false});
const bundled=await build({stdin:{contents:`export {lessonById} from './src/curriculum'; export {assessmentPlan} from './src/scoring-profiles'; export {hfWordDecision,hfHybridScore,needsHfWordEvidence} from './src/hf-word-score'; export {referenceScore} from './src/reference-score'; export {analyze} from './src/analysis';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const engine=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const manifest=JSON.parse(await readFile('.runtime/audio/research-reference-clips/manifest.json','utf8'));
const apple=appleFolder?JSON.parse(await readFile(appleFolder+'/manifest.json','utf8')):[];
const raw=(file)=>execFileSync('ffmpeg',['-nostdin','-v','error','-i',file,'-f','f32le','-ar','16000','-ac','1','pipe:1']);
const pcm=(data)=>Array.from(new Float32Array(data.buffer.slice(data.byteOffset,data.byteOffset+data.length)));
const fixture=(word,language)=>{
 const local=apple.find(r=>r.text===word&&r.language===language);
 if(local)return {source:'Apple offline reference; functional only',samples:pcm(raw(appleFolder+'/'+local.file))};
 const key=language+'-'+Array.from(word).map(c=>c.codePointAt(0).toString(16)).join('-'),file=manifest[key];
 if(file)return {source:'Private cached synthetic reference; functional only',samples:pcm(raw('.runtime/audio/research-reference-clips/'+file))};
 const wav=execFileSync('espeak-ng',['-v',language==='en-US'?'en-us':'cmn','-s','145','--stdout',word]);
 return {source:'espeak-ng; functional only',samples:pcm(execFileSync('ffmpeg',['-nostdin','-v','error','-i','pipe:0','-f','f32le','-ar','16000','-ac','1','pipe:1'],{input:wav}))};
};
const cases=[];
for(const lesson of ['hf-en','hf-final','hf-zh'])for(const [pair,words] of engine.lessonById(lesson).pairs.entries()){
 const p=engine.assessmentPlan('handf',lesson,pair,0,false),a=fixture(words[0].text,p.profile.language),b=fixture(words[1].text,p.profile.language);
 for(const [side,f] of [a,b].entries())for(const gain of [1,.08])cases.push({name:lesson+'/'+pair+'/'+side+'/'+gain,language:p.profile.language,expected:side?'opposite':'target',
  ...f,samples:f.samples.map(v=>v*gain),plan:p,target:a.samples,competitor:b.samples});
}
for(const word of ['cat','bat','mat','dog','at','it'])cases.push({name:'control/'+word,language:'en-US',expected:word==='at'?'omitted':'other',...fixture(word,'en-US'),plan:engine.assessmentPlan('handf','hf-en',0,0,false)});
cases.push({name:'silence',language:'en-US',expected:'unknown',samples:Array(16000).fill(0),plan:engine.assessmentPlan('handf','hf-en',0,0,false)});
const humanFile='.runtime/reference-qa/hf-human-20261003.json',human=JSON.parse(await readFile(humanFile,'utf8'));
for(const r of human.rows){const [a,b]=human.pairs[r.pair];cases.push({name:'human/'+r.clip+'/'+r.word,speaker:r.speaker,split:r.split,language:'en-US',expected:r.side?'opposite':'target',source:'Expert-high TRAIN word crop; development regression only',samples:r.samples,
 plan:{mode:'contrast',calibrationKey:'handf/hf-en/'+r.pair+'/0/word/en-h-f:v1',spokenPrompt:a,target:{text:a},competitor:{text:b},profile:{id:'en-h-f:v1',unit:'phone',language:'en-US'}},target:human.references[a],competitor:human.references[b]});}
// Group language loads; also exercise one switch back to the first language.
cases.sort((a,b)=>a.language.localeCompare(b.language));cases.push({...cases[0],name:'repeated-after-language-switch'});
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--disable-dev-shm-usage']});
const page=await browser.newPage();let results=[];
try{
 await page.goto('http://127.0.0.1:4310/');
 await page.evaluate(async()=>{const {HfWordRuntime}=await import('/src/hf-word-runtime.ts');window.hfWords=new HfWordRuntime();});
 for(const [i,c] of cases.entries()){
  const start=Date.now();
  const acoustic=c.target?engine.referenceScore({id:c.name,plan:c.plan,samples:Float32Array.from(c.samples),target:Float32Array.from(c.target),competitor:Float32Array.from(c.competitor),voice:'research-fixture'}):{status:'unscored',reason:'unaligned'};
  const quality=engine.analyze(Float32Array.from(c.samples),16000);
  const usedWordEvidence=['clear','quiet'].includes(quality.status)&&engine.needsHfWordEvidence(c.plan,acoustic);
  const recognition=usedWordEvidence?await page.evaluate(async ({language,samples})=>window.hfWords.recognize(language,Float32Array.from(samples),new URL('./',location.href).href),{language:c.language,samples:c.samples}):undefined;
  const decision=recognition?engine.hfWordDecision(c.plan,recognition):{decision:usedWordEvidence?'unavailable':'not-requested',confidence:0};
  const score=['clear','quiet'].includes(quality.status)?engine.hfHybridScore(c.plan,recognition,acoustic,quality):{status:'unscored',reason:'poor-signal'};
  results.push({name:c.name,language:c.language,source:c.source,speaker:c.speaker,split:c.split,expected:c.expected,recognition,decision:decision.decision,confidence:decision.confidence,
   seconds:(Date.now()-start)/1000,usedWordEvidence,acoustic,score,passed:decision.decision===c.expected});
  if((i+1)%16===0)console.log(`${i+1}/${cases.length}`);
 }
 await page.evaluate(()=>window.hfWords.dispose());
}finally{await browser.close();}
const summary=(rows)=>({examples:rows.length,identified:rows.filter(r=>r.passed).length,oppositeErrors:rows.filter(r=>['target','opposite'].includes(r.expected)&&['target','opposite'].includes(r.decision)&&r.decision!==r.expected).length,
 unresolved:rows.filter(r=>r.decision==='unknown'||r.decision==='unavailable').length});
const routed=(rows,key)=>({examples:rows.length,scored:rows.filter(r=>r[key].status==='matched').length,
 correctHigh:rows.filter(r=>r.expected==='target'&&r[key].status==='matched'&&r[key].score>=65).length,
 oppositeHigh:rows.filter(r=>r.expected==='opposite'&&r[key].status==='matched'&&r[key].score>=65).length,
 oppositeLow:rows.filter(r=>r.expected==='opposite'&&r[key].status==='matched'&&r[key].score<=45).length,
 targetLow:rows.filter(r=>r.expected==='target'&&r[key].status==='matched'&&r[key].score<=45).length,
 controlsHigh:rows.filter(r=>!['target','opposite'].includes(r.expected)&&r[key].status==='matched'&&r[key].score>=65).length});
const report={scope:'Offline runtime/word regression, NOT calibrated pronunciation grade accuracy',humanSha256:createHash('sha256').update(await readFile(humanFile)).digest('hex'),
 summary:summary(results),synthetic:summary(results.filter(r=>!r.name.startsWith('human/'))),human:summary(results.filter(r=>r.name.startsWith('human/'))),
 routed:{before:routed(results,'acoustic'),after:routed(results,'score'),humanBefore:routed(results.filter(r=>r.name.startsWith('human/')),'acoustic'),humanAfter:routed(results.filter(r=>r.name.startsWith('human/')),'score')},
 byLanguage:Object.fromEntries(['en-US','zh-CN'].map(l=>[l,summary(results.filter(r=>r.language===l))])),results};
await writeFile(output+'/report.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({...report,results:undefined}));
