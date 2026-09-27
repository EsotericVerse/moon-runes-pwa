'use client';

import {useState} from 'react';
import {insertNeonRows} from './neon-repository';
import {useNeonAccount} from './use-neon-account';

const blank=()=>({title:'',content:'',source:'',url:'',source_id:'',target_id:'',ref_id:'',create_time:'',display:'summary',search:true,statics:true});

export default function ManagementArticlePublisher({scopeId}){
  const account=useNeonAccount();
  const [draft,setDraft]=useState(blank());
  const [status,setStatus]=useState('');
  const [busy,setBusy]=useState(false);
  if(scopeId!=='lo3rwang')return <section className="scope-v2-inline-card"><h3>文章發表</h3><p>此 Current Scope 沒有 Galaxy 文章資料表；不會把文章寫進其他 Scope 的資料庫。</p></section>;
  if(!account.canManageScopeSync(scopeId))return null;
  const change=(key,value)=>setDraft(current=>({...current,[key]:value}));
  async function submit(event){
    event.preventDefault();setBusy(true);setStatus('');
    try{
      if(!draft.title.trim()&&!draft.content.trim())throw new Error('標題與正文至少需要一項。');
      if(!draft.source.trim())throw new Error('請指定來源。');
      const now=new Date().toISOString();
      const id='article:'+globalThis.crypto.randomUUID();
      await insertNeonRows('silver.lo3rwang_galaxy',[{
        galaxy_id:id,scope_id:'lo3rwang',source:draft.source.trim(),
        title:draft.title.trim()||null,content:draft.content.trim()||null,
        source_id:draft.source_id.trim()||null,target_id:draft.target_id.trim()||null,ref_id:draft.ref_id.trim()||null,
        url:draft.url.trim()||null,search:Boolean(draft.search),statics:Boolean(draft.statics),
        display:draft.display==='full'?'full':'summary',
        create_time:draft.create_time?new Date(draft.create_time).toISOString():now,update_time:now
      }]);
      setDraft(blank());setStatus('文章已發表到 Galaxy。');
    }catch(error){setStatus(error?.message||'文章發表失敗。');}
    finally{setBusy(false);}
  }
  return <section className="scope-v2-inline-card">
    <h3>文章發表</h3>
    <p>簡單發表頁只存在 Management；內容存入 Galaxy 後再依 Search／Statistics／顯示設定運作。</p>
    <form onSubmit={submit} className="scope-v2-editor">
      <label>標題<input value={draft.title} onChange={e=>change('title',e.target.value)}/></label>
      <label>正文<textarea rows={12} value={draft.content} onChange={e=>change('content',e.target.value)}/></label>
      <div className="scope-v2-stat-controls">
        <label>來源<input value={draft.source} onChange={e=>change('source',e.target.value)} placeholder="例如 threads / vocus / personal"/></label>
        <label>原始連結<input value={draft.url} onChange={e=>change('url',e.target.value)}/></label>
        <label>發表時間<input type="datetime-local" value={draft.create_time} onChange={e=>change('create_time',e.target.value)}/></label>
      </div>
      <div className="scope-v2-stat-controls">
        <label>source_id<input value={draft.source_id} onChange={e=>change('source_id',e.target.value)} placeholder="上層／來源"/></label>
        <label>target_id<input value={draft.target_id} onChange={e=>change('target_id',e.target.value)} placeholder="下層／目標"/></label>
        <label>ref_id<input value={draft.ref_id} onChange={e=>change('ref_id',e.target.value)} placeholder="參照"/></label>
      </div>
      <div className="scope-v2-editor-options">
        <label><input type="checkbox" checked={draft.search} onChange={e=>change('search',e.target.checked)}/>參加搜尋</label>
        <label><input type="checkbox" checked={draft.statics} onChange={e=>change('statics',e.target.checked)}/>參加統計</label>
        <label>顯示<select value={draft.display} onChange={e=>change('display',e.target.value)}><option value="summary">簡文</option><option value="full">全文</option></select></label>
      </div>
      <button type="submit" disabled={busy}>{busy?'發表中…':'發表文章'}</button>
      {status?<p className="scope-v2-status">{status}</p>:null}
    </form>
  </section>;
}
