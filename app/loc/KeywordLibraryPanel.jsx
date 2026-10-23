'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {useEditDock} from '../modular/edit-dock';
import {useFeatureCopy,useUiLocale} from '../i18n/ui-locale';
import featureZh from '../i18n/features.zh_tw.js';
import ManagementSectionNav from '../modular/ManagementSectionNav';
import dynamic from 'next/dynamic';
import {useQueryClient} from '@tanstack/react-query';
import {copyKeywordLibraryClass,copyRune66KeywordClass,dbAuthRelation,resetKeywordClassification,updateRows,writeKeywordLibraryItem} from './db-client.mjs';
const BlockNoteEditor=dynamic(()=>import('./BlockNoteEditor'),{loading:()=>null});

// The vis-network bundle is downloaded/mounted only when its view is chosen.
const KeywordNetworkEditor=dynamic(()=>import('./KeywordNetworkEditor'),{ssr:false});

const DEFAULT_KEYWORD_MIN_CHARS=32;
const DEFAULT_KEYWORD_MIN_DOCUMENTS=100;
const KEYWORD_WORKSPACE_OPTIONS=Object.freeze([
  {value:'analysis',key:'analysisSettings'},
  {value:'manual',key:'manual'},
  {value:'network',key:'network'},
  {value:'library',key:'title'}
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
export default function KeywordLibraryPanel({scopeId='lo3rwang',account}){
  const l=useFeatureCopy('keywordPanel',featureZh.keywordPanel);
  const {locale}=useUiLocale();
  const workspaceOptions=KEYWORD_WORKSPACE_OPTIONS.map(option=>({value:option.value,label:l[option.key]}));
  const editDock=useEditDock();
  const dockActions=useRef({save:null});
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
  // Zero-keyword-hit fallback item (silver.{scope}_keywords.default_group_item_no).
  // Stored per class_id (same value on every row of that class), so it rides
  // along in the main keyword SELECT below rather than a separate query.
  const [defaultGroupItemNo,setDefaultGroupItemNo]=useState('0');
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
    const {clearKeywordAnalysisCache}=await import('./keyword-analysis');
    clearKeywordAnalysisCache();
    await Promise.all([
      queryClient.invalidateQueries({queryKey:['statistics-style-filter'],refetchType:'all'}),
      queryClient.invalidateQueries({queryKey:['culture-style-filter'],refetchType:'all'})
    ]);
  }

  async function markCurrentClassificationStale(classId){
    if(!classId||String(classId)!==String(currentClassId))return;
    // staticstime:null alone already forces the next run to be non-skippable
    // (checkSkippable's first check in keyword-analysis.js is `if(!config.
    // staticstime)return null`) -- keyword_meta must NOT be wiped here.
    // keyword_meta.shas is the narrowing baseline (changedItemNosOf); this
    // function runs after every single keyword edit/remove/copy, so wiping
    // it here meant the very next 重新分析 could never see a matching-length
    // stored baseline and narrowing could never fire, ever, for the normal
    // edit-then-reanalyze workflow. Keep keyword_meta intact; only the
    // finalize RPC (reset mode, or a successful run) should ever replace it.
    await updateRows(CONFIG_TABLE,{
      staticstime:null,
      keyword_document_count:0,
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
          .select('keyword_id,class_id,class_name,class_group,class_enable,item_no,item_name,principle,keywords,order_no,default_group_item_no')
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

      const next=keywordResult.data||[];
      setRows(next);
      const classNames=[...new Set(next.map(row=>String(row.class_name||'').trim()).filter(Boolean))];
      const currentClassName=next.find(row=>String(row.class_id||'')===nextCurrentClassId)?.class_name||'';
      const requested=String(preferredClass||selectedClass||currentClassName||'').trim();
      const nextClass=classNames.includes(requested)?requested:(classNames.includes('符文66')?'符文66':(classNames[0]||''));
      setSelectedClass(nextClass);
      // Same value is repeated on every row of nextCurrentClassId -- any one row works.
      const nextDefaultGroupItemNo=String(next.find(row=>String(row.class_id||'')===nextCurrentClassId)?.default_group_item_no??0);

      setMinChars(nextMinChars);
      setMinDocuments(nextMinDocuments);
      setCurrentClassId(nextCurrentClassId);
      setShareEnabled(nextShareEnabled);
      setKeywordDocumentCount(nextDocumentCount);
      setStaticstime(nextStaticstime);
      setDefaultGroupItemNo(nextDefaultGroupItemNo);
      setConfigSnapshot({
        minChars:nextMinChars,
        minDocuments:nextMinDocuments,
        currentClassId:nextCurrentClassId,
        shareEnabled:nextShareEnabled,
        defaultGroupItemNo:nextDefaultGroupItemNo
      });
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
  // For the "預設群組" dropdown in 分析設定: the active analysis class's items
  // (currentClassId, not selectedClass -- the panel can be browsing a different
  // class in the manual editor while 分析設定 still targets currentClassId).
  const currentClassItems=useMemo(()=>rows
    .filter(row=>String(row.class_id)===String(currentClassId))
    .sort((a,b)=>Number(a.order_no||0)-Number(b.order_no||0)||Number(a.item_no||0)-Number(b.item_no||0)),[rows,currentClassId]);
  const selectedClassId=String(items[0]?.class_id||'');
  const groups=useMemo(()=>[...new Set(items.map(item=>String(item.class_group||'').trim()).filter(Boolean))],[items]);
  const groupItems=useMemo(()=>items.filter(item=>String(item.class_group||'').trim()===selectedGroup),[items,selectedGroup]);
  const draftKeywords=useMemo(()=>normalizeKeywordLines(draft?.keywords_text||''),[draft?.keywords_text]);
  const configDirty=Boolean(configSnapshot)&&(
    Number(minChars)!==Number(configSnapshot.minChars)
    ||Number(minDocuments)!==Number(configSnapshot.minDocuments)
    ||String(currentClassId)!==String(configSnapshot.currentClassId)
    ||Boolean(shareEnabled)!==Boolean(configSnapshot.shareEnabled)
    ||String(defaultGroupItemNo)!==String(configSnapshot.defaultGroupItemNo)
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
    if(!draft){setMessage('請先選擇要編輯的關鍵詞。');return false;}
    const classId=String(draft.class_id||'').trim();
    const className=String(draft.class_name||'').trim();
    const classGroup=String(draft.class_group||'').trim();
    const itemName=String(draft.item_name||'').trim();
    const itemNo=Number(draft.item_no);
    if(!classId){setMessage(l.uuidRequired);return false;}
    if(!className){setMessage(l.classRequired);return false;}
    if(!classGroup){setMessage(l.groupRequired);return false;}
    if(!itemName){setMessage(l.itemNameRequired);return false;}
    if(!Number.isInteger(itemNo)||itemNo<0){setMessage(l.itemNumberInvalid);return false;}

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
      return true;
    }catch(error){
      const detail=l.writeError+String(error?.message||error);
      setMessage(detail);
      if(editDock?.active)editDock.setNotice(detail);
      return false;
    }finally{
      setSavingStage('');
      setBusy(false);
    }
  }

  async function saveAnalysisSettings(){
    const chars=Number(minChars);
    const documents=Number(minDocuments);
    if(!Number.isInteger(chars)||chars<0||chars>10000){
      setMessage(l.minimumCharsInvalid);return false;
    }
    if(!Number.isInteger(documents)||documents<0||documents>1000000){
      setMessage(l.minimumDocumentsInvalid);return false;
    }
    if(!classes.some(item=>item.class_id===currentClassId)){
      setMessage(l.activeClassRequired);return false;
    }
    const defaultItemNo=Number(defaultGroupItemNo);
    if(!Number.isInteger(defaultItemNo)||!currentClassItems.some(item=>Number(item.item_no)===defaultItemNo)){
      setMessage(l.defaultGroupInvalid);return false;
    }
    const defaultGroupChanged=String(defaultItemNo)!==String(configSnapshot?.defaultGroupItemNo||'0');
    const classificationChanged=chars!==Number(configSnapshot?.minChars)||currentClassId!==String(configSnapshot?.currentClassId||'')||defaultGroupChanged;
    setBusy(true);setMessage('');
    try{
      if(defaultGroupChanged){
        await updateRows(TABLE,{default_group_item_no:defaultItemNo},{filters:[{column:'class_id',operator:'eq',value:currentClassId}]});
      }
      await updateRows(CONFIG_TABLE,{
        keyword_min_chars:chars,
        keyword_min_documents:documents,
        current_keyword_class_id:currentClassId,
        keyword_class_share_enabled:Boolean(shareEnabled),
        // staticstime:null + keyword_document_count:0 correctly mark the
        // classification as stale/unverified the moment a setting that
        // affects it changes (min_chars, current class, default group).
        // keyword_meta is NOT cleared here: it holds the sha-narrowing
        // baseline from the last successful run, which is still valid
        // (none of these settings change keyword content), and wiping it
        // would force every next reanalysis to do a full scan instead of
        // a narrowed one -- the same bug already fixed in
        // markCurrentClassificationStale.
        ...(classificationChanged?{staticstime:null,keyword_document_count:0}:{}),
        updated_at:new Date().toISOString()
      },{filters:[{column:'id',operator:'eq',value:scopeId}]});
      if(classificationChanged)await invalidateClassification();
      await load('',selectedClass);
      setMessage(classificationChanged?l.settingsChanged:l.settingsSaved);
      return true;
    }catch(error){
      const detail=String(error?.message||error||l.settingsSaveError);
      setMessage(detail);
      if(editDock?.active)editDock.setNotice(detail);
      return false;
    }finally{
      setBusy(false);
    }
  }

  async function runBatch(){
    if(configDirty){setMessage(l.settingsUnsaved);return;}
    setBusy(true);setMessage('');
    setBatchProgress({phase:'reading',completed:0,total:0,percent:0,label:l.preparing});
    try{
      const {runKeywordAnalysisBatch}=await import('./keyword-analysis');
      const result=await runKeywordAnalysisBatch(scopeId,{onProgress:setBatchProgress});
      await invalidateClassification();
      // Refreshes `staticstime` from the row the run just finalized; the
      // cooldown effect above picks up the new value and greys the button
      // out for the remainder of the 5-minute window on its own.
      await load('',selectedClass);
      setMessage(
        result.skipped?
          l.skippedNoChange+Number(result.documentCount||0).toLocaleString()+l.skippedNoChangeSuffix:
          l.completedPrefix+Number(result.documentCount||0).toLocaleString()+
          l.analyzedMiddle+Number(result.dynamicTieCount||0).toLocaleString()+
          l.tiesSuffix
      );
    }catch(error){
      setBatchProgress(current=>current?{...current,phase:'failed',label:l.analysisInterrupted}:null);
      setMessage(String(error?.message||error||l.batchError));
    }finally{
      setBusy(false);
    }
  }

  // Manual full wipe (class_id/group_lists only -- keyword library rows are
  // untouched) for when the keyword library changed enough that a clean
  // slate is wanted instead of the incremental narrowed reanalysis above.
  // Does not re-run analysis by itself; press 重新分析 afterward.
  async function resetBatch(){
    if(!window.confirm(l.confirmReset))return;
    setBusy(true);setMessage('');
    try{
      await resetKeywordClassification(scopeId);
      await invalidateClassification();
      await load('',selectedClass);
      setMessage(l.resetDone);
    }catch(error){
      setMessage(String(error?.message||error||l.resetError));
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

  const originalItem=rows.find(row=>String(row.keyword_id)===String(draft?.keyword_id||''));
  const draftDirty=Boolean(draft&&(
    !draft.keyword_id||
    (originalItem&&(
      ['class_id','class_name','class_group','class_enable','item_no','item_name','principle','order_no']
        .some(key=>String(draft[key]??'')!==String(originalItem[key]??''))||
      String(draft.keywords_text||'')!==keywordText(originalItem.keywords)
    ))||
    (workspace==='manual'&&keywordEdit.trim()&&keywordEdit!==selectedKeyword)
  ));
  dockActions.current={
    save:async({switching=false}={})=>{
      if(busy||loading)return false;
      if(configDirty&&draftDirty){
        setMessage('分析設定與關鍵詞草稿都有未儲存內容，請分別儲存。');
        return false;
      }
      const choice=configDirty?'analysis':draftDirty?'manual':workspace;
      if(choice==='library'){
        setMessage(l.libraryImmediateSave);
        return false;
      }
      const success=await (choice==='analysis'?saveAnalysisSettings():save());
      return success;
    },
    isDirty:()=>configDirty||draftDirty,
    isBusy:()=>busy||loading
  };
  useEffect(()=>{
    if(!editDock?.active||editDock.scopeId!==scopeId||!canEdit)return undefined;
    return editDock.register({
      save:options=>dockActions.current.save(options),
      isDirty:()=>dockActions.current.isDirty(),
      isBusy:()=>dockActions.current.isBusy()
    });
  },[editDock?.active,editDock?.scopeId,editDock?.register,scopeId,canEdit]);

  if(!canEdit)return null;

  return <div className="scope-keyword-management">
    <div className="management-workspace">
      <ManagementSectionNav id="keyword-workspace-sections" title={l.workspace}
        panelId="keyword-workspace-panel"
        items={workspaceOptions} value={workspace}
        onChange={next=>{setWorkspace(next);if(next==='manual'||next==='network')chooseGroup('');}}/>
      <div className="management-workspace-panel" id="keyword-workspace-panel"
        role="region" aria-labelledby={'keyword-workspace-sections-option-'+workspace}>

    {workspace==='analysis'?<section className="loc-card scope-feature-card">
       <h2>{l.analysisSettings}</h2>
      <div className="scope-management-fields">
        <label><span>{l.activeClass}</span><select className="scope-select" value={currentClassId} onChange={event=>{
          const nextClassId=event.target.value;
          setCurrentClassId(nextClassId);
          // default_group_item_no is per-class_id -- resync to the newly
          // chosen class's own stored value instead of carrying over the
          // previous class's setting.
          const nextDefault=rows.find(row=>String(row.class_id)===nextClassId)?.default_group_item_no;
          setDefaultGroupItemNo(String(nextDefault??0));
        }}>
          {classes.map(item=><option key={item.class_id} value={item.class_id}>{'關鍵詞組：'+item.class_name}</option>)}
        </select></label>
        <label><span>{l.minChars}</span><input type="number" min="0" max="10000" step="1" value={minChars} onChange={event=>setMinChars(event.target.value)}/></label>
        <label><span>{l.minDocuments}</span><input type="number" min="0" max="1000000" step="1" value={minDocuments} onChange={event=>setMinDocuments(event.target.value)}/></label>
        <label><span>{l.sharePermission}</span><select className="scope-select" value={shareEnabled?'open':'closed'} onChange={event=>setShareEnabled(event.target.value==='open')}>
          <option value="closed">{l.closed}</option>
          <option value="open">{l.open}</option>
        </select></label>
        <label><span>{l.defaultGroup}</span><select className="scope-select" value={defaultGroupItemNo} onChange={event=>setDefaultGroupItemNo(event.target.value)}>
          {currentClassItems.map(item=><option key={item.keyword_id} value={String(item.item_no)}>{item.item_no}　{item.item_name}</option>)}
        </select></label>
      </div>
      <p className="scope-status">{l.minCharsPrefix}{minChars}{l.minCharsMiddle}{minDocuments}{l.minCharsSuffix}</p>
      <p className="scope-status">{l.anchored}{formatStaticTime(staticstime,l,locale)}{l.validArticles}{Number(keywordDocumentCount||0).toLocaleString()}{l.articleUnit}{staticstime?'':l.reanalyzeNeeded}</p>
      <div className="scope-preview-links">
        {!editDock?.active?<button type="button" className="loc-button" disabled={busy||!configDirty} onClick={saveAnalysisSettings}>{l.saveSettings}</button>:null}
        <button type="button" className="loc-button primary" disabled={busy||configDirty||!currentClassId} onClick={runBatch}>{busy?l.processing:l.reanalyse}</button>
        <button type="button" className="loc-button" disabled={busy||configDirty||!currentClassId} onClick={resetBatch}>{l.resetClassification}</button>
      </div>
      {batchProgress?<div className="scope-keyword-batch-progress" role="status" aria-live="polite">
        <div className="scope-keyword-batch-progress-head"><strong>{batchProgress.phase==='failed'?l.incomplete:batchProgress.phase==='completed'?l.complete:l.attrProgress}</strong><span>{batchProgress.percent}%</span></div>
        <div className="scope-keyword-batch-progress-bar" role="progressbar"
          aria-valuenow={batchProgress.percent} aria-valuemin={0} aria-valuemax={100} aria-label={l.attrProgress}>
          <div className="scope-keyword-batch-progress-fill" style={{transform:'scaleX('+(batchProgress.percent/100)+')'}}/>
        </div>
        <p>{batchProgress.label}</p>
        {batchProgress.total>0?<p>{l.stage}{Number(batchProgress.completed||0).toLocaleString()} / {Number(batchProgress.total).toLocaleString()}{l.articleUnit}</p>:null}
      </div>:null}
    </section>:null}

    {workspace==='library'?<section className="loc-card scope-feature-card">
      <h2>{l.title}</h2>
      <p>{l.description}</p>
      <div className="scope-stat-controls">
        <button type="button" className="loc-button" disabled={busy||loading} onClick={copyRune66}>{busy?l.processing:l.copyRuneButton}</button>
      </div>
      <p className="scope-status">{l.copyHint}</p>
      <div className="scope-management-fields">
        <label><span>關鍵詞組</span><select className="scope-select" value={selectedClass} onChange={event=>{setSelectedClass(event.target.value);chooseGroup('');}}>
          {[...new Set(classes.map(item=>item.class_name))].map(name=><option key={name} value={name}>{'關鍵詞組：'+name}</option>)}
        </select></label>
        <label><span>關鍵詞組 UUID</span><input value={selectedClassId} readOnly aria-readonly="true"/></label>
      </div>
      {selectedClassId?<div className="scope-preview-links">
        <button type="button" className="loc-button" onClick={copyClassUuid}>{l.copyUuid}</button>
        <span className="scope-status">scope_id: {scopeId}</span>
      </div>:null}
      <div className="scope-stat-controls">
        <label><span>{l.copyCurrentClass}</span><input value={copyName} placeholder={l.newClassName} onChange={event=>setCopyName(event.target.value)}/></label>
        <button type="button" className="loc-button" disabled={busy||!selectedClass} onClick={copyClass}>{l.copyFullClass}</button>
      </div>
    </section>:null}

    {(workspace==='manual'||workspace==='network')?<section className="loc-card scope-feature-card scope-keyword-editor-section">
    <h2>{workspace==='manual'?l.manual:l.network}</h2>
    <div className="scope-stat-controls">
      <label><span>關鍵詞組</span><select className="scope-select" value={selectedClass} onChange={event=>{const name=event.target.value;setSelectedClass(name);const first=rows.find(row=>String(row.class_name)===name);if(workspace==='manual'||workspace==='network')chooseGroup('');else if(first)selectItem(first);else chooseGroup('');}}>
        {[...new Set(classes.map(item=>item.class_name))].map(name=><option key={name} value={name}>{'關鍵詞組：'+name}</option>)}
      </select></label>
    </div>
    {loading?<p className="scope-status" role="status">{l.loadingKeywords}</p>:null}
    {savingStage?<p className="scope-status scope-keyword-saving-progress" role="status" aria-live="polite" aria-busy="true"><span className="scope-keyword-saving-spinner" aria-hidden="true"/>{savingStage}</p>:null}
    {!loading?<div className={workspace==='network'&&items.length?'scope-keyword-network-layout':'scope-keyword-manual-layout'}>
      {workspace==='network'&&items.length?<KeywordNetworkEditor
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
       />:null}
       <aside className="scope-management-editor scope-keyword-network-inspector">
      <p className="scope-status">{workspace==='manual'?l.manualHint:l.networkHint}</p>
      {workspace==='manual'?<>
        <div className="scope-stat-controls scope-keyword-manual-path">
          <label><span>{l.runeGroup}</span><select className="scope-select" aria-label={l.selectRuneGroup} value={selectedGroup} onChange={event=>chooseGroup(event.target.value)}>
            <option value="">{l.chooseRuneGroup}</option>
            {groups.map(group=><option key={group} value={group}>{[selectedClass,group,'群組'].filter(Boolean).join(' ')}</option>)}
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
          {items.map(item=><option key={item.keyword_id} value={item.keyword_id}>{[item.class_name,item.class_group,'群組'].filter(Boolean).join(' ')} · {item.item_name||(item.item_no??'')}</option>)}
        </select></label>
        <button type="button" className="loc-button" onClick={()=>newItem(items[0]?.class_group||'')}>{l.addItem}</button>
      </div>:null}
        {!draft?<p className="scope-status">{workspace==='manual'?l.manualEmpty:l.networkEmpty}</p>:<>
          <div className="scope-management-fields">
            <label><span>關鍵詞組</span><input value={draft.class_name||''} readOnly aria-readonly="true"/></label>
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
            {!editDock?.active?<button type="button" className="loc-button primary" disabled={busy} onClick={save}>{busy?l.saving:l.save}</button>:null}
            {draft.keyword_id?<button type="button" className="loc-button scope-danger-button" disabled={busy} onClick={remove}>{l.deleteItem}</button>:null}
          </div>
        </>}
       </aside>
     </div>:null}
    {!loading&&!items.length?<div className="scope-keyword-empty">
      <p className="scope-status">{l.noClassItems}</p>
      <button type="button" className="loc-button" onClick={()=>newItem('')}>{l.createFirst}</button>
    </div>:null}
    </section>:null}
       {message?<p role="status" aria-live="polite" className={message.includes(l.errorWord)||message.includes('failed')||message.includes(l.notAllowedWord)||message.includes('0 rows')||message.includes(l.alreadyExistsWord)?'scope-status scope-error':'scope-status'}>{message}</p>:null}
       </div>
     </div>
   </div>;
}
