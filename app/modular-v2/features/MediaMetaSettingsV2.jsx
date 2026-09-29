'use client';

import {useEffect,useMemo,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {neonAuthClient} from '../../loc/neon-client';
import {selectNeonRows} from '../../loc/neon-query';
import {useNeonAccount} from '../../loc/use-neon-account';
import {FEATURE_LOADING_MESSAGE,featureDataErrorMessage} from '../feature-data-state.v2';
import {galaxyIdentityHref,galaxyRelationLinks} from '../feature-navigation.v2';
import WorkSummaryCardV2 from '../WorkSummaryCardV2';
import IncrementalLoadV2 from '../IncrementalLoadV2';
import {DEFAULT_LIST_BATCH_SIZE} from '../list-loading.v2';
import {resolveScopeTables} from '../../loc/scope-table-mapping';


function mediaRelation(client,table){
  const [schema,name]=String(table).split('.');
  return client.schema(schema).from(name);
}
async function updateNeonRows(table,values,{filters=[]}={}){
  let query=mediaRelation(neonAuthClient,table).update(values);
  for(const filter of filters)query=filter.operator==='in'?query.in(filter.column,filter.value):query[filter.operator](filter.column,filter.value);
  const {error}=await query;
  if(error)throw new Error(error.message||('Neon UPDATE '+table+' failed'));
}

const MEDIA_TYPE_LABELS={suno:'Suno',instagram:'Instagram'};
const MEDIA_PAGE_SIZE=DEFAULT_LIST_BATCH_SIZE;
function navigationScopeId(databaseScopeId){
  return String(databaseScopeId||'').trim();
}

const MEDIA_TAG_STAT_EXCLUSIONS=new Set(['正位','半正位','半逆位','逆位','男聲','女聲','合唱']);

function statisticalMediaTag(value=''){
  const tag=String(value||'').trim();
  if(!tag)return '';
  if(MEDIA_TAG_STAT_EXCLUSIONS.has(tag))return '';
  const parts=tag.split('/').map(part=>part.trim()).filter(Boolean);
  if(parts.length>1&&MEDIA_TAG_STAT_EXCLUSIONS.has(parts.at(-1))){
    return parts.slice(0,-1).join('/').trim();
  }
  return tag;
}

function splitMediaTags(value=''){
  return [...new Set(String(value||'')
    .split(/[,，]/u)
    .map(statisticalMediaTag)
    .filter(Boolean))];
}

const MEDIA_RANK_CACHE_LIMIT=100;

function buildMediaTagIndex(rows=[]){
  const parsed=(rows||[]).map(row=>({
    media_id:String(row?.media_id||'').trim(),
    createtime:String(row?.createtime||''),
    tags:splitMediaTags(row?.meta_tags)
  })).filter(row=>row.media_id&&row.tags.length);

  const counts=new Map();
  for(const row of parsed){
    for(const tag of row.tags)counts.set(tag,(counts.get(tag)||0)+1);
  }

  const tags=[...counts.entries()]
    .map(([term,item_count])=>({ranking_key:'meta|'+term,term,item_count}))
    .sort((a,b)=>b.item_count-a.item_count||a.term.localeCompare(b.term,'zh-Hant'));

  const maxWeight=Math.max(1,...counts.values());
  const buckets=new Map();
  for(const row of parsed){
    const representative_score=row.tags.reduce(
      (sum,tag)=>sum+(Number(counts.get(tag))||0)/maxWeight,
      0
    );
    const ranked={media_id:row.media_id,createtime:row.createtime,representative_score};
    for(const tag of row.tags){
      if(!buckets.has(tag))buckets.set(tag,[]);
      buckets.get(tag).push(ranked);
    }
  }

  const top100ByTag={};
  for(const [tag,items] of buckets){
    top100ByTag[tag]=items
      .sort((a,b)=>
        Number(b.representative_score||0)-Number(a.representative_score||0)||
        String(b.createtime||'').localeCompare(String(a.createtime||''))||
        String(a.media_id||'').localeCompare(String(b.media_id||''))
      )
      .slice(0,MEDIA_RANK_CACHE_LIMIT);
  }
  return {tags,top100ByTag};
}

export default function MediaMetaSettingsV2({databaseScopeId}){
  const queryClient=useQueryClient();
  const account=useNeonAccount();
  const tableQuery=useQuery({
    queryKey:['scope-table-mapping',databaseScopeId],
    queryFn:()=>resolveScopeTables(databaseScopeId),
    staleTime:5*60_000
  });
  const tables=tableQuery.data||null;
  const navigationScope=navigationScopeId(databaseScopeId);
  const [selectedTag,setSelectedTag]=useState('');
  const [mediaPage,setMediaPage]=useState(0);
  const [canEdit,setCanEdit]=useState(false);
  const [editingId,setEditingId]=useState('');
  const [draft,setDraft]=useState('');
  const [message,setMessage]=useState('');

  const tagQuery=useQuery({
    queryKey:['media-meta-ranking',databaseScopeId],
    enabled:Boolean(tables?.galaxyMedia),
    queryFn:async()=>{
      const {rows}=await selectNeonRows(tables.galaxyMedia,{
        columns:'media_id,meta_tags,createtime',
        filters:[{column:'meta_tags',operator:'neq',value:''}],
        limit:5000,
        offset:0
      });
      return buildMediaTagIndex(rows);
    },
    staleTime:5*60_000,
    gcTime:30*60_000
  });

  useEffect(()=>{
    if(!selectedTag&&tagQuery.data?.tags?.length)setSelectedTag(String(tagQuery.data.tags[0].term||''));
  },[selectedTag,tagQuery.data]);

  useEffect(()=>{setMediaPage(0);},[selectedTag,databaseScopeId]);

  useEffect(()=>{
    let active=true;
    if(account.permissionLoading||!account.user){setCanEdit(false);return()=>{active=false};}
    Promise.all([account.canManageGlobal(),account.canManageScope(databaseScopeId)])
      .then(values=>{if(active)setCanEdit(values.some(Boolean))})
      .catch(()=>{if(active)setCanEdit(false)});
    return()=>{active=false};
  },[account.email,account.permissionLoading,account.user,account.canManageGlobal,account.canManageScope,databaseScopeId]);

  const rankedMediaRows=useMemo(
    ()=>tagQuery.data?.top100ByTag?.[selectedTag]||[],
    [tagQuery.data,selectedTag]
  );
  const visibleRankRows=useMemo(
    ()=>rankedMediaRows.slice(0,(mediaPage+1)*MEDIA_PAGE_SIZE),
    [rankedMediaRows,mediaPage]
  );
  const visibleMediaIds=useMemo(
    ()=>visibleRankRows.map(row=>String(row.media_id||'').trim()).filter(Boolean),
    [visibleRankRows]
  );
  const detailQuery=useQuery({
    queryKey:['media-meta-visible-details',databaseScopeId,visibleMediaIds.join(',')],
    enabled:Boolean(tables?.galaxyMedia&&visibleMediaIds.length),
    queryFn:async()=>{
      const {rows}=await selectNeonRows(tables.galaxyMedia,{
        columns:'media_id,galaxy_link,title,url,media_type,meta_tags,createtime',
        filters:[{column:'media_id',operator:'in',value:visibleMediaIds}],
        limit:visibleMediaIds.length
      });
      return rows;
    },
    staleTime:30000
  });
  const detailById=useMemo(
    ()=>new Map((detailQuery.data||[]).map(row=>[String(row.media_id),row])),
    [detailQuery.data]
  );
  const visibleMediaRows=useMemo(
    ()=>visibleRankRows
      .map(rankRow=>{
        const detail=detailById.get(String(rankRow.media_id));
        return detail?{...detail,representative_score:rankRow.representative_score}:null;
      })
      .filter(Boolean),
    [visibleRankRows,detailById]
  );
  const visibleGalaxyIds=useMemo(
    ()=>[...new Set(visibleMediaRows.map(row=>String(row.galaxy_link||'').trim()).filter(Boolean))],
    [visibleMediaRows]
  );
  const relationQuery=useQuery({
    queryKey:['media-meta-visible-relations',databaseScopeId,visibleGalaxyIds.join(',')],
    enabled:Boolean(tables?.galaxy&&visibleGalaxyIds.length),
    queryFn:async()=>{
      const {rows}=await selectNeonRows(tables.galaxy,{
        columns:'uid,source_id,target_id',
        filters:[{column:'uid',operator:'in',value:visibleGalaxyIds}],
        limit:visibleGalaxyIds.length
      });
      return rows;
    },
    staleTime:30000
  });
  const galaxyRelations=useMemo(
    ()=>new Map((relationQuery.data||[]).map(row=>[String(row.uid),row])),
    [relationQuery.data]
  );

  async function save(row){
    const next=String(draft||'').trim()||null;
    try{
      await updateNeonRows(tables.galaxyMedia,{meta_tags:next},{
        filters:[{column:'media_id',operator:'eq',value:row.media_id}]
      });
      setEditingId('');
      setMessage('已更新媒體 Meta Tag。');
      await queryClient.invalidateQueries({queryKey:['media-meta-ranking',databaseScopeId]});
    }catch(error){setMessage(error?.message||'更新失敗。');}
  }

  const tags=tagQuery.data?.tags||[];
  const mediaRows=visibleMediaRows;
  const hasMore=visibleRankRows.length<rankedMediaRows.length;

  return <div className="scope-v2-media-meta-settings">
    <section className="scope-v2-inline-card">
      <h4>多媒體 Meta Tag</h4>
      {tagQuery.isPending?<p className="scope-v2-status">{FEATURE_LOADING_MESSAGE}</p>:null}
      {tagQuery.error?<p className="scope-v2-status scope-v2-error">{featureDataErrorMessage(tagQuery.error)}</p>:null}
      {detailQuery.isFetching?<p className="scope-v2-status">{FEATURE_LOADING_MESSAGE}</p>:null}
      {tags.length?<label className="scope-v2-react-select-field">
        <span>選擇 Meta Tag</span>
        <select className="scope-v2-select" value={selectedTag} onChange={event=>setSelectedTag(event.target.value)}>
          {tags.map(row=><option key={row.ranking_key} value={row.term}>
            {row.term}（{Number(row.item_count||0).toLocaleString()}）
          </option>)}
        </select>
      </label>:null}
    </section>

    {selectedTag?<section className="scope-v2-inline-card">
      <h4>{selectedTag}</h4>
      {tagQuery.isPending?<p className="scope-v2-status">{FEATURE_LOADING_MESSAGE}</p>:null}
      {tagQuery.error?<p className="scope-v2-status scope-v2-error">{featureDataErrorMessage(tagQuery.error)}</p>:null}
      <div className="scope-v2-media-meta-list">
        {mediaRows.map(row=>{
          const relationLinks=[
            ...(row.galaxy_link?[{id:'galaxy:'+row.galaxy_link,label:'作品',href:galaxyIdentityHref(navigationScope,row.galaxy_link)}]:[]),
            ...galaxyRelationLinks(navigationScope,galaxyRelations.get(String(row.galaxy_link||''))||{})
          ].filter(link=>link.href);
          const links=row.url&&/^https?:\/\//i.test(String(row.url))
            ?[{id:'media:'+row.media_id,href:row.url,label:'媒體連結'}]
            :[];
          return <WorkSummaryCardV2
            key={row.media_id}
            title={row.title||'未命名媒體'}
            source={MEDIA_TYPE_LABELS[String(row.media_type||'').toLowerCase()]||row.media_type||'媒體'}
            date={row.createtime?String(row.createtime).slice(0,16).replace('T',' '):''}
            body={row.meta_tags||''}
            relationLinks={relationLinks}
            links={links}
          >
            {editingId===row.media_id?<div className="scope-v2-media-meta-editor">
              <input className="scope-v2-search-input" value={draft} onChange={event=>setDraft(event.target.value)}/>
              <button type="button" onClick={()=>save(row)}>儲存</button>
              <button type="button" onClick={()=>setEditingId('')}>取消</button>
            </div>:canEdit?<button type="button" onClick={()=>{setEditingId(row.media_id);setDraft(String(row.meta_tags||''));setMessage('')}}>編輯</button>:null}
          </WorkSummaryCardV2>;
        })}
      </div>
      <IncrementalLoadV2 hasMore={hasMore} loading={false} error={null} onLoadMore={()=>setMediaPage(page=>page+1)} label="還有更多媒體"/>
      {message?<p className="scope-v2-status" role="status">{message}</p>:null}
    </section>:null}
  </div>;
}
