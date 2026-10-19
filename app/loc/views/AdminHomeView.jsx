'use client';
import UiText from '../../i18n/UiText';
import FieldText from '../../i18n/FieldText';

import {UI_COPY,UI_LOCALE_OPTIONS,normalizeUiLocale} from '../../i18n/ui-copy';
import {useUiCopy,useUiLocale} from '../../i18n/ui-locale';
import {translateUiField} from '../../i18n/ui-functional-copy.mjs';
import {useCallback,useEffect,useRef,useState} from 'react';
import dynamic from 'next/dynamic';
import dynamic from 'next/dynamic';
import {scopeHref,duplicateDomainLabelError} from '../../modular/scope-registry';
import {THEME_SLOTS} from '../../modular/theme-registry';
import {useAccount} from '../use-account';
// Registry editing and source catalogs are independent admin capabilities.
const AdminSourceCategories=dynamic(()=>import('../SourceCategoryEditor').then(mod=>mod.AdminSourceCategories),{loading:()=>null});
const ObjectEditor=dynamic(()=>import('../BlockNoteEditor').then(mod=>mod.ObjectEditor),{loading:()=>null});
import {ScopeFeatureToggles} from '../../modular/ui';
import {
  deleteScope,deleteRows,insertRows,dbAuthRelation,manageScopeRegistry,provisionScope,syncManageScopeRow,updateRows
} from '../db-client.mjs';

// Independent admin capabilities are loaded only for the selected workspace.
const DatabaseTarget=dynamic(()=>import('./admin-panels/DatabaseTarget'),{loading:()=>null});
const ThemeEditor=dynamic(()=>import('./admin-panels/ThemeEditor'),{loading:()=>null});
const AdminEmailBlocklist=dynamic(()=>import('./admin-panels/AdminEmailBlocklist'),{loading:()=>null});

const ADMIN_OPTIONS=Object.freeze([
  {value:'registry',label:'群組人員管理'},
  {value:'sources',label:'群組來源分類'},
  {value:'database',label:'資料庫設定'},
  {value:'themes',label:'主題設定'},
  {value:'blocklist',label:'系統黑名單'}
]);
const CREATE_OPTIONS=Object.freeze([
  {value:'scope',label:'新增人員'},
  {value:'group',label:'新增群組'}
]);
const EMPTY_SCOPE_CREATE={scope_id:'',email:'',locale:'zh-Hant',route_mode:'directory'};
const EMPTY_GROUP_CREATE={scope_id:'',display_name:'',route_mode:'directory',parent_scope_id:'loc'};
const EMPTY_MAPPING={email:'',galaxy:'galaxy',time:'time',birthday:''};

function Login({account}){
  const UI_COPY=useUiCopy();
  return <section className="loc-view">
    <header className="loc-hero"><p className="loc-eyebrow">{UI_COPY.admin.eyebrow}</p><h1>{UI_COPY.admin.loginTitle}</h1></header>
    <section className="loc-card">
      <a className="loc-button primary" href="/settings/">前往設定登入</a>
      {account.error?<p className="scope-status scope-error">{account.error}</p>:null}
    </section>
  </section>;
}

function normalizeAliases(value){
  return [...new Set((Array.isArray(value)?value:String(value||'').split(/[\n,，]/g))
    .map(item=>String(item||'').trim()).filter(Boolean))];
}

// Dynamic Scope tables are created in one transaction. PostgREST may keep the
// previous schema cache briefly after the provisioning RPC has committed.
function scopeSchemaCachePending(error){
  return String(error?.code||'')==='PGRST205'
    ||/could not find the table .* in the schema cache/i.test(String(error?.message||''));
}
const waitForScopeSchema=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function readAdminScopeConfig(scopeId,{attempts=7}={}){
  for(let attempt=0;attempt<attempts;attempt++){
    if(attempt>0)await waitForScopeSchema(Math.min(2000,350*attempt));
    const {data,error}=await dbAuthRelation('silver.'+scopeId)
      .select('id,display_name,search_intro,search_aliases,theme,locale,search_able,statistics_able,culture_able')
      .eq('id',scopeId).limit(1);
    if(!error)return data?.[0]||null;
    if(!scopeSchemaCachePending(error)||attempt===attempts-1){
      throw new Error(error.message||'人員設定讀取失敗。');
    }
  }
  return null;
}

function useAdminScopeData(){
  const [registry,setRegistry]=useState([]);
  const [mappings,setMappings]=useState([]);
  const [configs,setConfigs]=useState({});
  const [status,setStatus]=useState('');
  const [revision,setRevision]=useState(0);

  useEffect(()=>{
    let active=true;
    (async()=>{
      try{
        const [mappingResult,registryResult]=await Promise.all([
          dbAuthRelation('silver.manage').select('id,email,role,galaxy,time,birthday,Title_TW,Desc_TW').order('id',{ascending:true}).order('email',{ascending:true}),
          dbAuthRelation('silver.scope_registry').select('scope_id,display_name,scope_kind,domain,directory,parent_scope_id,active,sort_order').order('sort_order',{ascending:true}).order('scope_id',{ascending:true})
        ]);
        if(mappingResult.error)throw new Error(mappingResult.error.message||'Mapping 讀取失敗。');
        if(registryResult.error)throw new Error(registryResult.error.message||'人員目錄讀取失敗。');

        const registryRows=registryResult.data||[];
        const configRows={};
        const configFailures=[];
        await Promise.all(registryRows.filter(row=>row.scope_kind==='scope').map(async row=>{
          try{
            const config=await readAdminScopeConfig(row.scope_id);
            if(config)configRows[row.scope_id]=config;
            else configFailures.push(row.scope_id+'：找不到人員設定');
          }catch(error){
            configFailures.push(row.scope_id+'：'+String(error?.message||error||'人員設定讀取失敗。'));
          }
        }));

        if(!active)return;
        setRegistry(registryRows);
        setMappings((mappingResult.data||[]).map(row=>({...row,birthday:String(row.birthday||'').slice(0,10)})));
        setConfigs(configRows);
        setStatus(configFailures.length?'部分人員設定讀取失敗：'+configFailures.join('；'):'');
      }catch(error){
        if(active)setStatus(error?.message||'Admin 資料讀取失敗。');
      }
    })();
    return()=>{active=false};
  },[revision]);

  return {
    registry,setRegistry,mappings,setMappings,configs,setConfigs,status,setStatus,
    refresh:()=>setRevision(value=>value+1)
  };
}

function DeploymentTree({registry=[],configs={},selectedId='',onSelect,onMoveParent,onDeleteNode}){
  const containerRef=useRef(null);
  const networkRef=useRef(null);
  const [treeState,setTreeState]=useState('loading');
  const [treeError,setTreeError]=useState('');
  const handlersRef=useRef({onSelect,onMoveParent,onDeleteNode});
  useEffect(()=>{handlersRef.current={onSelect,onMoveParent,onDeleteNode};},[onSelect,onMoveParent,onDeleteNode]);

  useEffect(()=>{
    let cancelled=false;
    let network=null;
    let themeObserver=null;
    setTreeState('loading');
    setTreeError('');
    // Admin is the management site, not a Scope or an extra hierarchy level.
    const scopeRows=registry.filter(row=>row.scope_kind!=='system');
    if(!scopeRows.length)return()=>{cancelled=true;};
    const nodes=scopeRows.map(row=>({
      id:row.scope_id,
      label:(configs[row.scope_id]?.display_name||row.display_name||row.scope_id)+'\n'+row.scope_id+(row.active===false?' · 停用':''),
      shape:'box',
      borderWidth:row.scope_kind==='group'?2:1,
      shapeProperties:{borderRadius:12},
      widthConstraint:{maximum:210},
      fixed:row.scope_id==='loc',
      mass:1
    }));
    const scopeIds=new Set(scopeRows.map(row=>row.scope_id));
    const edges=scopeRows
      .filter(row=>row.parent_scope_id&&scopeIds.has(row.parent_scope_id))
      .map(row=>({from:row.parent_scope_id,to:row.scope_id,arrows:'to'}));
    const groupIds=new Set(scopeRows.filter(row=>row.scope_kind==='group').map(row=>row.scope_id));

    import('vis-network/standalone').then(({Network})=>{
      if(cancelled||!containerRef.current)return;
      const themeOptions=()=>{
        const css=getComputedStyle(document.documentElement);
        const token=(name,fallback)=>css.getPropertyValue(name).trim()||fallback;
        const panel=token('--loc-panel','#181922');
        const text=token('--loc-text','#fafafa');
        const line=token('--loc-line','#626574');
        const accent=token('--loc-accent','#8da8d4');
        return {
          nodes:{
            color:{background:panel,border:line,highlight:{background:panel,border:accent},hover:{background:panel,border:accent}},
            font:{color:text,face:'system-ui',size:15,multi:false},
            margin:14
          },
          edges:{color:{color:line,highlight:accent,hover:accent}}
        };
      };
      network=new Network(containerRef.current,{nodes,edges},{
        autoResize:true,
        physics:{enabled:false},
        // LR: Group parent at left, siblings aligned vertically at right; deeper Groups extend right.
        layout:{hierarchical:{enabled:true,direction:'LR',sortMethod:'directed',levelSeparation:235,nodeSpacing:120,treeSpacing:145}},
        interaction:{hover:true,dragNodes:true,dragView:true,zoomView:true,selectable:true,keyboard:true,navigationButtons:true},
        locale:'en',
        locales:{en:{
          edit:'編輯',del:'刪除所選',back:'返回',close:'關閉',addNode:'新增節點',addEdge:'新增關係',
          editNode:'編輯節點',editEdge:'編輯關係',addDescription:'在圖面放置節點',
          edgeDescription:'拖曳建立關係',editEdgeDescription:'拖曳調整關係',
          createEdgeError:'不可建立此關係',deleteClusterError:'不能刪除群集',editClusterError:'不能編輯群集'
        }},
        manipulation:{
          enabled:true,initiallyActive:true,addNode:false,addEdge:false,editEdge:false,
          editNode:(nodeData,callback)=>{
            const id=String(nodeData?.id||'');
            if(id)handlersRef.current.onSelect?.(id);
            callback(null);
          },
          deleteNode:(selection,callback)=>{
            // Never remove a visual node before the database confirms deletion.
            // Avoid browser prompt() from inside the vis-network manipulation callback.
            const ids=Array.isArray(selection?.nodes)?selection.nodes:[];
            callback(null);
            if(ids.length===1)handlersRef.current.onDeleteNode?.(String(ids[0]));
          }
        },
        ...themeOptions(),
        edges:{...themeOptions().edges,smooth:{enabled:true,type:'cubicBezier',forceDirection:'horizontal',roundness:.35}}
      });
      themeObserver=new MutationObserver(()=>network?.setOptions(themeOptions()));
      themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['style','data-theme-id']});
      networkRef.current=network;
      network.fit({animation:false,maxZoomLevel:1});
      setTreeState('ready');
      network.on('selectNode',params=>{
        const id=String(params?.nodes?.[0]||'');
        if(id)handlersRef.current.onSelect?.(id);
      });
      network.on('doubleClick',params=>{
        const id=String(params?.nodes?.[0]||'');
        if(id)handlersRef.current.onSelect?.(id);
      });
      network.on('dragEnd',params=>{
        const nodeId=String(params?.nodes?.[0]||'');
        if(!nodeId||nodeId==='loc')return;
        const row=registry.find(item=>item.scope_id===nodeId);
        if(!row||row.scope_kind==='group'&&nodeId==='loc')return;
        const positions=network.getPositions();
        const source=positions[nodeId];
        if(!source)return;
        let nearest=null;
        let distance=Infinity;
        for(const groupId of groupIds){
          if(groupId===nodeId)continue;
          const point=positions[groupId];
          if(!point)continue;
          const d=Math.hypot(point.x-source.x,point.y-source.y);
          if(d<distance){distance=d;nearest=groupId;}
        }
        if(nearest&&distance<190&&nearest!==row.parent_scope_id){
          const parent=registry.find(item=>item.scope_id===nearest);
          if(window.confirm('將 '+nodeId+' 移至 '+(parent?.display_name||nearest)+'？'))handlersRef.current.onMoveParent?.(nodeId,nearest);
          else network.fit({animation:false,maxZoomLevel:1});
        }
      });
      if(selectedId&&registry.some(row=>row.scope_id===selectedId)){
        network.selectNodes([selectedId]);
      }
    }).catch(error=>{
      if(cancelled)return;
      setTreeState('error');
      setTreeError(String(error?.message||error||'人員關聯圖載入失敗。'));
    });
    return()=>{cancelled=true;themeObserver?.disconnect();network?.destroy();networkRef.current=null;};
  // Draft Scope names are not canonical until saved; don't rebuild the graph on each keystroke.
  },[registry]);

  useEffect(()=>{
    const network=networkRef.current;
    if(!network||!selectedId)return;
    try{network.selectNodes([selectedId]);}catch{}
  },[selectedId]);

  return <div className="admin-deployment-tree-wrap">
    <div ref={containerRef} className={'admin-deployment-tree'+(treeState==='error'?' is-unavailable':'')} role="region" aria-label="人員目錄"/>
    {treeState!=='ready'?<div className="admin-registry-fallback" role="region" aria-label="人員清單">
      <p className="scope-status">{treeState==='error'?'圖形樹載入失敗，已切換清單模式。':'人員目錄載入中…'}</p>
      {treeError?<p className="scope-status scope-error">{treeError}</p>:null}
      {registry.length?<div className="admin-registry-fallback-list">
        {registry.filter(row=>row.scope_kind!=='system').map(row=><button type="button" className={'scope-inline-card admin-registry-fallback-item'+(row.scope_id===selectedId?' is-selected':'')} onClick={()=>onSelect?.(row.scope_id)} key={row.scope_id}>
          <strong>{configs[row.scope_id]?.display_name||row.display_name||row.scope_id}</strong>
          <span>{row.scope_id} · {row.scope_kind}{row.active===false?' · 停用':''}</span>
        </button>)}
      </div>:<p className="scope-status">目前沒有人員資料。</p>}
    </div>:null}
  </div>;
}

function RegistryNodePanel({data,selectedId,onDeleted,onDeleteNode}){
  const {registry,mappings,setMappings,configs,status,setStatus,refresh}=data;
  const selected=registry.find(row=>row.scope_id===selectedId)||null;
  const config=configs[selectedId]||null;
  const scopeMappings=mappings.filter(row=>row.id===selectedId);
  const [newMapping,setNewMapping]=useState({...EMPTY_MAPPING});
  const pageCopy=scopeMappings[0]||null;
  // Only persist after explicit Save. Clicking another node or Cancel discards this draft.
  const [editDraft,setEditDraft]=useState(null);
  const editing=editDraft?.scopeId===selectedId;
  const current=editing?editDraft.registry:selected;
  const currentConfig=editing?editDraft.config:config;
  const currentCopy=editing?editDraft.pageCopy:pageCopy;
  const beginEdit=()=>setEditDraft({
    scopeId:selectedId,
    registry:{...selected},
    config:config?{...config}:null,
    pageCopy:pageCopy?{Title_TW:pageCopy.Title_TW||'',Desc_TW:pageCopy.Desc_TW||''}:null
  });
  const cancelEdit=()=>setEditDraft(null);
  const patchRegistry=(key,value)=>setEditDraft(draft=>draft?.scopeId!==selectedId?draft:{
    ...draft,registry:{...draft.registry,[key]:value}
  });
  const patchConfig=(key,value)=>setEditDraft(draft=>draft?.scopeId!==selectedId?draft:{
    ...draft,config:{...draft.config,[key]:value}
  });
  const patchPageCopy=(key,value)=>setEditDraft(draft=>draft?.scopeId!==selectedId?draft:{
    ...draft,pageCopy:{...draft.pageCopy,[key]:value}
  });

  const groups=registry.filter(row=>row.scope_kind==='group'&&row.active!==false&&row.scope_id!==selectedId);
  const parentOptions=[{value:'',label:'—'},...groups.map(row=>({value:row.scope_id,label:(row.display_name||row.scope_id)+' · '+row.scope_id}))];
  const themeOptions=[{value:'system-default',label:'系統預設（日／夜自動）'},...THEME_SLOTS.map(theme=>({value:theme.id,label:theme.label}))];
  const routeMode=current?.domain?'domain':'directory';
  const routeLocked=['loc','lrunes','lo3rwang'].includes(selectedId);
  const routeValue=routeMode==='domain'
    ?'https://'+String(current?.domain||'')
    :'https://loc.lo3rwang.cc'+String(current?.directory||'');
  const chooseRouteMode=mode=>setEditDraft(draft=>draft?.scopeId!==selectedId?draft:{
    ...draft,registry:{
      ...draft.registry,
      domain:mode==='domain'?draft.registry.domain||draft.registry.scope_id+'.lo3rwang.cc':null,
      directory:mode==='directory'?draft.registry.directory||'/'+draft.registry.scope_id:null
    }
  });
  const patchMapping=(email,key,value)=>setMappings(rows=>rows.map(row=>row.id===selectedId&&row.email===email?{...row,[key]:value}:row));

  async function saveRegistryAndConfig(){
    if(!editing||!current)return;
    setStatus('');
    try{
      if(current.scope_kind!=='system'){
        const hasDomain=Boolean(String(current.domain||'').trim());
        const hasDirectory=Boolean(String(current.directory||'').trim());
        if(hasDomain===hasDirectory)throw new Error('Domain / Directory 必須二選一。');
        await manageScopeRegistry('update',current.scope_id,{
          display_name:String(current.display_name||current.scope_id).trim(),
          domain:String(current.domain||'').trim()||null,
          directory:String(current.directory||'').trim()||null,
          parent_scope_id:current.scope_id==='loc'?null:(String(current.parent_scope_id||'').trim()||null),
          active:current.scope_id==='loc'?true:current.active!==false
        });
      }
      if(current.scope_kind==='scope'&&currentCopy){
        if(!String(currentCopy.Title_TW||'').trim())throw new Error('NAV 中文名稱不可空白。');
        if(String(currentCopy.Title_TW||'')!==String(pageCopy?.Title_TW||'')||
          String(currentCopy.Desc_TW||'')!==String(pageCopy?.Desc_TW||'')){
          await updateRows('silver.manage',{
            Title_TW:String(currentCopy.Title_TW||'').trim(),
            Desc_TW:String(currentCopy.Desc_TW||'').trim()
          },{filters:[{column:'id',operator:'eq',value:current.scope_id}]});
        }
      }
      if(current.scope_kind==='scope'&&currentConfig){
        await updateRows('silver.'+current.scope_id,{
          display_name:String(currentConfig.display_name||current.scope_id).trim(),
          search_intro:String(currentConfig.search_intro||'').trim(),
          search_aliases:normalizeAliases(currentConfig.search_aliases),
          theme:String(currentConfig.theme||'system-default'),
          locale:normalizeUiLocale(currentConfig.locale),
          search_able:currentConfig.search_able!==false,
          statistics_able:currentConfig.statistics_able!==false,
          culture_able:currentConfig.culture_able!==false,
          updated_at:new Date().toISOString()
        },{filters:[{column:'id',operator:'eq',value:current.scope_id}]});
      }
      setStatus(current.scope_id+' 已更新。');
      setEditDraft(null);
      refresh();
    }catch(error){setStatus(error?.message||'人員更新失敗。');}
  }

  async function saveMapping(row){
    setStatus('');
    try{
      await syncManageScopeRow({
        galaxy:String(row.galaxy||'galaxy').trim()||'galaxy',
        time:String(row.time||'time').trim()||'time',
        birthday:row.birthday||null
      },{scopeId:row.id,email:row.email});
      setStatus('Mapping 已更新。');refresh();
    }catch(error){setStatus(error?.message||'Mapping 更新失敗。');}
  }

  async function removeMapping(row){
    if(!window.confirm('移除 '+row.email+'？'))return;
    try{
      await deleteRows('silver.manage',{filters:[
        {column:'id',operator:'eq',value:row.id},{column:'email',operator:'eq',value:row.email}
      ]});
      setStatus('Mapping 已移除。');refresh();
    }catch(error){setStatus(error?.message||'Mapping 刪除失敗。');}
  }

  async function addMapping(){
    if(!selected||selected.scope_kind!=='scope')return;
    setStatus('');
    try{
      const email=String(newMapping.email||'').trim().toLowerCase();
      if(!/^\S+@\S+\.\S+$/.test(email))throw new Error('Email 格式不正確。');
      await insertRows('silver.manage',[{
        id:selected.scope_id,email,role:'scope',
        galaxy:String(newMapping.galaxy||'galaxy').trim()||'galaxy',
        time:String(newMapping.time||'time').trim()||'time',
        birthday:newMapping.birthday||null,
        Title_TW:String(pageCopy?.Title_TW||'').trim()||selected.scope_id,
        Desc_TW:String(pageCopy?.Desc_TW||'').trim()
      }]);
      setNewMapping({...EMPTY_MAPPING});setStatus('Mapping 已新增。');refresh();
    }catch(error){setStatus(error?.message||'Mapping 新增失敗。');}
  }

  if(!selected)return <aside className="admin-context-panel"><p className="scope-status">請選擇人員或群組</p></aside>;

  const attrs=[
    {label:'人員代碼',value:selected.scope_id},
    {label:'節點類型',value:selected.scope_kind==='group'?'群組':'人員'},
    {label:'顯示名稱',value:config?.display_name||selected.display_name||'—'},
    ...(selected.scope_kind==='scope'?[
      {label:'NAV 中文名稱',value:pageCopy?.Title_TW||'未設定'},
      {label:'頁面說明',value:pageCopy?.Desc_TW||'未設定'},
      {label:'搜尋介紹',value:config?.search_intro||'未設定'},
      {label:'搜尋別名',value:normalizeAliases(config?.search_aliases).join('、')||'未設定'},
      {label:'主題',value:themeOptions.find(option=>option.value===(config?.theme||'system-default'))?.label||'系統預設'},
      {label:'預設語系',value:UI_LOCALE_OPTIONS.find(option=>option.value===normalizeUiLocale(config?.locale))?.label||'繁體中文'},
      {label:'功能開放',value:['Search','Statistics','Culture'].filter((name,index)=>[config?.search_able,config?.statistics_able,config?.culture_able][index]!==false).join('、')||'全部停用'},
      {label:'管理者數量',value:String(scopeMappings.length)}
    ]:[]),
    {label:'路由類型',value:routeMode==='domain'?'Domain · 獨立網域':'Directory · 站內路徑'},
    {label:'實際位置',value:routeValue},
    ...(selected.scope_id==='loc'?[]:[{label:'所屬群組',value:registry.find(row=>row.scope_id===selected.parent_scope_id)?.display_name||selected.parent_scope_id||'—'}]),
    {label:'狀態',value:selected.active!==false?'啟用':'隱藏'}
  ];

  return <aside className={'admin-context-panel'+(editing?' is-editing':' is-reading')}>
    <div className="admin-node-heading">
      <div>
                <h2>{config?.display_name||selected.display_name||selected.scope_id}</h2>
      </div>
      {!editing?<div className="admin-node-actions">
        <button type="button" className="loc-button primary" onClick={beginEdit}><UiText id="uiExtra.adminView.editSettings"/></button>
        {selected.scope_kind==='scope'&&!routeLocked?<button type="button" className="loc-button" onClick={()=>onDeleteNode?.(selectedId)}><UiText id="uiExtra.adminView.delete"/></button>:null}
      </div>:<span className="scope-status"><UiText id="uiExtra.adminView.editingDraftNotSaved"/></span>}
    </div>

    {!editing?<div className="admin-attribute-grid" aria-label="人員設定摘要">
      {attrs.map(item=><button type="button" className="admin-attribute" key={item.label} onClick={beginEdit} title={'編輯 '+item.label}>
        <span><FieldText text={item.label}/></span>
        <strong>{item.value}</strong>
      </button>)}
    </div>:<>
      {current.scope_kind==='group'?<label><span><UiText id="uiExtra.adminView.groupName"/></span><input value={current.display_name||''} onChange={e=>patchRegistry('display_name',e.target.value)}/></label>:null}
      {current.scope_kind==='scope'&&currentConfig?<>
        {currentCopy?<section className="admin-page-copy-fields" aria-label="公開頁面名稱設定">
          <label><span><UiText id="uiExtra.adminView.navigationTitle"/></span><input required value={currentCopy.Title_TW||''} onChange={e=>patchPageCopy('Title_TW',e.target.value)}/></label>
          <ObjectEditor mode="fields" fields={[
            {key:'Desc_TW',kind:'rich',label:<UiText id="uiExtra.adminView.pageDescription"/>,
              editorKey:'admin-page-description:'+selectedId,content:currentCopy.Desc_TW||'',
              canInsertImage:false,onPlainTextChange:value=>patchPageCopy('Desc_TW',value)}
          ]}/>
        </section>:null}
        <label><span><UiText id="uiExtra.adminView.displayName"/></span><input value={currentConfig.display_name||''} onChange={e=>patchConfig('display_name',e.target.value)}/></label>
        <ObjectEditor mode="fields" fields={[
          {key:'search_intro',kind:'rich',label:<UiText id="uiExtra.adminView.searchIntroduction"/>,
            editorKey:'admin-search-intro:'+selectedId,content:currentConfig.search_intro||'',
            canInsertImage:false,onPlainTextChange:value=>patchConfig('search_intro',value)},
          {key:'search_aliases',kind:'rich',label:<UiText id="uiExtra.adminView.searchAliases"/>,
            editorKey:'admin-search-aliases:'+selectedId,
            content:normalizeAliases(currentConfig.search_aliases).join('\n'),
            canInsertImage:false,onPlainTextChange:value=>patchConfig('search_aliases',value.split('\n'))}
        ]}/>
        <label><span><UiText id="uiExtra.adminView.theme"/></span><select className="admin-native-select" value={currentConfig.theme||'system-default'} onChange={e=>patchConfig('theme',e.target.value)}>{themeOptions.map(option=><option value={option.value} key={option.value}><FieldText text={option.label}/></option>)}</select></label>
        <label><span><UiText id="uiExtra.adminView.defaultLanguage"/></span><select className="admin-native-select" value={normalizeUiLocale(currentConfig.locale)} onChange={e=>patchConfig('locale',normalizeUiLocale(e.target.value))}>{UI_LOCALE_OPTIONS.map(option=><option value={option.value} key={option.value}><FieldText text={option.label}/></option>)}</select></label>
        <ScopeFeatureToggles className="admin-inline-flags" value={currentConfig} onChange={patchConfig}/>
      </>:null}

      <div className="admin-route-summary" aria-label="目前路由">
        <span><UiText id="uiExtra.adminView.routeType"/></span>
        <strong>{routeMode==='domain'?'Domain · 獨立網域':'Directory · 站內路徑'}</strong>
        <code>{routeValue}</code>
      </div>
      {!routeLocked?<div className="admin-inline-flags" role="radiogroup" aria-label="路由模式">
        <label><input type="radio" name={'registry-route-mode-'+selectedId} value="domain" checked={routeMode==='domain'} onChange={()=>chooseRouteMode('domain')}/><UiText id="uiExtra.adminView.independentDomain"/></label>
        <label><input type="radio" name={'registry-route-mode-'+selectedId} value="directory" checked={routeMode==='directory'} onChange={()=>chooseRouteMode('directory')}/><UiText id="uiExtra.adminView.siteDirectory"/></label>
      </div>:null}
      {current.scope_id!=='loc'?<label><span><UiText id="uiExtra.adminView.parentGroup"/></span><select className="admin-native-select" value={String(current.parent_scope_id||'')} onChange={e=>patchRegistry('parent_scope_id',e.target.value||'')}>{parentOptions.map(option=><option value={option.value} key={option.value||'root'}><FieldText text={option.label}/></option>)}</select></label>:null}
      {current.scope_kind==='scope'?<label className="scope-setting-toggle"><input type="checkbox" checked={current.active!==false} onChange={e=>patchRegistry('active',e.target.checked)}/> <UiText id="uiExtra.adminView.publiclyEnabled"/></label>:null}
      <ObjectEditor mode="actions" actionClassName="scope-tabs admin-edit-actions" actions={[
        {key:'save',primary:true,onClick:saveRegistryAndConfig,label:<UiText id="uiExtra.adminView.save"/>},
        {key:'cancel',onClick:cancelEdit,label:<UiText id="uiExtra.adminView.cancel"/>},
        ...(current.scope_kind==='scope'?[{key:'delete',danger:true,disabled:routeLocked,
          onClick:()=>onDeleteNode?.(current.scope_id),label:<UiText id="uiExtra.adminView.delete"/>}]:[])
      ]}/>
    </>}

    {selected.scope_kind==='scope'&&!editing?<details className="admin-node-mapping">
      <summary>管理者 Mapping（{scopeMappings.length}）</summary>
      {scopeMappings.map(row=><article className="scope-inline-card" key={row.email}>
        <strong>{row.email}</strong>
        <div className="scope-management-fields">
          <label><span>Galaxy</span><input value={row.galaxy||'galaxy'} onChange={e=>patchMapping(row.email,'galaxy',e.target.value)}/></label>
          <label><span>Time</span><input value={row.time||'time'} onChange={e=>patchMapping(row.email,'time',e.target.value)}/></label>
          <label><span>Birthday</span><input type="date" value={row.birthday||''} onChange={e=>patchMapping(row.email,'birthday',e.target.value)}/></label>
        </div>
        <div className="scope-tabs"><button type="button" onClick={()=>saveMapping(row)}><UiText id="uiExtra.adminView.saveMapping"/></button><button type="button" onClick={()=>removeMapping(row)}><UiText id="uiExtra.adminView.remove"/></button></div>
      </article>)}
      <details>
        <summary><UiText id="uiExtra.adminView.addAdministrator"/></summary>
        <label><span>Email</span><input type="email" value={newMapping.email} onChange={e=>setNewMapping(v=>({...v,email:e.target.value}))}/></label>
        <button type="button" className="loc-button" onClick={addMapping}><UiText id="uiExtra.adminView.add"/></button>
      </details>
    </details>:null}

    {status?<p className="scope-status" role="status">{status}</p>:null}
  </aside>;
}

function CreateNodePanel({data,kind='scope',onClose}){
  const {registry,setStatus,refresh}=data;
  const groups=registry.filter(row=>row.scope_kind==='group'&&row.active!==false);
  const parentOptions=groups.map(row=>({value:row.scope_id,label:(row.display_name||row.scope_id)+' · '+row.scope_id}));
  const [scopeDraft,setScopeDraft]=useState({...EMPTY_SCOPE_CREATE});
  const [groupDraft,setGroupDraft]=useState({...EMPTY_GROUP_CREATE});
  const [creatingScope,setCreatingScope]=useState(false);
  const scopeDomainError=duplicateDomainLabelError(scopeDraft.scope_id,scopeDraft.route_mode);
  const groupDomainError=duplicateDomainLabelError(groupDraft.scope_id,groupDraft.route_mode);

  async function createScope(){
    if(creatingScope)return;
    setCreatingScope(true);
    setStatus('正在建立人員資料…');
    let provisioned=false;
    let id='';
    try{
      id=String(scopeDraft.scope_id||'').trim().toLowerCase();
      if(!/^[a-z][a-z0-9]{0,14}$/.test(id))throw new Error('人員代碼格式不正確。');
      const email=String(scopeDraft.email||'').trim().toLowerCase();
      if(!email)throw new Error('請先設定管理者 Email。');
      if(!/^\\S+@\\S+\\.\\S+$/.test(email))throw new Error('Email 格式不正確。');
      const mode=scopeDraft.route_mode;
      if(!['directory','domain'].includes(mode))throw new Error('請選擇 Directory 或 Domain。');
      if(duplicateDomainLabelError(id,mode))throw new Error('網域名稱重複，拒絕建立。');
      const provisionedScope=await provisionScope({
        scope_id:id,
        display_name:id,
        email,
        domain:mode==='domain'?id+'.lo3rwang.cc':null,
        directory:mode==='directory'?'/'+id:null,
        parent_scope_id:'loc',
        theme:'system-default',
        copy_keywords:true
      });
      // The RPC returned successfully; a later schema-cache failure is not a failed creation.
      provisioned=true;
      if(String(provisionedScope?.scope_id||'')!==id)throw new Error('人員建立回應缺少正確代碼。');
      if(Number(provisionedScope?.keyword_rows)!==66)throw new Error('符文66複製數量不正確，請核對資料庫。');
      await updateRows('silver.'+id,{
        locale:normalizeUiLocale(scopeDraft.locale),
        updated_at:new Date().toISOString()
      },{filters:[{column:'id',operator:'eq',value:id}]});
      const config=await readAdminScopeConfig(id);
      if(!config)throw new Error('人員設定尚未可讀。');
      setStatus('人員 '+id+' 已建立。');
      refresh();
      onClose?.();
    }catch(error){
      if(provisioned){
        setStatus('人員 '+id+' 已建立，但後續驗證／設定尚未完成：'+String(error?.message||error)+'。請重新讀取，不要重複建立。');
        refresh();
        onClose?.();
      }else setStatus(error?.message||'人員建立失敗。');
    }finally{setCreatingScope(false);}
  }

  async function createGroup(){
    try{
      const id=String(groupDraft.scope_id||'').trim().toLowerCase();
      if(!/^[a-z][a-z0-9]{0,14}$/.test(id))throw new Error('Group ID 格式不正確。');
      if(duplicateDomainLabelError(id,groupDraft.route_mode))throw new Error('網域名稱重複，拒絕建立。');
      await manageScopeRegistry('create_group',id,{
        display_name:String(groupDraft.display_name||'').trim(),
        domain:groupDraft.route_mode==='domain'?id+'.lo3rwang.cc':null,
        directory:groupDraft.route_mode==='directory'?'/'+id:null,
        parent_scope_id:String(groupDraft.parent_scope_id||'loc').trim()||'loc'
      });
      setStatus('群組 '+id+' 已建立。');refresh();onClose?.();
    }catch(error){setStatus(error?.message||'群組建立失敗。');}
  }

  const parentValue=value=>parentOptions.find(o=>o.value===value)||parentOptions[0]||null;
  return <aside className="admin-context-panel">
    <div className="admin-node-heading"><h2>{kind==='group'?'新增群組':'新增人員'}</h2><button type="button" className="loc-button" onClick={onClose}><UiText id="uiExtra.adminView.cancel"/></button></div>
    {kind==='scope'?<>
      <label><span><UiText id="uiExtra.adminView.memberId"/></span><input maxLength="15" value={scopeDraft.scope_id} onChange={e=>setScopeDraft(v=>({...v,scope_id:e.target.value.toLowerCase()}))}/></label>
      <label><span><UiText id="uiExtra.adminView.administratorEmail"/></span><input type="email" required autoComplete="off" value={scopeDraft.email} onChange={e=>setScopeDraft(v=>({...v,email:e.target.value}))}/></label>
      <label><span><UiText id="uiExtra.adminView.defaultLanguage"/></span><select className="admin-native-select" value={normalizeUiLocale(scopeDraft.locale)} onChange={e=>setScopeDraft(v=>({...v,locale:normalizeUiLocale(e.target.value)}))}>{UI_LOCALE_OPTIONS.map(option=><option value={option.value} key={option.value}><FieldText text={option.label}/></option>)}</select></label>
      <div className="admin-inline-flags" role="radiogroup" aria-label="人員網址">
        <label><input type="radio" name="new-scope-route-mode" value="directory" checked={scopeDraft.route_mode==='directory'} onChange={()=>setScopeDraft(v=>({...v,route_mode:'directory'}))}/>Directory</label>
        <label><input type="radio" name="new-scope-route-mode" value="domain" checked={scopeDraft.route_mode==='domain'} onChange={()=>setScopeDraft(v=>({...v,route_mode:'domain'}))}/>Domain</label>
      </div>
      <div className="admin-route-summary"><span><UiText id="uiExtra.adminView.createLocation"/></span><strong>{scopeDraft.route_mode==='domain'?'Domain · 獨立網域':'Directory · 站內路徑'}</strong><code>{scopeDraft.route_mode==='domain'?(scopeDraft.scope_id||'scope-id')+'.lo3rwang.cc':'https://loc.lo3rwang.cc/'+(scopeDraft.scope_id||'scope-id')}</code></div>
      {scopeDomainError?<p className="scope-status scope-error" role="alert">{scopeDomainError}</p>:null}
      <button type="button" className="loc-button primary" disabled={Boolean(scopeDomainError)||creatingScope} onClick={createScope}><FieldText text={creatingScope?'建立與驗證中…':'建立'}/></button>
    </>:<>
      <label><span><UiText id="uiExtra.adminView.groupId"/></span><input maxLength="15" value={groupDraft.scope_id} onChange={e=>setGroupDraft(v=>({...v,scope_id:e.target.value.toLowerCase()}))}/></label>
      <label><span><UiText id="uiExtra.adminView.groupName"/></span><input value={groupDraft.display_name} onChange={e=>setGroupDraft(v=>({...v,display_name:e.target.value}))}/></label>
      <div className="admin-inline-flags" role="radiogroup" aria-label="群組網址">
        <label><input type="radio" name="new-group-route-mode" value="directory" checked={groupDraft.route_mode==='directory'} onChange={()=>setGroupDraft(v=>({...v,route_mode:'directory'}))}/>Directory</label>
        <label><input type="radio" name="new-group-route-mode" value="domain" checked={groupDraft.route_mode==='domain'} onChange={()=>setGroupDraft(v=>({...v,route_mode:'domain'}))}/>Domain</label>
      </div>
      <div className="admin-route-summary"><span><UiText id="uiExtra.adminView.createLocation"/></span><strong>{groupDraft.route_mode==='domain'?'Domain · 獨立網域':'Directory · 站內路徑'}</strong><code>{groupDraft.route_mode==='domain'?(groupDraft.scope_id||'group-id')+'.lo3rwang.cc':'https://loc.lo3rwang.cc/'+(groupDraft.scope_id||'group-id')}</code></div>
      {groupDomainError?<p className="scope-status scope-error" role="alert">{groupDomainError}</p>:null}
      <label><span><UiText id="uiExtra.adminView.parentGroup2"/></span><select className="admin-native-select" value={groupDraft.parent_scope_id||'loc'} onChange={e=>setGroupDraft(v=>({...v,parent_scope_id:e.target.value||'loc'}))}>{parentOptions.map(option=><option value={option.value} key={option.value}><FieldText text={option.label}/></option>)}</select></label>
      <button type="button" className="loc-button primary" disabled={Boolean(groupDomainError)} onClick={createGroup}><UiText id="uiExtra.adminView.create"/></button>
    </>}
  </aside>;
}

function AdminRegistry(){
  const data=useAdminScopeData();
  const {registry,configs,setRegistry,setStatus,refresh}=data;
  const [selectedId,setSelectedId]=useState('');
  const [createKind,setCreateKind]=useState('');
  const [deletePending,setDeletePending]=useState('');
  const [deleteTyped,setDeleteTyped]=useState('');
  const [deleteBusy,setDeleteBusy]=useState(false);
  const [deleteNotice,setDeleteNotice]=useState('');
  const deleteConfirmRef=useRef(null);
  useEffect(()=>{
    if(deletePending)deleteConfirmRef.current?.scrollIntoView({behavior:'smooth',block:'nearest'});
  },[deletePending]);

  useEffect(()=>{
    if(selectedId&&registry.some(row=>row.scope_id===selectedId))return;
    setSelectedId(registry.find(row=>row.scope_id==='loc')?.scope_id||registry[0]?.scope_id||'');
  },[registry,selectedId]);

  const moveParent=useCallback(async(nodeId,parentId)=>{
    const row=registry.find(item=>item.scope_id===nodeId);
    if(!row)return;
    setRegistry(rows=>rows.map(item=>item.scope_id===nodeId?{...item,parent_scope_id:parentId}:item));
    setStatus('移動中…');
    try{
      await manageScopeRegistry('update',nodeId,{
        display_name:String(row.display_name||nodeId),
        domain:row.domain||null,directory:row.directory||null,
        parent_scope_id:parentId,active:row.active!==false,sort_order:Number(row.sort_order)||0
      });
      setStatus(nodeId+' 已移到 '+parentId+'。');refresh();
    }catch(error){setStatus(error?.message||'移動失敗。');refresh();}
  },[registry,setRegistry,setStatus,refresh]);

  const selectNode=useCallback(id=>{setCreateKind('');setSelectedId(id);},[]);
  const requestDelete=useCallback(id=>{
    if(deleteBusy)return;
    const row=registry.find(item=>item.scope_id===id);
    if(!row||row.scope_kind!=='scope'){
      setDeleteNotice('只能刪除一般人員；群組與系統節點不可刪除。');
      return;
    }
    if(['loc','lrunes','lo3rwang','admin'].includes(id)){
      setDeleteNotice('內建人員不可刪除。');
      return;
    }
    setCreateKind('');
    setSelectedId(id);
    setDeleteTyped('');
    setDeleteNotice('');
    setDeletePending(id);
  },[registry,deleteBusy]);
  const cancelDelete=()=>{if(deleteBusy)return;setDeletePending('');setDeleteTyped('');};
  const confirmDelete=async()=>{
    const id=deletePending;
    if(!id||deleteBusy||deleteTyped.trim().toLowerCase()!==id)return;
    setDeleteBusy(true);
    setDeleteNotice(id+' 正在刪除並核對資料庫…');
    try{
      const result=await deleteScope(id);
      if(result?.deleted!==true||result?.scope_id!==id){
        throw new Error('刪除 RPC 未回傳正確的完成確認。');
      }
      const {data:remaining,error:verifyError}=await dbAuthRelation('silver.scope_registry')
        .select('scope_id').eq('scope_id',id).limit(1);
      if(verifyError)throw new Error('刪除已執行，但 Registry 驗證失敗：'+verifyError.message);
      if(remaining?.length)throw new Error('資料庫仍存在 '+id+'，已取消前端成功提示。');
      setRegistry(rows=>rows.filter(row=>row.scope_id!==id));
      setSelectedId(current=>current===id?'loc':current);
      setDeletePending('');
      setDeleteTyped('');
      setDeleteNotice('人員 '+id+' 已移除。');
      refresh();
    }catch(error){
      setDeleteNotice('刪除 '+id+' 失敗：'+String(error?.message||error)+'。節點保留，請檢查後重試。');
      refresh();
    }finally{setDeleteBusy(false);}
  };
  return <section className="loc-card admin-workspace">
    <div className="admin-deployment-layout">
      <div className="admin-graph-header">
        <div><h2><UiText id="uiExtra.adminView.memberRelationshipGraph"/></h2></div>
        <div className="admin-registry-actions">
          <button type="button" className="loc-button" onClick={refresh}><UiText id="uiExtra.adminView.reload"/></button>
          <button type="button" className="loc-button" onClick={()=>setCreateKind('scope')}><UiText id="uiExtra.adminView.ddMember"/></button>
          <button type="button" className="loc-button" onClick={()=>setCreateKind('group')}><UiText id="uiExtra.adminView.ddGroup"/></button>
        </div>
      </div>
      <DeploymentTree registry={registry} configs={configs} selectedId={selectedId} onSelect={selectNode} onMoveParent={moveParent} onDeleteNode={requestDelete}/>
      {deletePending?<section className="admin-delete-confirm" ref={deleteConfirmRef} role="region" aria-label="刪除人員確認">
        <div><strong>永久刪除人員：{deletePending}</strong><p>將移除此人員的六張資料表、關鍵詞、設定及管理紀錄；此操作不可復原。</p></div>
        <label><span>請輸入 {deletePending} 以確認</span><input autoFocus autoComplete="off" value={deleteTyped} disabled={deleteBusy} onChange={e=>setDeleteTyped(e.target.value)} /></label>
        <div className="scope-tabs">
          <button type="button" className="loc-button" disabled={deleteBusy} onClick={cancelDelete}><UiText id="uiExtra.adminView.cancel"/></button>
          <button type="button" className="loc-button primary" disabled={deleteBusy||deleteTyped.trim().toLowerCase()!==deletePending} onClick={confirmDelete}><FieldText text={deleteBusy?'刪除與驗證中…':'確認永久刪除'}/></button>
        </div>
      </section>:null}
      {deleteNotice?<p className={'scope-status'+(deleteNotice.includes('失敗')?' scope-error':'')} role="status">{deleteNotice}</p>:null}
      {data.status?<p className="scope-status" role="status">{data.status}</p>:null}
      <div className="admin-editor-section" id="admin-scope-editor">
        {createKind?<CreateNodePanel data={data} kind={createKind} onClose={()=>setCreateKind('')}/>:<RegistryNodePanel key={selectedId} data={data} selectedId={selectedId} onDeleted={()=>setSelectedId('')} onDeleteNode={requestDelete}/>}
      </div>
    </div>
  </section>;
}

export default function AdminHomeView(){
  const UI_COPY=useUiCopy();
  const {locale}=useUiLocale();
  const account=useAccount();
  const [section,setSection]=useState('registry');
  const selectedOption=ADMIN_OPTIONS.find(option=>option.value===section)||ADMIN_OPTIONS[0];

  if(account.loading||account.permissionLoading)return <section className="loc-view"><div className="loc-card">{UI_COPY.admin.checking}</div></section>;
  if(!account.user)return <Login account={account}/>;
  if(!account.canManageGlobalSync())return <section className="loc-view"><section className="loc-card"><p>{UI_COPY.admin.denied}</p><a href="/settings/"><UiText id="uiExtra.adminView.accountSettings"/></a></section></section>;

  return <section className="loc-view scope-management-page">
    <header className="loc-hero loc-hero-context admin-hero">
      <div className="admin-hero-row"><h1>{UI_COPY.admin.eyebrow}</h1><a className="loc-button" href="/settings/"><UiText id="uiExtra.adminView.accountSettings"/></a></div>
      <div className="admin-main-select">
        <select className="admin-native-select" value={selectedOption.value} onChange={e=>setSection(e.target.value||'registry')} aria-label={translateUiField(locale,'Admin 管理功能')}>{ADMIN_OPTIONS.map(option=><option value={option.value} key={option.value}><FieldText text={option.label}/></option>)}</select>
      </div>
    </header>
    {section==='registry'?<AdminRegistry/>:null}
    {section==='sources'?<AdminSourceCategories/>:null}
    {section==='database'?<DatabaseTarget/>:null}
    {section==='themes'?<ThemeEditor/>:null}
    {section==='blocklist'?<AdminEmailBlocklist/>:null}
  </section>;
}
