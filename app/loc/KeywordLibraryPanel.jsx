'use client';

import {useEffect,useMemo,useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {copyKeywordLibraryClass,dbAuthRelation,updateRows,writeKeywordLibraryItem} from './db-client.mjs';
import {useAccount} from './use-account';
import {clearRune66ClassificationCache,runRune66ClassificationBatch} from './rune66-keyword-analysis';
import KeywordNetworkEditor from './KeywordNetworkEditor';

const DEFAULT_KEYWORD_MIN_CHARS=32;
const DEFAULT_KEYWORD_MIN_DOCUMENTS=100;

function normalizeKeywordLines(value){
  const lines=String(value||'').split(/\r?\n/).map(item=>item.trim()).filter(Boolean);
  return [...new Set(lines)];
}
function keywordText(value){
  return Array.isArray(value)?value.map(item=>String(item||'').trim()).filter(Boolean).join('\n'):'';
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
function formatStaticTime(value){
  if(!value)return '尚未定錨';
  const date=new Date(value);
  return Number.isNaN(date.getTime())?String(value):date.toLocaleString('zh-TW',{hour12:false});
}

export default function KeywordLibraryPanel({scopeId='lo3rwang'}){
  const account=useAccount();
  const queryClient=useQueryClient();
  const scopeData=account.scopeDataFor(scopeId);
  const TABLE=scopeData?.keywords||'';
  const CONFIG_TABLE=scopeData?.config||'';
  const [rows,setRows]=useState([]);
  const [selectedClass,setSelectedClass]=useState('');
  const [selectedId,setSelectedId]=useState('');
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
  const [message,setMessage]=useState('');

  const canEdit=account.canManageScopeSync(scopeId)&&Boolean(TABLE&&CONFIG_TABLE);

  async function invalidateClassification(){
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

  async function load(preferredId='',preferredClass=''){
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
      if(keywordResult.error)throw new Error(keywordResult.error.message||'關鍵詞庫讀取失敗');
      if(configResult.error)throw new Error(configResult.error.message||'關鍵詞分析設定讀取失敗');

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
        setDraft({...candidate,keywords_text:keywordText(candidate.keywords)});
      }else{
        setSelectedId('');
        setDraft(null);
      }
    }catch(error){
      setRows([]);setSelectedId('');setDraft(null);setMessage(String(error?.message||error));
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
  const configDirty=Boolean(configSnapshot)&&(
    Number(minChars)!==Number(configSnapshot.minChars)
    ||Number(minDocuments)!==Number(configSnapshot.minDocuments)
    ||String(currentClassId)!==String(configSnapshot.currentClassId)
    ||Boolean(shareEnabled)!==Boolean(configSnapshot.shareEnabled)
  );

  function selectItem(row){
    setSelectedId(String(row.keyword_id));
    setDraft({...row,keywords_text:keywordText(row.keywords)});
    setMessage('');
  }
  function newItem(group=''){
    const next=Math.max(0,...items.map(row=>Number(row.item_no)||0))+1;
    setSelectedId('');
    setDraft({...blankDraft(selectedClass,selectedClassId,next),class_group:String(group||'')});
    setMessage('');
  }

  async function save(){
    if(!draft)return;
    const classId=String(draft.class_id||'').trim();
    const className=String(draft.class_name||'').trim();
    const classGroup=String(draft.class_group||'').trim();
    const itemName=String(draft.item_name||'').trim();
    const itemNo=Number(draft.item_no);
    if(!classId){setMessage('Class UUID 不可為空。');return;}
    if(!className){setMessage('Class 不可為空。');return;}
    if(!classGroup){setMessage('Group 不可為空。');return;}
    if(!itemName){setMessage('項目名稱不可為空。');return;}
    if(!Number.isInteger(itemNo)||itemNo<1){setMessage('項目編號必須是正整數。');return;}

    const payload={
      keyword_id:draft.keyword_id,
      class_id:classId,
      class_name:className,
      class_group:classGroup,
      class_enable:draft.class_enable!==false,
      item_no:itemNo,
      item_name:itemName,
      principle:String(draft.principle||'').trim(),
      keywords:normalizeKeywordLines(draft.keywords_text),
      order_no:Number.isFinite(Number(draft.order_no))?Number(draft.order_no):itemNo
    };

    setBusy(true);setMessage('');
    try{
      const result=await writeKeywordLibraryItem(scopeId,draft.keyword_id?'update':'insert',payload);
      await markCurrentClassificationStale(classId);
      setSelectedClass(className);
      await load(result.keyword_id||draft.keyword_id||'',className);
      setMessage(classId===currentClassId?'關鍵詞設定已儲存；目前 Class 已變更，請重新分析文章。':'關鍵詞設定已儲存。');
    }catch(error){
      setMessage(String(error?.message||error||'關鍵詞設定儲存失敗。'));
    }finally{
      setBusy(false);
    }
  }

  async function saveAnalysisSettings(){
    const chars=Number(minChars);
    const documents=Number(minDocuments);
    if(!Number.isInteger(chars)||chars<0||chars>10000){
      setMessage('最小分析字數必須是 0 到 10000 的整數。');return;
    }
    if(!Number.isInteger(documents)||documents<0||documents>1000000){
      setMessage('最小統計文章數必須是 0 到 1000000 的整數。');return;
    }
    if(!classes.some(item=>item.class_id===currentClassId)){
      setMessage('請選擇目前使用的 Class。');return;
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
      setMessage(classificationChanged?'分析設定已更新；請重新分析文章。':'分析設定已更新。');
    }catch(error){
      setMessage(String(error?.message||error||'關鍵詞分析設定儲存失敗。'));
    }finally{
      setBusy(false);
    }
  }

  async function runBatch(){
    if(configDirty){setMessage('分析設定尚未儲存，請先儲存分析設定。');return;}
    setBusy(true);setMessage('');
    try{
      const result=await runRune66ClassificationBatch(scopeId);
      await invalidateClassification();
      await load('',selectedClass);
      setMessage(
        '已完成 '+Number(result.documentCount||0).toLocaleString()+
        ' 篇文章分析；其中 '+Number(result.dynamicTieCount||0).toLocaleString()+
        ' 篇完全平手以當下 Class 累積數動態分配。'
      );
    }catch(error){
      setMessage(String(error?.message||error||'關鍵詞批次分析失敗。'));
    }finally{
      setBusy(false);
    }
  }

  async function remove(){
    if(!draft?.keyword_id)return;
    if(!window.confirm('確定刪除這個分類項目？'))return;
    const classId=String(draft.class_id||'');
    setBusy(true);setMessage('');
    try{
      await writeKeywordLibraryItem(scopeId,'delete',draft);
      await markCurrentClassificationStale(classId);
      setSelectedId('');setDraft(null);
      await load('',selectedClass);
      setMessage(classId===currentClassId?'分類項目已刪除；目前 Class 已變更，請重新分析文章。':'分類項目已刪除。');
    }catch(error){
      setMessage(String(error?.message||error||'分類項目刪除失敗。'));
    }finally{
      setBusy(false);
    }
  }

  async function removeItemRow(row){
    if(!row?.keyword_id)return false;
    if(!window.confirm('確定刪除「'+String(row.item_name||'這個分類項目')+'」？'))return false;
    const classId=String(row.class_id||'');
    setBusy(true);setMessage('');
    try{
      await writeKeywordLibraryItem(scopeId,'delete',row);
      await markCurrentClassificationStale(classId);
      if(String(selectedId)===String(row.keyword_id)){setSelectedId('');setDraft(null);}
      await load('',selectedClass);
      setMessage('分類項目已刪除；目前 Class 已標記為待重新分析。');
      return true;
    }catch(error){
      setMessage(String(error?.message||error||'分類項目刪除失敗。'));
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
      setMessage('關鍵詞「'+keyword+'」已從圖上刪除；目前 Class 已標記為待重新分析。');
      return true;
    }catch(error){
      setMessage(String(error?.message||error||'關鍵詞刪除失敗。'));
      return false;
    }finally{setBusy(false);}
  }

  async function removeGroup(group){
    const targets=items.filter(row=>String(row.class_group||'')===String(group||''));
    if(!targets.length)return false;
    if(!window.confirm('確定刪除 Group「'+group+'」與其中 '+targets.length+' 個分類項目？'))return false;
    setBusy(true);setMessage('');
    try{
      for(const row of targets)await writeKeywordLibraryItem(scopeId,'delete',row);
      await markCurrentClassificationStale(selectedClassId);
      setSelectedId('');setDraft(null);
      await load('',selectedClass);
      setMessage('Group「'+group+'」已刪除；目前 Class 已標記為待重新分析。');
      return true;
    }catch(error){
      setMessage(String(error?.message||error||'Group 刪除失敗。'));
      return false;
    }finally{setBusy(false);}
  }

  async function copyClass(){
    const target=String(copyName||'').trim();
    if(!selectedClass){setMessage('請先選擇要複製的 Class。');return;}
    if(!target){setMessage('請輸入新 Class 名稱。');return;}
    setBusy(true);setMessage('');
    try{
      const result=await copyKeywordLibraryClass(scopeId,selectedClass,target);
      setCopyName('');
      await load('',target);
      setMessage('已複製 '+result.count+' 個分類項目到「'+target+'」；新 Class UUID：'+result.class_id);
    }catch(error){
      setMessage(String(error?.message||error||'Class 複製失敗。'));
    }finally{
      setBusy(false);
    }
  }

  async function copyClassUuid(){
    if(!selectedClassId)return;
    try{
      await navigator.clipboard.writeText(selectedClassId);
      setMessage('Class UUID 已複製。分享時請同時提供 scope_id：'+scopeId+'。');
    }catch{
      setMessage('無法自動複製；請手動複製 Class UUID。');
    }
  }

  if(!canEdit)return null;

  return <section className="loc-card scope-feature-card scope-management-workspace">
    <p className="loc-eyebrow">Keyword Library</p>
    <h2>關鍵詞庫</h2>
    <p>每套 Class 以 UUID 獨立識別，可複製與分享；文章只保存分析後的 class_id 與 group_lists。公開統計直接讀文章 Attr，不會重新跑關鍵詞。</p>

    <section className="scope-inline-card">
      <h3>分析設定</h3>
      <div className="scope-management-fields">
        <label><span>目前使用 Class</span><select className="scope-select" value={currentClassId} onChange={event=>setCurrentClassId(event.target.value)}>
          {classes.map(item=><option key={item.class_id} value={item.class_id}>{item.class_name}</option>)}
        </select></label>
        <label><span>最小分析字數</span><input type="number" min="0" max="10000" step="1" value={minChars} onChange={event=>setMinChars(event.target.value)}/></label>
        <label><span>最小統計文章數</span><input type="number" min="0" max="1000000" step="1" value={minDocuments} onChange={event=>setMinDocuments(event.target.value)}/></label>
        <label><span>Class 分享授權</span><select className="scope-select" value={shareEnabled?'open':'closed'} onChange={event=>setShareEnabled(event.target.value==='open')}>
          <option value="closed">關閉</option>
          <option value="open">開放</option>
        </select></label>
      </div>
      <p className="scope-status">正文去除空白後必須大於 {minChars} 字才分析；符合資格文章必須大於 {minDocuments} 篇才啟用關鍵詞統計。</p>
      <p className="scope-status">目前定錨：{formatStaticTime(staticstime)} · 有效文章 {Number(keywordDocumentCount||0).toLocaleString()} 篇{staticstime?'':' · 需要重新分析'}</p>
      <div className="scope-preview-links">
        <button type="button" className="loc-button" disabled={busy||!configDirty} onClick={saveAnalysisSettings}>儲存分析設定</button>
        <button type="button" className="loc-button primary" disabled={busy||configDirty||!currentClassId} onClick={runBatch}>{busy?'處理中…':'重新分析並寫入文章 Attr'}</button>
      </div>
    </section>

    <div className="scope-stat-controls">
      <label><span>Class</span><select className="scope-select" value={selectedClass} onChange={event=>{const name=event.target.value;setSelectedClass(name);const first=rows.find(row=>String(row.class_name)===name);if(first)selectItem(first);}}>
        {[...new Set(classes.map(item=>item.class_name))].map(name=><option key={name} value={name}>{name}</option>)}
      </select></label>
    </div>
    {selectedClassId?<div className="scope-stat-controls">
      <label><span>Class UUID</span><input value={selectedClassId} readOnly aria-readonly="true"/></label>
      <button type="button" className="loc-button" onClick={copyClassUuid}>複製 UUID</button>
      <span className="scope-status">scope_id: {scopeId}</span>
    </div>:null}

    <div className="scope-stat-controls">
      <label><span>複製目前 Class</span><input value={copyName} placeholder="新 Class 名稱" onChange={event=>setCopyName(event.target.value)}/></label>
      <button type="button" className="loc-button" disabled={busy||!selectedClass} onClick={copyClass}>複製整套 Class</button>
    </div>

    {loading?<p className="scope-status">讀取中…</p>:null}
    {!loading&&items.length?<div className="scope-keyword-network-layout">
      <KeywordNetworkEditor
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
      <aside className="scope-management-editor scope-keyword-network-inspector">
        {!draft?<p className="scope-status">從圖上選擇 Item／Keyword；使用 vis-network 工具列新增、編輯或刪除節點。</p>:<>
          <div className="scope-management-fields">
            <label><span>Class</span><input value={draft.class_name||''} readOnly aria-readonly="true"/></label>
            <label><span>Group</span><input value={draft.class_group||''} onChange={event=>setDraft(current=>({...current,class_group:event.target.value}))}/></label>
            <label><span>參與 Class 判定</span><select className="scope-select" value={draft.class_enable===false?'false':'true'} onChange={event=>setDraft(current=>({...current,class_enable:event.target.value==='true'}))}><option value="true">是</option><option value="false">否</option></select></label>
            <label><span>項目編號</span><input type="number" min="1" value={draft.item_no||''} onChange={event=>setDraft(current=>({...current,item_no:event.target.value}))}/></label>
            <label><span>項目名稱</span><input value={draft.item_name||''} onChange={event=>setDraft(current=>({...current,item_name:event.target.value}))}/></label>
            <label><span>排序</span><input type="number" value={draft.order_no??''} onChange={event=>setDraft(current=>({...current,order_no:event.target.value}))}/></label>
          </div>
          <label><span>判別原理</span><textarea rows="4" value={draft.principle||''} onChange={event=>setDraft(current=>({...current,principle:event.target.value}))}/></label>
          <label><span>關鍵詞（每行一筆）</span><textarea rows="12" value={draft.keywords_text||''} onChange={event=>setDraft(current=>({...current,keywords_text:event.target.value}))}/></label>
          <div className="scope-preview-links">
            <button type="button" className="loc-button primary" disabled={busy} onClick={save}>{busy?'儲存中…':'儲存'}</button>
            {draft.keyword_id?<button type="button" className="loc-button scope-danger-button" disabled={busy} onClick={remove}>刪除此 Item</button>:null}
          </div>
        </>}
        {message?<p className={message.includes('失敗')||message.includes('不可')||message.includes('0 rows')||message.includes('已經存在')?'scope-status scope-error':'scope-status'}>{message}</p>:null}
      </aside>
    </div>:null}
    {!loading&&!items.length?<div className="scope-keyword-empty">
      <p className="scope-status">這個 Class 目前沒有分類項目。</p>
      <button type="button" className="loc-button" onClick={()=>newItem('')}>建立第一個分類項目</button>
    </div>:null}
  </section>;
}
