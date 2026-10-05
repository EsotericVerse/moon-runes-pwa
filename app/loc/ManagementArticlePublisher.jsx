'use client';

import {UI_COPY} from '../i18n/ui-copy';

import {useState} from 'react';
import {insertRows} from './db-client.mjs';
import {useAccount} from './use-account';
import {ContentEditor,WorkSummaryCard} from '../modular/ui';
import {createUid8} from './uid';
import {normalizeRelationIds,requireGalaxyContent,resolveGalaxyTitle} from './content-policy';


const blank=()=>({
  title:'',body:'',source:'',url:'',source_id:'',target_id:'',ref_id:'',createtime:'',
  hidden:false
});

export default function ManagementArticlePublisher({scopeId}){
  const account=useAccount();
  const [draft,setDraft]=useState(blank());
  const [status,setStatus]=useState('');
  const [busy,setBusy]=useState(false);

  if(!scopeId||!account.canManageScopeSync(scopeId))return null;

  async function save(){
    setBusy(true);setStatus('');
    try{
      const content=requireGalaxyContent(draft.body);
      if(!draft.source.trim())throw new Error(UI_COPY.management.sourceRequired);
      const now=new Date().toISOString();
      const uid=createUid8();

      const galaxy=account.scopeDataFor(scopeId)?.galaxy;
      if(!galaxy)throw new Error('Scope data 未解析');
      await insertRows(galaxy,[{
        uid,content_type:'article',
        title:resolveGalaxyTitle(draft.title,content),content,
        source_id:draft.source_id.trim()||null,target_id:normalizeRelationIds(draft.target_id),ref_id:draft.ref_id.trim()||null,
        url:draft.url.trim()||null,searchable:!draft.hidden,
        createtime:draft.createtime?new Date(draft.createtime).toISOString():now,
        source_name:draft.source.trim()
      }]);

      setDraft(blank());setStatus(UI_COPY.management.articlePublished);
    }catch(error){setStatus(error?.message||UI_COPY.management.articlePublishFailed);}
    finally{setBusy(false);}
  }

  const extraFields=<>
    <div className="scope-stat-controls">
      <label>{UI_COPY.management.articleSource}<input value={draft.source} onChange={e=>setDraft(current=>({...current,source:e.target.value}))} placeholder="例如 threads / vocus / personal"/></label>
      <label>{UI_COPY.management.articleUrl}<input value={draft.url} onChange={e=>setDraft(current=>({...current,url:e.target.value}))}/></label>
      <label>{UI_COPY.management.articleTime}<input type="datetime-local" value={draft.createtime} onChange={e=>setDraft(current=>({...current,createtime:e.target.value}))}/></label>
    </div>
    <div className="scope-stat-controls">
      <label>source_id<input value={draft.source_id} onChange={e=>setDraft(current=>({...current,source_id:e.target.value}))} placeholder={UI_COPY.management.articleParent}/></label>
      <label>target_id<input value={draft.target_id} onChange={e=>setDraft(current=>({...current,target_id:e.target.value}))} placeholder={UI_COPY.management.articleTarget}/></label>
      <label>ref_id<input value={draft.ref_id} onChange={e=>setDraft(current=>({...current,ref_id:e.target.value}))} placeholder={UI_COPY.management.articleReference}/></label>
    </div>
  </>;

  return <section className="scope-inline-card">
    <h3>{UI_COPY.management.article}</h3>
    <div className="scope-management-split">
      <div className="scope-management-editor">
        <WorkSummaryCard
          title={draft.title||'未命名文章'}
          scopeId={scopeId}
          source={draft.source}
          date={draft.createtime}
          body={draft.body}
          hidden={draft.hidden}
          links={draft.url?[{id:'draft-url',href:draft.url,label:'外部連結'}]:[]}
        />
      </div>
      <div>
    <ContentEditor
      draft={draft}
      setDraft={setDraft}
      busy={busy}
      error={status&&status!==UI_COPY.management.articlePublished?status:''}
      bodyLabel={UI_COPY.management.articleBody}
      extraFields={extraFields}
      onSave={save}
    />
    {status===UI_COPY.management.articlePublished?<p className="scope-status">{status}</p>:null}
      </div>
    </div>
  </section>;
}
