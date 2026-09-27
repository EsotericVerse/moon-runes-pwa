'use client';

import {useState} from 'react';
import {insertNeonRows,upsertNeonRows} from './neon-repository';
import {useNeonAccount} from './use-neon-account';
import ContentEditorV2 from '../modular-v2/ContentEditorV2';

const blank=()=>({
  title:'',body:'',source:'',url:'',source_id:'',target_id:'',ref_id:'',create_time:'',
  includeStatistics:true,fullText:false,hidden:false,showLink:true,showSource:true
});

export default function ManagementArticlePublisher({scopeId}){
  const account=useNeonAccount();
  const [draft,setDraft]=useState(blank());
  const [status,setStatus]=useState('');
  const [busy,setBusy]=useState(false);

  if(scopeId!=='lo3rwang')return <section className="scope-v2-inline-card"><h3>文章發表</h3><p>此 Current Scope 沒有 Galaxy 文章資料表；不會把文章寫進其他 Scope 的資料庫。</p></section>;
  if(!account.canManageScopeSync(scopeId))return null;

  async function save(){
    setBusy(true);setStatus('');
    try{
      if(!draft.title.trim()&&!draft.body.trim())throw new Error('標題與正文至少需要一項。');
      if(!draft.source.trim())throw new Error('請指定來源。');
      const now=new Date().toISOString();
      const id='article:'+globalThis.crypto.randomUUID();

      await insertNeonRows('silver.lo3rwang_galaxy',[{
        galaxy_id:id,scope_id:'lo3rwang',source:draft.source.trim(),
        title:draft.title.trim()||null,content:draft.body.trim()||null,
        source_id:draft.source_id.trim()||null,target_id:draft.target_id.trim()||null,ref_id:draft.ref_id.trim()||null,
        url:draft.url.trim()||null,
        search:!draft.hidden,
        statics:draft.includeStatistics!==false,
        display:draft.fullText?'full':'summary',
        create_time:draft.create_time?new Date(draft.create_time).toISOString():now,
        update_time:now
      }]);

      await upsertNeonRows('silver.resource_visibility',{
        scope:'lo3rwang',resource_type:'galaxy',resource_id:id,
        visibility:draft.hidden?'private':'public',
        projection_level:draft.fullText?'full':'summary',
        search_indexed:!draft.hidden,
        statistics_included:draft.includeStatistics!==false,
        semantic_scan_included:false,
        source_ref:draft.source.trim(),
        show_link:draft.showLink!==false,
        show_source:draft.showSource!==false,
        updated_at:now
      },{conflict:'scope,resource_type,resource_id'});

      setDraft(blank());setStatus('文章已發表到 Galaxy。');
    }catch(error){setStatus(error?.message||'文章發表失敗。');}
    finally{setBusy(false);}
  }

  const extraFields=<>
    <div className="scope-v2-stat-controls">
      <label>來源<input value={draft.source} onChange={e=>setDraft(current=>({...current,source:e.target.value}))} placeholder="例如 threads / vocus / personal"/></label>
      <label>原始連結<input value={draft.url} onChange={e=>setDraft(current=>({...current,url:e.target.value}))}/></label>
      <label>發表時間<input type="datetime-local" value={draft.create_time} onChange={e=>setDraft(current=>({...current,create_time:e.target.value}))}/></label>
    </div>
    <div className="scope-v2-stat-controls">
      <label>source_id<input value={draft.source_id} onChange={e=>setDraft(current=>({...current,source_id:e.target.value}))} placeholder="上層／來源"/></label>
      <label>target_id<input value={draft.target_id} onChange={e=>setDraft(current=>({...current,target_id:e.target.value}))} placeholder="下層／目標"/></label>
      <label>ref_id<input value={draft.ref_id} onChange={e=>setDraft(current=>({...current,ref_id:e.target.value}))} placeholder="參照"/></label>
    </div>
  </>;

  return <section className="scope-v2-inline-card">
    <h3>文章發表</h3>
    <p>只在 Management 顯示。公開／私密、簡文／全文、搜尋與統計會一起寫入現有 visibility 規則。</p>
    <ContentEditorV2
      draft={draft}
      setDraft={setDraft}
      busy={busy}
      error={status&&status!=='文章已發表到 Galaxy。'?status:''}
      bodyLabel="正文"
      extraFields={extraFields}
      onSave={save}
    />
    {status==='文章已發表到 Galaxy。'?<p className="scope-v2-status">{status}</p>:null}
  </section>;
}
