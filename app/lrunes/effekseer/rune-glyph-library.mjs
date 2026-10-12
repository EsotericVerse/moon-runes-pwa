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
const accents=Object.freeze({"15":"#f4e9b9","16":"#dca1ae","18":"#b6a99b","24":"#c7afed","27":"#a0c67e","28":"#9cdd83","29":"#b68e6c","32":"#95c48a","33":"#f5d07b","34":"#b6edd3","35":"#d9f6ff","36":"#c7b49c","37":"#b8afb0","38":"#f5fbff","39":"#c5a887","40":"#b8b2a3","41":"#ffe9a5","42":"#b3a2d1","43":"#a4d5f1","44":"#ffab58","45":"#b7dfde","47":"#d0c5f9","48":"#a7d9df","49":"#ffd990","50":"#e7ecff","51":"#f8f8fd","52":"#b5b2de","53":"#eaf7ff","54":"#c7d0ef","55":"#afa5d9","56":"#d9bb93","58":"#d9a2a2","59":"#dad8d0","61":"#c6a7dc","62":"#d3b6e9","63":"#9784be","64":"#efdbad","65":"#ad91dd","66":"#dfc89d"});
const fallback=Object.freeze({family:'scribe',font:'script',ink:'#e6d8c9',finish:'ink'});
export function runeGlyphProfile(rune){
  const id=Number(rune?.rune_id);
  const family=Number.isInteger(id)?byId.get(id):null;
  if(!family)return fallback;
  const style=RUNE_GLYPH_STYLES[family];
  return {family,font:style.font,ink:accents[id]||style.ink,finish:style.finish};
}
export const RUNE_GLYPH_IDS=Object.freeze([...byId.keys()].sort((a,b)=>a-b));
