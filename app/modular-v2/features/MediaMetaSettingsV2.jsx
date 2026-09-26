'use client';

import {useEffect,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {selectScopeRankingPage} from '../../loc/neon-ranking-client';
import {selectNeonRows,updateNeonRows} from '../../loc/neon-repository';
import {useNeonAccount} from '../../loc/use-neon-account';
import {featureDataErrorMessage} from '../feature-data-state.v2';

const MEDIA_TYPE_LABELS={song:'曲目',reel:'Reels',video:'影片',image:'圖像',audio:'音訊'};

export default function MediaMetaSettingsV2({databaseScopeId='lo3rwang'}){
  const queryClient=useQueryClient();
  const account=useNeonAccount();
  const [selectedTag,setSelectedTag]=useState('');
  const [canEdit,setCanEdit]=useState(false);
  const [editingId,setEditingId]=useState('');
  const [draft,setDraft]=useState('');
  const [message,setMessage]=useState('');

  const tagQuery=useQuery({
    queryKey:['media-meta-style-ranking',databaseScopeId],
    queryFn:async()=>(await selectScopeRankingPage('lo3rwang',{rankingType:'meta_style',limit:100,navigation:{}})).rows,
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
      const {rows}=await selectNeonRows('silver.lo3rwang_galaxy_media',{
        columns:'media_id,title,media_type,source_name,style_tags,created_date',
        filters:[
          {column:'scope_id',operator:'eq',value:databaseScopeId},
          {column:'style_tags',operator:'ilike',value:'%'+selectedTag+'%'}
        ],
        orders:[{column:'created_date',ascending:false,nullsFirst:false}],
        limit:100
      });
      return rows;
    },
    staleTime:15000
  });

  async function save(row){
    const next=String(draft||'').trim()||'風格未知';
    try{
      await updateNeonRows('silver.lo3rwang_galaxy_media',{style_tags:next},{
        filters:[
          {column:'media_id',operator:'eq',value:row.media_id},
          {column:'scope_id',operator:'eq',value:databaseScopeId}
        ]
      });
      setEditingId('');
      setMessage('已更新媒體 Meta Tag。');
      await queryClient.invalidateQueries({queryKey:['media-meta-style-ranking',databaseScopeId]});
      await queryClient.invalidateQueries({queryKey:['media-meta-tag-items',databaseScopeId]});
    }catch(error){setMessage(error?.message||'更新失敗。');}
  }

  const tags=tagQuery.data||[];

  return <div className="scope-v2-media-meta-settings">
    <section className="scope-v2-inline-card">
      <h4>多媒體 Meta Tag</h4>
      <p className="scope-v2-culture-period-description">直接使用 galaxy_media.style_tags；不共用文字關鍵詞詞庫。</p>
      {tagQuery.isPending?<p className="scope-v2-status">讀取 Meta Tag…</p>:null}
      {tagQuery.error?<p className="scope-v2-status scope-v2-error">{featureDataErrorMessage(tagQuery.error)}</p>:null}
      <div className="scope-v2-media-tag-cloud">
        {tags.map(row=><button type="button" key={row.ranking_key} aria-pressed={selectedTag===row.term} onClick={()=>setSelectedTag(String(row.term))}>
          <strong>{row.term}</strong><span>{Number(row.item_count||0).toLocaleString()}</span>
        </button>)}
      </div>
    </section>

    {selectedTag?<section className="scope-v2-inline-card">
      <h4>{selectedTag}</h4>
      {mediaQuery.isPending?<p className="scope-v2-status">讀取媒體…</p>:null}
      {mediaQuery.error?<p className="scope-v2-status scope-v2-error">{featureDataErrorMessage(mediaQuery.error)}</p>:null}
      <div className="scope-v2-media-meta-list">
        {(mediaQuery.data||[]).map(row=><article key={row.media_id}>
          <div><strong>{row.title||'未命名媒體'}</strong><span>{MEDIA_TYPE_LABELS[String(row.media_type||'').toLowerCase()]||row.media_type||'媒體'} · {row.source_name||''}</span></div>
          {editingId===row.media_id?<div className="scope-v2-media-meta-editor">
            <input className="scope-v2-search-input" value={draft} onChange={event=>setDraft(event.target.value)}/>
            <button type="button" onClick={()=>save(row)}>儲存</button>
            <button type="button" onClick={()=>setEditingId('')}>取消</button>
          </div>:<p>{row.style_tags||'風格未知'} {canEdit?<button type="button" onClick={()=>{setEditingId(row.media_id);setDraft(String(row.style_tags||''));setMessage('')}}>編輯</button>:null}</p>}
        </article>)}
      </div>
      {message?<p className="scope-v2-status" role="status">{message}</p>:null}
    </section>:null}
  </div>;
}
