// U+FFFC is ProseMirror's representation of a leaf/embedded object.
// Convert only orphan placeholder-only paragraphs into actual HTML line breaks from LOC's legacy HTML.
// Never remove the marker inside meaningful text or media markup: it may
// represent an actual inline attachment that needs separate migration.
const placeholderParagraph=/<p\b[^>]*>\s*(?:(?:\uFFFC|&#0*65532;|&#x0*fffc;)\s*)+<\/p>/gi;

export function stripLocHomeEditorPlaceholders(html=''){
  return String(html??'').replace(placeholderParagraph,'<p><br></p>');
}


export const HOME_BLOCK_ENTITY_LIMIT=6;
const UID_ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function createHomeBlockUid(){
  const bytes=new Uint8Array(8);
  globalThis.crypto?.getRandomValues?.(bytes);
  let uid='';
  for(let index=0;index<8;index+=1){
    const value=bytes[index]??Math.floor(Math.random()*UID_ALPHABET.length);
    uid+=UID_ALPHABET[value%UID_ALPHABET.length];
  }
  return uid;
}


export function normalizeHomeBlockEntities(value){
  const rows=Array.isArray(value)?value:[];
  return rows.slice(0,HOME_BLOCK_ENTITY_LIMIT).map((entity,index)=>({
    uid:/^[A-Za-z0-9]{8}$/.test(String(entity?.uid||''))?String(entity.uid):createHomeBlockUid(),
    title:String(entity?.title||''),
    text:String(entity?.text||''),
    ...(entity?.image_mode==='side'?{image_mode:'side'}:{}),
    order:index+1
  }));
}


export const HOME_BLOCK_LIMIT=8;

// VARCHAR headings are plain strings; remove only legacy markup wrappers.
export function plainBlockLine(value=''){
  return String(value??'').replace(/<br\s*\/?\s*>/gi,' ')
    .replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#0*160;|&#x0*a0;/gi,' ')
    .replace(/\s+/g,' ').trim();
}


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

// The Registry stores the one-time assigned Extra Sign key.
// These copyrighted personal-IP presentations are intentionally not generic
// Scope defaults. No email or session is checked during page rendering.
const SIGN_DEFINITIONS=Object.freeze({
  codex:Object.freeze({scopeId:'loc',scopeKind:'group',label:'LOC 圓環中心實心點標誌',text:''}),
  anchor:Object.freeze({scopeId:'lo3rwang',scopeKind:'scope',label:'光之定錨點',text:'光之定錨點'}),
  moon:Object.freeze({scopeId:'lrunes',scopeKind:'scope',label:'玄韻家黃色圓點標誌',text:''})
});

export function heroExtraFor({scopeId='',scopeKind='',extraSign=''}={}){
  const key=String(extraSign||'').trim();
  const definition=SIGN_DEFINITIONS[key];
  if(!definition||definition.scopeId!==scopeId||definition.scopeKind!==scopeKind)return null;
  return {key,...definition};
}

/** Composable home frames, children and feature-page headers share one object. */
export const HomeBlock=Object.freeze({
  entityLimit:HOME_BLOCK_ENTITY_LIMIT,
  createUid:createHomeBlockUid,
  normalizeEntities:normalizeHomeBlockEntities,
  limit:HOME_BLOCK_LIMIT,
  rows:homeBlockRows,
  visibleEntities:visibleHomeEntities,
  stripLocHomeEditorPlaceholders,
  heroExtraFor,
  childPresentation,
  removeDuplicatedLegacySubtitle,
  plainBlockLine,
  FEATURE_HERO_PAGE,
  FEATURE_HERO_ORDER,
  FEATURE_HERO_IDS,
  featureHeroFor:sharedFeatureHeroFor,
  shouldUseSharedFeatureHero
});
