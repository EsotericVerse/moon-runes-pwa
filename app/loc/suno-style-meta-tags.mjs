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
