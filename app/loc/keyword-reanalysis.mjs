import {classifyKeywordDocumentsByUid} from './model/keyword-uid-analysis.mjs';
import {rebuildKeywordUidLists} from './keyword-tree.mjs';

// Reanalysis only reads Galaxy content. It replaces Group and Item uid_lists,
// even when a deleted keyword now has zero matches. No Galaxy writes.
export async function reanalyzeKeywordClass({
  classUid,treeRows=[],minChars=0,pageSize=1000,readPage,writeNode,finalize,
  onProgress=()=>{}
}={}){
  if(typeof readPage!=='function'||typeof writeNode!=='function'||typeof finalize!=='function')
    throw new TypeError('Article reader, Keywords writer and finalizer are required');
  const results=[],seen=new Set();
  let offset=0,read=0,eligible=0;
  for(;;){
    const page=await readPage({offset,limit:pageSize});
    if(!Array.isArray(page))throw new Error('Galaxy page must be an array');
    if(!page.length)break;
    const docs=page.filter(row=>row?.uid&&row.searchable!==false
      &&Array.from(String(row.content||'').replace(/\s/gu,'')).length>minChars);
    for(const doc of docs){
      if(seen.has(doc.uid))throw new Error('Repeated Galaxy UID');
      seen.add(doc.uid);
    }
    const data=classifyKeywordDocumentsByUid(docs,treeRows,classUid);
    results.push(...data.classifications);
    offset+=page.length;read+=page.length;eligible+=docs.length;
    onProgress({phase:'reading',completed:read,eligible});
    if(page.length<pageSize)break;
  }
  const changed=rebuildKeywordUidLists(treeRows,classUid,results)
    .filter(row=>row.type==='group'||row.type==='item');
  const matched=new Set(),occurrences=changed.filter(row=>row.type==='item')
    .reduce((sum,row)=>sum+row.uid_lists.reduce((count,hit)=>count+hit.times,0),0);
  for(const row of changed.filter(row=>row.type==='group'))
    for(const uid of row.uid_lists){
      if(matched.has(uid))throw new Error('Multiple winning Groups for one article');
      matched.add(uid);
    }
  for(let i=0;i<changed.length;i++){
    const node=changed[i];
    await writeNode({uid:node.uid,type:node.type,uid_lists:node.uid_lists});
    onProgress({phase:'writing',completed:i+1,total:changed.length});
  }
  const statistics={classUid,analyzedDocuments:eligible,matchedDocuments:matched.size,
    itemMatches:changed.filter(row=>row.type==='item')
      .reduce((n,row)=>n+row.uid_lists.length,0),occurrences,
    groupCount:changed.filter(row=>row.type==='group').length,
    itemCount:changed.filter(row=>row.type==='item').length};
  await finalize(statistics);
  onProgress({phase:'completed',completed:eligible,total:eligible});
  return statistics;
}
