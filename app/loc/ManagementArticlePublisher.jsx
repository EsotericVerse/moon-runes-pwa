'use client';
import UiText,{useUiText} from '../i18n/UiText';

import {UI_COPY,registerDefaultSection} from '../i18n/ui-copy';
import {useUiCopy,useUiSection} from '../i18n/ui-locale';
import managementZh from '../i18n/sections/management.zh_tw.js';
import publisherZh from '../i18n/sections/uiExtra.publisher.zh_tw.js';
import sharingZh from '../i18n/sections/uiExtra.sharing.zh_tw.js';
registerDefaultSection('management',managementZh);
registerDefaultSection('uiExtra.publisher',publisherZh);
// uiExtra.sharing currently has no consumer in the codebase; it is kept
// registered here (its content unchanged) so it stays reachable rather than
// silently dropped by this split.
registerDefaultSection('uiExtra.sharing',sharingZh);
import {useEffect,useRef,useState} from 'react';
import {useEditDock} from '../modular/edit-dock';
import {insertRows} from './db-client.mjs';
import {useAccount} from './use-account';
import {createUid8} from './uid';
import {normalizeRelationIds,requireGalaxyContent,resolveGalaxyTitle} from './content-policy';
import {ObjectEditor} from './BlockNoteEditor';
import {blocksToPlainText,plainTextToBlocks} from './blocknote-content.mjs';

const blank=()=>({
  title:'',bodyBlocks:plainTextToBlocks(''),bodyHtml:'',editorKey:createUid8(),source:'',url:'',source_id:'',target_id:'',ref_id:'',createtime:'',
  hidden:false
});

export default function ManagementArticlePublisher({scopeId}){
  useUiSection('management');
  useUiSection('uiExtra.publisher');
  const UI_COPY=useUiCopy();
  const t=useUiText();
  const account=useAccount();
  const editDock=useEditDock();
  const dockActions=useRef({save:null,discard:null});
  const activateDock=useRef(()=>{});
  const inDock=Boolean(editDock?.active&&editDock.scopeId===scopeId);
  const [draft,setDraft]=useState(blank());
  const [status,setStatus]=useState('');
  const [busy,setBusy]=useState(false);
  useEffect(()=>{
    if(!inDock)return undefined;
    const unregister=editDock.register({
      save:()=>dockActions.current.save(),
      discard:()=>dockActions.current.discard(),
      isDirty:()=>dockActions.current.isDirty(),
      isBusy:()=>dockActions.current.isBusy()
    });
    activateDock.current=unregister.activate;
    return unregister;
  },[inDock,editDock?.register]);

  if(!scopeId||!account.canManageScopeSync(scopeId))return null;
  const change=(key,value)=>setDraft(current=>({...current,[key]:value}));

  async function save(event){
    event?.preventDefault?.();
    if(busy)return false;
    setBusy(true);setStatus('');
    try{
      const content=await requireGalaxyContent(draft.bodyHtml||blocksToPlainText(draft.bodyBlocks));
      if(!draft.source.trim())throw new Error(UI_COPY.management.sourceRequired);
      const now=new Date().toISOString();
      const uid=createUid8();
      const galaxy=account.scopeDataFor(scopeId)?.galaxy;
      if(!galaxy)throw new Error(t('uiExtra.publisher.scopeUnavailable'));

      await insertRows(galaxy,[{
        uid,
        title:resolveGalaxyTitle(draft.title,content),
        content,
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
      return true;
    }catch(error){
      const message=error?.message||UI_COPY.management.articlePublishFailed;
      setStatus(message);
      if(inDock)editDock.setNotice(message);
      return false;
    }finally{
      setBusy(false);
    }
  }
  dockActions.current={
    save:()=>save(),
    discard:()=>{setDraft(blank());setStatus('')},
    isDirty:()=>Boolean(
      draft.title.trim()||draft.source.trim()||draft.url.trim()||
      draft.source_id.trim()||draft.target_id.trim()||draft.ref_id.trim()||
      draft.createtime||draft.hidden||blocksToPlainText(draft.bodyHtml||draft.bodyBlocks).trim()
    ),
    isBusy:()=>busy
  };

  return <section className="loc-card scope-feature-card"
    onFocusCapture={()=>activateDock.current?.()}
    onPointerDownCapture={()=>activateDock.current?.()}>
    <p className="loc-eyebrow">Publish</p>
    <h2>{UI_COPY.management.article}</h2>
    <form className="scope-publisher" onSubmit={save}>
      <div className="scope-publisher-main">
        <ObjectEditor mode="fields" fields={[
          {key:'title',kind:'node',bare:false,node:<input
            className="scope-publisher-title"
            value={draft.title}
            onChange={event=>change('title',event.target.value)}
            placeholder={t('uiExtra.publisher.addTitle')}
            aria-label={t('uiExtra.publisher.articleTitle')}/>,label:<UiText id="uiExtra.publisher.articleTitle"/>},
          {key:'body',kind:'rich',label:<UiText id="uiExtra.publisher.articleBody"/>,
            editorKey:'publisher:'+scopeId+':'+draft.editorKey,
            content:draft.bodyBlocks,
            onBlocksChange:blocks=>change('bodyBlocks',blocks),
            onHtmlChange:html=>change('bodyHtml',html)}
        ]}/>
      </div>

      <aside className="scope-publisher-sidebar">
        <section className="scope-publisher-panel">
          <h3><UiText id="uiExtra.publisher.publish"/></h3>
          <label>
            <span>{UI_COPY.management.articleTime}</span>
            <input type="datetime-local" value={draft.createtime} onChange={event=>change('createtime',event.target.value)}/>
          </label>
          <label className="scope-setting-toggle">
            <input type="checkbox" checked={draft.hidden===true} onChange={event=>change('hidden',event.target.checked)}/>
            <UiText id="uiExtra.publisher.excludeSearch"/>
          </label>
          {!inDock?<button className="loc-button primary" type="submit" disabled={busy}><UiText id={busy?'uiExtra.publisher.publishing':'uiExtra.publisher.publishArticle'}/></button>:null}
        </section>

        <section className="scope-publisher-panel">
          <h3><UiText id="uiExtra.publisher.source"/></h3>
          <label>
            <span>{UI_COPY.management.articleSource}</span>
            <input value={draft.source} onChange={event=>change('source',event.target.value)} placeholder={t('uiExtra.publisher.sourceHint')} required/>
          </label>
          <label>
            <span>{UI_COPY.management.articleUrl}</span>
            <input value={draft.url} onChange={event=>change('url',event.target.value)} placeholder="https://…"/>
          </label>
        </section>

        <details className="scope-publisher-panel">
          <summary><UiText id="uiExtra.publisher.relations"/></summary>
          <label><span><UiText id="uiExtra.publisher.parentArticleId"/></span><input value={draft.source_id} onChange={event=>change('source_id',event.target.value)} placeholder={UI_COPY.management.articleParent}/></label>
          <label><span><UiText id="uiExtra.publisher.targetArticleId"/></span><input value={draft.target_id} onChange={event=>change('target_id',event.target.value)} placeholder={UI_COPY.management.articleTarget}/></label>
          <label><span><UiText id="uiExtra.publisher.referenceArticleId"/></span><input value={draft.ref_id} onChange={event=>change('ref_id',event.target.value)} placeholder={UI_COPY.management.articleReference}/></label>
        </details>
      </aside>
    </form>

    {status?<p className={'scope-status'+(status===UI_COPY.management.articlePublished?'':' scope-error')} role="status">{status}</p>:null}
  </section>;
}
