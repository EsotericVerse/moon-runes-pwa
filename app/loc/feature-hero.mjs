// The four feature headers share one LOC-managed data source; LOC edits in place,
// other Scopes consume its read-only presentation.
// Rows live on silver.loc_blocks.page_name='feature_hero', never on 'index'.
// LunaRunes deliberately remains on its current read-only localized header.
export const FEATURE_HERO_PAGE='feature_hero';
export const FEATURE_HERO_ORDER=Object.freeze({
  culture:1,
  statics:2,
  search:3,
  governance:4
});
export const FEATURE_HERO_IDS=Object.freeze(Object.keys(FEATURE_HERO_ORDER));

export function sharedFeatureHeroFor(rows,featureId){
  const order=FEATURE_HERO_ORDER[String(featureId||'')];
  if(!order)return null;
  const row=(Array.isArray(rows)?rows:[]).find(item=>item?.page_name===FEATURE_HERO_PAGE&&Number(item.block_order)===order);
  if(!row)return null;
  return {
    eyebrow:String(row.block_eyebrow||'').trim(),
    title:String(row.block_title||'').trim(),
    subtitle:String(row.block_subtitle||''),
    description:String(row.block_text||'')
  };
}

export function shouldUseSharedFeatureHero(scopeId,featureId){
  // Explicitly keep the rune pages, their presentation and content untouched.
  return Boolean(FEATURE_HERO_ORDER[String(featureId||'')])&&
    Boolean(scopeId)&&scopeId!=='lrunes'&&scopeId!=='admin';
}
