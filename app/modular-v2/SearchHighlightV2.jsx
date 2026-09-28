'use client';

function escapeRegExp(value){
  return String(value||'').replace(/[.*+?^\${}()|[\]\\]/g,'\\$&');
}
function termsOf(query){
  const raw=String(query||'').trim();
  if(!raw)return [];
  const pieces=[raw,...raw.split(/\s+/g)].map(item=>item.trim()).filter(Boolean);
  return [...new Set(pieces)].sort((a,b)=>b.length-a.length);
}

export default function SearchHighlightV2({text='',query=''}){
  const source=String(text||'');
  const terms=termsOf(query);
  if(!source||!terms.length)return source;
  const pattern=new RegExp('('+terms.map(escapeRegExp).join('|')+')','giu');
  const parts=source.split(pattern);
  const normalized=new Set(terms.map(term=>term.normalize('NFKC').toLocaleLowerCase('zh-Hant')));
  return parts.map((part,index)=>{
    const key=part.normalize('NFKC').toLocaleLowerCase('zh-Hant');
    return normalized.has(key)
      ?<mark className="scope-v2-search-highlight" key={index}>{part}</mark>
      :part;
  });
}
