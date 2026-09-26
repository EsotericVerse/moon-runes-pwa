export const LANGUAGE_ITEM_KINDS=Object.freeze({TEXT:'text',MEDIA:'media',TIME:'time',KEYWORD:'keyword'});
export {LANGUAGE_4D_FACES as LANGUAGE_SPACE_FACES,language4DFace as languageSpaceFace} from './language-4d-core';

export function languageItem(raw={},fallbackKind='text',index=0){
  const kind=String(raw.kind||fallbackKind);
  const id=String(raw.id||raw.media_id||raw.galaxy_id||raw.entry_id||raw.ranking_key||raw.key||kind+':'+index);
  return {
    id,kind,
    label:String(raw.label||raw.title||raw.display_label||raw.term||id),
    date:String(raw.date||raw.start_date||raw.created_at||raw.created_date||''),
    source:String(raw.source||raw.source_platform||raw.group_label||''),
    text:String(raw.text||raw.content||raw.description||raw.summary||raw.media_metadata_text||raw.meta_tags||''),
    tags:String(raw.tags||raw.style_tags||raw.meta_tags||raw.term||''),
    href:String(raw.href||raw.url||raw.source_ref||''),
    value:Number(raw.value??raw.item_count??raw.rank_value??1)||1,
    relations:Array.isArray(raw.relations)?raw.relations.map(String):[]
  };
}

export function searchResultItems(results=[]){
  return results.map((row,index)=>languageItem({
    id:row.key,label:row.title,date:row.date,source:row.source,text:row.bodyText,
    tags:row.styleTags,href:row.href,
    relations:(row.relatedRelations||[]).map(item=>item.target_id||item.ref_id||item.source_id||item.galaxy_id).filter(Boolean)
  },row.resourceType==='galaxy_media'?'media':'text',index));
}

export function timelineItems(rows=[]){
  return rows.map((row,index)=>languageItem(row,'time',index));
}

export function rankingItems(rows=[],kind='keyword'){
  return rows.map((row,index)=>languageItem({...row,label:row.term,value:row.item_count??row.rank_value},kind,index));
}

export function periodContentItems(rows=[]){
  return rows.map((row,index)=>languageItem(row,row.entry_type==='media_metadata'?'media':'text',index));
}

export function mergeLanguageItems(...groups){
  const map=new Map();
  for(const item of groups.flat())if(item?.id)map.set(item.id,item);
  return [...map.values()];
}

export function filterLanguageItems(items=[],{query='',start='',end='',kinds=[]}={}){
  const q=String(query).normalize('NFKC').toLocaleLowerCase('zh-Hant').replace(/[\s\u3000]+/g,'');
  const startTime=start?Date.parse(start):NaN,endTime=end?Date.parse(end):NaN;
  const kindSet=new Set(kinds);
  return items.filter(item=>{
    if(kindSet.size&&!kindSet.has(item.kind))return false;
    const time=Date.parse(item.date||'');
    if(Number.isFinite(startTime)&&Number.isFinite(time)&&time<startTime)return false;
    if(Number.isFinite(endTime)&&Number.isFinite(time)&&time>endTime)return false;
    if(!q)return true;
    const hay=[item.label,item.text,item.tags,item.source].join(' ').normalize('NFKC').toLocaleLowerCase('zh-Hant').replace(/[\s\u3000]+/g,'');
    return hay.includes(q);
  });
}


export function neonSearchItems(rows=[]){
  return (rows||[]).map((entry,index)=>{
    const row=entry?.row||entry||{};
    const source=entry?.source||row.source||row.source_platform||'';
    const kind=row.media_id?'media':'text';
    const text=Object.values(row).filter(value=>typeof value==='string').join(' ');
    return languageItem({
      id:row.media_id||row.galaxy_id||row.song_id||row.rune_id||row.id||row.entry_key||kind+':search:'+index,
      label:row.title||row.name||row.display_title||row.label||row.rune_name||row.song_id||source||('搜尋結果 '+(index+1)),
      date:row.date||row.created_date||row.created_at||row.updated_at||row.start_date||'',
      source,text,
      tags:[row.style_tags,row.meta_tags,row.category,row.content_type].filter(Boolean).join(' '),
      href:row.url||row.href||row.suno_url||row.source_ref||''
    },kind,index);
  });
}
