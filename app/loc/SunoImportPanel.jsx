'use client';

import {useState} from 'react';
import {useUiCopy} from '../i18n/ui-locale';
import UiText,{useUiText} from '../i18n/UiText';
import {insertRows} from './db-client.mjs';
import {useAccount} from './use-account';
import {createUid8} from './uid';
import {hasIrrecoverableEncoding,normalizeGalaxyContent,normalizeRelationIds,repairMojibakeText} from './content-policy';
import {refreshSunoStyleMetaTags} from './suno-style-meta-tags.mjs';
import BlockNoteEditor from './BlockNoteEditor';
import {blocksToPlainText,hasBlockNoteContent,plainTextToBlocks} from './blocknote-content.mjs';

export default function SunoImportPanel({scopeId}){
  const UI_COPY=useUiCopy();
  const t=useUiText();
  const account=useAccount();
  const freshSunoDraft=()=>({title:'',lyrics:'',lyricsBlocks:plainTextToBlocks(''),stylePrompt:'',stylePromptBlocks:plainTextToBlocks(''),stylePromptPlain:'',editorKey:createUid8(),url:'',createdDate:'',metaTags:'',metaTagsEdited:false,source_id:'',target_id:'',ref_id:''});
  const [draft,setDraft]=useState(freshSunoDraft);
  const [status,setStatus]=useState('');const [busy,setBusy]=useState(false);
  if(!account.canManageScopeSync(scopeId))return null;
  const change=(key,value)=>setDraft(current=>({
    ...current,[key]:value,
    ...(key==='stylePromptPlain'&&!current.metaTagsEdited?{metaTags:refreshSunoStyleMetaTags(value,current.metaTags)}:{}),
    ...(key==='metaTags'?{metaTagsEdited:true}:{})
  }));
  function regenerateStyleTags(){
    setDraft(current=>({...current,metaTags:refreshSunoStyleMetaTags(current.stylePromptPlain,current.metaTags),metaTagsEdited:false}));
  }
  async function save(event){
    event.preventDefault();setBusy(true);setStatus('');
    try{
      const title=repairMojibakeText(draft.title).trim();
      const lyrics=normalizeGalaxyContent(draft.lyrics||blocksToPlainText(draft.lyricsBlocks));
      const stylePrompt=normalizeGalaxyContent(draft.stylePrompt||blocksToPlainText(draft.stylePromptBlocks));
      const metaTags=repairMojibakeText(draft.metaTags).trim();
      if([title,lyrics,stylePrompt,metaTags].some(hasIrrecoverableEncoding))throw new Error(t('uiExtra.importUI.sunoEncoding'));
      if(!title)throw new Error(t('uiExtra.importUI.sunoTitleRequired'));
      if(!metaTags)throw new Error(t('uiExtra.importUI.sunoTagsRequired'));
      const createtime=draft.createdDate?new Date(draft.createdDate+'T00:00:00+08:00').toISOString():new Date().toISOString();
      const lyricsUid=hasBlockNoteContent(lyrics)?createUid8():null;
      const styleUid=lyricsUid&&hasBlockNoteContent(stylePrompt)?createUid8():null;
      const sourceId=draft.source_id.trim()||(styleUid?draft.ref_id.trim():'')||null;
      const scopeData=account.scopeDataFor(scopeId);
      if(!scopeData)throw new Error(t('uiExtra.importUI.scopeUnresolved'));
      const {galaxy,galaxyMedia}=scopeData;
      if(lyricsUid){
        await insertRows(galaxy,[{
          uid:lyricsUid,
          title,content:lyrics,createtime,
          source_id:sourceId,target_id:normalizeRelationIds(draft.target_id),ref_id:styleUid||draft.ref_id.trim()||null,
          url:draft.url.trim()||null,searchable:true,source_name:'suno'
        }]);
      }
      if(styleUid){
        await insertRows(galaxy,[{
          uid:styleUid,
          title:title+'｜Suno Style',content:stylePrompt,createtime,
          target_id:[lyricsUid],searchable:false,statistics_able:false,source_name:'suno'
        }]);
      }
      await insertRows(galaxyMedia,[{
        galaxy_link:lyricsUid,
        media_type:'suno',
        title,url:draft.url.trim()||null,
        meta_tags:metaTags||null,createtime
      }]);
      setStatus(t('uiExtra.importUI.sunoSaved'));setDraft(freshSunoDraft());
    }catch(error){setStatus(error?.message||t('uiExtra.importUI.sunoSaveFailed'));}
    finally{setBusy(false);}
  }
  return <div className="scope-inline-card">
    <h4><UiText id="uiExtra.importUI.sunoImport"/></h4>
    <form onSubmit={save} className="scope-editor">
      <label>{UI_COPY.management.songTitle}<input value={draft.title} onChange={e=>change('title',e.target.value)}/></label>
      <div className="scope-management-wide-field"><span>{UI_COPY.management.lyrics}</span>
        <BlockNoteEditor editorKey={'suno-lyrics:'+draft.editorKey} content={draft.lyricsBlocks}
          onBlocksChange={blocks=>setDraft(current=>current.editorKey===draft.editorKey
            ?{...current,lyricsBlocks:blocks}:current)}
          onHtmlChange={html=>setDraft(current=>current.editorKey===draft.editorKey
            ?{...current,lyrics:html}:current)}/>
      </div>
      <div className="scope-stat-controls">
        <label>Suno URL<input value={draft.url} onChange={e=>change('url',e.target.value)}/></label>
        <label><UiText id="common.date"/><input type="date" value={draft.createdDate} onChange={e=>change('createdDate',e.target.value)}/></label>
      </div>
      <div className="scope-stat-controls">
        <div className="scope-management-wide-field"><span>Suno Style</span>
          <BlockNoteEditor editorKey={'suno-style:'+draft.editorKey} content={draft.stylePromptBlocks}
            onBlocksChange={blocks=>setDraft(current=>current.editorKey!==draft.editorKey?current:{
              ...current,stylePromptBlocks:blocks,
              stylePromptPlain:blocksToPlainText(blocks),
              ...(!current.metaTagsEdited?{metaTags:refreshSunoStyleMetaTags(blocksToPlainText(blocks),current.metaTags)}:{})
            })}
            onHtmlChange={html=>setDraft(current=>current.editorKey===draft.editorKey
              ?{...current,stylePrompt:html}:current)}/>
        </div>
        <label>Meta Tags<input value={draft.metaTags} onChange={e=>change('metaTags',e.target.value)} placeholder={t('uiExtra.importUI.sunoStyleTagHint')} required/></label>
        <button type="button" className="loc-button" onClick={regenerateStyleTags}><UiText id="uiExtra.importUI.sunoRegenerate"/></button>
      </div>
      <div className="scope-stat-controls">
        <label>source_id<input value={draft.source_id} onChange={e=>change('source_id',e.target.value)}/></label>
        <label>target_id<input value={draft.target_id} onChange={e=>change('target_id',e.target.value)}/></label>
        <label>ref_id<input value={draft.ref_id} onChange={e=>change('ref_id',e.target.value)}/></label>
      </div>
      <button type="submit" disabled={busy}>{busy?UI_COPY.common.saving:UI_COPY.management.addSuno}</button>
      {status?<p className="scope-status">{status}</p>:null}
    </form>
  </div>;
}

