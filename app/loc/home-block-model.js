import {stripLocHomeEditorPlaceholders} from './loc-home-text.mjs';

export const HOME_BLOCK_LIMIT=8;

/** One indexed page row is one text frame; repeat neither row nor field. */
export function homeBlockRows(rows,page='index',limit=HOME_BLOCK_LIMIT){
  const target=String(page||'index').toLowerCase();
  return (Array.isArray(rows)?rows:[])
    .filter(row=>String(row?.page_name||'index').toLowerCase()===target)
    .filter(row=>Number.isInteger(Number(row?.block_order))&&Number(row.block_order)>=1&&Number(row.block_order)<=limit)
    .sort((a,b)=>Number(a.block_order)-Number(b.block_order)||
      String(a.uid||'').localeCompare(String(b.uid||'')))
    .slice(0,limit);
}

function textSignature(value){
  return stripLocHomeEditorPlaceholders(value||'')
    .replace(/<br\b[^>]*>/gi,' ')
    .replace(/<[^>]*>/g,'')
    .replace(/&nbsp;|&#0*160;|&#x0*a0;/gi,' ')
    .replace(/\uFFFC/g,'')
    .replace(/\s+/g,'')
    .trim();
}

/** Only suppress empty placeholder entries and byte-equivalent legacy copies
 * of a populated canonical field. All other child entries remain in DB order. */
export function visibleHomeEntities(slot){
  const signatures=new Set([
    slot?.eyebrow,slot?.title,slot?.subtitle,slot?.text
  ].map(textSignature).filter(Boolean));
  return (Array.isArray(slot?.entities)?slot.entities:[]).filter(entity=>{
    const title=textSignature(entity?.title);
    const body=textSignature(entity?.text);
    const hasMedia=/<(?:img|picture|video|audio|iframe|svg)\b/i.test(String(entity?.text||''));
    if(!title&&!body&&!hasMedia)return false;
    if(!title&&body&&signatures.has(body))return false;
    if(title&&body&&signatures.has(body))return false;
    if(title&&!body&&!hasMedia&&signatures.has(title))return false;
    return true;
  });
}

// A child with no title is a bubble; entering a title turns it into a text card.
// No type selector or additional schema field is required.
export function childPresentation(title=''){
  return String(title??'').trim()?'card':'bubble';
}

// Legacy LOC homepage headers were stored in the first <p> of block_text.
// Never mutate the DB during rendering; avoid rendering that paragraph twice.
export function removeDuplicatedLegacySubtitle(body='',subtitle=''){
  const text=String(body??'');
  const heading=String(subtitle??'');
  if(!heading)return text;
  return text.startsWith(heading)?text.slice(heading.length):text;
}

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

/** Composable home frames, children and feature-page headers share one object. */
export const HomeBlock=Object.freeze({
  limit:HOME_BLOCK_LIMIT,
  rows:homeBlockRows,
  visibleEntities:visibleHomeEntities,
  childPresentation,
  removeDuplicatedLegacySubtitle,
  FEATURE_HERO_PAGE,
  FEATURE_HERO_ORDER,
  FEATURE_HERO_IDS,
  featureHeroFor:sharedFeatureHeroFor,
  shouldUseSharedFeatureHero
});
