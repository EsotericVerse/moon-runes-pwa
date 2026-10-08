import {stripLocHomeEditorPlaceholders} from './loc-home-text.mjs';

// Home blocks always have four canonical fields in storage/presentation order:
// eyebrow -> title -> subtitle -> text. Child columns follow in stored array order.
export const HOME_COLUMN_ORDER=Object.freeze(['eyebrow','title','subtitle','text']);

export function orderedHomeFields(slot={}){
  return HOME_COLUMN_ORDER.map(key=>({key,value:String(slot?.[key]||'')}));
}

export function plainHomeContent(value=''){
  return stripLocHomeEditorPlaceholders(value)
    .replace(/<[^>]+>/g,'')
    .replace(/&(?:nbsp|#160|#xA0);/gi,' ')
    .replace(/\uFFFC/g,'')
    .replace(/\s+/g,'')
    .trim();
}

export function visibleHomeChildren(slot={}){
  const canonicalTexts=new Set(orderedHomeFields(slot)
    .map(field=>plainHomeContent(field.value)).filter(Boolean));
  return (Array.isArray(slot?.entities)?slot.entities:[]).filter(entity=>{
    const title=plainHomeContent(entity?.title);
    const text=plainHomeContent(entity?.text);
    // Legacy copies of a canonical main field must not be printed twice.
    if(text&&canonicalTexts.has(text))return false;
    // Keep media-only markup even when there is no readable text.
    const media=/<(?:img|video|audio|iframe|picture|svg)\b/i.test(entity?.text||'');
    if(!text&&!title&&!media)return false;
    if(!text&&title&&canonicalTexts.has(title))return false;
    return true;
  });
}
