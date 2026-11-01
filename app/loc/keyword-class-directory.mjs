// Keywords live in one UID tree. A Class belongs to the Category whose lists
// contains its UID; item names and unrelated categories never become filter keys.
export function keywordClassDirectory(shared=[],authorizedRows=[],scopeId=''){
  const classes=new Map((Array.isArray(shared)?shared:[])
    .filter(row=>row?.classUid)
    .map(row=>[String(row.classUid),{...row,categoryName:''}]));
  const rows=Array.isArray(authorizedRows)?authorizedRows:[];
  const categoryOf=new Map(rows.filter(row=>row?.type==='category').flatMap(row=>
    (Array.isArray(row.lists)?row.lists:[]).map(uid=>[String(uid),String(row.name||'')])));
  for(const row of rows.filter(row=>row?.type==='class')){
    const uid=String(row.uid||'');
    if(!uid)continue;
    classes.set(uid,{...classes.get(uid),scopeId,classUid:uid,
      name:String(row.name||uid),categoryName:categoryOf.get(uid)||''});
  }
  for(const [uid,row] of classes){
    if(!row.categoryName&&categoryOf.has(uid))
      classes.set(uid,{...row,categoryName:categoryOf.get(uid)});
  }
  return [...classes.values()].sort((a,b)=>
    String(a.categoryName||'').localeCompare(String(b.categoryName||''),'zh-Hant')
    ||String(a.name||'').localeCompare(String(b.name||''),'zh-Hant'));
}
