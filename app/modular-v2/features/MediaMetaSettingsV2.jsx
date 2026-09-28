'use client';

import {useEffect,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {selectNeonAllRows,selectNeonRows,updateNeonRows} from '../../loc/neon-repository';
import {useNeonAccount} from '../../loc/use-neon-account';
import {FEATURE_LOADING_MESSAGE,featureDataErrorMessage} from '../feature-data-state.v2';
import {galaxyIdentityHref,galaxyRelationLinks} from '../feature-navigation.v2';
import WorkSummaryCardV2 from '../WorkSummaryCardV2';
import PagedResultV2 from '../PagedResultV2';

const MEDIA_TYPE_LABELS={suno:'Suno',instagram:'Instagram'};
const MEDIA_PAGE_SIZE=20;
function splitTags(value){
  return String(value||'').split(/[,，]/).map(tag=>tag.trim()).filter(Boolean);
}
function tableNames(databaseScopeId){
  const lunarunes=String(databaseScopeId||'')==='lunarunes'||String(databaseScopeId||'')==='lrunes';
  return {
    media:lunarunes?'silver.lrunes_galaxy_media':'silver.lo3rwang_galaxy_media',
    galaxy:lunarunes?'silver.lrunes_galaxy':'silver.lo3rwang_galaxy',
    navigationScope:lunarunes?'lunarunes':'lo3rwang'
  };
}

export default function MediaMetaSettingsV2({databaseScopeId='lo3rwang'}){
  const queryClient=useQueryClient();
  const account=useNeonAccount();
  const tables=tableNames(databaseScopeId);
  const [selectedTag,setSelectedTag]=useState('');
  const [mediaPage,setMediaPage]=useState(0);
  const [canEdit,setCanEdit]=useState(false);
  const [editingId,setEditingId]=useState('');
  const [draft,setDraft]=useState('');
  const [message,setMessage]=useState('');

  const tagQuery=useQuery({
    queryKey:['media-meta-ranking',databaseScopeId],
    queryFn:async()=>{
      const {rows}=await selectNeonAllRows(tables.media,{columns:'media_id,meta_tags'});
      const counts=new Map();
      for(const row of rows)for(const tag of splitTags(row.meta_tags))counts.set(tag,(counts.get(tag)||0)+1);
      return [...counts.entries()]
        .map(([term,item_count])=>({ranking_key:'meta|'+term,term,item_count}))
        .sort((a,b)=>b.item_count-a.item_count||a.term.localeCompare(b.term))
        .slice(0,10);
    },
    staleTime:30000
  });

  useEffect(()=>{
    if(!selectedTag&&tagQuery.data?.length)setSelectedTag(String(tagQuery.data[0].term||''));
  },[selectedTag,tagQuery.data]);

  useEffect(()=>{setMediaPage(0);},[selectedTag]);

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
    enabled:Boolean(selectedTag),
    queryFn:async()=>{
      const offset=mediaPage*MEDIA_PAGE_SIZE;
      const {rows,count}=await selectNeonRows(tables.media,{
        columns:'media_id,galaxy_link,title,url,media_type,meta_tags,createtime',
        filters:[{column:'meta_tags',operator:'ilike',value:'%'+selectedTag+'%'}],
        orders:[{column:'createtime',ascending:false,nullsFirst:false}],
        limit:MEDIA_PAGE_SIZE,
        offset,
        count:'exact'
      });
      const galaxyIds=[...new Set(rows.map(row=>String(row.galaxy_link||'').trim()).filter(Boolean))];
      const galaxyRows=galaxyIds.length
        ?(await selectNeonAllRows(tables.galaxy,{
          columns:'uid,source_id,target_id',
          filters:[{column:'uid',operator:'in',value:galaxyIds}]
        })).rows
        :[];
      const byId=new Map(galaxyRows.map(row=>[String(row.uid),row]));
      const totalCount=Math.max(0,Number(count??rows.length)||0);
      return {
        rows:rows.map(row=>({...row,galaxy_relation:byId.get(String(row.galaxy_link||''))||null})),
        totalCount,
        hasMore:offset+rows.length<totalCount
      };
    },
    staleTime:15000
  });

  async function save(row){
    const next=String(draft||'').trim()||null;
    try{
      await updateNeonRows(tables.media,{meta_tags:next},{
        filters:[{column:'media_id',operator:'eq',value:row.media_id}]
      });
      setEditingId('');
      setMessage('已更新媒體 Meta Tag。');
      await queryClient.invalidateQueries({queryKey:['media-meta-ranking',databaseScopeId]});
      await queryClient.invalidateQueries({queryKey:['media-meta-tag-items',databaseScopeId]});
    }catch(error){setMessage(error?.message||'更新失敗。');}
  }

  const tags=tagQuery.data||[];
  const mediaRows=mediaQuery.data?.rows||[];
  const totalCount=Number(mediaQuery.data?.totalCount||0);

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
            ...(row.galaxy_link?[{id:'galaxy:'+row.galaxy_link,label:'作品',href:galaxyIdentityHref(tables.navigationScope,row.galaxy_link)}]:[]),
            ...galaxyRelationLinks(tables.navigationScope,row.galaxy_relation||{})
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
      {!mediaQuery.isPending&&!mediaQuery.error?<PagedResultV2
        label="作品"
        totalCount={totalCount}
        offset={mediaPage*MEDIA_PAGE_SIZE}
        pageSize={MEDIA_PAGE_SIZE}
        hasMore={Boolean(mediaQuery.data?.hasMore)}
        onPrevious={()=>setMediaPage(page=>Math.max(0,page-1))}
        onNext={()=>setMediaPage(page=>page+1)}
      />:null}
      {message?<p className="scope-v2-status" role="status">{message}</p>:null}
    </section>:null}
  </div>;
}
