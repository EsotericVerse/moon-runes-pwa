// Only call when creating new content. The unified store has one PRIMARY KEY
// across Time/Trace/Keywords/Media, even though feature lists remain kind-filtered.
export async function readUnifiedAnchorUids(table,reader,{pageSize=1000}={}){
  if(!/^silver\.lo3rwang_(?:time|anchor)$/.test(String(table||'')))return [];
  const rows=[];
  for(let offset=0;;offset+=pageSize){
    const page=await reader('silver.lo3rwang_anchor',offset,pageSize);
    if(!Array.isArray(page))throw Error('Cannot validate shared anchor UID pool');
    rows.push(...page.map(item=>({uid:String(item.uid||'')})));
    if(page.length<pageSize)break;
  }
  return rows;
}
