import fs from 'node:fs';
import path from 'node:path';
import {createConfiguredAdapter} from '../app/loc/providers/configured.mjs';

const [inventoryFile,outputDirectory]=process.argv.slice(2);
if(!inventoryFile||!outputDirectory)throw new Error('Usage: node scripts/export-public-db.mjs <current-catalog.json> <private-output-directory>');
const inventory=JSON.parse(fs.readFileSync(inventoryFile,'utf8'));
const client=createConfiguredAdapter().publicClient;
// Discover the live Scope layout, rather than exporting only hard-coded Scopes.
const {data:scopeRows,error:scopeError}=await client.schema('silver').from('manage')
  .select('id,galaxy,time').order('id');
if(scopeError)throw new Error('Scope registry read failed: '+scopeError.message);
if(!Array.isArray(scopeRows))throw new Error('Scope registry missing');
const tables=new Set(['game','lrunes_daily','runes','runes_etc','runes_group']);
for(const row of scopeRows){
  const id=String(row.id||'');
  const galaxy=String(row.galaxy||'galaxy');
  const time=String(row.time||'time');
  if(!/^[a-z][a-z0-9]{0,14}$/.test(id))throw new Error('Invalid Scope ID in live registry');
  for(const name of [galaxy,time])if(!/^[a-z][a-z0-9_]*$/.test(name))throw new Error('Invalid Scope table mapping');
  for(const name of [id,`${id}_${galaxy}`,`${id}_${galaxy}_media`,`${id}_${time}`,`${id}_keywords`])tables.add(name);
}
const retired=new Set(['reply_to','in_reply_to_username','reference_only']);
fs.mkdirSync(outputDirectory,{recursive:true,mode:0o700});
const manifest=[];
for(const table of [...tables].sort()){
  const columns=inventory.columns.filter(row=>row.schema_name==='silver'&&row.relname===table&&!retired.has(row.attname)).sort((a,b)=>a.attnum-b.attnum).map(row=>row.attname);
  if(!columns.length)throw new Error('Current catalog has no columns for '+table);
  const pk=inventory.constraints.find(row=>row.schema_name==='silver'&&row.relname===table&&row.contype==='p');
  const order=pk?.definition.match(/PRIMARY KEY \((.*)\)/)?.[1].split(',').map(value=>value.trim().replace(/^"|"$/g,''));
  if(!order?.length)throw new Error('Stable export needs the actual primary key: '+table);
  const rows=[];
  let expected=null;
  do{
    let query=client.schema('silver').from(table).select(columns.join(','),{count:'exact'});
    for(const column of order)query=query.order(column,{ascending:true});
    const {data,error,count,status}=await query.range(rows.length,rows.length+999);
    if(error||status>=400)throw new Error(table+': '+(error?.message||status));
    if(expected===null)expected=Number(count);
    if(Number(count)!==expected)throw new Error(table+' count changed during export');
    if(!data?.length&&rows.length<expected)throw new Error(table+' export stopped before count was reached');
    rows.push(...(data||[]));
    console.log(JSON.stringify({table,exported:rows.length,expected}));
  }while(rows.length<expected);
  if(rows.length!==expected)throw new Error(table+' export count mismatch');
  fs.writeFileSync(path.join(outputDirectory,table+'.json'),JSON.stringify(rows),{mode:0o600});
  manifest.push({table:'silver.'+table,columns,rows:rows.length,exportedAt:new Date().toISOString()});
  fs.writeFileSync(path.join(outputDirectory,'manifest.json'),JSON.stringify(manifest,null,2),{mode:0o600});
}
console.log('Public canonical export complete. This Data API export is not a transactionally consistent pg_dump snapshot. Private canonical records need an owner export.');
