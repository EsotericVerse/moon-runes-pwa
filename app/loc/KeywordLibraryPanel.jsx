'use client';

import {useEffect,useMemo,useState} from 'react';
import {useFeatureCopy,useUiLocale} from '../i18n/ui-locale';
import featureZh from '../i18n/features.zh_tw.js';
import Select from 'react-select';
import dynamic from 'next/dynamic';
import {useQueryClient} from '@tanstack/react-query';
import {copyKeywordLibraryClass,copyRune66KeywordClass,dbAuthRelation,updateRows,writeKeywordLibraryItem} from './db-client.mjs';
import {useAccount} from './use-account';
const BlockNoteEditor=dynamic(()=>import('./BlockNoteEditor'),{loading:()=>null});

// The vis-network bundle is downloaded/mounted only when its view is chosen.
const KeywordNetworkEditor=dynamic(()=>import('./KeywordNetworkEditor'),{ssr:false});

const DEFAULT_KEYWORD_MIN_CHARS=32;
const DEFAULT_KEYWORD_MIN_DOCUMENTS=100;
const KEYWORD_WORKSPACE_OPTIONS=Object.freeze([
  {value:'analysis',key:'analysisSettings'},
  {value:'manual',key:'manual'},
  {value:'network',key:'network'}
]);

function normalizeKeywordLines(value){
  const lines=String(value||'').split(/\r?\n/).map(item=>item.trim()).filter(Boolean);
  return [...new Set(lines)];
}
function keywordText(value){
  return Array.isArray(value)?value.map(item=>String(item||'').trim()).filter(Boolean).join('\n'):'';
}
// Preserve keyword input in the draft even without explicitly applying it.
function keywordDraftWithInput(keywords,selectedKeyword,input){
  const value=String(input||'').trim();
  if(!value)return keywords;
  const index=keywords.indexOf(selectedKeyword);
  const next=keywords.filter(word=>word!==selectedKeyword&&word!==value);
  if(selectedKeyword&&index>=0)next.splice(Math.min(index,next.length),0,value);
  else next.push(value);
  return next;
}
function blankDraft(className='',classId='',itemNo=1){
  return {
    keyword_id:null,
    class_id:classId,
    class_name:className,
    class_group:'',
    class_enable:true,
    item_no:itemNo,
    item_name:'',
    principle:'',
    keywords_text:'',
    order_no:itemNo
  };
}
function formatStaticTime(value,l,locale){
  if(!value)return l.notAnchored;
  const date=new Date(value);
  return Number.isNaN(date.getTime())?String(value):date.toLocaleString(locale,{hour12:false});
}

export default function KeywordLibraryPanel({scopeId='lo3rwang'}){
  const l=useFeatureCopy('keywordPanel',featureZh.keywordPanel);
  const {locale}=useUiLocale();
  const workspaceOptions=KEYWORD_WORKSPACE_OPTIONS.map(option=>({value:option.value,label:l[option.key]}));
  const account=useAccount();
  const queryClient=useQueryClient();
  const scopeData=account.scopeDataFor(scopeId);
  const TABLE=scopeData?.keywords||'';
  const CONFIG_TABLE=scopeData?.config||'';
  const [rows,setRows]=useState([]);
  const [selectedClass,setSelectedClass]=useState('');
  const [selectedId,setSelectedId]=useState('');
  const [selectedGroup,setSelectedGroup]=useState('');
  const [selectedKeyword,setSelectedKeyword]=useState('');
  const [keywordEdit,setKeywordEdit]=useState('');
  const [draft,setDraft]=useState(null);
  const [copyName,setCopyName]=useState('');
  const [minChars,setMinChars]=useState(DEFAULT_KEYWORD_MIN_CHARS);
  const [minDocuments,setMinDocuments]=useState(DEFAULT_KEYWORD_MIN_DOCUMENTS);
  const [currentClassId,setCurrentClassId]=useState('');
  const [shareEnabled,setShareEnabled]=useState(false);
  const [keywordDocumentCount,setKeywordDocumentCount]=useState(0);
  const [staticstime,setStaticstime]=useState('');
  const [configSnapshot,setConfigSnapshot]=useState(null);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [savingStage,setSavingStage]=useState('');
  const [batchProgress,setBatchProgress]=useState(null);
  const [message,setMessage]=useState('');
  const [workspace,setWorkspace]=useState('analysis');

  const canEdit=account.canManageScopeSync(scopeId)&&Boolean(TABLE&&CONFIG_TABLE);

  async function invalidateClassification(){
    const {clearRune66ClassificationCache}=await import('./rune66-keyword-analysis');
    clearRune66ClassificationCache();
    await Promise.all([
      queryClient.invalidateQueries({queryKey:['statistics-style-filter'],refetchType:'all'}),
      queryClient.invalidateQueries({queryKey:['culture-style-filter'],refetchType:'all'})
    ]);
  }

  async function markCurrentClassificationStale(classId){
    if(!classId||String(classId)!==String(currentClassId))return;
    await updateRows(CONFIG_TABLE,{
      staticstime:null,
      keyword_document_count:0,
      keyword_meta:{},
      updated_at:new Date().toISOString()
    },{filters:[{column:'id',operator:'eq',value:scopeId}]});
    await invalidateClassification();
  }

  async function load(preferredId='',preferredClass='',options={}){
    if(!canEdit)return;
    setLoading(true);setMessage('');
    try{
      const [keywordResult,configResult]=await Promise.all([
        dbAuthRelation(TABLE)
          .select('keyword_id,class_id,class_name,class_group,class_enable,item_no,item_name,principle,keywords,order_no')
          .order('class_name',{ascending:true})
          .order('order_no',{ascending:true})
          .order('item_no',{ascending:true}),
        dbAuthRelation(CONFIG_TABLE)
          .select('keyword_min_chars,keyword_min_documents,current_keyword_class_id,keyword_class_share_enabled,keyword_document_count,staticstime')
          .eq('id',scopeId)
          .limit(1)
      ]);
      if(keywordResult.error)throw new Error(keywordResult.error.message||l.libraryReadError);
      if(configResult.error)throw new Error(configResult.error.message||l.settingsReadError);

      const config=configResult.data?.[0]||{};
      const configuredChars=Number(config.keyword_min_chars);
      const configuredDocuments=Number(config.keyword_min_documents);
      const nextMinChars=Number.isInteger(configuredChars)&&configuredChars>=0?configuredChars:DEFAULT_KEYWORD_MIN_CHARS;
      const nextMinDocuments=Number.isInteger(configuredDocuments)&&configuredDocuments>=0?configuredDocuments:DEFAULT_KEYWORD_MIN_DOCUMENTS;
      const nextCurrentClassId=String(config.current_keyword_class_id||'');
      const nextShareEnabled=Boolean(config.keyword_class_share_enabled);
      const nextDocumentCount=Math.max(0,Number(config.keyword_document_count)||0);
      const nextStaticstime=String(config.staticstime||'');

      setMinChars(nextMinChars);
      setMinDocuments(nextMinDocuments);
      setCurrentClassId(nextCurrentClassId);
      setShareEnabled(nextShareEnabled);
      setKeywordDocumentCount(nextDocumentCount);
      setStaticstime(nextStaticstime);
      setConfigSnapshot({
        minChars:nextMinChars,
        minDocuments:nextMinDocuments,
        currentClassId:nextCurrentClassId,
        shareEnabled:nextShareEnabled
      });

      const next=keywordResult.data||[];
      setRows(next);
      const classNames=[...new Set(next.map(row=>String(row.class_name||'').trim()).filter(Boolean))];
      const currentClassName=next.find(row=>String(row.class_id||'')===nextCurrentClassId)?.class_name||'';
      const requested=String(preferredClass||selectedClass||currentClassName||'').trim();
      const nextClass=classNames.includes(requested)?requested:(classNames.includes('符文66')?'符文66':(classNames[0]||''));
      setSelectedClass(nextClass);
      const candidate=next.find(row=>String(row.keyword_id)===String(preferredId))
        ||next.find(row=>String(row.class_name)===nextClass)
        ||null;
      if(candidate){
        setSelectedId(String(candidate.keyword_id));
        setSelectedGroup(String(candidate.class_group||''));
        setSelectedKeyword('');setKeywordEdit('');
        setDraft({...candidate,keywords_text:keywordText(candidate.keywords)});
      }else{
        setSelectedId('');setSelectedGroup('');setSelectedKeyword('');setKeywordEdit('');
        setDraft(null);
      }
      return true;
    }catch(error){
      if(!options.preserveOnError){
        setRows([]);setSelectedId('');setSelectedGroup('');setSelectedKeyword('');setKeywordEdit('');setDraft(null);
      }
      setMessage(l.reloadError+String(error?.message||error));
      return false;
    }finally{
      setLoading(false);
    }
  }

  useEffect(()=>{if(canEdit)load();},[canEdit,account.email,scopeId,TABLE,CONFIG_TABLE]);

  const classes=useMemo(()=>{
    const map=new Map();
    for(const row of rows){
      const id=String(row.class_id||'').trim();
      const name=String(row.class_name||'').trim();
      if(id&&name&&!map.has(id))map.set(id,name);
    }
    return [...map.entries()].map(([class_id,class_name])=>({class_id,class_name}));
  },[rows]);
  const items=useMemo(()=>rows
    .filter(row=>String(row.class_name)===selectedClass)
    .sort((a,b)=>Number(a.order_no||0)-Number(b.order_no||0)||Number(a.item_no||0)-Number(b.item_no||0)),[rows,selectedClass]);
  const selectedClassId=String(items[0]?.class_id||'');
  const groups=useMemo(()=>[...new Set(items.map(item=>String(item.class_group||'').trim()).filter(Boolean))],[items]);
  const groupItems=useMemo(()=>items.filter(item=>String(item.class_group||'').trim()===selectedGroup),[items,selectedGroup]);
  const draftKeywords=useMemo(()=>normalizeKeywordLines(draft?.keywords_text||''),[draft?.keywords_text]);
  const configDirty=Boolean(configSnapshot)&&(
    Number(minChars)!==Number(configSnapshot.minChars)
    ||Number(minDocuments)!==Number(configSnapshot.minDocuments)
    ||String(currentClassId)!==String(configSnapshot.currentClassId)
    ||Boolean(shareEnabled)!==Boolean(configSnapshot.shareEnabled)
  );

  function selectItem(row){
    setSelectedId(String(row.keyword_id));
    setSelectedGroup(String(row.class_group||''));
    setSelectedKeyword('');setKeywordEdit('');
    setDraft({...row,keywords_text:keywordText(row.keywords)});
    setMessage('');
  }
  function newItem(group=''){
    const next=Math.max(0,...items.map(row=>Number(row.item_no)||0))+1;
    setSelectedId('');setSelectedKeyword('');setKeywordEdit('');
    setSelectedGroup(String(group||selectedGroup||''));
    setDraft({...blankDraft(selectedClass,selectedClassId,next),class_group:String(group||selectedGroup||'')});
    setMessage('');
  }

  function chooseGroup(group){
    setSelectedGroup(group);setSelectedId('');setDraft(null);
    setSelectedKeyword('');setKeywordEdit('');setMessage('');
  }
  function applyDraftKeyword(){
    if(!draft)return;
    const value=keywordEdit.trim();
    if(!value){setMessage(l.keywordRequired);return;}
    const next=keywordDraftWithInput(draftKeywords,selectedKeyword,value);
    setDraft(current=>({...current,keywords_text:next.join('\n')}));
    setSelectedKeyword(value);setKeywordEdit(value);
    setMessage(l.addedToDraft);
  }
  function removeDraftKeyword(){
    if(!draft||!selectedKeyword)return;
    setDraft(current=>({...current,keywords_text:draftKeywords.filter(word=>word!==selectedKeyword).join('\n')}));
    setSelectedKeyword('');setKeywordEdit('');
    setMessage(l.removedFromDraft);
  }

  async function save(){
    if(!draft)return;
    const classId=String(draft.class_id||'').trim();
    const className=String(draft.class_name||'').trim();
    const classGroup=String(draft.class_group||'').trim();
    const itemName=String(draft.item_name||'').trim();
    const itemNo=Number(draft.item_no);
    if(!classId){setMessage(l.uuidRequired);return;}
    if(!className){setMessage(l.classRequired);return;}
    if(!classGroup){setMessage(l.groupRequired);return;}
    if(!itemName){setMessage(l.itemNameRequired);return;}
    if(!Number.isInteger(itemNo)||itemNo<0){setMessage(l.itemNumberInvalid);return;}

    const payload={
      keyword_id:draft.keyword_id,
      class_id:classId,
      class_name:className,
      class_group:classGroup,
      class_enable:draft.class_enable!==false,
      item_no:itemNo,
      item_name:itemName,
      principle:String(draft.principle||'').trim(),
      keywords:workspace==='manual'&&keywordEdit.trim()&&(!selectedKeyword||draftKeywords.includes(selectedKeyword))
        ?keywordDraftWithInput(draftKeywords,selectedKeyword,keywordEdit)
        :draftKeywords,
      order_no:Number.isFinite(Number(draft.order_no))?Number(draft.order_no):itemNo
    };

    setBusy(true);setMessage('');
    setSavingStage(l.writing);
    try{
      const result=await writeKeywordLibraryItem(scopeId,draft.keyword_id?'update':'insert',payload);
      // A confirmed write cannot be turned into a "write failure" by a
      // classification reset or re-query that happens afterward.
      setSavingStage(l.updatingAnalysis);
      let classificationWarning='';
      try{
        await markCurrentClassificationStale(classId);
      }catch(error){
        classificationWarning=l.analysisUpdateWarning+String(error?.message||error);
      }
      setSavingStage(l.reloading);
      setSelectedClass(className);
      const reloaded=await load(result.keyword_id||draft.keyword_id||'',className,{preserveOnError:true});
      if(reloaded){
        setMessage((classId===currentClassId?l.savedClassChanged:l.saved)+classificationWarning);
      }else{
        setMessage(l.savedReloadFailed+classificationWarning);
      }
    }catch(error){
      setMessage(l.writeError+String(error?.message||error));
    }finally{
      setSavingStage('');
      setBusy(false);
    }
  }

  async function saveAnalysisSettings(){
    const chars=Number(minChars);
    const documents=Number(minDocuments);
    if(!Number.isInteger(chars)||chars<0||chars>10000){
      setMessage(l.minimumCharsInvalid);return;
    }
    if(!Number.isInteger(documents)||documents<0||documents>1000000){
      setMessage(l.minimumDocumentsInvalid);return;
    }
    if(!classes.some(item=>item.class_id===currentClassId)){
      setMessage(l.activeClassRequired);return;
    }
    const classificationChanged=chars!==Number(configSnapshot?.minChars)||currentClassId!==String(configSnapshot?.currentClassId||'');
    setBusy(true);setMessage('');
    try{
      await updateRows(CONFIG_TABLE,{
        keyword_min_chars:chars,
        keyword_min_documents:documents,
        current_keyword_class_id:currentClassId,
        keyword_class_share_enabled:Boolean(shareEnabled),
        ...(classificationChanged?{staticstime:null,keyword_document_count:0,keyword_meta:{}}:{}),
        updated_at:new Date().toISOString()
      },{filters:[{column:'id',operator:'eq',value:scopeId}]});
      if(classificationChanged)await invalidateClassification();
      await load('',selectedClass);
      setMessage(classificationChanged?l.settingsChanged:l.settingsSaved);
    }catch(error){
      setMessage(String(error?.message||error||l.settingsSaveError));
    }finally{
      setBusy(false);
    }
  }

  async function runBatch(){
    if(configDirty){setMessage(l.settingsUnsaved);return;}
    setBusy(true);setMessage('');
    setBatchProgress({phase:'reading',completed:0,total:0,percent:0,label:l.preparing});
    try{
      const {runRune66ClassificationBatch}=await import('./rune66-keyword-analysis');
      const result=await runRune66ClassificationBatch(scopeId,{onProgress:setBatchProgress});
      await invalidateClassification();
      await load('',selectedClass);
      setMessage(
        l.completedPrefix+Number(result.documentCount||0).toLocaleString()+
        l.analyzedMiddle+Number(result.dynamicTieCount||0).toLocaleString()+
        l.tiesSuffix
      );
    }catch(error){
      setBatchProgress(current=>current?{...current,phase:'failed',label:l.analysisInterrupted}:null);
      const rawMessage=String(error?.message||error||l.batchError);
      // Friendlier text for the two guard errors added on the DB side
      // (silver.apply_keyword_classification, mode='begin'): one person
      // double-clicking, or two people running this at once.
      const cooldownMatch=rawMessage.match(/keyword classification cooldown active: ([\d.]+) ?s remaining/i);
      if(cooldownMatch){
        setMessage(l.classificationCooldownActive.replace('{seconds}',cooldownMatch[1]));
      }else if(/keyword classification already running for this scope/i.test(rawMessage)){
        setMessage(l.classificationAlreadyRunning);
      }else{
        setMessage(rawMessage);
      }
    }finally{
      setBusy(false);
    }
  }

  async function remove(){
    if(!draft?.keyword_id)return;
    if(!window.confirm(l.confirmDelete))return;
    const classId=String(draft.class_id||'');
    setBusy(true);setMessage('');
    try{
      await writeKeywordLibraryItem(scopeId,'delete',draft);
      await markCurrentClassificationStale(classId);
      setSelectedId('');setDraft(null);
      await load('',selectedClass);
      setMessage(classId===currentClassId?l.deletedClassChanged:l.deleted);
    }catch(error){
      setMessage(String(error?.message||error||l.deleteError));
    }finally{
      setBusy(false);
    }
  }

  async function removeItemRow(row){
    if(!row?.keyword_id)return false;
    if(!window.confirm(l.deletePrefix+String(row.item_name||l.thisItem)+l.deleteSuffix))return false;
    const classId=String(row.class_id||'');
    setBusy(true);setMessage('');
    try{
      await writeKeywordLibraryItem(scopeId,'delete',row);
      await markCurrentClassificationStale(classId);
      if(String(selectedId)===String(row.keyword_id)){setSelectedId('');setDraft(null);}
      await load('',selectedClass);
      setMessage(l.needsReanalysis);
      return true;
    }catch(error){
      setMessage(String(error?.message||error||l.deleteError));
      return false;
    }finally{setBusy(false);}
  }

  async function removeKeyword(row,keyword){
    if(!row?.keyword_id||!keyword)return false;
    const next=(Array.isArray(row.keywords)?row.keywords:[]).filter(item=>String(item)!==String(keyword));
    setBusy(true);setMessage('');
    try{
      await writeKeywordLibraryItem(scopeId,'update',{...row,keywords:next});
      await markCurrentClassificationStale(String(row.class_id||''));
      await load(row.keyword_id,selectedClass);
      setMessage(l.keywordDeletePrefix+keyword+l.keywordDeleteSuffix);
      return true;
    }catch(error){
      setMessage(String(error?.message||error||l.keywordDeleteError));
      return false;
    }finally{setBusy(false);}
  }

  async function removeGroup(group){
    const targets=items.filter(row=>String(row.class_group||'')===String(group||''));
    if(!targets.length)return false;
    if(!window.confirm(l.groupConfirmPrefix+group+l.groupConfirmMiddle+targets.length+l.groupConfirmSuffix))return false;
    setBusy(true);setMessage('');
    try{
      for(const row of targets)await writeKeywordLibraryItem(scopeId,'delete',row);
      await markCurrentClassificationStale(selectedClassId);
      setSelectedId('');setDraft(null);
      await load('',selectedClass);
      setMessage(l.groupDeletedPrefix+group+l.groupDeletedSuffix);
      return true;
    }catch(error){
      setMessage(String(error?.message||error||l.groupDeleteError));
      return false;
    }finally{setBusy(false);}
  }

  async function copyRune66(){
    if(busy)return;
    setBusy(true);setMessage('');
    try{
      const result=await copyRune66KeywordClass(scopeId);
      const createdName=String(result.class_name||'').trim();
      const reloaded=await load('',createdName,{preserveOnError:true});
      setMessage(reloaded
        ?l.copyRunePrefix+createdName+l.copyRuneJoin+result.count+l.runeCountUnit+result.class_id+l.copyRuneSuffix
        :l.copyRuneReloadPrefix+result.class_id+l.copyRuneReloadSuffix);
    }catch(error){
      setMessage(l.copyRuneError+String(error?.message||error));
    }finally{
      setBusy(false);
    }
  }

  async function copyClass(){
    const target=String(copyName||'').trim();
    if(!selectedClass){setMessage(l.classCopyRequired);return;}
    if(!target){setMessage(l.newClassRequired);return;}
    setBusy(true);setMessage('');
    try{
      const result=await copyKeywordLibraryClass(scopeId,selectedClass,target);
      setCopyName('');
      await load('',target);
      setMessage(l.copiedPrefix+result.count+l.copiedMiddle+target+l.copiedSuffix+result.class_id);
    }catch(error){
      setMessage(String(error?.message||error||l.classCopyError));
    }finally{
      setBusy(false);
    }
  }

  async function copyClassUuid(){
    if(!selectedClassId)return;
    try{
      await navigator.clipboard.writeText(selectedClassId);
      setMessage(l.uuidCopied+scopeId+l.uuidCopiedSuffix);
    }catch{
      setMessage(l.uuidCopyFailed);
    }
  }

  if(!canEdit)return null;

  return <section className="loc-card scope-feature-card scope-management-workspace">
    <p className="loc-eyebrow">Keyword Library</p>
    <h2>{l.title}</h2>
    <p>{l.description}</p>
    <div className="scope-stat-controls">
      <button type="button" className="loc-button" disabled={busy||loading} onClick={copyRune66}>{busy?l.processing:l.copyRuneButton}</button>
      <span className="scope-status">{l.copyHint}</span>
    </div>
    {workspace==='analysis'&&message?<p role="status" aria-live="polite" className={message.includes(l.errorWord)||message.includes('failed')?'scope-status scope-error':'scope-status'}>{message}</p>:null}

    <div className="scope-stat-controls scope-stat-workspace-switch">
      <label htmlFor="keyword-workspace-picker">{l.workspace}</label>
      <Select
        inputId="keyword-workspace-picker"
        className="scope-workspace-select"
        classNamePrefix="scope-workspace-select"
        unstyled
        isSearchable={false}
        options={workspaceOptions}
        value={workspaceOptions.find(option=>option.value===workspace)}
        onChange={option=>{const next=option?.value||'analysis';setWorkspace(next);if(next==='manual'||next==='network')chooseGroup('');}}
        aria-label={l.workspace}
      />
    </div>

    {workspace==='analysis'?<section className="scope-inline-card">
      <h3>{l.analysisSettings}</h3>
      <div className="scope-management-fields">
        <label><span>{l.activeClass}</span><select className="scope-select" value={currentClassId} onChange={event=>setCurrentClassId(event.target.value)}>
          {classes.map(item=><option key={item.class_id} value={item.class_id}>{item.class_name}</option>)}
        </select></label>
        <label><span>{l.minChars}</span><input type="number" min="0" max="10000" step="1" value={minChars} onChange={event=>setMinChars(event.target.value)}/></label>
        <label><span>{l.minDocuments}</span><input type="number" min="0" max="1000000" step="1" value={minDocuments} onChange={event=>setMinDocuments(event.target.value)}/></label>
        <label><span>{l.sharePermission}</span><select className="scope-select" value={shareEnabled?'open':'closed'} onChange={event=>setShareEnabled(event.target.value==='open')}>
          <option value="closed">{l.closed}</option>
          <option value="open">{l.open}</option>
        </select></label>
      </div>
      <p className="scope-status">{l.minCharsPrefix}{minChars}{l.minCharsMiddle}{minDocuments}{l.minCharsSuffix}</p>
      <p className="scope-status">{l.anchored}{formatStaticTime(staticstime,l,locale)}{l.validArticles}{Number(keywordDocumentCount||0).toLocaleString()}{l.articleUnit}{staticstime?'':l.reanalyzeNeeded}</p>
      <div className="scope-preview-links">
        <button type="button" className="loc-button" disabled={busy||!configDirty} onClick={saveAnalysisSettings}>{l.saveSettings}</button>
        <button type="button" className="loc-button primary" disabled={busy||configDirty||!currentClassId} onClick={runBatch}>{busy?l.processing:l.reanalyse}</button>
      </div>
      {batchProgress?<div className="scope-keyword-batch-progress" role="status" aria-live="polite">
        <div className="scope-keyword-batch-progress-head"><strong>{batchProgress.phase==='failed'?l.incomplete:batchProgress.phase==='completed'?l.complete:l.attrProgress}</strong><span>{batchProgress.percent}%</span></div>
        <progress value={batchProgress.percent} max="100" aria-label={l.attrProgress} />
        <p>{batchProgress.label}</p>
        {batchProgress.total>0?<p>{l.stage}{Number(batchProgress.completed||0).toLocaleString()} / {Number(batchProgress.total).toLocaleString()}{l.articleUnit}</p>:null}
      </div>:null}
    </section>:null}

    {workspace!=='analysis'?<>
    <div className="scope-stat-controls">
      <label><span>Class</span><select className="scope-select" value={selectedClass} onChange={event=>{const name=event.target.value;setSelectedClass(name);const first=rows.find(row=>String(row.class_name)===name);if(workspace==='manual'||workspace==='network')chooseGroup('');else if(first)selectItem(first);else chooseGroup('');}}>
        {[...new Set(classes.map(item=>item.class_name))].map(name=><option key={name} value={name}>{name}</option>)}
      </select></label>
    </div>
    {selectedClassId?<div className="scope-stat-controls">
      <label><span>Class UUID</span><input value={selectedClassId} readOnly aria-readonly="true"/></label>
      <button type="button" className="loc-button" onClick={copyClassUuid}>{l.copyUuid}</button>
      <span className="scope-status">scope_id: {scopeId}</span>
    </div>:null}

    <div className="scope-stat-controls">
      <label><span>{l.copyCurrentClass}</span><input value={copyName} placeholder={l.newClassName} onChange={event=>setCopyName(event.target.value)}/></label>
      <button type="button" className="loc-button" disabled={busy||!selectedClass} onClick={copyClass}>{l.copyFullClass}</button>
    </div>

    {loading?<p className="scope-status" role="status">{l.loadingKeywords}</p>:null}
    {savingStage?<p className="scope-status scope-keyword-saving-progress" role="status" aria-live="polite" aria-busy="true"><span className="scope-keyword-saving-spinner" aria-hidden="true"/>{savingStage}</p>:null}
    {!loading&&workspace==='network'&&items.length?<div className="scope-keyword-network-layout">
      <KeywordNetworkEditor
        key={selectedClassId||selectedClass}
        items={items}
        className={selectedClass}
        classId={selectedClassId}
        selectedId={selectedId}
        onSelectItem={selectItem}
        onNewItem={newItem}
        onDeleteItem={removeItemRow}
        onDeleteKeyword={removeKeyword}
        onDeleteGroup={removeGroup}
        onMessage={setMessage}
      />
    </div>:null}

    {!loading?<aside className="scope-management-editor scope-keyword-network-inspector">
      <p className="scope-status">{workspace==='manual'?l.manualHint:l.networkHint}</p>
      {workspace==='manual'?<>
        <div className="scope-stat-controls scope-keyword-manual-path">
          <label><span>{l.runeGroup}</span><select className="scope-select" aria-label={l.selectRuneGroup} value={selectedGroup} onChange={event=>chooseGroup(event.target.value)}>
            <option value="">{l.chooseRuneGroup}</option>
            {groups.map(group=><option key={group} value={group}>{group}</option>)}
          </select></label>
          <label><span>{l.runeItem}</span><select className="scope-select" aria-label={l.selectRune} value={groupItems.some(row=>String(row.keyword_id)===selectedId)?selectedId:''} disabled={!selectedGroup} onChange={event=>{
            const chosen=groupItems.find(row=>String(row.keyword_id)===event.target.value);
            if(chosen)selectItem(chosen);
            else {setSelectedId('');setDraft(null);setSelectedKeyword('');setKeywordEdit('');}
          }}>
            <option value="">{l.chooseRune}</option>
            {groupItems.map(item=><option key={item.keyword_id} value={item.keyword_id}>{item.item_name||(item.item_no??'')}</option>)}
          </select></label>
          <label><span>{l.keyword}</span><select className="scope-select" aria-label={l.selectKeyword} value={draftKeywords.includes(selectedKeyword)?selectedKeyword:''} disabled={!draft} onChange={event=>{
            const word=event.target.value;setSelectedKeyword(word);setKeywordEdit(word);
          }}>
            <option value="">{l.addKeyword}</option>
            {draftKeywords.map(word=><option key={word} value={word}>{word}</option>)}
          </select></label>
        </div>
        <div className="scope-stat-controls">
          <button type="button" className="loc-button" disabled={!selectedGroup} onClick={()=>newItem(selectedGroup)}>{l.addRuneItem}</button>
          {draft?<><label><span>{l.keywordContent}</span><input aria-label={l.keywordContent} value={keywordEdit} onChange={event=>setKeywordEdit(event.target.value)} placeholder={l.keywordPlaceholder}/></label>
            <button type="button" className="loc-button" onClick={applyDraftKeyword} disabled={busy||!keywordEdit.trim()}>{l.applyDraft}</button>
            {selectedKeyword?<button type="button" className="loc-button scope-danger-button" disabled={busy} onClick={removeDraftKeyword}>{l.removeDraft}</button>:null}
          </>:null}
        </div>
      </>:items.length?<div className="scope-stat-controls">
        <label><span>{l.selectItem}</span><select className="scope-select" value={selectedId} onChange={event=>{
          const chosen=items.find(row=>String(row.keyword_id)===event.target.value);
          if(chosen)selectItem(chosen);
        }}>
          <option value="">{l.newOrNone}</option>
          {items.map(item=><option key={item.keyword_id} value={item.keyword_id}>{item.class_group} · {item.item_name||(item.item_no??'')}</option>)}
        </select></label>
        <button type="button" className="loc-button" onClick={()=>newItem(items[0]?.class_group||'')}>{l.addItem}</button>
      </div>:null}
        {!draft?<p className="scope-status">{workspace==='manual'?l.manualEmpty:l.networkEmpty}</p>:<>
          <div className="scope-management-fields">
            <label><span>Class</span><input value={draft.class_name||''} readOnly aria-readonly="true"/></label>
            <label><span>Group</span><input value={draft.class_group||''} onChange={event=>setDraft(current=>({...current,class_group:event.target.value}))}/></label>
            <label><span>{l.classEnabled}</span><select className="scope-select" value={draft.class_enable===false?'false':'true'} onChange={event=>setDraft(current=>({...current,class_enable:event.target.value==='true'}))}><option value="true">{l.yes}</option><option value="false">{l.no}</option></select></label>
            <label><span>{l.itemNo}</span><input type="number" min="0" value={draft.item_no??''} onChange={event=>setDraft(current=>({...current,item_no:event.target.value}))}/></label>
            <label><span>{l.itemName}</span><input value={draft.item_name||''} onChange={event=>setDraft(current=>({...current,item_name:event.target.value}))}/></label>
            <label><span>{l.sort}</span><input type="number" value={draft.order_no??''} onChange={event=>setDraft(current=>({...current,order_no:event.target.value}))}/></label>
          </div>
          <div className="scope-management-wide-field"><span>{l.principle}</span>
            <BlockNoteEditor editorKey={'keyword-principle:'+scopeId+':'+String(draft.keyword_id||'new:'+selectedGroup)}
              content={draft.principle||''} canInsertImage={false}
              onPlainTextChange={value=>setDraft(current=>({...current,principle:value}))}/>
          </div>
          <div className="scope-management-wide-field"><span>{l.keywordsPerLine}</span>
            <BlockNoteEditor editorKey={'keyword-lines:'+scopeId+':'+String(draft.keyword_id||'new:'+selectedGroup)}
              content={draft.keywords_text||''} canInsertImage={false}
              onPlainTextChange={value=>setDraft(current=>({...current,keywords_text:value}))}/>
          </div>
          <div className="scope-preview-links">
            <button type="button" className="loc-button primary" disabled={busy} onClick={save}>{busy?l.saving:l.save}</button>
            {draft.keyword_id?<button type="button" className="loc-button scope-danger-button" disabled={busy} onClick={remove}>{l.deleteItem}</button>:null}
          </div>
        </>}
        {message?<p role="status" aria-live="polite" className={message.includes(l.errorWord)||message.includes('failed')||message.includes(l.notAllowedWord)||message.includes('0 rows')||message.includes(l.alreadyExistsWord)?'scope-status scope-error':'scope-status'}>{message}</p>:null}
      </aside>:null}
    {!loading&&!items.length?<div className="scope-keyword-empty">
      <p className="scope-status">{l.noClassItems}</p>
      <button type="button" className="loc-button" onClick={()=>newItem('')}>{l.createFirst}</button>
    </div>:null}
    </>:null}
  </section>;
}
