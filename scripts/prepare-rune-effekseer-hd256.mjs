/**
 * Create a side-by-side HD256 trial pack from pinned, licensed Effekseer PNGs.
 * Never overwrite the source textures or authored effects.
 *
 * This is a comparison experiment: resampling a 64px original does NOT invent
 * true 256px detail. Original asset opacity, silhouettes and material behavior
 * require visual QA even when the generated bitmap is exactly 256px wide.
 */
import {mkdir,rename,rm,writeFile} from 'node:fs/promises';
import {dirname,resolve,sep} from 'node:path';
import sharp from 'sharp';
import {EFFECT_ASSET_BLOBS} from './rune-effekseer-asset-manifest.mjs';
import {HD256_SPRITE_EDGE,redirectHd256ParticleTexture} from '../app/lrunes/effekseer/hd256-particle-paths.mjs';

const ROOT=resolve('public/vendor/effekseer/Collections');
const REPORT=resolve('public/vendor/effekseer/hd256-report.json');
const FOG_ORIGINAL='MAGICALxSPIRAL/Texture/_fog-cloud-2048.png';
const FOG_256='MAGICALxSPIRAL/Texture/_hd256/_fog-cloud-2048.png';
function safePath(relative){
  const absolute=resolve(ROOT,relative);
  if(!absolute.startsWith(ROOT+sep))throw Error('HD256 path escapes pinned effect library: '+relative);
  return absolute;
}
async function create256(originalRelative,outputRelative,kind){
  const original=safePath(originalRelative),output=safePath(outputRelative);
  const input=sharp(original,{limitInputPixels:8192*8192});
  const meta=await input.metadata();
  if(meta.format!=='png'||!meta.width||!meta.height)throw Error('Not a valid PNG: '+originalRelative);
  if((meta.pages||1)!==1)throw Error('Animated PNG requires authored frame preservation: '+originalRelative);
  const scale=HD256_SPRITE_EDGE/Math.max(meta.width,meta.height);
  const w=Math.max(1,Math.round(meta.width*scale));
  const h=Math.max(1,Math.round(meta.height*scale));
  await mkdir(dirname(output),{recursive:true});
  const tmp=output+'.temp-'+process.pid;
  try{
    await sharp(original,{limitInputPixels:8192*8192})
      .resize(w,h,{kernel:sharp.kernel.lanczos3,fit:'fill',fastShrinkOnLoad:false})
      .png({compressionLevel:9,palette:false})
      .toFile(tmp);
    const converted=await sharp(tmp).metadata();
    if(converted.width!==w||converted.height!==h)throw Error('Bad resized PNG: '+outputRelative);
    if(Boolean(meta.hasAlpha)!==Boolean(converted.hasAlpha))
      throw Error('PNG transparency semantics changed: '+originalRelative);
    await rename(tmp,output);
  }finally{await rm(tmp,{force:true});}
  return {kind,source:originalRelative,output:outputRelative,
    sourceWidth:meta.width,sourceHeight:meta.height,width:w,height:h,
    sourceHasAlpha:Boolean(meta.hasAlpha)};
}
const originals=EFFECT_ASSET_BLOBS.filter(item=>item.target.toLowerCase().endsWith('.png'));
const eligible=originals.map(item=>[item.target,redirectHd256ParticleTexture(item.target)])
  .filter(([a,b])=>a!==b);
if(new Set(eligible.map(([,dest])=>dest)).size!==eligible.length)
  throw Error('Duplicate HD256 sprite destination');
const completed=[];
let next=0;
const worker=async()=>{while(next<eligible.length){
  const [source,target]=eligible[next++];
  completed.push(await create256(source,target,'authored-sprite'));
}};
await Promise.all(Array.from({length:Math.min(4,eligible.length)},()=>worker()));
// Fog remains a separate, explicit alpha-repair problem. Only the QA variant
// uses this 256px copy of the pinned 2048px, genuine-alpha source.
completed.push(await create256(FOG_ORIGINAL,FOG_256,'native-alpha-fog'));
completed.sort((a,b)=>a.source.localeCompare(b.source));
const report={
  targetLongestEdge:HD256_SPRITE_EDGE,
  actualSprites:eligible.length,
  excludedNonSpriteTextures:originals.length-eligible.length,
  fogVariant:FOG_256,
  notes:'Original sources remain unchanged; alpha errors are NOT repaired by resampling.',
  textures:completed
};
await mkdir(dirname(REPORT),{recursive:true});
await writeFile(REPORT,JSON.stringify(report,null,2)+'\n');
console.log('[EFFEKSEER-HD256] '+eligible.length+' authored sprite textures resampled to longest edge 256; '+
  (originals.length-eligible.length)+' protected normal/atlas/material textures left original; '+
  '1 native-alpha fog variant for comparison. Original VFX unmodified.');
