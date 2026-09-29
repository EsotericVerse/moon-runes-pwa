'use client';

import {useState} from 'react';
import {neonAuthClient} from './neon-client';
import {useNeonAccount} from './use-neon-account';
import ContentEditorV2 from '../modular-v2/ContentEditorV2';
import {createUid8} from './uid';
import {requireGalaxyContent,resolveGalaxyTitle} from './content-policy';
import {resolveScopeTables} from './scope-table-mapping';

function targetIds(value){
  const values=Array.isArray(value)?value:String(value||'').split(/[,，]/);
  const ids=[...new Set(values.map(item=>String(item||'').trim()).filter(Boolean))];
  return ids.length?ids:null;
}

async function insertNeonRows(table,rows){
  const [schema,name]=String(table).split('.');
  const {error}=await neonAuthClient.schema(schema).from(name).insert(rows);
  if(error)throw new Error(error.message||('Neon INSERT '+table+' failed'));
}

const blank=()=>({
  title:'',body:'',source:'',url:'',source_id:'',target_id:'',ref_id:'',createtime:'',
  hidden:false
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
      const content=requireGalaxyContent(draft.body);
      if(!draft.source.trim())throw new Error('請指定來源。');
      const now=new Date().toISOString();
      const uid=createUid8();

      const {galaxy}=await resolveScopeTables(scopeId,{email:account.email});
      await insertNeonRows(galaxy,[{
        uid,content_type:'article',
        title:resolveGalaxyTitle(draft.title,content),content,
        source_id:draft.source_id.trim()||null,target_id:targetIds(draft.target_id),ref_id:draft.ref_id.trim()||null,
        url:draft.url.trim()||null,searchable:!draft.hidden,
        createtime:draft.createtime?new Date(draft.createtime).toISOString():now,
        source_name:draft.source.trim()
      }]);

      setDraft(blank());setStatus('文章已發表到 Galaxy。');
    }catch(error){setStatus(error?.message||'文章發表失敗。');}
    finally{setBusy(false);}
  }

  const extraFields=<>
    <div className="scope-v2-stat-controls">
      <label>來源<input value={draft.source} onChange={e=>setDraft(current=>({...current,source:e.target.value}))} placeholder="例如 threads / vocus / personal"/></label>
      <label>原始連結<input value={draft.url} onChange={e=>setDraft(current=>({...current,url:e.target.value}))}/></label>
      <label>發表時間<input type="datetime-local" value={draft.createtime} onChange={e=>setDraft(current=>({...current,createtime:e.target.value}))}/></label>
    </div>
    <div className="scope-v2-stat-controls">
      <label>source_id<input value={draft.source_id} onChange={e=>setDraft(current=>({...current,source_id:e.target.value}))} placeholder="上層／來源"/></label>
      <label>target_id<input value={draft.target_id} onChange={e=>setDraft(current=>({...current,target_id:e.target.value}))} placeholder="下層／目標"/></label>
      <label>ref_id<input value={draft.ref_id} onChange={e=>setDraft(current=>({...current,ref_id:e.target.value}))} placeholder="參照"/></label>
    </div>
  </>;

  return <section className="scope-v2-inline-card">
    <h3>文章發表</h3>
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
