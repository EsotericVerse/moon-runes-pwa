/**
 * Copy exact, comma-separated source phrases from the author-supplied Suno
 * Style prompt into Galaxy Media meta_tags. This is extraction, not translation,
 * invented vocabulary, voice classification, or a keyword blacklist.
 * The author may review or append explicit identifiers (LP15-3, LunaRunesMusic).
 */
export function sunoStyleMetaTags(source,{limit=3}={}){
  const original=String(source??'').trim().replace(/^(?:Suno Style|Style)\s*:\s*/iu,'');
  if(!original)return '';
  const seen=new Set();
  const selected=[];
  for(const raw of original.split(/[,，\r\n]+/u)){
    const phrase=raw.trim();
    if(!phrase||/[\u3400-\u9FFF]/u.test(phrase))continue;
    const key=phrase.normalize('NFKC').toLocaleLowerCase();
    if(seen.has(key))continue;
    selected.push(phrase);
    seen.add(key);
    if(selected.length>=limit)break;
  }
  return selected.join(', ');
}

/**
 * Re-extracting a Style must not silently erase explicit album positions or
 * the author's Rune Music classification from an existing Media tag field.
 */
export function refreshSunoStyleMetaTags(source,current=''){
  const extracted=sunoStyleMetaTags(source);
  const explicitIds=String(current??'').split(/[,，]/u)
    .map(value=>value.trim())
    .filter(value=>/^(?:LP[0-9]+(?:-[0-9]+)?|LunaRunesMusic)$/iu.test(value));
  const tags=[...extracted.split(',').map(value=>value.trim()).filter(Boolean),...explicitIds];
  const seen=new Set();
  return tags.filter(value=>{
    const key=value.normalize('NFKC').toLowerCase();
    if(seen.has(key))return false;
    seen.add(key);return true;
  }).join(', ');
}
