/**
 * Pixel-edge repair of select pinned Effekseer raster sprites used by
 * Illusion, Phase and Jade's licensed reflection overlay.
 *
 * The source library contains opaque RGB images with dark mattes that reveal
 * rectangles when scaled/tinted. Create transparent derivative PNGs as
 * dependencies while preserving all pinned source bytes and authored effects.
 * No runtime shaders, new emitters, or procedurally generated VFX.
 */
import {mkdir,rename,rm,writeFile} from 'node:fs/promises';
import {dirname,resolve,sep} from 'node:path';
import sharp from 'sharp';
import {SOFT_MATTE_NAMES} from '../app/lrunes/effekseer/soft-matte-textures.mjs';

const SRC_DIR=resolve('public/vendor/effekseer/Collections/MAGICALxSPIRAL/Texture');
const REPORT=resolve('public/vendor/effekseer/soft-matte-report.json');
const TARGET=256;
function smoothstep(value){
  const v=Math.max(0,Math.min(1,value));
  return v*v*(3-2*v);
}
const generated=[];
for(const filename of SOFT_MATTE_NAMES){
  if(!/^[A-Za-z0-9_-]+\.png$/.test(filename))throw Error('Invalid soft-matte file');
  const original=resolve(SRC_DIR,filename);
  if(!original.startsWith(SRC_DIR+sep))throw Error('Unsafe matte input');
  const originalMeta=await sharp(original).metadata();
  if(originalMeta.format!=='png'||!originalMeta.width||!originalMeta.height)
    throw Error('Expected pinned PNG: '+filename);
  if((originalMeta.pages||1)!==1)throw Error('Animated atlas cannot be rewritten: '+filename);

  // Only enlarge if necessary; do not lower any authored high-resolution input.
  const scale=Math.max(1,TARGET/Math.max(originalMeta.width,originalMeta.height));
  const width=Math.round(originalMeta.width*scale),height=Math.round(originalMeta.height*scale);
  const {data,info}=await sharp(original)
    .resize(width,height,{kernel:sharp.kernel.lanczos3,fastShrinkOnLoad:false})
    .ensureAlpha()
    .raw()
    .toBuffer({resolveWithObject:true});
  if(info.channels!==4)throw Error('Expected RGBA: '+filename);

  let activePixels=0;
  for(let y=0;y<height;y++){
    for(let x=0;x<width;x++){
      const offset=4*(y*width+x);
      const r=data[offset],g=data[offset+1],b=data[offset+2],a=data[offset+3]/255;
      // With RGB-only dark-matte sprites, luminance is the intended glow
      // density. Converting it to Alpha prevents opaque black rectangles.
      const brightness=Math.max(r,g,b)/255;
      const matte=originalMeta.hasAlpha?1:smoothstep((brightness-.025)/.15);
      // Preserve the authored colored interior, fading only the quad's
      // outer 17% so it no longer has a rectangular silhouette on movement.
      const border=Math.min(
        (x+.5)/(width*.17),
        (width-x-.5)/(width*.17),
        (y+.5)/(height*.17),
        (height-y-.5)/(height*.17)
      );
      const feather=smoothstep(border);
      const alpha=Math.round(255*a*matte*feather);
      data[offset+3]=alpha;
      if(alpha>8)activePixels++;
    }
  }
  if(activePixels<16)throw Error('Matte repair erased authored art: '+filename);
  const output=resolve(SRC_DIR,'_softmatte',filename);
  await mkdir(dirname(output),{recursive:true});
  const temp=output+'.temp-'+process.pid+'.png';
  try{
    await sharp(data,{raw:{width,height,channels:4}})
      .png({palette:false,compressionLevel:9})
      .toFile(temp);
    const checked=await sharp(temp).metadata();
    if(checked.width!==width||checked.height!==height||!checked.hasAlpha)
      throw Error('Soft matte dimensions/alpha did not survive encoding: '+filename);
    await rename(temp,output);
  }finally{
    await rm(temp,{force:true});
  }
  generated.push({filename,sourceWidth:originalMeta.width,sourceHeight:originalMeta.height,
    width,height,sourceHadAlpha:Boolean(originalMeta.hasAlpha),activePixels});
}
await mkdir(dirname(REPORT),{recursive:true});
await writeFile(REPORT,JSON.stringify({source:'pinned Effekseer art',targetLongestEdgeAtLeast:TARGET,
  operation:'scoped matte alpha/edge feather; original PNG and .efkefc unmodified',
  sprites:generated},null,2)+'\n');
console.log('[EFFEKSEER-SOFTMATTE] '+generated.length+' authored sprite edges repaired for video-observed quads');
