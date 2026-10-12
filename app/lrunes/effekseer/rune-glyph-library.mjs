/** LunaRunes lettering: eight reusable font families across all canonical Rune IDs.
 * Presentation styles never redefine the database's Rune semantics.
 * Rune 0 is included only for author visualization, not the draw pool.
 */
export const RUNE_GLYPH_STYLES=Object.freeze({
"scribe":Object.freeze({"label":"靈思手札","font":"script","ink":"#dbcce8","finish":"ink","ids":[0,1,2,4,13,15,23,24,57]}),
"monument":Object.freeze({"label":"刻銘碑文","font":"serif","ink":"#dec6ac","finish":"stone","ids":[5,6,8,11,12,18,20,29,33,36,37,39,46,49,54,56,64,66]}),
"vigorous":Object.freeze({"label":"奔放筆勢","font":"brush","ink":"#f1b9a0","finish":"ink","ids":[9,10,14,16,40,44,45,47,58,65]}),
"living":Object.freeze({"label":"生長書韻","font":"kai","ink":"#b6d8ae","finish":"ink","ids":[17,25,27,28,30,31,32,43,48]}),
"tender":Object.freeze({"label":"柔韻墨意","font":"soft","ink":"#ead1de","finish":"ink","ids":[3,19,21,22,26,34,60,61,62]}),
"prismatic":Object.freeze({"label":"晶耀字鋒","font":"sharp","ink":"#f7dea6","finish":"glass","ids":[7,35,38,41,50,51,53]}),
"cosmic":Object.freeze({"label":"星域銘文","font":"serif","ink":"#bdcce9","finish":"glass","ids":[42,52,55,63]}),
"blank":Object.freeze({"label":"留白本體","font":"minimal","ink":"#dad8d0","finish":"plain","ids":[59]})
});
const byId=new Map();
for(const [family,style] of Object.entries(RUNE_GLYPH_STYLES)){
  for(const id of style.ids){
    if(byId.has(id))throw Error('Duplicate Rune ID: '+id);
    byId.set(id,family);
  }
}
const accents=Object.freeze({"34":"#a9dac8","40":"#c8bcb0","41":"#ffe9a5","42":"#b3a2d1","43":"#a4d5f1","44":"#f4ae76","45":"#b7dfde","47":"#d0c5f9","50":"#e5e5ec","61":"#d2b6e9","63":"#aa9ac6"});
const fallback=Object.freeze({family:'scribe',font:'script',ink:'#e6d8c9',finish:'ink'});
export function runeGlyphProfile(rune){
  const id=Number(rune?.rune_id);
  const family=Number.isInteger(id)?byId.get(id):null;
  if(!family)return fallback;
  const style=RUNE_GLYPH_STYLES[family];
  return {family,font:style.font,ink:accents[id]||style.ink,finish:style.finish};
}
export const RUNE_GLYPH_IDS=Object.freeze([...byId.keys()].sort((a,b)=>a-b));
