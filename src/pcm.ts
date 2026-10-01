export interface PCM { samples: Float32Array; rate: number }
/** Decode native PCM WAV directly. This avoids an unnecessary AudioContext,
 * codec startup and suspended-context dependency after native recording. */
export function decodeWav(buffer: ArrayBuffer): PCM | null {
  const v=new DataView(buffer),id=(at:number)=>String.fromCharCode(...new Uint8Array(buffer,at,4));
  if(v.byteLength<12 || id(0)!=='RIFF' || id(8)!=='WAVE')return null;
  if(v.byteLength>16*1024*1024)throw Error('Recording exceeds the local decoding limit');
  const end=v.getUint32(4,true)+8;
  if(end>v.byteLength || end<12)throw Error('Truncated WAV recording');
  let format:{tag:number;channels:number;rate:number;bits:number;block:number}|undefined;
  let data:{at:number;size:number}|undefined;
  for(let at=12;at+8<=end;){
    const size=v.getUint32(at+4,true),start=at+8;
    if(start+size>end)throw Error('Truncated WAV chunk');
    if(id(at)==='fmt '){
      if(format||size<16)throw Error('Invalid WAV format');
      format={tag:v.getUint16(start,true),channels:v.getUint16(start+2,true),rate:v.getUint32(start+4,true),
        block:v.getUint16(start+12,true),bits:v.getUint16(start+14,true)};
    }else if(id(at)==='data'){
      if(data)throw Error('Multiple WAV audio chunks are not supported');
      data={at:start,size};
    }
    at=start+size+(size%2);
  }
  if(!format||!data)throw Error('WAV is missing its format or audio');
  const {tag,channels,rate,bits,block}=format;
  if(![1,2].includes(channels)||rate<8000||rate>192000||
    !(tag===1&&[8,16,24,32].includes(bits)||tag===3&&bits===32)||
    block!==channels*bits/8 || data.size%block!==0)throw Error('Unsupported PCM WAV format');
  const length=data.size/block;
  if(length>rate*13.5)throw Error('Recording exceeds the short practice window');
  const samples=new Float32Array(length);
  for(let frame=0;frame<length;frame++){
    let sum=0;
    for(let channel=0;channel<channels;channel++){
      const at=data.at+frame*block+channel*bits/8;
      const value=tag===3?v.getFloat32(at,true):bits===8?(v.getUint8(at)-128)/128:
        bits===16?v.getInt16(at,true)/32768:bits===32?v.getInt32(at,true)/2147483648:
        ((v.getUint8(at)|v.getUint8(at+1)<<8|v.getInt8(at+2)<<16)/8388608);
      if(!Number.isFinite(value)||Math.abs(value)>1.001)throw Error('Invalid PCM sample');
      sum+=value;
    }
    samples[frame]=sum/channels;
  }
  return {samples,rate};
}
export async function decodeRecording(blob: Blob): Promise<PCM> {
  if(blob.size>16*1024*1024)throw Error('Recording exceeds the local decoding limit');
  const data=await blob.arrayBuffer(),wav=decodeWav(data);
  if(wav)return wav;
  const context=new AudioContext();
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{
    const decoded=await Promise.race([context.decodeAudioData(data),new Promise<never>((_,no)=>{
      timer=setTimeout(()=>no(Error('Audio decoder timed out')),3000);
    })]);
    if(decoded.duration>13.5||decoded.numberOfChannels>2)throw Error('Recording exceeds the short practice window');
    const samples=new Float32Array(decoded.length);
    for(let c=0;c<decoded.numberOfChannels;c++){
      const channel=decoded.getChannelData(c);
      for(let i=0;i<channel.length;i++)samples[i]+=channel[i]/decoded.numberOfChannels;
    }
    if(samples.some(v=>!Number.isFinite(v)))throw Error('Invalid audio sample');
    return {samples,rate:decoded.sampleRate};
  }finally{clearTimeout(timer);await context.close().catch(()=>{});}
}
/** Windowed-sinc low-pass resampling, never decimate by dropping samples.
 * Golden fixtures must accompany the exact preprocessing of a model export. */
export function resamplePCM(samples:Float32Array,from:number,to=16000):Float32Array {
  if(!Number.isFinite(from)||from<8000||from>192000||to!==16000||samples.length>from*13.5||samples.some(v=>!Number.isFinite(v)))
    throw Error('Invalid local model audio');
  if(from===to)return samples.slice();
  const output=new Float32Array(Math.round(samples.length*to/from)),cutoff=Math.min(1,to/from)*.94;
  const radius=24,sinc=(x:number)=>Math.abs(x)<1e-8?1:Math.sin(Math.PI*x)/(Math.PI*x);
  for(let i=0;i<output.length;i++){
    const at=i*from/to,center=Math.floor(at);
    let sum=0,mass=0;
    for(let j=center-radius+1;j<=center+radius;j++){
      if(j<0||j>=samples.length)continue;
      const d=j-at,weight=cutoff*sinc(cutoff*d)*(.5+.5*Math.cos(Math.PI*d/radius));
      sum+=samples[j]*weight;mass+=weight;
    }
    output[i]=mass?sum/mass:0;
  }
  return output;
}
