'use client';

import {selectAllNeonRows} from './neon-query';
import {selectManagedScope} from './scope-data';
import {classifyRune66Documents} from './model/rune66-keyword-engine.mjs';

const PERSONAL_KEYWORD_TABLE='silver.lo3rwang_keywords';
const RUNE_TABLE='silver.runes';

const analysisPromises=new Map();

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
      date:String(row?.createtime||'').slice(0,10),
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
      date:String(row?.createtime||'').slice(0,10),
      media_metadata_text:metadata
    });
  }
  return docs;
}

async function loadRune66Catalog(){
  const [catalogResult,structureResult]=await Promise.all([
    selectAllNeonRows(PERSONAL_KEYWORD_TABLE,{
      columns:'keyword_id,group_name,item_no,item_name,principle,keywords,order_no',
      filters:[{column:'group_name',operator:'eq',value:'符文66'}],
      orders:[{column:'order_no',ascending:true},{column:'item_no',ascending:true}]
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
  return {catalogRows:catalogResult.rows||[],structureRows:structureResult.rows||[]};
}

async function loadAuthorDocuments({startDate='',endDate=''}={}){
  const scope=await selectManagedScope('lo3rwang');
  if(!scope)throw new Error('找不到 lo3rwang Scope');
  const [textResult,mediaResult]=await Promise.all([
    selectAllNeonRows(scope.galaxy,{
      columns:'uid,title,content,createtime,searchable',
      filters:[
        {column:'searchable',operator:'eq',value:true},
        ...(startDate?[{column:'createtime',operator:'gte',value:startDate}]:[]),
        ...(endDate?[{column:'createtime',operator:'lte',value:endDate+'T23:59:59.999Z'}]:[])
      ],
      orders:[{column:'createtime',ascending:true},{column:'uid',ascending:true}]
    }),
    selectAllNeonRows(scope.galaxyMedia,{
      columns:'media_id,galaxy_link,title,meta_tags,media_type,createtime',
      filters:[
        ...(startDate?[{column:'createtime',operator:'gte',value:startDate}]:[]),
        ...(endDate?[{column:'createtime',operator:'lte',value:endDate+'T23:59:59.999Z'}]:[])
      ],
      orders:[{column:'createtime',ascending:true},{column:'media_id',ascending:true}]
    })
  ]);
  return buildDocuments(textResult.rows||[],mediaResult.rows||[]);
}

export async function selectRune66Classification({startDate='',endDate=''}={}){
  const key=[String(startDate||''),String(endDate||'')].join('|');
  if(analysisPromises.has(key))return analysisPromises.get(key);
  const promise=(async()=>{
    const [{catalogRows,structureRows},documents]=await Promise.all([
      loadRune66Catalog(),
      loadAuthorDocuments({startDate,endDate})
    ]);
    return classifyRune66Documents(documents,catalogRows,structureRows);
  })().catch(error=>{
    analysisPromises.delete(key);
    throw error;
  });
  analysisPromises.set(key,promise);
  return promise;
}

export function clearRune66ClassificationCache(){
  analysisPromises.clear();
}
