/**
 * Redirect only the existing MAGICALxSPIRAL smoke scene's dependency URLs.
 * This file creates no new effect, emitter or shader. The original licensed
 * .efkefc remains intact; the browser loads a separately pinned CC0 texture.
 */
export const AMBIENT_FOG_IMAGE='/vendor/effekseer/Collections/MAGICALxSPIRAL/Texture/_fog-cloud-2048.png';

export function redirectAmbientFogTexture(path,onReplacement){
  if(typeof path!=='string')return path;
  // Effekseer can supply either a relative filename or a fully resolved URL.
  // Preserve any directory, slash convention and cache query string.
  return path.replace(/(^|[/\\])(smoke_01|star)\.png(?=$|[?#])/i,
    (whole,prefix,original)=>{
      onReplacement?.(original.toLowerCase());
      return prefix+'_fog-cloud-2048.png';
    });
}
