'use client';

import {useEffect,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {selectNeonAllRows,updateNeonRows} from '../../loc/neon-repository';
import {useNeonAccount} from '../../loc/use-neon-account';
import {FEATURE_LOADING_MESSAGE,featureDataErrorMessage} from '../feature-data-state.v2';

const MEDIA_TYPE_LABELS={suno:'Suno',instagram:'Instagram'};
function splitTags(value){
  return String(value||'').split(/[,，]/).map(tag=>tag.trim()).filter(Boolean);
}

export default function MediaMetaSettingsV2({databaseScopeId='lo3rwang'}){
  const queryClient=useQueryClient();
  const account=useNeonAccount();
  const [selectedTag,setSelectedTag]=useState('');
  const [canEdit,setCanEdit]=useState(false);
  const [editingId,setEditingId]=useState('');
  const [draft,setDraft]=useState('');
  const [message,setMessage]=useState('');

  const tagQuery=useQuery({
    queryKey:['media-meta-ranking',databaseScopeId],
    queryFn:async()=>{
      const {rows}=await selectNeonAllRows('silver.lo3rwang_galaxy_media',{columns:'media_id,meta_tags'});
      const counts=new Map();
      for(const row of rows)for(const tag of splitTags(row.meta_tags))counts.set(tag,(counts.get(tag)||0)+1);
      return [...counts.entries()]
        .map(([term,item_count])=>({ranking_key:'meta|'+term,term,item_count}))
        .sort((a,b)=>b.item_count-a.item_count||a.term.localeCompare(b.term))
        .slice(0,100);
    },
    staleTime:30000
  });

  useEffect(()=>{
    if(!selectedTag&&tagQuery.data?.length)setSelectedTag(String(tagQuery.data[0].term||''));
  },[selectedTag,tagQuery.data]);

  useEffect(()=>{
    let active=true;
    if(account.permissionLoading||!account.user){setCanEdit(false);return()=>{active=false};}
    Promise.all([account.canManageGlobal(),account.canManageScope(databaseScopeId)])
      .then(values=>{if(active)setCanEdit(values.some(Boolean))})
      .catch(()=>{if(active)setCanEdit(false)});
    return()=>{active=false};
  },[account.email,account.permissionLoading,account.user,account.canManageGlobal,account.canManageScope,databaseScopeId]);

  const mediaQuery=useQuery({
    queryKey:['media-meta-tag-items',databaseScopeId,selectedTag],
    enabled:Boolean(selectedTag),
    queryFn:async()=>{
      const {rows}=await selectNeonAllRows('silver.lo3rwang_galaxy_media',{
        columns:'media_id,title,media_type,meta_tags,createtime',
        filters:[{column:'meta_tags',operator:'ilike',value:'%'+selectedTag+'%'}],
        orders:[{column:'createtime',ascending:false,nullsFirst:false}]
      });
      return rows;
    },
    staleTime:15000
  });

  async function save(row){
    const next=String(draft||'').trim()||null;
    try{
      await updateNeonRows('silver.lo3rwang_galaxy_media',{meta_tags:next},{
        filters:[{column:'media_id',operator:'eq',value:row.media_id}]
      });
      setEditingId('');
      setMessage('已更新媒體 Meta Tag。');
      await queryClient.invalidateQueries({queryKey:['media-meta-ranking',databaseScopeId]});
      await queryClient.invalidateQueries({queryKey:['media-meta-tag-items',databaseScopeId]});
    }catch(error){setMessage(error?.message||'更新失敗。');}
  }

  const tags=tagQuery.data||[];

  return <div className="scope-v2-media-meta-settings">
    <section className="scope-v2-inline-card">
      <h4>多媒體 Meta Tag</h4>
      <p className="scope-v2-culture-period-description">直接使用 galaxy_media.meta_tags。</p>
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
        {(mediaQuery.data||[]).map(row=><article key={row.media_id}>
          <div><strong>{row.title||'未命名媒體'}</strong><span>{MEDIA_TYPE_LABELS[String(row.media_type||'').toLowerCase()]||row.media_type||'媒體'}</span></div>
          {editingId===row.media_id?<div className="scope-v2-media-meta-editor">
            <input className="scope-v2-search-input" value={draft} onChange={event=>setDraft(event.target.value)}/>
            <button type="button" onClick={()=>save(row)}>儲存</button>
            <button type="button" onClick={()=>setEditingId('')}>取消</button>
          </div>:<p>{row.meta_tags||'未設定'} {canEdit?<button type="button" onClick={()=>{setEditingId(row.media_id);setDraft(String(row.meta_tags||''));setMessage('')}}>編輯</button>:null}</p>}
        </article>)}
      </div>
      {message?<p className="scope-v2-status" role="status">{message}</p>:null}
    </section>:null}
  </div>;
}
