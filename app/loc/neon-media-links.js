'use client';

import {selectNeonRows} from './neon-repository';

// A canonical media table is not confirmed yet. Keep this boundary
// link-only and read only from tables whose link columns are already governed.
// When silver.system_table_catalog registers the media table, only this module
// needs to change; the view must not fall back to JSON or a guessed relation.
const LINK_SOURCES=Object.freeze({
  culture:'api.loc_culture_entries',
  songs:'silver.song_versions'
});

function externalUrl(value){
  const raw=String(value??'').trim();
  if(!raw)return '';
  try{
    const url=new URL(raw);
    return ['http:','https:'].includes(url.protocol)?url.href:'';
  }catch{return '';}
}

function text(value){return value==null?'':String(value).trim();}

function cultureLinks(rows){
  return (rows||[]).map(row=>{
    const href=externalUrl(row.url);
    if(!href)return null;
    const id=text(row.entry_key)||href;
    return {link_id:`culture:${id}`,label:text(row.title)||id,href,kind:'culture',source:text(row.source_ref)||text(row.entry_type)||'LOC culture',scope_id:text(row.scope_id)};
  }).filter(Boolean);
}

function songLinks(rows){
  return (rows||[]).map(row=>{
    const href=externalUrl(row.suno_url);
    if(!href)return null;
    const id=text(row.song_id)||href;
    return {link_id:`song:${id}`,label:text(row.title)||id,href,kind:'song',source:'Suno',scope_id:'loc'};
  }).filter(Boolean);
}

function dedupe(rows){
  const seen=new Set();
  return rows.filter(row=>{
    const key=`${row.href}|${row.label}`;
    if(seen.has(key))return false;
    seen.add(key);
    return true;
  }).sort((a,b)=>a.label.localeCompare(b.label,'zh-Hant')||a.href.localeCompare(b.href));
}

export async function selectMediaLinks(){
  const results=await Promise.all([
    selectNeonRows(LINK_SOURCES.culture,{columns:'entry_key,title,url,source_ref,entry_type,scope_id',limit:5000}),
    selectNeonRows(LINK_SOURCES.songs,{columns:'song_id,title,suno_url',limit:5000})
  ].map(promise=>promise.then(result=>({rows:result.rows,error:null})).catch(error=>({rows:[],error}))));
  const failures=results.filter(result=>result.error).map(result=>result.error);
  const rows=dedupe([...cultureLinks(results[0].rows),...songLinks(results[1].rows)]);
  if(!rows.length&&failures.length===results.length)throw new AggregateError(failures,'Neon link sources are unavailable');
  return {rows,failures};
}

export {LINK_SOURCES};
