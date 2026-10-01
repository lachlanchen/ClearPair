import { alignCtc } from './alignment';
import { prepareCtc, validateCtc } from './ctc';
import { logSumExp } from './scoring';

/** Deterministic edit alignment of the unconstrained decoder, not a forced
 * acoustic alignment and not a diagnosis of what the speaker intended. */
export function freePhoneAlignment(reference: readonly number[], decoded: readonly number[]) {
  if(reference.length>96||decoded.length>1000)throw Error('Oversized phone sequence');
  const n=reference.length,m=decoded.length;
  const cost=Array.from({length:n+1},()=>new Uint16Array(m+1));
  for(let i=0;i<=n;i++)cost[i][0]=i;
  for(let j=0;j<=m;j++)cost[0][j]=j;
  for(let i=1;i<=n;i++)for(let j=1;j<=m;j++)cost[i][j]=Math.min(
    cost[i-1][j-1]+Number(reference[i-1]!==decoded[j-1]),cost[i-1][j]+1,cost[i][j-1]+1);
  const observed=Array<number|null>(n).fill(null);
  let i=n,j=m;
  while(i||j){
    if(i&&j&&cost[i][j]===cost[i-1][j-1]+Number(reference[i-1]!==decoded[j-1])){
      observed[i-1]=decoded[j-1];i--;j--;
    }else if(i&&cost[i][j]===cost[i-1][j]+1)i--;
    else j--;
  }
  return {observed,distance:cost[n][m]/Math.max(1,n)};
}

/** Same-context all-phone/omission evidence used by the human research audit.
 * Conditional edit mass is not a pronunciation grade or content/OOD check.
 * Single-phone targets only; multi-phone/accepted-allophone tasks use their
 * separately validated lattice. A merged model class cannot distinguish its
 * constituent sounds, so the vocabulary adapter must exclude such grading tasks.
 */
export function phoneEditFeatures(frames:readonly (readonly number[])[],
  reference:readonly number[],position:number,inventory:readonly number[],blank:number):Record<string,number> {
  if(!frames.length||frames.length>1000||reference.length>96||inventory.length<2||inventory.length>128||
    frames.length*reference.length*inventory.length>12_000_000||
    !Number.isInteger(position)||position<0||position>=reference.length||
    new Set(inventory).size!==inventory.length||reference.some(p=>!inventory.includes(p)))
    throw Error('Invalid or oversized phone edit task');
  validateCtc(frames,inventory,blank);
  const target=reference[position],prefix=reference.slice(0,position),suffix=reference.slice(position+1);
  const likelihood=prepareCtc(frames,blank);
  const edits=[...inventory.map(p=>likelihood([...prefix,p,...suffix])),likelihood([...prefix,...suffix])];
  const index=inventory.indexOf(target),targetLL=edits[index],total=logSumExp(edits);
  if(!Number.isFinite(targetLL))throw Error('No finite target alignment');
  const logp=edits.map(v=>v-total),alignment=alignCtc(frames,reference,blank);
  if(!alignment)throw Error('No target alignment');
  const weights=alignment.phones[position],mass=weights.reduce((s,p)=>s+p,0);
  if(!(mass>1e-8))throw Error('No aligned target mass');
  let posterior=0,margin=0;
  for(let t=0;t<frames.length;t++){
    if(weights[t]===0)continue; // 0 * -Infinity must not poison an impossible frame.
    const targetFrame=frames[t][target],other=Math.max(...inventory.filter(p=>p!==target).map(p=>frames[t][p]));
    posterior+=weights[t]/mass*targetFrame;
    margin+=weights[t]/mass*(targetFrame-other);
  }
  const decoded:number[]=[];
  let previous=blank;
  for(const row of frames){
    const token=row.indexOf(Math.max(...row));
    if(token!==blank&&token!==previous)decoded.push(token);
    previous=token;
  }
  const free=freePhoneAlignment(reference,decoded);
  const result={targetVsBestEdit:targetLL-Math.max(...edits.filter((_,i)=>i!==index)),
    targetGivenEdits:Math.exp(logp[index]),
    editEntropy:-logp.reduce((sum,value)=>sum+(Number.isFinite(value)?Math.exp(value)*value:0),0),
    deletionMargin:targetLL-edits.at(-1)!,contextPerFrame:alignment.logLikelihood/frames.length,
    targetLogPosterior:posterior,targetVsOtherFrame:margin,alignmentMass:mass,
    greedyMatch:Number(free.observed[position]===target),greedyDeletion:Number(free.observed[position]===null),
    greedyContextDistance:free.distance};
  if(!Object.values(result).every(Number.isFinite))throw Error('Non-finite phone edit feature');
  return result;
}
