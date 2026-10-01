import type {LocalAssessmentRequest} from './local-score';
import type {ScoreResult} from './scoring';
/** One worker, one active attempt, at most one model session. Keep completed
 * sessions warm briefly; never keep an audio job alive after cancellation. */
export class LocalWorker {
 private worker?:Worker;
 private abort?:()=>void;
 private idleTimer?:ReturnType<typeof setTimeout>;
 constructor(private create=()=>new Worker(new URL('./local-score.worker.ts',import.meta.url),{type:'module'})){}
 cancel(){this.abort?.();this.abort=undefined;}
 dispose(){this.cancel();clearTimeout(this.idleTimer);this.worker?.terminate();this.worker=undefined;}
 request(request:LocalAssessmentRequest):Promise<ScoreResult>{
  this.cancel();clearTimeout(this.idleTimer);
  return new Promise(resolve=>{
   let worker:Worker;
   try{worker=this.worker??this.create();this.worker=worker;}
   catch{resolve({status:'unscored',reason:'model-unavailable'});return;}
   let settled=false;
   const finish=(result:ScoreResult,release=false)=>{
    if(settled)return;settled=true;clearTimeout(timer);
    if(this.worker===worker){
     this.abort=undefined;worker.onmessage=null;worker.onerror=null;
     if(release){worker.terminate();this.worker=undefined;}
     else this.idleTimer=setTimeout(()=>{
      if(this.worker===worker){worker.terminate();this.worker=undefined;}
     },60_000);
    }
    resolve(result);
   };
   const timer=setTimeout(()=>finish({status:'unscored',reason:'model-unavailable'},true),30_000);
   this.abort=()=>finish({status:'unscored',reason:'cancelled'},true);
   worker.onerror=()=>finish({status:'unscored',reason:'model-unavailable'},true);
   worker.onmessage=event=>{
    if(event.data?.id!==request.id)return;
    const result=event.data.result as ScoreResult;
    const reasons=['poor-signal','unvalidated-model','wrong-model','unsupported-contrast','unaligned','uncertain',
     'invalid-evidence','ungraded-exercise','cancelled','model-unavailable'];
    const valid=result&&(result.status==='unscored'&&reasons.includes(result.reason)||result.status==='scored'&&
     Number.isInteger(result.score)&&result.score>=0&&result.score<=100&&
     Number.isFinite(result.probability)&&result.probability>=0&&result.probability<=1&&
     result.score===Math.round(result.probability*100)&&result.contrast===request.plan.calibrationKey&&
     typeof result.model==='string'&&!!result.model&&result.unit===request.plan.profile.unit);
    finish(valid?result:{status:'unscored',reason:'invalid-evidence'},!valid||result.status==='unscored'&&result.reason==='model-unavailable');
   };
   try{worker.postMessage(request,[request.samples.buffer]);}
   catch{finish({status:'unscored',reason:'model-unavailable'},true);}
  });
 }
}
