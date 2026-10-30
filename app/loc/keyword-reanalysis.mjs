import {classifyKeywordDocumentsByUid,createKeywordUidGroupResolver} from './model/keyword-uid-analysis.mjs';
import {keywordClassCatalog,indexKeywordTree} from './keyword-tree.mjs';

const ARTICLE_UID=/^[A-Za-z0-9]{8}$/;

// Aggregate one page at a time. Memory scales with the actual stored Keyword
// hits, never with a second full copy of per-article classification records.
export async function reanalyzeKeywordClass({
  classUid,treeRows=[],minChars=0,pageSize=200,expectedCount=null,readPage,writeNode,finalize,
  onProgress=()=>{}
}={}){
  if(typeof readPage!=='function'||typeof writeNode!=='function'||typeof finalize!=='function')
    throw new TypeError('Article reader, Keywords writer and finalizer are required');
  if(!Number.isSafeInteger(pageSize)||pageSize<1)
    throw new TypeError('pageSize must be a positive integer');
  const tree=indexKeywordTree(treeRows);
  const root=tree.index.get(classUid);
  if(!root||root.type!=='class')throw new Error('Unknown Class UID');
  const {catalog}=keywordClassCatalog(treeRows,classUid);
  const itemResults=new Map(catalog.map(item=>[item.uid,new Map()]));
  const groupResults=new Map(root.lists.map(uid=>[uid,new Set()]));
  const resolver=createKeywordUidGroupResolver(treeRows,classUid);
  const seen=new Set();
  let offset=0,read=0,eligible=0,occurrences=0,itemMatches=0;
  for(;;){
    const page=await readPage({offset,limit:pageSize});
    if(!Array.isArray(page))throw new Error('Galaxy page must be an array');
    if(page.length>pageSize)throw new Error('Galaxy page exceeded requested limit');
    if(!page.length)break;
    const docs=page.filter(row=>row?.uid&&row.searchable!==false&&
      Array.from(String(row.content||'').replace(/\s/gu,'')).length>minChars);
    for(const doc of docs){
      if(!ARTICLE_UID.test(doc.uid)||seen.has(doc.uid))
        throw new Error('Invalid or duplicate Galaxy UID');
      seen.add(doc.uid);
    }
    const data=classifyKeywordDocumentsByUid(docs,treeRows,classUid);
    for(const result of data.classifications||[]){
      if(!ARTICLE_UID.test(result.uid)||!seen.has(result.uid))
        throw new Error('Classifier returned an unknown Galaxy UID');
      const itemSeen=new Set();
      for(const hit of result.hits||[]){
        const output=itemResults.get(hit.uid);
        if(!output||itemSeen.has(hit.uid)||!Number.isSafeInteger(hit.times)||hit.times<0)
          throw new Error('Invalid Keyword Item hit');
        output.set(result.uid,hit.times);
        itemSeen.add(hit.uid);
        occurrences+=hit.times;
        itemMatches++;
        if(!Number.isSafeInteger(occurrences))throw new Error('Keyword hit total overflow');
      }
      // Stateful resolution must run in article/page order, not afterwards:
      // equal-scoring articles are distributed to the least populated Group.
      const groupUid=resolver.resolve(result);
      if(groupUid)groupResults.get(groupUid).add(result.uid);
    }
    offset+=page.length;read+=page.length;eligible+=docs.length;
    onProgress({phase:'reading',completed:read,eligible});
    // A backend may cap returned rows below the requested LIMIT (for example,
    // PostgREST max_rows). A short page is NOT end-of-data: stop only after an
    // empty page, with the Galaxy reader advancing its UID cursor each time.
  }
  // COUNT was read before the scan. If concurrent Galaxy changes or a
  // backend row cap make the number diverge, fail BEFORE writing UID lists.
  if(expectedCount!==null){
    if(!Number.isSafeInteger(expectedCount)||expectedCount<0)
      throw new TypeError('Expected Galaxy count must be a nonnegative integer');
    if(read!==expectedCount)
      throw new Error('Galaxy 分頁筆數不一致（預期 '+expectedCount+'，實際 '+read+'）；未寫入分析結果，請在資料穩定後重試');
  }
  const changes=[
    ...root.lists.map(uid=>({
      uid,type:'group',uid_lists:[...groupResults.get(uid)].sort()
    })),
    ...catalog.map(item=>({
      uid:item.uid,type:'item',
      uid_lists:[...itemResults.get(item.uid)].sort(([a],[b])=>a.localeCompare(b))
        .map(([uid,times])=>({uid,times}))
    }))
  ];
  const matched=new Set();
  for(const group of changes.filter(row=>row.type==='group'))
    for(const uid of group.uid_lists){
      if(matched.has(uid))throw new Error('Multiple winning Groups for one article');
      matched.add(uid);
    }
  for(let i=0;i<changes.length;i++){
    const node=changes[i];
    await writeNode(node);
    onProgress({phase:'writing',completed:i+1,total:changes.length});
  }
  const stats={classUid,analyzedDocuments:eligible,matchedDocuments:matched.size,
    itemMatches,occurrences,groupCount:root.lists.length,itemCount:catalog.length};
  await finalize(stats);
  onProgress({phase:'completed',completed:eligible,total:eligible});
  return stats;
}
