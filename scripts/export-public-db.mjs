import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
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
const catalogTables=new Set(inventory.relations.filter(row=>row.schema_name==='silver'&&row.relkind==='r').map(row=>row.relname));
const tables=new Set(['manage','game','lrunes_daily','runes','runes_etc','runes_group','keyword_classes','loc_theme','loc_blocks','scope_registry','scope_group_source_sharing','scope_other_sources','scope_source_subcategories','statistics_source_aliases','statistics_source_categories'].filter(table=>catalogTables.has(table)));
for(const row of scopeRows){
  const id=String(row.id||'');
  const galaxy=String(row.galaxy||'galaxy');
  const time=String(row.time||'time');
  if(!/^[a-z][a-z0-9]{0,14}$/.test(id))throw new Error('Invalid Scope ID in live registry');
  for(const name of [galaxy,time])if(!/^[a-z][a-z0-9_]*$/.test(name))throw new Error('Invalid Scope table mapping');
  if(!catalogTables.has(id))throw new Error('Scope config table missing from catalog: '+id);
  for(const name of [id,`${id}_${galaxy}`,`${id}_${galaxy}_media`,`${id}_${time}`,`${id}_keywords`,`${id}_blocks`])if(catalogTables.has(name))tables.add(name);
}
const retired=new Set(['reply_to','in_reply_to_username','reference_only']);
fs.mkdirSync(outputDirectory,{recursive:true,mode:0o700});
const manifest=[];
const partialFile=path.join(outputDirectory,'manifest.partial.json');
fs.rmSync(path.join(outputDirectory,'manifest.json'),{force:true});
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
  const snapshot=JSON.stringify(rows);
  fs.writeFileSync(path.join(outputDirectory,table+'.json'),snapshot,{mode:0o600});
  const related=inventory.constraints.filter(x=>x.schema_name==='silver'&&x.relname===table&&x.contype==='f')
    .map(x=>x.definition.match(/REFERENCES\\s+(?:\\\"?silver\\\"?\\.)?\\\"?([a-z][a-z0-9_]*)\\\"?/i)?.[1])
    .filter(name=>name&&name!==table&&tables.has(name));
  manifest.push({table:'silver.'+table,columns,primaryKey:order,dependsOn:[...new Set(related)].map(name=>'silver.'+name),rows:rows.length,sha256:createHash('sha256').update(snapshot).digest('hex'),exportedAt:new Date().toISOString()});
  fs.writeFileSync(partialFile,JSON.stringify(manifest,null,2),{mode:0o600});
}
fs.renameSync(partialFile,path.join(outputDirectory,'manifest.json'));
console.log('Public canonical export complete. This Data API export is not a transactionally consistent pg_dump snapshot. Private canonical records need an owner export.');
