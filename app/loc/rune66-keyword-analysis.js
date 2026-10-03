'use client';

import {selectAllNeonRows} from './neon-query';
import {selectManagedScope} from './scope-data';
import {classifyRune66Documents} from './model/rune66-keyword-engine.mjs';

const PERSONAL_STYLE_TABLE='silver.lo3rwang_style';
const RUNE_TABLE='silver.runes';

let analysisPromise=null;

function mediaLinks(value){
  return [...new Set(String(value||'').split(',').map(item=>item.trim()).filter(Boolean))];
}

function buildDocuments(textRows=[],mediaRows=[]){
  const docs=[];
  const byUid=new Map();

  for(const row of textRows){
    const uid=String(row?.uid||'').trim();
    if(!uid)continue;
    const doc={
      key:'galaxy:'+uid,
      uid,
      kind:'galaxy',
      title:String(row?.title||'').trim(),
      content:String(row?.content||''),
      media_metadata_text:''
    };
    docs.push(doc);
    byUid.set(uid,doc);
  }

  for(const row of mediaRows){
    const metadata=[row?.title,row?.meta_tags,row?.media_type].filter(Boolean).join(' ');
    const links=mediaLinks(row?.galaxy_link);
    let attached=false;
    for(const uid of links){
      const doc=byUid.get(uid);
      if(!doc)continue;
      doc.media_metadata_text=[doc.media_metadata_text,metadata].filter(Boolean).join(' ');
      attached=true;
    }
    if(attached)continue;
    const mediaId=String(row?.media_id||'').trim();
    if(!mediaId||!metadata.trim())continue;
    docs.push({
      key:'media:'+mediaId,
      uid:'',
      kind:'media',
      title:String(row?.title||row?.media_type||'').trim(),
      content:'',
      media_metadata_text:metadata
    });
  }
  return docs;
}

async function loadRune66Catalog(){
  const [styleResult,structureResult]=await Promise.all([
    selectAllNeonRows(PERSONAL_STYLE_TABLE,{
      columns:'style_no,node_type,representative_name,parent_group_name,basic_principle,keyword_group,keyword,order_no',
      orders:[{column:'style_no',ascending:true},{column:'order_no',ascending:true}]
    }),
    selectAllNeonRows(RUNE_TABLE,{
      columns:'rune_id,rune_name,group_name',
      filters:[
        {column:'rune_id',operator:'gte',value:1},
        {column:'rune_id',operator:'lte',value:66}
      ],
      orders:[{column:'rune_id',ascending:true}]
    })
  ]);
  return {styleRows:styleResult.rows||[],structureRows:structureResult.rows||[]};
}

async function loadAuthorDocuments(){
  const scope=await selectManagedScope('lo3rwang');
  if(!scope)throw new Error('找不到 lo3rwang Scope');
  const [textResult,mediaResult]=await Promise.all([
    selectAllNeonRows(scope.galaxy,{
      columns:'uid,title,content,searchable',
      filters:[{column:'searchable',operator:'eq',value:true}],
      orders:[{column:'uid',ascending:true}]
    }),
    selectAllNeonRows(scope.galaxyMedia,{
      columns:'media_id,galaxy_link,title,meta_tags,media_type',
      orders:[{column:'media_id',ascending:true}]
    })
  ]);
  return buildDocuments(textResult.rows||[],mediaResult.rows||[]);
}

export async function selectRune66Classification(){
  if(analysisPromise)return analysisPromise;
  analysisPromise=(async()=>{
    const [{styleRows,structureRows},documents]=await Promise.all([
      loadRune66Catalog(),
      loadAuthorDocuments()
    ]);
    return classifyRune66Documents(documents,styleRows,structureRows);
  })().catch(error=>{
    analysisPromise=null;
    throw error;
  });
  return analysisPromise;
}

export function clearRune66ClassificationCache(){
  analysisPromise=null;
}
