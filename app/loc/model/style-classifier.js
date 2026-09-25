import {splitRuneKeywordEntries} from './rune-keyword-rules.js';

const splitTerms=value=>String(value||'').split(/[\n、,，・]/).map(x=>x.trim()).filter(Boolean);
const uniq=values=>[...new Set(values.filter(Boolean))];

export function buildRuneSuggestionRegistry(runes){
  const byGroup=new Map();
  for(const rune of runes||[]){
    const group=String(rune?.['所屬分組']??rune?.group_name??'特殊').trim()||'特殊';
    if(!byGroup.has(group))byGroup.set(group,{keywords:[],nor:[],runes:[]});
    const bucket=byGroup.get(group);
    const positive=splitRuneKeywordEntries(rune?.['正向關鍵詞']??rune?.positive_keywords);
    const negative=splitRuneKeywordEntries(rune?.['反向關鍵詞']??rune?.negative_keywords);
    const keywords=positive.keywords;
    const nor=negative.keywords;
    const rules=[...positive.rules,...negative.rules];
    bucket.keywords.push(...keywords);
    bucket.nor.push(...nor);
    bucket.runes.push({
      id:rune?.rune_number??rune?.['符文編號'],
      name:String(rune?.rune_name??rune?.['符文名稱']??'').trim(),
      keywords,
      nor,
      and:rules.filter(rule=>rule.operator==='AND').map(rule=>rule.keyword),
      ruleNor:rules.filter(rule=>rule.operator==='NOR').map(rule=>rule.keyword)
    });
  }
  return [...byGroup.entries()].map(([name,data])=>({
    name,
    keywords:uniq(data.keywords).slice(0,64),
    nor:uniq(data.nor).slice(0,8),
    runes:data.runes
  }));
}

export function classifyText(text,profile){
  const source=String(text||'');
  const groups=profile?.groups||[];
  const matches=[];
  for(const group of groups){
    if(Array.isArray(group.runes)){
      const groupBlocked=(group.nor||[]).filter(term=>term&&source.includes(term));
      if(groupBlocked.length)continue;
      const runeMatches=group.runes.flatMap(rune=>{
        const blocked=(rune.ruleNor||[]).filter(term=>term&&source.includes(term));
        if(blocked.length)return [];
        const required=rune.and||[];
        if(required.some(term=>term&&!source.includes(term)))return [];
        const hits=(rune.keywords||[]).filter(term=>term&&source.includes(term));
        if(!hits.length&&!required.length)return [];
        return [{id:rune.id,name:rune.name,hits:uniq([...hits,...required])}];
      });
      if(runeMatches.length)matches.push({id:group.id,name:group.name,hits:uniq(runeMatches.flatMap(rune=>rune.hits)),runes:runeMatches});
      continue;
    }
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
