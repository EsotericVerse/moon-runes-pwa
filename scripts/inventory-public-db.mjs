import {createConfiguredAdapter} from '../app/loc/providers/configured.mjs';
const client=createConfiguredAdapter().publicClient;
const {data,error}=await client.schema('silver').from('manage').select('id,galaxy,time').order('id');
if(error)throw error;
const tables=new Set(['manage','runes','runes_etc','runes_group','game','lrunes_daily','lo3rwang_keywords']);
for(const row of data){
  if(!/^[a-z][a-z0-9]*$/.test(row.id))throw new Error('Invalid Scope ID');
  const galaxy=row.galaxy||'galaxy',time=row.time||'time';
  if(!/^[a-z][a-z0-9_]*$/.test(galaxy)||!/^[a-z][a-z0-9_]*$/.test(time))throw new Error('Invalid Scope mapping');
  for(const table of [row.id,row.id+'_'+galaxy,row.id+'_'+galaxy+'_media',row.id+'_'+time])tables.add(table);
}
const inventory=[];
for(const table of [...tables].sort()){
  const query=client.schema('silver').from(table);
  const result=table==='manage'
    ?await query.select('id',{count:'exact',head:true})
    :await query.select('item_count:count()').limit(1);
  const {data,error,status}=result;
  const count=table==='manage'?result.count:Number(data?.[0]?.item_count||0);
  const entry={table:'silver.'+table,count:error||status>=400?null:count,status,error:error?.message||(status>=400?'HTTP '+status:null)};
  inventory.push(entry);console.log(JSON.stringify(entry));
}
if(inventory.some(row=>row.error))process.exitCode=1;
