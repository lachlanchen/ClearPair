import {localModels,validatedTask} from './local-models';
import {verifiedModelBytes,createLocalSession,inferLocal} from './local-inference';
import {localEvidence} from './local-evidence';
import {scorePlannedContrast} from './scoring';
import type {LocalAssessmentRequest} from './local-score';
let session:Awaited<ReturnType<typeof createLocalSession>>|undefined,modelId:string|undefined;
// Controller owns one worker/attempt. Termination cancels model load/inference,
// removes audio from memory and avoids an old take overwriting a new result.
onmessage=async(event:MessageEvent<LocalAssessmentRequest>)=>{
  const {id,app,plan,samples,quality,base}=event.data;
  try{
    const model=localModels.find(m=>validatedTask(m,plan.calibrationKey)),
      task=model?validatedTask(model,plan.calibrationKey):undefined;
    if(!model||!task){postMessage({id,result:{status:'unscored',reason:'unvalidated-model'}});return;}
    if(modelId!==model.id){
      await session?.release();session=undefined;
      session=await createLocalSession(await verifiedModelBytes(model,base));modelId=model.id;
    }
    const {frames,features}=await inferLocal(session!,model,samples);
    const evidence=localEvidence(model,task,frames,quality,features);
    postMessage({id,result:scorePlannedContrast(app,plan,evidence,[task.calibration])});
  }catch{
    postMessage({id,result:{status:'unscored',reason:'model-unavailable'}});
  }
};
