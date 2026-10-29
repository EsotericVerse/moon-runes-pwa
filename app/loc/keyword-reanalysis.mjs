import {classifyKeywordDocumentsById} from './model/keyword-id-analysis.mjs';
import {buildKeywordUidlistRows} from './keyword-uidlist.mjs';

// A complete reanalysis deliberately ignores every old Galaxy classification.
// It reads article bodies only and replaces every Item's uidlist, including
// Items whose keywords now match nothing. No Galaxy write is ever performed.
export async function reanalyzeKeywordClass({
  classUid,catalogRows=[],defaultKeywordId='',minChars=0,pageSize=1000,
  readPage,writeItem,finalize,onProgress=()=>{}
}={}){
  if(typeof readPage!=='function'||typeof writeItem!=='function'||typeof finalize!=='function')
    throw new TypeError('Reading, writing and finalization callbacks are required');
  const ordered=[...catalogRows].sort((a,b)=>
    Number(a.order_no??0)-Number(b.order_no??0)
    ||String(a.keyword_id).localeCompare(String(b.keyword_id)));
  if(!ordered.length)throw new Error('Cannot classify without Keywords Items');
  if(!ordered.every(item=>item.class_enable!==false)){
    // Disabled entries are persisted with empty uidlist but do not match.
  }
  const catalog=ordered.filter(row=>row.class_enable!==false);
  const hits=[],seen=new Set();
  let offset=0,articles=0,eligible=0;
  for(;;){
    const page=await readPage({offset,limit:pageSize});
    if(!Array.isArray(page))throw new TypeError('Article page must be an array');
    if(!page.length)break;
    const documents=page.filter(row=>{
      if(!row?.uid||row.searchable===false)return false;
      return Array.from(String(row.content||'').replace(/\s/gu,'')).length>minChars;
    });
    for(const row of documents){
      if(seen.has(row.uid))throw new Error('Duplicate Galaxy article UID during reanalysis');
      seen.add(row.uid);
    }
    const output=classifyKeywordDocumentsById(documents,catalog);
    hits.push(...output.classifications);
    articles+=page.length;
    eligible+=documents.length;
    offset+=page.length;
    onProgress({phase:'reading',completed:articles,eligible});
    if(page.length<pageSize)break;
  }
  const fallback=String(defaultKeywordId||'');
  if(fallback){
    if(!ordered.some(item=>String(item.keyword_id)===fallback&&item.class_enable!==false))
      throw new Error('Default Keyword Item is not in the enabled Class');
    for(const result of hits)if(!result.hits.length)
      result.hits=[{keyword_id:fallback,times:0}];
  }
  const rows=buildKeywordUidlistRows({classUid,catalogRows:ordered,classifications:hits});
  const matched=new Set();
  let occurrences=0;
  for(const row of rows)for(const hit of row.uidlist){
    matched.add(hit.uid);
    occurrences+=hit.times;
  }
  // A write error leaves the prior analysis anchor invalid. The caller must
  // mark the analysis stale BEFORE entering this function.
  for(let index=0;index<rows.length;index++){
    const item=rows[index];
    await writeItem({
      classUid:item.class_uid,
      keywordId:item.keyword_id,
      uidlist:item.uidlist
    });
    onProgress({phase:'writing',completed:index+1,total:rows.length});
  }
  await finalize({classUid,analyzedDocuments:eligible,matchedDocuments:matched.size,
    itemMatches:rows.reduce((n,item)=>n+item.uidlist.length,0),occurrences});
  onProgress({phase:'completed',completed:eligible,total:eligible});
  return {classUid,analyzedDocuments:eligible,matchedDocuments:matched.size,
    itemMatches:rows.reduce((n,item)=>n+item.uidlist.length,0),occurrences};
}
