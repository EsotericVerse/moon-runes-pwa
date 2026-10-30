'use client';

import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import dynamic from 'next/dynamic';
import {useSWRConfig} from 'swr';
import {useEditDock} from '../modular/edit-dock';
import {dbAuthRelation,resetKeywordClassification,updateRows,writeKeywordLibraryItem,copyKeywordLibraryClass} from './db-client.mjs';
import {indexKeywordTree,descendantsOfKeyword} from './keyword-tree.mjs';
import {keywordClassState,invalidateKeywordClass} from './keyword-class-state.mjs';
import {generateKeywordClassUid} from './keyword-uidlist.mjs';

const KeywordNetworkEditor=dynamic(()=>import('./KeywordNetworkEditor'),{ssr:false});
const TYPES=['category','class','group','item'];
const LABEL={category:'關鍵字目錄',class:'關鍵字群組',group:'關鍵字分類',item:'關鍵字'};
const onlyWords=value=>[...new Set(String(value||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean))];
const emptyTree={index:new Map(),parent:new Map(),roots:[]};
const uidFor=rows=>generateKeywordClassUid(rows.map(row=>row.uid));
function freshNode(type,rows){
  return {uid:uidFor(rows),type,name:'',desc:'',lists:[],uid_lists:[]};
}
function childrenOf(tree,uid){
  const parent=tree.index.get(uid);
  return (parent?.lists||[]).map(id=>tree.index.get(id)).filter(Boolean);
}
function parentOf(tree,uid){return tree.index.get(tree.parent.get(uid));}
function classOf(tree,uid){
  let node=tree.index.get(uid);
  while(node&&node.type!=='class')node=parentOf(tree,node.uid);
  return node;
}
export default function KeywordLibraryPanel({scopeId='lo3rwang',account}){
  const scope=account.scopeDataFor(scopeId),table=scope?.keywords||'';
  const configTable=scope?.config||'';
  const canEdit=account.canManageScopeSync(scopeId)&&Boolean(table&&configTable);
  const dock=useEditDock(),dockActions=useRef(null);
  const {mutate}=useSWRConfig();
  const [rows,setRows]=useState([]);
  const [config,setConfig]=useState({});
  const [savedConfig,setSavedConfig]=useState({});
  const [editor,setEditor]=useState(null);
  const [pendingParent,setPendingParent]=useState('');
  const [keywordText,setKeywordText]=useState('');
  const [workspace,setWorkspace]=useState('manual');
  const [chosen,setChosen]=useState({category:'',class:'',group:'',item:''});
  const [copyName,setCopyName]=useState('');
  const [progress,setProgress]=useState(null);
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
  const [error,setError]=useState(''),[notice,setNotice]=useState('');
  const tree=useMemo(()=>{
    if(!rows.length)return emptyTree;
    return indexKeywordTree(rows);
  },[rows]);
  const category=tree.index.get(chosen.category);
  const classes=childrenOf(tree,category?.uid);
  const activeClass=tree.index.get(chosen.class);
  const groups=childrenOf(tree,activeClass?.uid);
  const activeGroup=tree.index.get(chosen.group);
  const items=childrenOf(tree,activeGroup?.uid);
  const selected=tree.index.get(chosen.item)||activeGroup||activeClass||category||null;
  const draft=editor?.node||null;
  const dirty=Boolean(draft&&(
    !tree.index.has(draft.uid)||
    JSON.stringify(draft)!==JSON.stringify(tree.index.get(draft.uid))
  ))||Boolean(draft?.type==='item'&&keywordText!==((draft.lists||[]).join('\n')));

  const invalidate=useCallback(async()=>{
    const {clearKeywordAnalysisCache}=await import('./keyword-analysis');
    clearKeywordAnalysisCache();
    await mutate(key=>Array.isArray(key)&&/keyword|culture-style-filter|statistics-style-filter/.test(String(key[0]||'')),undefined,{revalidate:true});
  },[mutate]);

  const load=useCallback(async(preferredUid='')=>{
    if(!canEdit)return;
    setLoading(true);setError('');
    try{
      const [found,settings]=await Promise.all([
        (async()=>{
          const owned=[],size=500;
          for(let offset=0;;offset+=size){
            const {data,error}=await dbAuthRelation(table)
              .select('uid,type,name,desc,lists')
              .order('uid',{ascending:true}).range(offset,offset+size-1);
            if(error)throw new Error(error.message||'Keywords 讀取失敗');
            owned.push(...(data||[]));
            if((data||[]).length<size)break;
          }
          return {rows:owned};
        })(),
        dbAuthRelation(configTable).select(
          'current_keyword_class_uid,keyword_min_chars,keyword_min_documents,keyword_class_share_enabled,keyword_meta,staticstime'
        ).eq('id',scopeId).limit(1)
      ]);
      if(settings.error)throw settings.error;
      const records=(found.rows||[]).map(row=>({...row,uid_lists:[]})),index=indexKeywordTree(records);
      const first=index.roots[0];
      const firstClass=first&&childrenOf(index,first.uid)[0];
      const current=index.index.get(preferredUid);
      const target=current||index.index.get(settings.data?.[0]?.current_keyword_class_uid)
        ||index.index.get(chosen.item)||index.index.get(chosen.group)
        ||index.index.get(chosen.class)||index.index.get(chosen.category)||firstClass||first;
      const lineage={},nodeType=target?.type;
      let node=target;
      while(node){lineage[node.type]=node.uid;node=parentOf(index,node.uid);}
      setRows(records);setConfig(settings.data?.[0]||{});setSavedConfig(settings.data?.[0]||{});
      setChosen({category:lineage.category||first?.uid||'',
        class:lineage.class||(target?.type==='category'?childrenOf(index,target.uid)[0]?.uid:'')||firstClass?.uid||'',
        group:lineage.group||'',item:lineage.item||''});
      setEditor(null);setPendingParent('');setKeywordText('');
      setNotice('');
    }catch(e){setError(String(e.message||e));}
    finally{setLoading(false);}
  },[canEdit,table,configTable,scopeId]);

  useEffect(()=>{load();},[load]);
  const choose=(type,uid)=>{
    const next={...chosen,[type]:uid};
    if(type==='category'){next.class='';next.group='';next.item='';}
    if(type==='class'){next.group='';next.item='';}
    if(type==='group')next.item='';
    setChosen(next);setEditor(null);setKeywordText('');
    setError('');setNotice('');
  };
  const edit=(node=selected)=>{
    if(!node)return;
    setPendingParent('');setEditor({node:{...node,lists:[...node.lists],uid_lists:[...node.uid_lists]}});
    setKeywordText(node.type==='item'?node.lists.join('\n'):'');
    setNotice('');
  };
  const create=(type,parentUid='')=>{
    const node=freshNode(type,rows);
    setEditor({node});setPendingParent(parentUid);
    setKeywordText('');setNotice('');
  };
  const markStale=async(uid)=>{
    const cl=classOf(tree,uid);
    if(!cl)return;
    const keyword_meta=invalidateKeywordClass(config.keyword_meta,cl.uid);
    const current=String(config.current_keyword_class_uid||'')===cl.uid;
    const {error:staleError}=await dbAuthRelation(configTable)
      .update({keyword_meta,...(current?{staticstime:null}:{})}).eq('id',scopeId);
    if(staleError)throw staleError;
  };
  const saveNode=async()=>{
    if(!draft||busy)return false;
    setBusy(true);setError('');
    try{
      const node={...draft,
        name:String(draft.name||'').trim(),
        lists:draft.type==='item'?onlyWords(keywordText):[...draft.lists]};
      if(!node.name)throw new Error('請填寫名稱');
      if(!TYPES.includes(node.type))throw new Error('Keywords Type 無效');
      const isNew=!tree.index.has(node.uid);
      if(isNew&&node.type!=='category'){
        const parent=tree.index.get(pendingParent);
        const expected=TYPES[TYPES.indexOf(node.type)-1];
        if(!parent||parent.type!==expected)throw new Error('缺少上層 UID');
        await writeKeywordLibraryItem(scopeId,'insert',node);
        try{await writeKeywordLibraryItem(scopeId,'update',{
          ...parent,lists:[...parent.lists,node.uid]
        });}catch(error){
          await writeKeywordLibraryItem(scopeId,'delete',node).catch(()=>{});
          throw error;
        }
        await markStale(parent.uid);
      }else{
        const parent=parentOf(tree,node.uid);
        await writeKeywordLibraryItem(scopeId,isNew?'insert':'update',node);
        await markStale(node.uid);
      }
      await load(node.uid);await invalidate();setNotice('已儲存；相關關鍵字群組需重新分析。');
      return true;
    }catch(e){setError(String(e.message||e));return false;}
    finally{setBusy(false);}
  };
  const removeNode=async(node=draft||selected)=>{
    if(!node||busy)return;
    if(!window.confirm('刪除「'+node.name+'」及其下層分類？原始 Galaxy 文章不受影響。'))return;
    setBusy(true);setError('');
    try{
      const parent=parentOf(tree,node.uid);
      if(parent)await writeKeywordLibraryItem(scopeId,'update',{
        ...parent,lists:parent.lists.filter(uid=>uid!==node.uid)
      });
      await markStale(node.uid);
      const descendants=descendantsOfKeyword(rows,node.uid).reverse();
      const removedIds=new Set(descendants.map(row=>row.uid));
      const activeRemoved=removedIds.has(config.current_keyword_class_uid);
      for(const child of descendants)await writeKeywordLibraryItem(scopeId,'delete',child);
      const removedClasses=descendants.filter(child=>child.type==='class');
      if(removedClasses.length){
        let keyword_meta=config.keyword_meta||{};
        for(const deleted of removedClasses)
          keyword_meta=invalidateKeywordClass(keyword_meta,deleted.uid);
        const surviving=[...tree.index.values()].find(record=>
          record.type==='class'&&!removedIds.has(record.uid));
        const nextUid=activeRemoved?surviving?.uid||null:config.current_keyword_class_uid;
        const remainingState=keywordClassState({...config,keyword_meta},nextUid);
        const {error:settingsError}=await dbAuthRelation(configTable)
          .update({current_keyword_class_uid:nextUid,
            staticstime:remainingState?.completedAt||null,keyword_meta})
          .eq('id',scopeId);
        if(settingsError)throw settingsError;
      }
      await load(parent?.uid||'');await invalidate();
      setNotice('已刪除；不會刪除文章。');
    }catch(e){setError(String(e.message||e));}
    finally{setBusy(false);}
  };
  const saveConfig=async()=>{
    if(busy)return false;
    setBusy(true);setError('');
    try{
      const rulesChanged=Number(config.keyword_min_chars||0)!==Number(savedConfig.keyword_min_chars||0);
      const targetUid=String(config.current_keyword_class_uid||'');
      const targetState=keywordClassState(config,targetUid);
      const payload={
        current_keyword_class_uid:targetUid||null,
        keyword_min_chars:Number(config.keyword_min_chars)||0,
        keyword_min_documents:Number(config.keyword_min_documents)||0,
        keyword_class_share_enabled:Boolean(config.keyword_class_share_enabled),
        ...(rulesChanged
          ?{staticstime:null,keyword_meta:{by_class:{}}}
          :{staticstime:targetState?.completedAt||null})
      };
      const {data,error:writeError}=await dbAuthRelation(configTable).update(payload)
        .eq('id',scopeId).select('id');
      if(writeError||data?.length!==1)throw new Error(writeError?.message||'儲存設定失敗');
      await load();await invalidate();setNotice('設定已儲存。');return true;
    }catch(e){setError(String(e.message||e));return false;}
    finally{setBusy(false);}
  };
  const run=async(reset=false)=>{
    const runClassUid=activeClass?.uid||config.current_keyword_class_uid;
    if(busy||!runClassUid)return;
    setBusy(true);setProgress({phase:'reading',percent:0});setError('');
    try{
      if(reset)await resetKeywordClassification(scopeId,{classUid:runClassUid,onProgress:setProgress});
      else{
        const {runKeywordAnalysisBatch}=await import('./keyword-analysis');
        await runKeywordAnalysisBatch(scopeId,{classUid:runClassUid,onProgress:setProgress});
      }
      await load(runClassUid);await invalidate();
      setNotice(reset?'已清空此關鍵字群組的分析結果。':'此關鍵字群組已重新分析完成。');
    }catch(e){setError(String(e.message||e));}
    finally{setBusy(false);}
  };
  const copyClass=async()=>{
    const from=activeClass?.uid,to=copyName.trim();
    if(!from||!to)return;
    setBusy(true);setError('');
    try{
      const result=await copyKeywordLibraryClass(scopeId,from,to);
      await load(result.uid);await invalidate();setCopyName('');
      setNotice('已複製關鍵字群組「'+to+'」。');
    }catch(e){setError(String(e.message||e));}
    finally{setBusy(false);}
  };
  dockActions.current={
    save:()=>workspace==='analysis'?saveConfig():saveNode(),
    isDirty:()=>workspace==='analysis'
      ?['current_keyword_class_uid','keyword_min_chars','keyword_min_documents','keyword_class_share_enabled']
        .some(key=>String(config[key]??'')!==String(savedConfig[key]??''))
      :dirty,
    isBusy:()=>busy||loading
  };
  useEffect(()=>{
    if(!dock?.active||dock.scopeId!==scopeId||!canEdit)return;
    return dock.register({
      save:()=>dockActions.current.save(),
      isDirty:()=>dockActions.current.isDirty(),
      isBusy:()=>dockActions.current.isBusy()
    });
  },[dock?.active,dock?.scopeId,dock?.register,scopeId,canEdit]);
  if(!canEdit)return null;
  const selectedClass=activeClass;
  const allClassNodes=[...tree.index.values()].filter(x=>x.type==='class');
  const graphItems=selectedClass?descendantsOfKeyword(rows,selectedClass.uid,{type:'item'}).map(node=>{
    const group=parentOf(tree,node.uid);
    return {keyword_id:node.uid,item_name:node.name,keywords:node.lists,
      group_uid:group?.uid||'',class_group:group?.name||'',class_name:selectedClass.name};
  }):[];
  return <div className="scope-keyword-management">
    <div className="scope-stat-controls">
      {[['manual','群組對應調整'],['analysis','基本設定'],['run','重新分析'],['network','關聯圖']].map(([key,label])=>
        <button key={key} type="button" className="loc-button"
          aria-pressed={workspace===key} onClick={()=>{setWorkspace(key);setEditor(null);}}>
          {label}
        </button>)}
    </div>
    {loading?<p className="scope-status" role="status">讀取關鍵字資料中…</p>:null}
    {error?<p className="scope-status scope-error" role="alert">{error}</p>:null}
    {notice?<p className="scope-status" role="status">{notice}</p>:null}
    {!loading&&workspace==='manual'?<section className="loc-card scope-feature-card">
      <h2>關鍵詞分析 群組對應調整</h2>
      <div className="scope-management-fields">
        {TYPES.map((type,index)=>{
          const parent=index?tree.index.get(chosen[TYPES[index-1]]):null;
          const options=index?childrenOf(tree,parent?.uid):tree.roots;
          return <label key={type}><span>{LABEL[type]}</span>
            <select className="scope-select" value={chosen[type]} onChange={e=>choose(type,e.target.value)}
              disabled={index>0&&!parent}>
              <option value="">選擇 {LABEL[type]}</option>
              {options.map(row=><option key={row.uid} value={row.uid}>{row.name}</option>)}
            </select>
            <button type="button" className="loc-button" disabled={busy||(index>0&&!parent)}
              onClick={()=>create(type,parent?.uid||'')}>新增</button>
          </label>;
        })}
      </div>
      {selected?<div className="scope-preview-links">
        <button className="loc-button" type="button" disabled={busy} onClick={()=>edit(selected)}>編輯「{selected.name}」</button>
        <span className="scope-status">{LABEL[selected.type]}：{selected.lists.length}{selected.type==='item'?' 個判斷詞':' 筆'}</span>
      </div>:null}
      {!tree.roots.length?<p className="scope-status">尚無資料，請先新增關鍵字目錄。</p>:null}
      {draft?<div className="scope-management-editor">
        <h3>{tree.index.has(draft.uid)?'編輯':'新增'} {LABEL[draft.type]}</h3>
        <div className="scope-management-fields">
          <label><span>名稱</span><input value={draft.name} onChange={e=>setEditor({node:{...draft,name:e.target.value}})}/></label>
          <label><span>說明</span><textarea rows={2} value={draft.desc} onChange={e=>setEditor({node:{...draft,desc:e.target.value}})}/></label>
        </div>
        {draft.type==='item'?<label className="scope-management-wide-field">
          <span>判斷詞（一行一個）</span>
          <textarea rows={9} value={keywordText} onChange={e=>setKeywordText(e.target.value)}/>
        </label>:null}
        <div className="scope-preview-links">
          <button type="button" className="loc-button primary" disabled={busy||!draft.name.trim()} onClick={saveNode}>{busy?'儲存中…':'儲存'}</button>
          {tree.index.has(draft.uid)?<button type="button" className="loc-button scope-danger-button" disabled={busy} onClick={()=>removeNode(draft)}>刪除</button>:null}
          <button type="button" className="loc-button" onClick={()=>setEditor(null)} disabled={busy}>取消</button>
        </div>
      </div>:null}
      <div className="scope-stat-controls">
        <label><span>複製選定的關鍵字群組</span><input value={copyName} placeholder="新群組名稱"
          onChange={e=>setCopyName(e.target.value)}/></label>
        <button type="button" className="loc-button" disabled={!selectedClass||!copyName.trim()||busy} onClick={copyClass}>複製整套群組</button>
      </div>
    </section>:null}
    {!loading&&workspace==='analysis'?<section className="loc-card scope-feature-card">
      <h2>基本設定（此 Scope 共用）</h2>
      <div className="scope-management-fields">
        <label><span>目前使用的關鍵字群組</span><select className="scope-select" value={config.current_keyword_class_uid||''}
          onChange={e=>setConfig(v=>({...v,current_keyword_class_uid:e.target.value}))}>
          <option value="">未選擇</option>
          {allClassNodes.map(row=><option value={row.uid} key={row.uid}>{row.name}</option>)}
        </select></label>
        <label><span>文章最少字元</span><input type="number" min="0" value={config.keyword_min_chars??32}
          onChange={e=>setConfig(v=>({...v,keyword_min_chars:e.target.value}))}/></label>
        <label><span>統計最低文章數</span><input type="number" min="0" value={config.keyword_min_documents??100}
          onChange={e=>setConfig(v=>({...v,keyword_min_documents:e.target.value}))}/></label>
        <label><span>開放目前群組的分析結果</span><select className="scope-select" value={config.keyword_class_share_enabled?'yes':'no'}
          onChange={e=>setConfig(v=>({...v,keyword_class_share_enabled:e.target.value==='yes'}))}>
          <option value="no">不公開</option><option value="yes">公開</option>
        </select></label>
      </div>
      <button type="button" className="loc-button primary" disabled={busy} onClick={saveConfig}>儲存設定</button>
    </section>:null}
    {!loading&&workspace==='run'?<section className="loc-card scope-feature-card">
      <h2>重新分析</h2>
      <p className="scope-status">關鍵字群組：{activeClass?.name||'尚未選擇'} · 上次完成：{keywordClassState(config,activeClass?.uid)?.completedAt?new Date(keywordClassState(config,activeClass.uid).completedAt).toLocaleString('zh-TW'):'尚未分析'}</p>
      <p className="scope-status">有效分類文章：{Number(keywordClassState(config,activeClass?.uid)?.matchedDocuments||0).toLocaleString()} 篇</p>
      <div className="scope-preview-links">
        <button type="button" className="loc-button primary" disabled={busy||!(activeClass?.uid||config.current_keyword_class_uid)}
          onClick={()=>run(false)}>重新分析</button>
        <button type="button" className="loc-button" disabled={busy||!(activeClass?.uid||config.current_keyword_class_uid)}
          onClick={()=>run(true)}>清空本群組的分析結果</button>
      </div>
      {progress?<p role="status" className="scope-status">{progress.label||progress.phase}
        {progress.total?' · '+progress.completed+' / '+progress.total:''}</p>:null}
    </section>:null}
    {!loading&&workspace==='network'?<section className="loc-card scope-feature-card">
      <h2>關聯圖</h2>
      {graphItems.length?<KeywordNetworkEditor items={graphItems} className={selectedClass?.name||''}
        classId={selectedClass?.uid||''} selectedId={chosen.item}
        onSelectItem={item=>{choose('item',String(item.keyword_id));edit(tree.index.get(String(item.keyword_id)));setWorkspace('manual');}}
        onNewItem={groupUid=>{const group=groups.find(row=>row.uid===groupUid);if(group){create('item',group.uid);setWorkspace('manual');}}}
        onDeleteItem={item=>removeNode(tree.index.get(String(item.keyword_id)))}
        onDeleteKeyword={async(item,word)=>{
          const original=tree.index.get(String(item.keyword_id));
          await writeKeywordLibraryItem(scopeId,'update',{...original,lists:original.lists.filter(x=>x!==word)});
          await markStale(original.uid);await load(original.uid);await invalidate();
        }}
        onDeleteGroup={uid=>{const group=groups.find(row=>row.uid===uid);if(group)removeNode(group);}}
        onMessage={setNotice}
      />:<p className="scope-status">請先建立關鍵字群組、關鍵字分類與關鍵字。</p>}
    </section>:null}
  </div>;
}
