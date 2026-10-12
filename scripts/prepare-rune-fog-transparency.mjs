/**
 * Adapt opaque, indexed upstream PNGs for alpha-composited web fog.
 *
 * Original author textures and .efkefc files stay byte-for-byte unchanged.
 * We add a PNG tRNS palette-alpha chunk to a COPY of the original texture;
 * no particles, emitters, shaders or synthetic smoke are authored here.
 *
 * The sampled image-background color comes from the outer border, not a
 * guessed matte hue. Any modification to the original texture is caught
 * by the independent pinned-hash installer before this conversion.
 */
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {inflateSync} from 'node:zlib';
const BASE=resolve('public/vendor/effekseer/Collections/MAGICALxSPIRAL/Texture');
const FILES=[
  ['smoke_01.png','_fog-smoke_01.png'],
  ['star.png','_fog-star.png']
];
const SIGNATURE='89504e470d0a1a0a';
const crcTable=Uint32Array.from({length:256},(_,i)=>{
 let c=i;
 for(let j=0;j<8;j++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);
 return c>>>0;
});
function crc32(bytes){
 let c=0xffffffff;
 for(const n of bytes)c=crcTable[(c^n)&255]^(c>>>8);
 return (c^0xffffffff)>>>0;
}
function pngChunks(bytes){
 if(bytes.subarray(0,8).toString('hex')!==SIGNATURE)throw Error('Not PNG');
 let at=8;
 const chunks=[];
 while(at+12<=bytes.length){
  const length=bytes.readUInt32BE(at);
  const type=bytes.toString('ascii',at+4,at+8);
  if(at+12+length>bytes.length)throw Error('Truncated PNG chunk '+type);
  chunks.push({type,content:bytes.subarray(at+8,at+8+length),offset:at,end:at+12+length});
  at+=12+length;
  if(type==='IEND')break;
 }
 return chunks;
}
function indexedPixels(bytes,chunks){
 const ihdr=chunks.find(x=>x.type==='IHDR')?.content;
 if(!ihdr)throw Error('No PNG IHDR');
 const w=ihdr.readUInt32BE(0),h=ihdr.readUInt32BE(4);
 if(ihdr[8]!==8||ihdr[9]!==3)throw Error('Expected 8-bit indexed author texture');
 const packed=Buffer.concat(chunks.filter(x=>x.type==='IDAT').map(x=>x.content));
 const inflated=inflateSync(packed);
 let prev=Buffer.alloc(w),pos=0;
 const pixels=Buffer.alloc(w*h);
 const paeth=(a,b,c)=>{
  const p=a+b-c,da=Math.abs(p-a),db=Math.abs(p-b),dc=Math.abs(p-c);
  return da<=db&&da<=dc?a:db<=dc?b:c;
 };
 for(let y=0;y<h;y++){
  const filter=inflated[pos++],line=Buffer.alloc(w);
  for(let x=0;x<w;x++){
   const a=x?line[x-1]:0,b=prev[x],c=x?prev[x-1]:0;
   const predictor=filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):filter===4?paeth(a,b,c):null;
   if(predictor===null)throw Error('Unknown PNG scanline filter '+filter);
   line[x]=(inflated[pos++]+predictor)&255;
  }
  line.copy(pixels,y*w);prev=line;
 }
 return {pixels,w,h};
}
function chooseMatte(bytes,chunks,palette){
 const {pixels,w,h}=indexedPixels(bytes,chunks);
 const counts=new Map();
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  if(x<3||y<3||x>=w-3||y>=h-3){
   const key=pixels[y*w+x];
   counts.set(key,(counts.get(key)||0)+1);
  }
 }
 const [index,count]=[...counts.entries()].sort((a,b)=>b[1]-a[1])[0];
 return {index,color:[palette[index*3],palette[index*3+1],palette[index*3+2]],fraction:count/(w*h-(w-6)*(h-6)),w,h};
}
function makeTransparent(bytes,label){
 const chunks=pngChunks(bytes);
 if(chunks.some(x=>x.type==='tRNS'))throw Error(label+' already has an alpha palette');
 const pal=chunks.find(x=>x.type==='PLTE');
 if(!pal||pal.content.length%3)throw Error(label+' has no valid palette');
 const matte=chooseMatte(bytes,chunks,pal.content);
 const alpha=Buffer.alloc(pal.content.length/3);
 for(let i=0;i<alpha.length;i++){
  const col=[...pal.content.subarray(i*3,i*3+3)];
  const distance=Math.sqrt(col.reduce((sum,v,j)=>sum+(v-matte.color[j])**2,0)/3);
  alpha[i]=Math.max(0,Math.min(255,Math.round((distance-6)*1.35)));
 }
 alpha[matte.index]=0;
 const tag=Buffer.from('tRNS','ascii'),length=Buffer.alloc(4),sum=Buffer.alloc(4);
 length.writeUInt32BE(alpha.length);
 sum.writeUInt32BE(crc32(Buffer.concat([tag,alpha])));
 const newChunk=Buffer.concat([length,tag,alpha,sum]);
 const output=Buffer.concat([bytes.subarray(0,pal.end),newChunk,bytes.subarray(pal.end)]);
 const check=pngChunks(output);
 if(!check.some(x=>x.type==='tRNS')||output.length<=bytes.length)throw Error('Failed to add PNG alpha to '+label);
 return {output,matte,zeroAlpha:alpha.filter(x=>x===0).length,midAlpha:alpha.filter(x=>x>0&&x<255).length};
}
for(const [name,out] of FILES){
 const bytes=await readFile(resolve(BASE,name));
 const {output,matte,zeroAlpha,midAlpha}=makeTransparent(bytes,name);
 await writeFile(resolve(BASE,out),output);
 console.log('[FOG-ALPHA] '+name+' => '+out+' '+matte.w+'x'+matte.h+
   ' border RGB='+matte.color.join(',')+' borderMatch='+matte.fraction.toFixed(2)+
   ' paletteTransparent='+zeroAlpha+' palettePartial='+midAlpha);
}
