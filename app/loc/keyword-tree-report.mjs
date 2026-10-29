import {indexKeywordTree} from './keyword-tree.mjs';

// One parser for Culture, Statistics and Trace. Category/Class reference child
// UIDs; Group stores its final article UID set; Item stores {uid,times} hits.
export function keywordTreeCatalog(rows,classUid){
  const tree=indexKeywordTree(rows),root=tree.index.get(classUid);
  if(!root||root.type!=='class')throw new Error('Unknown Class UID');
  const groups=root.lists.map(uid=>{
    const node=tree.index.get(uid);
    return {uid:node.uid,name:node.name,desc:node.desc,
      items:node.lists.map(childUid=>{
        const item=tree.index.get(childUid);
        return {uid:item.uid,name:item.name,desc:item.desc,
          keywords:[...item.lists],uid_lists:item.uid_lists};
      }),
      uid_lists:node.uid_lists};
  });
  return {uid:root.uid,name:root.name,groups};
}
export function keywordTreeMetrics(rows,classUid,{articleUids=null}={}){
  const catalog=keywordTreeCatalog(rows,classUid);
  const selected=articleUids==null?null:new Set(articleUids);
  if(selected)for(const uid of selected)
    if(typeof uid!=='string'||!/^[A-Za-z0-9]{8}$/.test(uid))
      throw new Error('Invalid Galaxy article UID');
  const matching=uid=>!selected||selected.has(uid);
  const byArticle=new Map(),groups=[],items=[];
  for(const group of catalog.groups){
    const members=group.uid_lists.filter(matching);
    for(const uid of members){
      if(byArticle.has(uid))throw new Error('Article belongs to multiple Groups');
      byArticle.set(uid,group.uid);
    }
    let itemMatches=0,occurrences=0;
    for(const item of group.items){
      const hits=item.uid_lists.filter(hit=>matching(hit.uid));
      const count=hits.reduce((sum,hit)=>sum+hit.times,0);
      itemMatches+=hits.length;occurrences+=count;
      items.push({uid:item.uid,name:item.name,group_uid:group.uid,group_name:group.name,
        document_count:hits.length,hit_count:count});
    }
    groups.push({uid:group.uid,name:group.name,description:group.desc,
      document_count:members.length,item_matches:itemMatches,hit_count:occurrences});
  }
  return {class_uid:catalog.uid,class_name:catalog.name,
    document_count:byArticle.size,groups,items,byArticle};
}
export function keywordTreeGroupForArticle(rows,classUid,articleUid){
  return keywordTreeMetrics(rows,classUid,{articleUids:[articleUid]}).groups.find(
    group=>keywordTreeMetrics(rows,classUid,{articleUids:[articleUid]}).byArticle.get(articleUid)===group.uid
  )||null;
}
