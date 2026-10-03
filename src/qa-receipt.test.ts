import {describe,it,expect} from 'vitest';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
function extract(log:string){
 const dir=mkdtempSync(join(tmpdir(),'clearpair-receipt-test-'));
 try{
  const source=join(dir,'console.log'),output=join(dir,'receipt.json');writeFileSync(source,log);
  const run=spawnSync('python3',['tools/reference-qa/extract-receipt.py',source,output,'--expected','1'],{encoding:'utf8'});
  return {status:run.status,...(run.status===0?{receipt:JSON.parse(readFileSync(output,'utf8'))}:{})};
 }finally{rmSync(dir,{recursive:true,force:true});}
}
function chunks(){
 const value={lesson:'哈/发',pair:0,passed:true};
 const encoded=Buffer.from(JSON.stringify(value)).toString('base64'),count=Math.ceil(encoded.length/30);
 return Array.from({length:count},(_,part)=>`⚡️ [log] CLEARPAIR_REFERENCE_PART 0 ${part} ${count} ${encoded.slice(part*30,(part+1)*30)} END`);
}
describe('native QA receipt capture integrity',()=>{
 it('reassembles UTF-8 chunks with unrelated native diagnostics between writes',()=>{
  const result=extract(chunks().join('\nApple native diagnostic\n')+'\nCLEARPAIR_REFERENCE_DONE 1\n');
  expect(result.status).toBe(0);expect(result.receipt.summary).toEqual({checks:1,passed:1,failed:[]});expect(result.receipt.results[0].lesson).toBe('哈/发');
 });
 it('fails closed for missing chunks even with a completion marker',()=>expect(extract(chunks().slice(1).join('\n')+'\nCLEARPAIR_REFERENCE_DONE 1').status).not.toBe(0));
 it('fails closed for duplicate chunks',()=>expect(extract([...chunks(),chunks()[0]].join('\n')+'\nCLEARPAIR_REFERENCE_DONE 1').status).not.toBe(0));
 it('retains the original complete-row format for previous release receipts',()=>{
  expect(extract('CLEARPAIR_REFERENCE_ROW '+JSON.stringify({lesson:'old',passed:true})+'\nCLEARPAIR_REFERENCE_DONE 1').status).toBe(0);
 });
});
