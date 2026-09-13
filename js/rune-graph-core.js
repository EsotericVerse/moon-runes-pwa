const GROUPS=['靈魂','連結','生命','自然','礦物','元素','秩序','無序','特殊'];
const DEFAULT_GROUP='特殊';
const GROUP_SET=new Set(GROUPS);
const REVIEWED_STATUSES=new Set(['author_confirmed','confirmed','canonical']);
const splitTerms=value=>String(value||'').split(/[、,，;；/]/).map(x=>x.trim()).filter(Boolean);
const nodeId=(type,label)=>`${type}:${label}`;

function addNode(map,node){if(node?.id)map.set(node.id,{...(map.get(node.id)||{}),...node});}
function addEdge(map,edge){if(!edge?.source||!edge?.target||!edge?.type)return;const key=[edge.source,edge.type,edge.target,edge.source_type||''].join('|');if(!map.has(key))map.set(key,edge);}

function parseOwnershipRules(raw,runeNames){
  const out=[];
  for(const chunk of String(raw||'').split(/[、,，;；]/).map(x=>x.trim()).filter(Boolean)){
    const match=chunk.match(/^(.+?)(屬|歸)(.+?)$/);
    if(!match)continue;
    const source=match[1].trim(),target=match[3].trim();
    if(source&&target)out.push({source,target,targetRune:runeNames.has(target)?target:null,raw:chunk});
  }
  return out;
}

function registryNodeType(record={}){
  const domain=String(record.domain||'').toLowerCase();
  const content=String(record.content_type||record.source_type||'').toLowerCase();
  if(domain==='music'||content.includes('lyrics')||content.includes('song')||content.includes('suno'))return 'music_work';
  if(domain==='literary'||['novel','article','essay','journal','writing_work'].includes(content))return 'literary_work';
  if(domain==='media'||content.includes('reel')||content.includes('video')||content.includes('image'))return 'media';
  return 'knowledge_asset';
}
function registryNodeId(record={}){
  const type=registryNodeType(record);
  const key=record.title||record.canonical_key||record.work_id||record.work_ref||record.media_id||record.id;
  return key?nodeId(type,String(key)):'';
}
function registryRelationType(value){
  const type=String(value||'');
  if(type==='song_to_article_expansion')return 'expanded_to';
  if(type==='cross_media_adaptation')return 'adapted_to';
  if(['article_to_theme_song','novel_to_character_song','novel_to_op','scene_to_song'].includes(type))return 'work_theme';
  return 'related_to';
}
function addReviewedRegistryGraph(nodes,edges,registries={}){
  const relationships=registries.relationships||{};
  for(const relation of relationships.relationships||[]){
    const status=String(relation?.evidence_status||'');
    if(!REVIEWED_STATUSES.has(status))continue;
    const sid=registryNodeId(relation.source);if(!sid)continue;
    addNode(nodes,{id:sid,label:relation.source?.title||relation.source?.work_ref,type:registryNodeType(relation.source),source_type:'registry',review_status:status});
    for(const target of relation.targets||[]){
      const tid=registryNodeId(target);if(!tid)continue;
      addNode(nodes,{id:tid,label:target.title||target.work_ref,type:registryNodeType(target),definition:target.relation_label||'',source_type:'registry',review_status:status});
      addEdge(edges,{source:sid,target:tid,type:registryRelationType(relation.relation_type),source_type:'registry',registry:'人工審核關係名冊',evidence_kind:'explicit_registry_relation',evidence_status:status,source_ref:relation.relationship_id,evidence:relation.relation_summary||target.relation_label||''});
    }
  }
}

export function buildRuneGraph(runes,derivedEntries=[],registries={}){
  const nodes=new Map(),edges=new Map();
  const runeNames=new Set((runes||[]).map(row=>String(row?.符文名稱||'').trim()).filter(Boolean));
  const runeGroup=new Map();
  GROUPS.forEach(group=>addNode(nodes,{id:nodeId('group',group),label:group,type:'group',group}));

  for(const rune of runes||[]){
    const name=String(rune?.符文名稱||'').trim();
    if(!name||Number(rune?.編號)===0)continue;
    const rawGroup=String(rune?.所屬分組||'').trim();
    const group=GROUP_SET.has(rawGroup)?rawGroup:DEFAULT_GROUP;
    runeGroup.set(name,group);
    const rid=nodeId('rune',name);
    addNode(nodes,{id:rid,label:name,type:'rune',group,number:Number(rune?.編號)||null,english:String(rune?.英文||''),definition:String(rune?.符文說明||''),polarity:String(rune?.卡片屬性||'')});
    addEdge(edges,{source:rid,target:nodeId('group',group),type:'belongs_to_group',source_type:'registry'});
    for(const term of splitTerms(rune?.正向關鍵詞)){const tid=nodeId('term',term);addNode(nodes,{id:tid,label:term,type:'term',group});addEdge(edges,{source:tid,target:rid,type:'keyword_of',source_type:'keyword'});}
    for(const term of splitTerms(rune?.反向關鍵詞)){const tid=nodeId('term',term);addNode(nodes,{id:tid,label:term,type:'term',group});addEdge(edges,{source:tid,target:rid,type:'reverse_keyword_of',source_type:'keyword'});}
    for(const rule of parseOwnershipRules(rune?.額外規則,runeNames)){
      const sid=nodeId('term',rule.source);addNode(nodes,{id:sid,label:rule.source,type:'term',group:DEFAULT_GROUP});
      const targetId=rule.targetRune?nodeId('rune',rule.targetRune):nodeId('term',rule.target);
      addNode(nodes,{id:targetId,label:rule.target,type:rule.targetRune?'rune':'term',group:rule.targetRune?(runeGroup.get(rule.targetRune)||DEFAULT_GROUP):DEFAULT_GROUP});
      addEdge(edges,{source:sid,target:targetId,type:'ownership',evidence:rule.raw,source_type:'registry'});
    }
  }

  for(const entry of derivedEntries||[]){
    const term=String(entry?.term||'').trim();if(!term)continue;
    const tid=nodeId('derived',term),owner=String(entry?.resolved_rune||'').trim(),ownerGroup=owner?(runeGroup.get(owner)||DEFAULT_GROUP):DEFAULT_GROUP;
    addNode(nodes,{id:tid,label:term,type:'derived',group:ownerGroup,term_status:String(entry?.status||'special'),relation:String(entry?.relation||'derived'),resolved_rune:owner,definition:String(entry?.note||entry?.evidence||'')});
    if(owner&&runeNames.has(owner))addEdge(edges,{source:tid,target:nodeId('rune',owner),type:'resolved_to',source_type:'registry'});
    else addEdge(edges,{source:tid,target:nodeId('group',DEFAULT_GROUP),type:'remains_special',source_type:'registry'});
  }

  addReviewedRegistryGraph(nodes,edges,registries);
  return {groups:GROUPS,defaultGroup:DEFAULT_GROUP,nodes:[...nodes.values()],edges:[...edges.values()]};
}

export function searchRuneGraph(graph,query='',group=''){
  const q=String(query||'').trim().toLowerCase();
  let nodes=(graph?.nodes||[]).filter(node=>!q||[node.label,node.english,node.definition,node.group,node.polarity,node.relation,node.term_status,node.resolved_rune,node.period,node.content_type,node.source_type,node.review_status].filter(Boolean).join(' ').toLowerCase().includes(q));
  if(group)nodes=nodes.filter(node=>node.group===group||node.label===group);
  const ids=new Set(nodes.map(node=>node.id));
  const edges=(graph?.edges||[]).filter(edge=>ids.has(edge.source)||ids.has(edge.target));
  edges.forEach(edge=>{ids.add(edge.source);ids.add(edge.target)});
  return {nodes:(graph?.nodes||[]).filter(node=>ids.has(node.id)),edges};
}
