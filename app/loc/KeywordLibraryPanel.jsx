'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {useEditDock} from '../modular/edit-dock';
import {useFeatureCopy,useUiLocale} from '../i18n/ui-locale';
import featureZh from '../i18n/features.zh_tw.js';
import ManagementSectionNav from '../modular/ManagementSectionNav';
import dynamic from 'next/dynamic';
import {useSWRConfig} from 'swr';
import {selectCount} from './db-query.mjs';
import {classGroupIndex} from './model/class-group-items.mjs';
import {copyKeywordLibraryClass,copyRune66KeywordClass,dbAuthRelation,resetKeywordClassification,updateRows,writeKeywordLibraryItem} from './db-client.mjs';
const BlockNoteEditor=dynamic(()=>import('./BlockNoteEditor'),{loading:()=>null});

// The vis-network bundle is downloaded/mounted only when its view is chosen.
const KeywordNetworkEditor=dynamic(()=>import('./KeywordNetworkEditor'),{ssr:false});

const compactKeywordTitle=label=>String(label||'').replace(/^關鍵詞/,'');
const KEYWORD_TAB_LABELS=Object.freeze({
  'zh-Hant':{analysis:'基本',run:'分析',manual:'群組',library:'分類',network:'關聯圖'},
  'zh-Hans':{analysis:'基础',run:'分析',manual:'分组',library:'分类',network:'关联图'},
  en:{analysis:'Basic',run:'Analyze',manual:'Groups',library:'Library',network:'Network'},
  ja:{analysis:'基本',run:'分析',manual:'グループ',library:'分類',network:'関連図'}
});
const DEFAULT_KEYWORD_MIN_CHARS=32;
const DEFAULT_KEYWORD_MIN_DOCUMENTS=100;
const KEYWORD_WORKSPACE_OPTIONS=Object.freeze([
  {value:'analysis',key:'basicSettings'},
  {value:'run',key:'keywordAnalysis'},
  {value:'manual',key:'manual'},
  {value:'library',key:'title'},
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
function blankDraft(className='',classUid='',orderNo=1){
  return {
    keyword_id:null,class_uid:classUid,class_name:className,class_group:'',
    class_enable:true,item_name:'',principle:'',keywords_text:'',order_no:orderNo
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
  const workspaceOptions=KEYWORD_WORKSPACE_OPTIONS.map(option=>{
    const label=l[option.key]||featureZh.keywordPanel[option.key];
    return {value:option.value,label,shortLabel:KEYWORD_TAB_LABELS[locale]?.[option.value]||compactKeywordTitle(label)};
  });
  const editDock=useEditDock();
  const dockActions=useRef({save:null});
  const {mutate}=useSWRConfig();
  const scopeData=account.scopeDataFor(scopeId);
  const TABLE=scopeData?.keywords||'';
  const CONFIG_TABLE=scopeData?.config||'';
  const [rows,setRows]=useState([]);
  const [classRegistry,setClassRegistry]=useState([]);
  const [selectedClass,setSelectedClass]=useState('');
  const [selectedId,setSelectedId]=useState('');
  const [selectedGroup,setSelectedGroup]=useState('');
  const [selectedKeyword,setSelectedKeyword]=useState('');
  const [keywordEdit,setKeywordEdit]=useState('');
  const [draft,setDraft]=useState(null);
  const [copyName,setCopyName]=useState('');
  const [minChars,setMinChars]=useState(DEFAULT_KEYWORD_MIN_CHARS);
  const [minDocuments,setMinDocuments]=useState(DEFAULT_KEYWORD_MIN_DOCUMENTS);
  const [currentClassUid,setCurrentClassUid]=useState('');
  const [shareEnabled,setShareEnabled]=useState(false);
  // Zero-keyword-hit fallback item (silver.{scope}_keywords.default_keyword_id).
  // Stored per class_id (same value on every row of that class), so it rides
  // along in the main keyword SELECT below rather than a separate query.
  const [defaultKeywordId,setDefaultKeywordId]=useState('');
  const [keywordDocumentCount,setKeywordDocumentCount]=useState(null);
  const [galaxyTotalCount,setGalaxyTotalCount]=useState(null);
  const [countReadError,setCountReadError]=useState('');
  const [countVersion,setCountVersion]=useState(0);
  const countReadId=useRef(0);
  const [staticstime,setStaticstime]=useState('');
  const [configSnapshot,setConfigSnapshot]=useState(null);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [savingStage,setSavingStage]=useState('');
  const [batchProgress,setBatchProgress]=useState(null);
  const [resetProgress,setResetProgress]=useState(null);
  const [message,setMessage]=useState('');
  const [workspace,setWorkspace]=useState('analysis');

  const canEdit=account.canManageScopeSync(scopeId)&&Boolean(TABLE&&CONFIG_TABLE);

  async function invalidateClassification(){
    const {clearKeywordAnalysisCache}=await import('./keyword-analysis');
    clearKeywordAnalysisCache();
    await Promise.all([
      mutate(key=>Array.isArray(key)&&['statistics-style-filter','culture-style-filter','own-scope-keyword-summary','own-scope-keyword-item-days','statistics-keyword-item-class-map'].includes(key[0]))
    ]);
  }

  async function markCurrentClassificationStale(classUid){
    if(!classUid||String(classUid)!==String(currentClassUid))return;
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
      updated_at:new Date().toISOString()
    },{filters:[{column:'id',operator:'eq',value:scopeId}]});
    await invalidateClassification();
  }

  async function load(preferredId='',preferredClass='',options={}){
    if(!canEdit)return;
    setLoading(true);setMessage('');
    try{
      const [keywordResult,configResult,registryResult]=await Promise.all([
        dbAuthRelation(TABLE)
          .select('keyword_id,class_uid,class_name,class_group,class_enable,item_name,principle,keywords,order_no')
          .order('class_name',{ascending:true})
          .order('order_no',{ascending:true})
          .order('keyword_id',{ascending:true}),
        dbAuthRelation(CONFIG_TABLE)
          .select('keyword_min_chars,keyword_min_documents,current_keyword_class_uid,keyword_class_share_enabled,staticstime,keyword_meta')
          .eq('id',scopeId).limit(1),
        dbAuthRelation('silver.keyword_classes')
          .select('class_uid,default_keyword_id').eq('scope_id',scopeId)
      ]);
      if(registryResult.error)throw new Error(registryResult.error.message||'Keyword Class registry failed');
      if(keywordResult.error)throw new Error(keywordResult.error.message||l.libraryReadError);
      if(configResult.error)throw new Error(configResult.error.message||l.settingsReadError);

      const config=configResult.data?.[0]||{};
      const configuredChars=Number(config.keyword_min_chars);
      const configuredDocuments=Number(config.keyword_min_documents);
      const nextMinChars=Number.isInteger(configuredChars)&&configuredChars>=0?configuredChars:DEFAULT_KEYWORD_MIN_CHARS;
      const nextMinDocuments=Number.isInteger(configuredDocuments)&&configuredDocuments>=0?configuredDocuments:DEFAULT_KEYWORD_MIN_DOCUMENTS;
      const nextCurrentClassUid=String(config.current_keyword_class_uid||'');
      const nextShareEnabled=Boolean(config.keyword_class_share_enabled);
      const nextStaticstime=String(config.staticstime||'');

      const next=keywordResult.data||[];
      setRows(next);
      setClassRegistry(registryResult.data||[]);
      const classNames=[...new Set(next.map(row=>String(row.class_name||'').trim()).filter(Boolean))];
      const currentClassName=next.find(row=>String(row.class_uid||'')===nextCurrentClassUid)?.class_name||'';
      const requested=String(preferredClass||selectedClass||currentClassName||'').trim();
      const nextClass=classNames.includes(requested)?requested:(classNames[0]||'');
      setSelectedClass(nextClass);
      // Same value is repeated on every row of nextCurrentClassUid -- any one row works.
      const nextDefaultKeywordId=String((registryResult.data||[]).find(row=>String(row.class_uid||'')===nextCurrentClassUid)?.default_keyword_id??'');

      setMinChars(nextMinChars);
      setMinDocuments(nextMinDocuments);
      setCurrentClassUid(nextCurrentClassUid);
      setShareEnabled(nextShareEnabled);
      setStaticstime(nextStaticstime);
      setDefaultKeywordId(nextDefaultKeywordId);
      setConfigSnapshot({
        minChars:nextMinChars,
        minDocuments:nextMinDocuments,
        currentClassUid:nextCurrentClassUid,
        shareEnabled:nextShareEnabled,
        defaultKeywordId:nextDefaultKeywordId
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

  // Counts are HEAD-only and read on demand when the analysis tab opens.
  // Never fetch article bodies or poll the database for this display.
  useEffect(()=>{
    if(workspace!=='run'||!canEdit||!scopeData?.galaxy)return;
    const request=++countReadId.current;
    let cancelled=false;
    setKeywordDocumentCount(null);
    setGalaxyTotalCount(null);
    setCountReadError('');
    Promise.all([
      selectCount(scopeData.galaxy,{idColumn:'uid'}),
      dbAuthRelation(CONFIG_TABLE).select('keyword_meta').eq('id',scopeId).limit(1)
    ]).then(([totalResult,configResult])=>{
      if(configResult.error)throw new Error(configResult.error.message);
      const total=Number(totalResult)||0;
      const classified=Number(configResult.data?.[0]?.keyword_meta?.matchedDocuments)||0;
      if(cancelled||request!==countReadId.current)return;
      setGalaxyTotalCount(Math.max(0,Number(total)||0));
      setKeywordDocumentCount(Math.max(0,Number(classified)||0));
    }).catch(error=>{
      if(cancelled||request!==countReadId.current)return;
      setCountReadError(String(error?.message||error||'Count failed'));
    });
    return ()=>{cancelled=true;};
  },[workspace,canEdit,scopeId,scopeData?.galaxy,countVersion]);

  const classes=useMemo(()=>{
    const map=new Map();
    for(const row of rows){
      const id=String(row.class_uid||'').trim();
      const name=String(row.class_name||'').trim();
      if(id&&name&&!map.has(id))map.set(id,name);
    }
    return [...map.entries()].map(([class_uid,class_name])=>({class_uid,class_name}));
  },[rows]);
  const items=useMemo(()=>rows
    .filter(row=>String(row.class_name)===selectedClass)
    .sort((a,b)=>Number(a.order_no||0)-Number(b.order_no||0)||String(a.keyword_id||'').localeCompare(String(b.keyword_id||''))),[rows,selectedClass]);
  // For the "預設群組" dropdown in 分析設定: the active analysis class's items
  // (currentClassUid, not selectedClass -- the panel can be browsing a different
  // class in the manual editor while 分析設定 still targets currentClassUid).
  const currentClassItems=useMemo(()=>rows
    .filter(row=>String(row.class_uid)===String(currentClassUid))
    .sort((a,b)=>Number(a.order_no||0)-Number(b.order_no||0)||String(a.keyword_id||'').localeCompare(String(b.keyword_id||''))),[rows,currentClassUid]);
  const selectedClassUid=String(items[0]?.class_uid||'');
  // Share the pure Class -> Group -> Item projection with Trace routes.
  // Keyword item identity and editing semantics remain unchanged.
  const classGroups=useMemo(()=>classGroupIndex(items,{
    classOf:item=>item.class_name,groupOf:item=>item.class_group
  }),[items]);
  const groups=useMemo(()=>[...(classGroups.get(selectedClass)||new Map()).keys()].filter(Boolean),
    [classGroups,selectedClass]);
  const groupItems=useMemo(()=>(classGroups.get(selectedClass)?.get(selectedGroup)||[]),
    [classGroups,selectedClass,selectedGroup]);
  const draftKeywords=useMemo(()=>normalizeKeywordLines(draft?.keywords_text||''),[draft?.keywords_text]);
  const configDirty=Boolean(configSnapshot)&&(
    Number(minChars)!==Number(configSnapshot.minChars)
    ||Number(minDocuments)!==Number(configSnapshot.minDocuments)
    ||String(currentClassUid)!==String(configSnapshot.currentClassUid)
    ||Boolean(shareEnabled)!==Boolean(configSnapshot.shareEnabled)
    ||String(defaultKeywordId)!==String(configSnapshot.defaultKeywordId)
  );

  function selectItem(row){
    setSelectedId(String(row.keyword_id));
    setSelectedGroup(String(row.class_group||''));
    setSelectedKeyword('');setKeywordEdit('');
    setDraft({...row,keywords_text:keywordText(row.keywords)});
    setMessage('');
  }
  function newItem(group=''){
    const next=Math.max(0,...items.map(row=>Number(row.order_no)||0))+1;
    setSelectedId('');setSelectedKeyword('');setKeywordEdit('');
    setSelectedGroup(String(group||selectedGroup||''));
    setDraft({...blankDraft(selectedClass,selectedClassUid,next),class_group:String(group||selectedGroup||'')});
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

  // One save action owns both drafts. Validate both before writing either,
  // and reload only after all requested writes have completed.
  async function saveAll(){
    if(busy||loading)return false;
    const saveSettings=configDirty;
    const saveDraft=draftDirty;
    if(!saveSettings&&!saveDraft)return true;

    let payload=null;
    let classUid='';
    let className='';
    if(saveDraft){
      if(!draft){setMessage('請先選擇要編輯的關鍵詞。');return false;}
      classUid=String(draft.class_uid||'').trim();
      className=String(draft.class_name||'').trim();
      const classGroup=String(draft.class_group||'').trim();
      const itemName=String(draft.item_name||'').trim();
      if(!classUid){setMessage(l.uuidRequired);return false;}
      if(!className){setMessage(l.classRequired);return false;}
      if(!classGroup){setMessage(l.groupRequired);return false;}
      if(!itemName){setMessage(l.itemNameRequired);return false;}
      payload={
        keyword_id:draft.keyword_id,
        class_uid:classUid,
        class_name:className,
        class_group:classGroup,
        class_enable:draft.class_enable!==false,
        item_name:itemName,
        principle:String(draft.principle||'').trim(),
        keywords:workspace==='manual'&&keywordEdit.trim()&&(!selectedKeyword||draftKeywords.includes(selectedKeyword))
          ?keywordDraftWithInput(draftKeywords,selectedKeyword,keywordEdit)
          :draftKeywords,
        order_no:Number.isFinite(Number(draft.order_no))?Number(draft.order_no):0
      };
    }

    const chars=Number(minChars);
    const documents=Number(minDocuments);
    const defaultItemId=String(defaultKeywordId);
    const defaultGroupChanged=defaultItemId!==String(configSnapshot?.defaultKeywordId||'');
    const classificationChanged=saveSettings&&(
      chars!==Number(configSnapshot?.minChars)||
      currentClassUid!==String(configSnapshot?.currentClassUid||'')||
      defaultGroupChanged
    );
    if(saveSettings){
      if(!Number.isInteger(chars)||chars<0||chars>10000){
        setMessage(l.minimumCharsInvalid);return false;
      }
      if(!Number.isInteger(documents)||documents<0||documents>1000000){
        setMessage(l.minimumDocumentsInvalid);return false;
      }
      if(!classes.some(item=>item.class_uid===currentClassUid)){
        setMessage(l.activeClassRequired);return false;
      }
      if(!currentClassItems.some(item=>String(item.keyword_id)===defaultItemId)){
        setMessage(l.defaultGroupInvalid);return false;
      }
    }

    setBusy(true);setMessage('');
    setSavingStage(l.writing);
    let settingsWritten=false;
    let draftWritten=false;
    try{
      // Write settings first: a failed keyword INSERT can then be retried
      // without accidentally creating a second new keyword row.
      if(saveSettings){
        if(defaultGroupChanged){
          await updateRows('silver.keyword_classes',{default_keyword_id:defaultItemId},{filters:[{column:'class_uid',operator:'eq',value:currentClassUid}]});
        }
        await updateRows(CONFIG_TABLE,{
          keyword_min_chars:chars,
          keyword_min_documents:documents,
          current_keyword_class_uid:currentClassUid,
          keyword_class_share_enabled:Boolean(shareEnabled),
          ...(classificationChanged?{staticstime:null}:{}),
          updated_at:new Date().toISOString()
        },{filters:[{column:'id',operator:'eq',value:scopeId}]});
        settingsWritten=true;
      }

      const result=saveDraft
        ?await writeKeywordLibraryItem(scopeId,draft.keyword_id?'update':'insert',payload)
        :null;
      draftWritten=saveDraft;
      setSavingStage(l.updatingAnalysis);
      let classificationWarning='';
      try{
        if(classificationChanged)await invalidateClassification();
        else if(saveDraft)await markCurrentClassificationStale(classUid);
      }catch(error){
        classificationWarning=l.analysisUpdateWarning+String(error?.message||error);
      }

      setSavingStage(l.reloading);
      if(saveDraft)setSelectedClass(className);
      const reloaded=await load(result?.keyword_id||draft?.keyword_id||'',saveDraft?className:selectedClass,{preserveOnError:true});
      const savedMessage=saveSettings&&saveDraft?'分析設定與關鍵詞草稿已儲存。'
        :saveSettings?(classificationChanged?l.settingsChanged:l.settingsSaved)
        :(classUid===currentClassUid?l.savedClassChanged:l.saved);
      setMessage((reloaded?savedMessage:l.savedReloadFailed)+classificationWarning);
      return true;
    }catch(error){
      const partial=settingsWritten&&saveDraft&&!draftWritten
        ?'分析設定已儲存，但關鍵詞草稿尚未儲存；草稿仍保留。'
        :'';
      const detail=partial+(saveDraft?l.writeError:'')+String(error?.message||error||l.settingsSaveError);
      setMessage(detail);
      if(editDock?.active)editDock.setNotice(detail);
      return false;
    }finally{
      setSavingStage('');
      setBusy(false);
    }
  }

  async function runBatch(){
    if(configDirty||draftDirty){setMessage('請先儲存分析設定與關鍵詞草稿，再重新分析。');return;}
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
      setCountVersion(version=>version+1);
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
    if(busy||loading||configDirty||draftDirty)return;
    if(!window.confirm(l.confirmReset+'\n'+scopeData.galaxy))return;
    setBusy(true);setMessage('');setBatchProgress(null);
    setResetProgress({phase:'reading',completed:0,total:0});
    try{
      await resetKeywordClassification(scopeId,{onProgress:setResetProgress});
      await invalidateClassification();
      await load('',selectedClass);
      setCountVersion(version=>version+1);
      setMessage(l.resetDone);
    }catch(error){
      await invalidateClassification().catch(()=>{});
      setCountVersion(version=>version+1);
      setMessage(l.resetError+' '+String(error?.message||error));
    }finally{
      setResetProgress(null);
      setBusy(false);
    }
  }

  async function remove(){
    if(!draft?.keyword_id)return;
    if(!window.confirm(l.confirmDelete))return;
    const classUid=String(draft.class_uid||'');
    setBusy(true);setMessage('');
    try{
      await writeKeywordLibraryItem(scopeId,'delete',draft);
      await markCurrentClassificationStale(classUid);
      setSelectedId('');setDraft(null);
      await load('',selectedClass);
      setMessage(classUid===currentClassUid?l.deletedClassChanged:l.deleted);
    }catch(error){
      setMessage(String(error?.message||error||l.deleteError));
    }finally{
      setBusy(false);
    }
  }

  async function removeItemRow(row){
    if(!row?.keyword_id)return false;
    if(!window.confirm(l.deletePrefix+String(row.item_name||l.thisItem)+l.deleteSuffix))return false;
    const classUid=String(row.class_uid||'');
    setBusy(true);setMessage('');
    try{
      await writeKeywordLibraryItem(scopeId,'delete',row);
      await markCurrentClassificationStale(classUid);
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
      await markCurrentClassificationStale(String(row.class_uid||''));
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
      await markCurrentClassificationStale(selectedClassUid);
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
        ?l.copyRunePrefix+createdName+l.copyRuneJoin+result.count+l.runeCountUnit+result.class_uid+l.copyRuneSuffix
        :l.copyRuneReloadPrefix+result.class_uid+l.copyRuneReloadSuffix);
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
      setMessage(l.copiedPrefix+result.count+l.copiedMiddle+target+l.copiedSuffix+result.class_uid);
    }catch(error){
      setMessage(String(error?.message||error||l.classCopyError));
    }finally{
      setBusy(false);
    }
  }

  async function copyClassUid(){
    if(!selectedClassUid)return;
    try{
      await navigator.clipboard.writeText(selectedClassUid);
      setMessage(l.uuidCopied+scopeId+l.uuidCopiedSuffix);
    }catch{
      setMessage(l.uuidCopyFailed);
    }
  }

  const originalItem=rows.find(row=>String(row.keyword_id)===String(draft?.keyword_id||''));
  const draftDirty=Boolean(draft&&(
    !draft.keyword_id||
    (originalItem&&(
      ['class_uid','class_name','class_group','class_enable','item_name','principle','order_no']
        .some(key=>String(draft[key]??'')!==String(originalItem[key]??''))||
      String(draft.keywords_text||'')!==keywordText(originalItem.keywords)
    ))||
    (workspace==='manual'&&keywordEdit.trim()&&keywordEdit!==selectedKeyword)
  ));
  dockActions.current={
    save:async({switching=false}={})=>{
      if(busy||loading)return false;
      if(!configDirty&&!draftDirty&&workspace==='library'){
        setMessage(l.libraryImmediateSave);
        return false;
      }
      return saveAll();
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
       <h2>{compactKeywordTitle(l.basicSettings)}</h2>
      <div className="scope-management-fields">
        <label><span>{l.activeClass}</span><select className="scope-select" value={currentClassUid} onChange={event=>{
          const nextClassUid=event.target.value;
          setCurrentClassUid(nextClassUid);
          // default_keyword_id is per-class_id -- resync to the newly
          // chosen class's own stored value instead of carrying over the
          // previous class's setting.
          const nextDefault=classRegistry.find(row=>String(row.class_uid)===nextClassUid)?.default_keyword_id;
          setDefaultKeywordId(String(nextDefault??0));
        }}>
          {classes.map(item=><option key={item.class_uid} value={item.class_uid}>{'關鍵詞組：'+item.class_name}</option>)}
        </select></label>
        <label><span>{l.minChars}</span><input type="number" min="0" max="10000" step="1" value={minChars} onChange={event=>setMinChars(event.target.value)}/></label>
        <label><span>{l.minDocuments}</span><input type="number" min="0" max="1000000" step="1" value={minDocuments} onChange={event=>setMinDocuments(event.target.value)}/></label>
        <label><span>{l.sharePermission}</span><select className="scope-select" value={shareEnabled?'open':'closed'} onChange={event=>setShareEnabled(event.target.value==='open')}>
          <option value="closed">{l.closed}</option>
          <option value="open">{l.open}</option>
        </select></label>
        <label><span>{l.defaultGroup}</span><select className="scope-select" value={defaultKeywordId} onChange={event=>setDefaultKeywordId(event.target.value)}>
          {currentClassItems.map(item=><option key={item.keyword_id} value={String(item.keyword_id)}>{item.item_name}</option>)}
        </select></label>
      </div>
      <p className="scope-status">{l.minCharsPrefix}{minChars}{l.minCharsMiddle}{minDocuments}{l.minCharsSuffix}</p>
      {!editDock?.active?<div className="scope-preview-links">
        <button type="button" className="loc-button" disabled={busy||(!configDirty&&!draftDirty)} onClick={saveAll}>{l.saveSettings}</button>
      </div>:null}
    </section>:null}

    {workspace==='run'?<section className="loc-card scope-feature-card">
      <h2>{compactKeywordTitle(l.keywordAnalysis)}</h2>
      <p className="scope-status">{l.activeClass}：{classes.find(item=>item.class_uid===currentClassUid)?.class_name||l.activeClassRequired}</p>
      {configDirty||draftDirty?<p className="scope-status">{l.settingsUnsaved}</p>:null}
      <p className="scope-status">{l.anchored}{formatStaticTime(staticstime,l,locale)}{l.totalArticles}{galaxyTotalCount===null?'—':galaxyTotalCount.toLocaleString()}{l.articleUnit}{l.validArticles}{keywordDocumentCount===null?'—':keywordDocumentCount.toLocaleString()}{l.articleUnit}{staticstime?'':l.reanalyzeNeeded}</p>
      {countReadError?<p className="scope-status scope-error" role="status">{countReadError}</p>:null}
      <div className="scope-preview-links">
        <button type="button" className="loc-button primary" disabled={busy||configDirty||draftDirty||!currentClassUid} onClick={runBatch}>{busy?l.processing:l.reanalyse}</button>
        <button type="button" className="loc-button" disabled={busy||loading||configDirty||draftDirty||!currentClassUid} onClick={resetBatch}>{resetProgress?l.resetInProgress:l.resetClassification}</button>
      </div>
      {resetProgress?<p className="scope-status scope-keyword-saving-progress" role="status" aria-live="polite" aria-busy="true">
        <span className="scope-keyword-saving-spinner" aria-hidden="true"/>
        {l.resetInProgress}{resetProgress.total>0?' '+Math.min(resetProgress.completed,resetProgress.total).toLocaleString()+' / '+resetProgress.total.toLocaleString()+l.articleUnit:''}
      </p>:null}
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
      <h2>{compactKeywordTitle(l.title)}</h2>
      <p>{l.description}</p>
      <div className="scope-stat-controls">
        <button type="button" className="loc-button" disabled={busy||loading} onClick={copyRune66}>{busy?l.processing:l.copyRuneButton}</button>
      </div>
      <p className="scope-status">{l.copyHint}</p>
      <div className="scope-management-fields">
        <label><span>關鍵詞組</span><select className="scope-select" value={selectedClass} onChange={event=>{setSelectedClass(event.target.value);chooseGroup('');}}>
          {[...new Set(classes.map(item=>item.class_name))].map(name=><option key={name} value={name}>{'關鍵詞組：'+name}</option>)}
        </select></label>
        <label><span>關鍵詞組 UUID</span><input value={selectedClassUid} readOnly aria-readonly="true"/></label>
      </div>
      {selectedClassUid?<div className="scope-preview-links">
        <button type="button" className="loc-button" onClick={copyClassUid}>{'複製 Class UID'}</button>
        <span className="scope-status">scope_id: {scopeId}</span>
      </div>:null}
      <div className="scope-stat-controls">
        <label><span>{l.copyCurrentClass}</span><input value={copyName} placeholder={l.newClassName} onChange={event=>setCopyName(event.target.value)}/></label>
        <button type="button" className="loc-button" disabled={busy||!selectedClass} onClick={copyClass}>{l.copyFullClass}</button>
      </div>
    </section>:null}

    {(workspace==='manual'||workspace==='network')?<section className="loc-card scope-feature-card scope-keyword-editor-section">
    <h2>{compactKeywordTitle(workspace==='manual'?l.manual:l.network)}</h2>
    <div className="scope-stat-controls">
      <label><span>關鍵詞組</span><select className="scope-select" value={selectedClass} onChange={event=>{const name=event.target.value;setSelectedClass(name);const first=rows.find(row=>String(row.class_name)===name);if(workspace==='manual'||workspace==='network')chooseGroup('');else if(first)selectItem(first);else chooseGroup('');}}>
        {[...new Set(classes.map(item=>item.class_name))].map(name=><option key={name} value={name}>{'關鍵詞組：'+name}</option>)}
      </select></label>
    </div>
    {loading?<p className="scope-status" role="status">{l.loadingKeywords}</p>:null}
    {savingStage?<p className="scope-status scope-keyword-saving-progress" role="status" aria-live="polite" aria-busy="true"><span className="scope-keyword-saving-spinner" aria-hidden="true"/>{savingStage}</p>:null}
    {!loading?<div className={workspace==='network'&&items.length?'scope-keyword-network-layout':'scope-keyword-manual-layout'}>
      {workspace==='network'&&items.length?<KeywordNetworkEditor
        key={selectedClassUid||selectedClass}
        items={items}
        className={selectedClass}
        classUid={selectedClassUid}
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
            {groupItems.map(item=><option key={item.keyword_id} value={item.keyword_id}>{item.item_name||(item.keyword_id??'')}</option>)}
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
          {items.map(item=><option key={item.keyword_id} value={item.keyword_id}>{[item.class_name,item.class_group,'群組'].filter(Boolean).join(' ')} · {item.item_name||(item.keyword_id??'')}</option>)}
        </select></label>
        <button type="button" className="loc-button" onClick={()=>newItem(items[0]?.class_group||'')}>{l.addItem}</button>
      </div>:null}
        {!draft?<p className="scope-status">{workspace==='manual'?l.manualEmpty:l.networkEmpty}</p>:<>
          <div className="scope-management-fields">
            <label><span>關鍵詞組</span><input value={draft.class_name||''} readOnly aria-readonly="true"/></label>
            <label><span>Group</span><input value={draft.class_group||''} onChange={event=>setDraft(current=>({...current,class_group:event.target.value}))}/></label>
            <label><span>{l.classEnabled}</span><select className="scope-select" value={draft.class_enable===false?'false':'true'} onChange={event=>setDraft(current=>({...current,class_enable:event.target.value==='true'}))}><option value="true">{l.yes}</option><option value="false">{l.no}</option></select></label>
            
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
            {!editDock?.active?<button type="button" className="loc-button primary" disabled={busy} onClick={saveAll}>{busy?l.saving:l.save}</button>:null}
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
       {message?<p role="status" aria-live="polite" className={message.includes(l.errorWord)||message.includes('failed')||message.includes(l.notAllowedWord)||message.includes('0 rows')||message.includes('timeout')||message.includes(l.alreadyExistsWord)?'scope-status scope-error':'scope-status'}>{message}</p>:null}
       </div>
     </div>
   </div>;
}
