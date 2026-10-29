import {classifyKeywordDocuments} from './keyword-engine.mjs';
import {keywordClassCatalog} from '../keyword-tree.mjs';

// Keep scoring rules unchanged; ephemeral ordinals only index one analysis call.
// All externally visible references are four-character Item UIDs.
export function classifyKeywordDocumentsByUid(documents=[],treeRows=[],classUid=''){
  const {catalog}=keywordClassCatalog(treeRows,classUid);
  const slot=new Map(catalog.map((item,i)=>[i+1,item.uid]));
  const temp=catalog.map((item,i)=>({
    item_no:i+1,item_name:item.item_name,class_group:item.class_group,
    keywords:item.keywords,order_no:item.order_no,class_enable:true,match_item_name:false
  }));
  const outcome=classifyKeywordDocuments(documents,temp);
  return {...outcome,classifications:(outcome.classifications||[]).map(row=>({
    uid:row.uid,status:row.status,classification_group:row.classification_group,
    hits:(row.rune_counts||[]).map(hit=>({uid:slot.get(hit.rune_id),times:hit.count}))
  }))};
}
