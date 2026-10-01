// Owner-authorized deterministic packaging matte. Opaque generated art is untouched.
import sharp from 'sharp';
import {mkdir,writeFile} from 'node:fs/promises';
const apps=['handf','landr','english','chinese','korean','arabic','cantonese'];
await mkdir('assets/icons/art-v4/foreground',{recursive:true});
const receipt=[];
for(const app of apps) {
 const {data,info}=await sharp(`assets/icons/art-v4/${app}.png`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const w=info.width,h=info.height,n=w*h;
 function corner(x0,y0){const sum=[0,0,0];for(let y=y0;y<y0+12;y++)for(let x=x0;x<x0+12;x++)for(let c=0;c<3;c++)sum[c]+=data[(y*w+x)*4+c];return sum.map(v=>v/144);}
 const corners=[corner(0,0),corner(w-12,0),corner(0,h-12),corner(w-12,h-12)];
 const mask=new Uint8Array(n);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
  const fx=x/(w-1),fy=y/(h-1),p=y*w+x;
  let distance=0;
  for(let c=0;c<3;c++){
   const bg=(1-fy)*((1-fx)*corners[0][c]+fx*corners[1][c])+fy*((1-fx)*corners[2][c]+fx*corners[3][c]);
   distance+=(data[p*4+c]-bg)**2;
  }
  mask[p]=Math.round(Math.max(0,Math.min(1,(Math.sqrt(distance)-24)/16))*255);
 }
 // Retain all meaningful glyph parts, including dots; remove isolated matte noise.
 const visited=new Uint8Array(n),queue=new Int32Array(n);let parts=0,discarded=0;
 for(let p=0;p<n;p++)if(mask[p]>0&&!visited[p]) {
  let head=0,tail=1;queue[0]=p;visited[p]=1;
  while(head<tail){const q=queue[head++],x=q%w,y=Math.floor(q/w);
   for(const k of [x>0?q-1:-1,x<w-1?q+1:-1,y>0?q-w:-1,y<h-1?q+w:-1])if(k>=0&&mask[k]>0&&!visited[k]){visited[k]=1;queue[tail++]=k;}
  }
  if(tail<500){for(let j=0;j<tail;j++)mask[queue[j]]=0;discarded+=tail;}else parts++;
 }
 for(let p=0;p<n;p++)data[p*4+3]=mask[p];
 await sharp(data,{raw:info}).png().toFile(`assets/icons/art-v4/foreground/${app}.png`);
 receipt.push({app,width:w,height:h,meaningfulParts:parts,discardedMattePixels:discarded});
}
await writeFile('.runtime/design/alpha-cleanup-v4.json',JSON.stringify(receipt,null,2)+'\n');
console.log(receipt);
