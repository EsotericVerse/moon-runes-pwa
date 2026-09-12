const splitTerms=value=>String(value||'').split(/[\n、,，・]/).map(x=>x.trim()).filter(Boolean);
const uniq=values=>[...new Set(values.filter(Boolean))];

export function buildRuneSuggestionRegistry(runes){
  const byGroup=new Map();
  for(const rune of runes||[]){
    const group=String(rune?.['所屬分組']||'特殊').trim();
    if(!byGroup.has(group))byGroup.set(group,{keywords:[],nor:[]});
    const bucket=byGroup.get(group);
    bucket.keywords.push(...splitTerms(rune?.['正向關鍵詞']));
    bucket.nor.push(...splitTerms(rune?.['反向關鍵詞']));
  }
  return [...byGroup.entries()].map(([name,data])=>({
    name,
    keywords:uniq(data.keywords).slice(0,64),
    nor:uniq(data.nor).slice(0,8)
  }));
}

export function classifyText(text,profile){
  const source=String(text||'');
  const groups=profile?.groups||[];
  const matches=[];
  for(const group of groups){
    const blocked=(group.nor||[]).filter(term=>term&&source.includes(term));
    if(blocked.length)continue;
    const hits=(group.keywords||[]).filter(term=>term&&source.includes(term));
    if(hits.length)matches.push({id:group.id,name:group.name,hits});
  }
  if(matches.length)return {matches,fallback:false};
  const fallback=profile?.fallback||{id:'special',name:'特殊'};
  return {matches:[{id:fallback.id,name:fallback.name,hits:[]}],fallback:true};
}

export async function classifyRecords(records,profile,{getText=item=>item?.text||'',onProgress,batchSize=250}={}){
  const list=Array.isArray(records)?records:[];
  const output=[];
  for(let start=0;start<list.length;start+=batchSize){
    const batch=list.slice(start,start+batchSize);
    for(const item of batch)output.push({...item,classification:classifyText(getText(item),profile)});
    const processed=Math.min(start+batch.length,list.length);
    onProgress?.({processed,total:list.length,percent:list.length?Math.round(processed/list.length*100):100});
    await new Promise(resolve=>setTimeout(resolve,0));
  }
  return output;
}
