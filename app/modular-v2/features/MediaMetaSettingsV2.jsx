'use client';

import {useEffect,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {neonAuthClient} from '../../loc/neon-client';
import {selectNeonCount,selectNeonRows} from '../../loc/neon-query';
import {selectCategoryCounts} from '../../loc/aggregate-query';
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
  return String(databaseScopeId||'')==='lunarunes'||String(databaseScopeId||'')==='lrunes'?'lunarunes':'lo3rwang';
}

export default function MediaMetaSettingsV2({databaseScopeId='lo3rwang'}){
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
  const [loadedMediaRows,setLoadedMediaRows]=useState([]);
  const [canEdit,setCanEdit]=useState(false);
  const [editingId,setEditingId]=useState('');
  const [draft,setDraft]=useState('');
  const [message,setMessage]=useState('');

  const tagQuery=useQuery({
    queryKey:['media-meta-ranking',databaseScopeId],
    enabled:Boolean(tables?.galaxyMedia),
    queryFn:async()=>{
      const rows=await selectCategoryCounts(tables.galaxyMedia,'meta_tags',{limit:10});
      return rows.map(row=>({ranking_key:'meta|'+row.term,term:row.term,item_count:row.item_count}));
    },
    staleTime:30000
  });

  useEffect(()=>{
    if(!selectedTag&&tagQuery.data?.length)setSelectedTag(String(tagQuery.data[0].term||''));
  },[selectedTag,tagQuery.data]);

  useEffect(()=>{setMediaPage(0);setLoadedMediaRows([]);},[selectedTag,databaseScopeId]);

  useEffect(()=>{
    let active=true;
    if(account.permissionLoading||!account.user){setCanEdit(false);return()=>{active=false};}
    Promise.all([account.canManageGlobal(),account.canManageScope(databaseScopeId)])
      .then(values=>{if(active)setCanEdit(values.some(Boolean))})
      .catch(()=>{if(active)setCanEdit(false)});
    return()=>{active=false};
  },[account.email,account.permissionLoading,account.user,account.canManageGlobal,account.canManageScope,databaseScopeId]);

  const mediaQuery=useQuery({
    queryKey:['media-meta-tag-items',databaseScopeId,selectedTag,mediaPage],
    enabled:Boolean(selectedTag&&tables?.galaxyMedia&&tables?.galaxy),
    queryFn:async()=>{
      const offset=mediaPage*MEDIA_PAGE_SIZE;
      const filters=[{column:'meta_tags',operator:'ilike',value:'%'+selectedTag+'%'}];
      const totalCount=await selectNeonCount(tables.galaxyMedia,{filters});
      const {rows}=await selectNeonRows(tables.galaxyMedia,{
        columns:'media_id,galaxy_link,title,url,media_type,meta_tags,createtime',
        filters,
        orders:[{column:'createtime',ascending:false,nullsFirst:false}],
        limit:MEDIA_PAGE_SIZE,
        offset
      });
      const galaxyIds=[...new Set(rows.map(row=>String(row.galaxy_link||'').trim()).filter(Boolean))];
      const galaxyRows=galaxyIds.length
        ?(await selectNeonRows(tables.galaxy,{
          columns:'uid,source_id,target_id',
          filters:[{column:'uid',operator:'in',value:galaxyIds}],
          limit:galaxyIds.length
        })).rows
        :[];
      const byId=new Map(galaxyRows.map(row=>[String(row.uid),row]));
      return {
        rows:rows.map(row=>({...row,galaxy_relation:byId.get(String(row.galaxy_link||''))||null})),
        hasMore:offset+MEDIA_PAGE_SIZE<totalCount
      };
    },
    staleTime:15000
  });

  async function save(row){
    const next=String(draft||'').trim()||null;
    try{
      await updateNeonRows(tables.galaxyMedia,{meta_tags:next},{
        filters:[{column:'media_id',operator:'eq',value:row.media_id}]
      });
      setEditingId('');
      setMessage('已更新媒體 Meta Tag。');
      await queryClient.invalidateQueries({queryKey:['media-meta-ranking',databaseScopeId]});
      await queryClient.invalidateQueries({queryKey:['media-meta-tag-items',databaseScopeId]});
    }catch(error){setMessage(error?.message||'更新失敗。');}
  }

  useEffect(()=>{
    const next=mediaQuery.data?.rows||[];
    if(!next.length)return;
    setLoadedMediaRows(current=>{
      if(mediaPage===0)return next;
      const map=new Map(current.map(row=>[String(row.media_id),row]));
      next.forEach(row=>map.set(String(row.media_id),row));
      return [...map.values()];
    });
  },[mediaQuery.data,mediaPage]);

  const tags=tagQuery.data||[];
  const mediaRows=loadedMediaRows;

  return <div className="scope-v2-media-meta-settings">
    <section className="scope-v2-inline-card">
      <h4>多媒體 Meta Tag</h4>
      {tagQuery.isPending?<p className="scope-v2-status">{FEATURE_LOADING_MESSAGE}</p>:null}
      {tagQuery.error?<p className="scope-v2-status scope-v2-error">{featureDataErrorMessage(tagQuery.error)}</p>:null}
      <div className="scope-v2-media-tag-cloud">
        {tags.map(row=><button type="button" key={row.ranking_key} aria-pressed={selectedTag===row.term} onClick={()=>setSelectedTag(String(row.term))}>
          <strong>{row.term}</strong><span>{Number(row.item_count||0).toLocaleString()}</span>
        </button>)}
      </div>
    </section>

    {selectedTag?<section className="scope-v2-inline-card">
      <h4>{selectedTag}</h4>
      {mediaQuery.isPending?<p className="scope-v2-status">{FEATURE_LOADING_MESSAGE}</p>:null}
      {mediaQuery.error?<p className="scope-v2-status scope-v2-error">{featureDataErrorMessage(mediaQuery.error)}</p>:null}
      <div className="scope-v2-media-meta-list">
        {mediaRows.map(row=>{
          const relationLinks=[
            ...(row.galaxy_link?[{id:'galaxy:'+row.galaxy_link,label:'作品',href:galaxyIdentityHref(navigationScope,row.galaxy_link)}]:[]),
            ...galaxyRelationLinks(navigationScope,row.galaxy_relation||{})
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
      <IncrementalLoadV2 hasMore={Boolean(mediaQuery.data?.hasMore)} loading={mediaQuery.isFetching} error={mediaQuery.error} onLoadMore={()=>setMediaPage(page=>page+1)} label="還有更多媒體"/>
      {message?<p className="scope-v2-status" role="status">{message}</p>:null}
    </section>:null}
  </div>;
}
