'use client';
import UiText,{useUiText} from '../i18n/UiText';

import {UI_COPY,registerDefaultSection} from '../i18n/ui-copy';
import {useUiCopy,useUiSection} from '../i18n/ui-locale';
import managementZh from '../i18n/sections/management.zh_tw.js';
import publisherZh from '../i18n/sections/uiExtra.publisher.zh_tw.js';
import sharingZh from '../i18n/sections/uiExtra.sharing.zh_tw.js';
import importUIZh from '../i18n/sections/uiExtra.importUI.zh_tw.js';
registerDefaultSection('management',managementZh);
registerDefaultSection('uiExtra.publisher',publisherZh);
// uiExtra.sharing currently has no consumer in the codebase; it is kept
// registered here (its content unchanged) so it stays reachable rather than
// silently dropped by this split.
registerDefaultSection('uiExtra.sharing',sharingZh);
// MediaRecordInsert's field labels/messages are the same canonical set used
// by ManagementImportPanel's own media handling -- one shared i18n section,
// not a duplicate copy, reused by both.
registerDefaultSection('uiExtra.importUI',importUIZh);
import {useState} from 'react';
import {insertRows} from './db-client.mjs';
import {useAccount} from './use-account';
import {createUid8} from './uid';
import {hasIrrecoverableEncoding,normalizeRelationIds,repairMojibakeText,requireGalaxyContent,resolveGalaxyTitle} from './content-policy';
import {ObjectEditor} from './BlockNoteEditor';
import {blocksToPlainText,plainTextToBlocks} from './blocknote-content.mjs';

const blank=()=>({
  title:'',bodyBlocks:plainTextToBlocks(''),bodyHtml:'',editorKey:createUid8(),source:'',url:'',source_id:'',target_id:'',ref_id:'',createtime:'',
  hidden:false
});

function mediaIso(value){
  if(!value)return null;
  const date=new Date(value);
  return Number.isNaN(date.getTime())?null:date.toISOString();
}

// 新增多媒體 belongs with publishing content (it creates a Galaxy Media
// record the same way publishing an article creates a Galaxy record), not
// with 資料匯入 (batch/file import of existing external data).
function MediaRecordInsert({scopeId}){
  const UI_COPY=useUiCopy();
  const t=useUiText();
  const account=useAccount();
  const [draft,setDraft]=useState({
    galaxy_link:'',
    source_place:'',
    media_type:'',
    title:'',
    url:'',
    meta_tags:'',
    createtime:''
  });
  const [status,setStatus]=useState('');
  const [busy,setBusy]=useState(false);
  if(!account.canManageScopeSync(scopeId))return null;

  const change=(key,value)=>setDraft(current=>({...current,[key]:value}));

  async function save(event){
    event.preventDefault();
    setBusy(true);setStatus('');
    try{
      const galaxyLink=String(draft.galaxy_link||'').trim().toUpperCase();
      if(galaxyLink&&galaxyLink.length!==8)throw new Error(t('uiExtra.importUI.linkUidInvalid'));
      const mediaType=repairMojibakeText(draft.media_type).trim();
      if(!mediaType)throw new Error(t('uiExtra.importUI.mediaTypeRequired'));
      const metaTags=repairMojibakeText(draft.meta_tags).trim();
      const mediaTitle=repairMojibakeText(draft.title).trim();
      const sourcePlace=repairMojibakeText(draft.source_place).trim();
      if([mediaType,metaTags,mediaTitle,sourcePlace].some(hasIrrecoverableEncoding))throw new Error(t('uiExtra.importUI.mediaEncoding'));
      if(!metaTags)throw new Error(t('uiExtra.importUI.tagsRequired'));
      const record={
        galaxy_link:galaxyLink||null,
        source_place:sourcePlace||null,
        media_type:mediaType,
        title:mediaTitle||null,
        url:String(draft.url||'').trim()||null,
        meta_tags:metaTags,
        createtime:mediaIso(draft.createtime)
      };
      const galaxyMedia=account.scopeDataFor(scopeId)?.galaxyMedia;
      if(!galaxyMedia)throw new Error(t('uiExtra.importUI.scopeUnresolved'));
      await insertRows(galaxyMedia,[record]);
      setStatus(t('uiExtra.importUI.mediaSaved'));
      setDraft({
        galaxy_link:'',
        source_place:'',
        media_type:'',
        title:'',
        url:'',
        meta_tags:'',
        createtime:''
      });
    }catch(error){setStatus(error?.message||t('uiExtra.importUI.mediaSaveFailed'));}
    finally{setBusy(false);}
  }

  return <div className="scope-inline-card">
    <h4>{UI_COPY.management.addMedia}</h4>
    <p><UiText id="uiExtra.importUI.mediaHelp"/></p>
    <form onSubmit={save} className="scope-editor">
      <div className="scope-stat-controls">
        <label><span><UiText id="uiExtra.importUI.mediaTypeLabel"/></span><input value={draft.media_type} onChange={e=>change('media_type',e.target.value)} placeholder="ig_pic / facebook_pic / suno / video / url" required/></label>
        <label><span><UiText id="uiExtra.importUI.mediaArticleUidLabel"/></span><input value={draft.galaxy_link} onChange={e=>change('galaxy_link',e.target.value)} placeholder={t('uiExtra.importUI.mediaUidHint')}/></label>
        <label><span><UiText id="uiExtra.importUI.mediaCreatedAtLabel"/></span><input type="datetime-local" value={draft.createtime} onChange={e=>change('createtime',e.target.value)}/></label>
      </div>
      <div className="scope-stat-controls">
        <label><span><UiText id="uiExtra.importUI.mediaLocationLabel"/></span><input value={draft.source_place} onChange={e=>change('source_place',e.target.value)} placeholder={t('uiExtra.importUI.placeHint')}/></label>
      </div>
      <label><span><UiText id="uiExtra.importUI.mediaTitle"/></span><input value={draft.title} onChange={e=>change('title',e.target.value)}/></label>
      <label><span><UiText id="uiExtra.importUI.mediaExternalUrlLabel"/></span><input value={draft.url} onChange={e=>change('url',e.target.value)} placeholder={t('uiExtra.importUI.externalUrlHint')}/></label>
      <label><span><UiText id="uiExtra.importUI.mediaTagsLabel"/></span><input value={draft.meta_tags} onChange={e=>change('meta_tags',e.target.value)} placeholder={t('uiExtra.importUI.tagHint')} required/></label>
      <button type="submit" disabled={busy}>{busy?UI_COPY.common.saving:UI_COPY.management.addMedia}</button>
      {status?<p className="scope-status">{status}</p>:null}
    </form>
  </div>;
}

export default function ManagementArticlePublisher({scopeId}){
  useUiSection('management');
  useUiSection('uiExtra.publisher');
  useUiSection('uiExtra.importUI');
  const UI_COPY=useUiCopy();
  const t=useUiText();
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
          <button className="loc-button primary" type="submit" disabled={busy}><UiText id={busy?'uiExtra.publisher.publishing':'uiExtra.publisher.publishArticle'}/></button>
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

    <MediaRecordInsert scopeId={scopeId}/>
  </section>;
}
