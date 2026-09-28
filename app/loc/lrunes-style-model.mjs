const GROUP_ORDER=Object.freeze(['靈魂','連結','生命','自然','礦物','元素','秩序','無序','特殊']);

function clean(value){
  return String(value??'').trim();
}
function unique(values=[]){
  return [...new Set(values.filter(Boolean))];
}
function parseRuleToken(value){
  const token=clean(value);
  let match=token.match(/^AND\s*(.+)$/i);
  if(match)return {type:'and',value:clean(match[1]),token};
  match=token.match(/^NOR\s*(.+)$/i);
  if(match)return {type:'nor',value:clean(match[1]),token};
  match=token.match(/^TO\s*(.+)$/i);
  if(match)return {type:'to',value:clean(match[1]),token};
  match=token.match(/^(.+?)NAME$/i);
  if(match)return {type:'name',value:clean(match[1]),token};
  return {type:'keyword',value:token,token};
}
function removeAll(text,phrase){
  if(!phrase)return text;
  return String(text).split(phrase).join(' ');
}

export function compileLunaRunesStyleModel(rows=[]){
  const source=Array.isArray(rows)?rows:[];
  const styles=new Map();
  for(const row of source){
    if(row?.node_type!=='style')continue;
    const styleNo=Number(row.style_no);
    styles.set(styleNo,{
      style_no:styleNo,
      rune_name:clean(row.representative_name),
      group_name:clean(row.parent_group_name),
      principle:clean(row.basic_principle),
      order:Number(row.order_no)||styleNo,
      keywords:[],
      rules:[]
    });
  }
  const nameExclusions=[];
  for(const row of source){
    if(row?.node_type!=='keyword')continue;
    const style=styles.get(Number(row.style_no));
    if(!style)continue;
    const parsed=parseRuleToken(row.keyword);
    const item={...parsed,order:Number(row.order_no)||0,keyword_group:clean(row.keyword_group)};
    if(parsed.type==='keyword')style.keywords.push(item);
    else{
      style.rules.push(item);
      if(parsed.type==='name'&&parsed.value)nameExclusions.push(parsed.value);
    }
  }
  const compiled=[...styles.values()].map(style=>({
    ...style,
    keywords:style.keywords.sort((a,b)=>a.order-b.order||a.value.localeCompare(b.value,'zh-Hant')),
    rules:style.rules.sort((a,b)=>a.order-b.order||a.token.localeCompare(b.token,'zh-Hant'))
  })).sort((a,b)=>a.order-b.order||a.style_no-b.style_no);
  const byName=new Map(compiled.map(style=>[style.rune_name,style]));
  const groups=GROUP_ORDER.map((name,index)=>({
    name,
    order:index,
    runes:compiled.filter(style=>style.group_name===name)
  })).filter(group=>group.runes.length);
  return {styles:compiled,groups,byName,nameExclusions:unique(nameExclusions)};
}

function addHit(target,style,reason,matchedText){
  if(!style)return;
  const key=String(style.style_no);
  const current=target.get(key)||{
    style_no:style.style_no,
    rune_name:style.rune_name,
    group_name:style.group_name,
    reasons:[],
    hit_count:0
  };
  const reasonKey=reason+'\u0000'+matchedText;
  if(!current.reasons.some(item=>item.key===reasonKey)){
    current.reasons.push({key:reasonKey,reason,matched_text:matchedText});
    current.hit_count+=1;
  }
  target.set(key,current);
}

export function classifyLunaRunesStyleText(value,model){
  const text=String(value??'');
  if(!text.trim()||!model?.styles?.length)return {hits:[],groups:[],excluded_names:[],unmatched:true};
  let sanitized=text;
  const excludedNames=[];
  for(const phrase of model.nameExclusions||[]){
    if(phrase&&sanitized.includes(phrase)){
      excludedNames.push(phrase);
      sanitized=removeAll(sanitized,phrase);
    }
  }

  const hits=new Map();
  for(const style of model.styles){
    let residual=sanitized;

    // Explicit keyword entries always run before fallback rules.
    for(const entry of style.keywords){
      if(!entry.value||!residual.includes(entry.value))continue;
      addHit(hits,style,'keyword',entry.value);
      residual=removeAll(residual,entry.value);
    }

    let pendingNor='';
    for(const rule of style.rules){
      if(rule.type==='name')continue;
      if(rule.type==='and'){
        if(rule.value&&residual.includes(rule.value))addHit(hits,style,'AND',rule.value);
        continue;
      }
      if(rule.type==='nor'){
        pendingNor=rule.value;
        continue;
      }
      if(rule.type==='to'){
        if(!pendingNor||!residual.includes(pendingNor))continue;
        const target=model.byName.get(rule.value);
        if(target)addHit(hits,target,'TO',pendingNor+'→'+rule.value);
        residual=removeAll(residual,pendingNor);
        pendingNor='';
      }
    }
  }

  const hitList=[...hits.values()].sort((a,b)=>b.hit_count-a.hit_count||a.style_no-b.style_no);
  const groupMap=new Map();
  for(const hit of hitList){
    const current=groupMap.get(hit.group_name)||{group_name:hit.group_name,hit_count:0,runes:[]};
    current.hit_count+=hit.hit_count;
    current.runes.push(hit.rune_name);
    groupMap.set(hit.group_name,current);
  }
  const groups=GROUP_ORDER.map(name=>groupMap.get(name)).filter(Boolean);
  return {
    hits:hitList,
    groups,
    excluded_names:excludedNames,
    unmatched:hitList.length===0
  };
}

export function lunaRunesStyleGroupOrder(){
  return GROUP_ORDER;
}
