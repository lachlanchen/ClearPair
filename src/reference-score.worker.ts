import {referenceScore,type ReferenceRequest} from './reference-score';
onmessage=(event:MessageEvent<ReferenceRequest>)=>{
 const {id}=event.data;
 try {postMessage({id,result:referenceScore(event.data)});}
 catch {postMessage({id,result:{status:'unscored',reason:'model-unavailable'}});}
};
