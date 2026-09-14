'use client';

import { fetchLocJson, getLocDataIndex } from './data';
import {
  commitLocalDataVersion,
  deleteLocalDataSegment,
  getLocalDataSegment,
  listLocalDataSegments,
  putLocalDataSegment
} from './data-local';

const SYNC_SCHEMA=1;
const MAX_SYNC_SEGMENTS=8;
const MAX_SYNC_BYTES=192*1024*1024;

export const LOC_DATA_SYNC_POLICY=Object.freeze({
  schema:SYNC_SCHEMA,
  maxSegments:MAX_SYNC_SEGMENTS,
  maxBytes:MAX_SYNC_BYTES,
  strategy:'hash-diff'
});

function indexedEntries(index){
  const entries=[];
  for(const [datasetId,dataset] of Object.entries(index?.datasets||{})){
    if(dataset?.manifest?.path)entries.push({dataset:datasetId,entry:dataset.manifest,kind:'manifest'});
    for(const entry of Array.isArray(dataset?.segments)?dataset.segments:[]){
      if(entry?.path)entries.push({dataset:datasetId,entry,kind:'segment'});
    }
  }
  return entries;
}

export async function inspectLocDataSync(){
  const index=await getLocDataIndex();
  const current=await listLocalDataSegments();
  const byPath=new Map(current.map(item=>[item.path,item]));
  const entries=indexedEntries(index);
  const changes=[];
  for(const item of entries){
    const local=byPath.get(item.entry.path);
    if(!local||local.hash!==item.entry.hash){
      changes.push({dataset:item.dataset,path:item.entry.path,hash:item.entry.hash,bytes:Number(item.entry.bytes||0),kind:item.kind,status:local?'changed':'new'});
    }
  }
  const expected=new Set(entries.map(item=>item.entry.path));
  const removals=current.filter(item=>!expected.has(item.path)).map(item=>({dataset:item.dataset||'',path:item.path,status:'removed'}));
  return {
    schema:SYNC_SCHEMA,
    dataVersion:index?.data_version||null,
    changed:changes,
    removed:removals,
    unchanged:Math.max(0,current.length-changes.filter(item=>item.status!=='removed').length-removals.length),
    localSegments:current.length,
    totalSegments:entries.length
  };
}

export async function syncLocData({force=false,maxSegments=MAX_SYNC_SEGMENTS,maxBytes=MAX_SYNC_BYTES}={}){
  const index=await getLocDataIndex();
  const current=await listLocalDataSegments();
  const byPath=new Map(current.map(item=>[item.path,item]));
  const entries=indexedEntries(index);
  const expected=new Set(entries.map(item=>item.entry.path));
  const removals=current.filter(item=>!expected.has(item.path));
  const changes=entries.filter(item=>{
    const local=byPath.get(item.entry.path);
    return force||!local||local.hash!==item.entry.hash;
  });
  const selected=changes.slice(0,maxSegments);
  const bytes=selected.reduce((sum,item)=>sum+Number(item.entry.bytes||0),0);
  if(selected.length>maxSegments)throw new Error(`LOC data sync selected ${selected.length} segments; budget allows ${maxSegments}`);
  if(bytes>maxBytes)throw new Error(`LOC data sync selected ${bytes} bytes; budget allows ${maxBytes}`);
  let updated=0;
  for(const item of selected){
    const data=await fetchLocJson(item.entry.path,{memory:true,maxResponseBytes:Number(item.entry.bytes||0)||undefined});
    await putLocalDataSegment({path:item.entry.path,dataset:item.dataset,hash:item.entry.hash,bytes:item.entry.bytes,data});
    updated+=1;
  }
  for(const item of removals)await deleteLocalDataSegment(item.path);
  const complete=selected.length===changes.length;
  if(complete){
    await commitLocalDataVersion(index?.data_version||null,{schema:SYNC_SCHEMA,segment_count:entries.length});
  }
  return {schema:SYNC_SCHEMA,dataVersion:index?.data_version||null,updated,removed:removals.length,remaining:changes.length-updated,complete};
}
