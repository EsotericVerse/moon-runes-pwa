/**
 * Licensed HD smoke art only; never synthesize a rune particle effect.
 * Artwork: WickedInsignia, "Clouds with Transparency – FX_CloudAlpha05",
 * CC0 1.0, https://opengameart.org/content/clouds-with-transparency-fxcloudalpha05png
 * Source texture: native 2048 x 2048 RGBA, no interpolation from 128px.
 * The authored MxS_foot_smoke2.efkefc emitter remains byte-for-byte unchanged.
 */
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname,resolve} from 'node:path';

export const HD_FOG_SOURCE='https://opengameart.org/sites/default/files/oga-textures/136561/fx_cloudalpha05.png';
export const HD_FOG_DESTINATION='public/vendor/effekseer/Collections/MAGICALxSPIRAL/Texture/_fog-cloud-2048.png';
export const HD_FOG_SIZE=2048;
const DEST=resolve(HD_FOG_DESTINATION);
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
function verify(bytes){
  if(bytes.length<1024||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')
    throw Error('2K cloud-fog material is not a PNG');
  const w=bytes.readUInt32BE(16),h=bytes.readUInt32BE(20);
  const depth=bytes[24],type=bytes[25];
  if(w!==HD_FOG_SIZE||h!==HD_FOG_SIZE)
    throw Error('Fog texture is '+w+'×'+h+'; native 2048×2048 mandatory');
  if(depth!==8||![4,6].includes(type))
    throw Error('Fog PNG must have a true alpha channel: type '+type+' depth '+depth);
  return {bytes:bytes.length,width:w,height:h,colorType:type,sha256:sha256(bytes)};
}
let buffer;
try{
  buffer=await readFile(DEST);
  verify(buffer);
}catch{
  const response=await fetch(HD_FOG_SOURCE,{
    headers:{'user-agent':'LunaRunesEffekseerFog/1.0 (CC0 asset verification)'},
    signal:AbortSignal.timeout(35000)
  });
  if(!response.ok)throw Error('Unable to retrieve pinned CC0 2K fog: HTTP '+response.status);
  buffer=Buffer.from(await response.arrayBuffer());
  verify(buffer);
  await mkdir(dirname(DEST),{recursive:true});
  await writeFile(DEST,buffer);
}
const result=verify(buffer);
console.log('[FOG-HD] Native CC0 RGBA texture verified '+result.width+'×'+result.height+
 ' alpha colorType='+result.colorType+' bytes='+result.bytes+' SHA256='+result.sha256);
