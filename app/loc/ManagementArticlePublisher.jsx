'use client';

import {UI_COPY} from '../i18n/ui-copy';
import {useState} from 'react';
import {insertRows} from './db-client.mjs';
import {useAccount} from './use-account';
import {createUid8} from './uid';
import {normalizeRelationIds,requireGalaxyContent,resolveGalaxyTitle} from './content-policy';
import RichBlockEditor,{blocksToPlainText,plainTextToBlocks} from './RichBlockEditor';

const blank=()=>({
  title:'',bodyBlocks:plainTextToBlocks(''),source:'',url:'',source_id:'',target_id:'',ref_id:'',createtime:'',
  hidden:false
});

export default function ManagementArticlePublisher({scopeId}){
  const account=useAccount();
  const [draft,setDraft]=useState(blank());
  const [status,setStatus]=useState('');
  const [busy,setBusy]=useState(false);

  if(!scopeId||!account.canManageScopeSync(scopeId))return null;
  const change=(key,value)=>setDraft(current=>({...current,[key]:value}));

  async function save(event){
    event?.preventDefault?.();
    setBusy(true);setStatus('');
    try{
      const content=requireGalaxyContent(blocksToPlainText(draft.bodyBlocks));
      if(!draft.source.trim())throw new Error(UI_COPY.management.sourceRequired);
      const now=new Date().toISOString();
      const uid=createUid8();
      const galaxy=account.scopeDataFor(scopeId)?.galaxy;
      if(!galaxy)throw new Error('Scope data 未解析');

      await insertRows(galaxy,[{
        uid,
        content_type:'article',
        title:resolveGalaxyTitle(draft.title,content),
        content,
        content_blocks:draft.bodyBlocks,
        source_id:draft.source_id.trim()||null,
        target_id:normalizeRelationIds(draft.target_id),
        ref_id:draft.ref_id.trim()||null,
        url:draft.url.trim()||null,
        searchable:!draft.hidden,
        createtime:draft.createtime?new Date(draft.createtime).toISOString():now,
        source_name:draft.source.trim()
      }]);

      setDraft(blank());
      setStatus(UI_COPY.management.articlePublished);
    }catch(error){
      setStatus(error?.message||UI_COPY.management.articlePublishFailed);
    }finally{
      setBusy(false);
    }
  }

  return <section className="loc-card scope-feature-card">
    <p className="loc-eyebrow">Publish</p>
    <h2>{UI_COPY.management.article}</h2>
    <form className="scope-publisher" onSubmit={save}>
      <div className="scope-publisher-main">
        <input
          className="scope-publisher-title"
          value={draft.title}
          onChange={event=>change('title',event.target.value)}
          placeholder="新增標題"
          aria-label="文章標題"
        />
        <RichBlockEditor
          key={'publisher:'+scopeId}
          initialContent={draft.bodyBlocks}
          onChange={blocks=>change('bodyBlocks',blocks)}
        />
      </div>

      <aside className="scope-publisher-sidebar">
        <section className="scope-publisher-panel">
          <h3>發佈</h3>
          <label>
            <span>{UI_COPY.management.articleTime}</span>
            <input type="datetime-local" value={draft.createtime} onChange={event=>change('createtime',event.target.value)}/>
          </label>
          <label className="scope-setting-toggle">
            <input type="checkbox" checked={draft.hidden===true} onChange={event=>change('hidden',event.target.checked)}/>
            不顯示於公開搜尋
          </label>
          <button className="loc-button primary" type="submit" disabled={busy}>{busy?'發佈中…':'發佈文章'}</button>
        </section>

        <section className="scope-publisher-panel">
          <h3>來源</h3>
          <label>
            <span>{UI_COPY.management.articleSource}</span>
            <input value={draft.source} onChange={event=>change('source',event.target.value)} placeholder="例如 threads / vocus / personal" required/>
          </label>
          <label>
            <span>{UI_COPY.management.articleUrl}</span>
            <input value={draft.url} onChange={event=>change('url',event.target.value)} placeholder="https://…"/>
          </label>
        </section>

        <details className="scope-publisher-panel">
          <summary>進階關聯</summary>
          <label><span>source_id</span><input value={draft.source_id} onChange={event=>change('source_id',event.target.value)} placeholder={UI_COPY.management.articleParent}/></label>
          <label><span>target_id</span><input value={draft.target_id} onChange={event=>change('target_id',event.target.value)} placeholder={UI_COPY.management.articleTarget}/></label>
          <label><span>ref_id</span><input value={draft.ref_id} onChange={event=>change('ref_id',event.target.value)} placeholder={UI_COPY.management.articleReference}/></label>
        </details>
      </aside>
    </form>

    {status?<p className={'scope-status'+(status===UI_COPY.management.articlePublished?'':' scope-error')} role="status">{status}</p>:null}
  </section>;
}
