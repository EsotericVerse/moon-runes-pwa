'use client';

import {UI_COPY,UI_LOCALE_OPTIONS,normalizeUiLocale} from '../../i18n/ui-copy';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import Select from 'react-select';
import {scopeHref} from '../../modular/scope-registry';
import {THEME_SLOTS,THEME_TOKEN_KEYS,applyTheme,getThemeSlot} from '../../modular/theme-registry';
import {mergeThemeSlot} from '../theme-data';
import {useAccount} from '../use-account';
import {
  deleteRows,insertRows,dbAuthRelation,manageScopeRegistry,provisionScope,syncManageScopeRow,updateRows
} from '../db-client.mjs';

const ADMIN_OPTIONS=Object.freeze([
  {value:'registry',label:'Scope Registry'},
  {value:'database',label:'Database Target'},
  {value:'themes',label:'Theme'},
  {value:'search',label:'搜尋關鍵詞'}
]);
const CREATE_OPTIONS=Object.freeze([
  {value:'scope',label:'新增 Scope'},
  {value:'group',label:'新增 Scope Group'}
]);
const EMPTY_SCOPE_CREATE={scope_id:'',display_name:'',email:'',birthday:'',domain:'',directory:'',parent_scope_id:'loc',theme:'theme-7',locale:'zh-Hant',copy_keywords:true};
const EMPTY_GROUP_CREATE={scope_id:'',display_name:'',domain:'',directory:'',parent_scope_id:'loc',sort_order:''};
const EMPTY_MAPPING={email:'',galaxy:'galaxy',time:'time',birthday:''};

function Login({account}){
  return <section className="loc-view">
    <header className="loc-hero"><p className="loc-eyebrow">{UI_COPY.admin.eyebrow}</p><h1>{UI_COPY.admin.loginTitle}</h1></header>
    <section className="loc-card">
      <button className="loc-button primary" type="button" onClick={()=>account.signIn(scopeHref('admin'))}>{UI_COPY.admin.signIn}</button>
      {account.error?<p className="scope-status scope-error">{account.error}</p>:null}
    </section>
  </section>;
}

function normalizeAliases(value){
  return [...new Set((Array.isArray(value)?value:String(value||'').split(/[\n,，]/g))
    .map(item=>String(item||'').trim()).filter(Boolean))];
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
          dbAuthRelation('silver.manage').select('id,email,role,galaxy,time,birthday').order('id',{ascending:true}).order('email',{ascending:true}),
          dbAuthRelation('silver.scope_registry').select('scope_id,display_name,scope_kind,domain,directory,parent_scope_id,active,sort_order').order('sort_order',{ascending:true}).order('scope_id',{ascending:true})
        ]);
        if(mappingResult.error)throw new Error(mappingResult.error.message||'Mapping 讀取失敗。');
        if(registryResult.error)throw new Error(registryResult.error.message||'Scope Registry 讀取失敗。');

        const registryRows=registryResult.data||[];
        const configRows={};
        const configFailures=[];
        await Promise.all(registryRows.filter(row=>row.scope_kind==='scope').map(async row=>{
          try{
            const {data,error}=await dbAuthRelation('silver.'+row.scope_id)
              .select('id,display_name,search_intro,search_aliases,theme,locale,search_able,statistics_able,culture_able')
              .eq('id',row.scope_id).limit(1);
            if(error)throw new Error(error.message||'Scope config 讀取失敗。');
            if(data?.[0])configRows[row.scope_id]=data[0];
            else configFailures.push(row.scope_id+'：找不到 Scope config');
          }catch(error){
            configFailures.push(row.scope_id+'：'+String(error?.message||error||'Scope config 讀取失敗。'));
          }
        }));

        if(!active)return;
        setRegistry(registryRows);
        setMappings((mappingResult.data||[]).map(row=>({...row,birthday:String(row.birthday||'').slice(0,10)})));
        setConfigs(configRows);
        setStatus(configFailures.length?'部分 Scope 設定讀取失敗：'+configFailures.join('；'):'');
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

function DeploymentTree({registry=[],configs={},selectedId='',onSelect,onMoveParent}){
  const containerRef=useRef(null);
  const networkRef=useRef(null);

  useEffect(()=>{
    let cancelled=false;
    let network=null;
    const roots=registry.filter(row=>!row.parent_scope_id);
    const nodes=[
      {id:'__admin__',label:'Admin',shape:'box',level:0,fixed:true},
      ...registry.map(row=>({
        id:row.scope_id,
        label:(configs[row.scope_id]?.display_name||row.display_name||row.scope_id)+'\n'+row.scope_id+(row.active===false?' · 停用':''),
        shape:row.scope_kind==='group'?'box':'ellipse',
        mass:1
      }))
    ];
    const edges=[
      ...roots.map(row=>({from:'__admin__',to:row.scope_id,arrows:'to'})),
      ...registry.filter(row=>row.parent_scope_id).map(row=>({from:row.parent_scope_id,to:row.scope_id,arrows:'to'}))
    ];
    const groupIds=new Set(registry.filter(row=>row.scope_kind==='group').map(row=>row.scope_id));

    import('vis-network/standalone').then(({Network})=>{
      if(cancelled||!containerRef.current)return;
      network=new Network(containerRef.current,{nodes,edges},{
        autoResize:true,
        physics:{enabled:false},
        layout:{hierarchical:{enabled:true,direction:'UD',sortMethod:'directed',levelSeparation:115,nodeSpacing:175,treeSpacing:200}},
        interaction:{hover:true,dragNodes:true,dragView:true,zoomView:true,selectable:true},
        nodes:{borderWidth:1,margin:12,font:{multi:false}},
        edges:{smooth:{enabled:true,type:'cubicBezier',forceDirection:'vertical',roundness:.35}}
      });
      networkRef.current=network;
      network.on('selectNode',params=>{
        const id=String(params?.nodes?.[0]||'');
        if(id&&id!=='__admin__')onSelect?.(id);
      });
      network.on('dragEnd',params=>{
        const nodeId=String(params?.nodes?.[0]||'');
        if(!nodeId||nodeId==='__admin__')return;
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
        if(nearest&&distance<190&&nearest!==row.parent_scope_id)onMoveParent?.(nodeId,nearest);
      });
      if(selectedId&&registry.some(row=>row.scope_id===selectedId)){
        network.selectNodes([selectedId]);
        network.focus(selectedId,{scale:1,animation:false});
      }
    }).catch(()=>{});
    return()=>{cancelled=true;network?.destroy();networkRef.current=null;};
  },[registry,configs,onSelect,onMoveParent]);

  useEffect(()=>{
    const network=networkRef.current;
    if(!network||!selectedId)return;
    try{network.selectNodes([selectedId]);network.focus(selectedId,{scale:1,animation:{duration:180}});}catch{}
  },[selectedId]);

  return <div ref={containerRef} className="admin-deployment-tree" role="region" aria-label="Scope Registry"/>;
}

function RegistryNodePanel({data,selectedId,onCreateMode}){
  const {registry,setRegistry,mappings,setMappings,configs,setConfigs,status,setStatus,refresh}=data;
  const selectedIndex=registry.findIndex(row=>row.scope_id===selectedId);
  const selected=selectedIndex>=0?registry[selectedIndex]:null;
  const config=configs[selectedId]||null;
  const scopeMappings=mappings.filter(row=>row.id===selectedId);
  const [newMapping,setNewMapping]=useState({...EMPTY_MAPPING});

  const groups=registry.filter(row=>row.scope_kind==='group'&&row.active!==false&&row.scope_id!==selectedId);
  const parentOptions=[{value:'',label:'—'},...groups.map(row=>({value:row.scope_id,label:(row.display_name||row.scope_id)+' · '+row.scope_id}))];
  const parentValue=parentOptions.find(option=>option.value===String(selected?.parent_scope_id||''))||parentOptions[0];
  const themeOptions=THEME_SLOTS.map(theme=>({value:theme.id,label:theme.label+' · '+theme.id}));

  const patchRegistry=(key,value)=>setRegistry(rows=>rows.map((row,index)=>index===selectedIndex?{...row,[key]:value}:row));
  const patchConfig=(key,value)=>setConfigs(current=>({...current,[selectedId]:{...(current[selectedId]||{}),[key]:value}}));
  const patchMapping=(email,key,value)=>setMappings(rows=>rows.map(row=>row.id===selectedId&&row.email===email?{...row,[key]:value}:row));

  async function saveRegistryAndConfig(){
    if(!selected)return;
    setStatus('');
    try{
      if(selected.scope_kind!=='system'){
        const hasDomain=Boolean(String(selected.domain||'').trim());
        const hasDirectory=Boolean(String(selected.directory||'').trim());
        if(hasDomain===hasDirectory)throw new Error('Domain / Directory 必須二選一。');
        await manageScopeRegistry('update',selected.scope_id,{
          display_name:String(selected.display_name||selected.scope_id).trim(),
          domain:String(selected.domain||'').trim()||null,
          directory:String(selected.directory||'').trim()||null,
          parent_scope_id:selected.scope_id==='loc'?null:(String(selected.parent_scope_id||'').trim()||null),
          active:selected.scope_id==='loc'?true:selected.active!==false,
          sort_order:Number(selected.sort_order)||0
        });
      }
      if(selected.scope_kind==='scope'&&config){
        await updateRows('silver.'+selected.scope_id,{
          display_name:String(config.display_name||selected.scope_id).trim(),
          search_intro:String(config.search_intro||'').trim(),
          search_aliases:normalizeAliases(config.search_aliases),
          theme:String(config.theme||'theme-7'),
          locale:normalizeUiLocale(config.locale),
          search_able:config.search_able!==false,
          statistics_able:config.statistics_able!==false,
          culture_able:config.culture_able!==false,
          updated_at:new Date().toISOString()
        },{filters:[{column:'id',operator:'eq',value:selected.scope_id}]});
      }
      setStatus(selected.scope_id+' 已更新。');
      refresh();
    }catch(error){setStatus(error?.message||'Scope 更新失敗。');}
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
        birthday:newMapping.birthday||null
      }]);
      setNewMapping({...EMPTY_MAPPING});setStatus('Mapping 已新增。');refresh();
    }catch(error){setStatus(error?.message||'Mapping 新增失敗。');}
  }

  if(!selected)return <aside className="admin-context-panel"><p className="scope-status">點選節點。</p></aside>;

  return <aside className="admin-context-panel">
    <div className="admin-node-heading">
      <div><p className="loc-eyebrow">{selected.scope_kind}</p><h2>{config?.display_name||selected.display_name||selected.scope_id}</h2><p className="scope-status">{selected.scope_id}</p></div>
      <div className="scope-tabs">
        <button type="button" onClick={()=>onCreateMode?.('scope')}>＋ Scope</button>
        <button type="button" onClick={()=>onCreateMode?.('group')}>＋ Group</button>
      </div>
    </div>

    {selected.scope_kind!=='system'?<>
      {selected.scope_kind==='group'?<label><span>Group 名稱</span><input value={selected.display_name||''} onChange={e=>patchRegistry('display_name',e.target.value)}/></label>:null}
      {selected.scope_kind==='scope'&&config?<>
        <label><span>顯示名稱</span><input value={config.display_name||''} onChange={e=>patchConfig('display_name',e.target.value)}/></label>
        <label><span>搜尋介紹</span><textarea rows={3} value={config.search_intro||''} onChange={e=>patchConfig('search_intro',e.target.value)}/></label>
        <label><span>搜尋別名</span><textarea rows={3} value={normalizeAliases(config.search_aliases).join('\n')} onChange={e=>patchConfig('search_aliases',e.target.value.split('\n'))}/></label>
        <label><span>Theme</span><Select className="admin-react-select" classNamePrefix="admin-react-select" unstyled isSearchable={false} options={themeOptions} value={themeOptions.find(o=>o.value===config.theme)||themeOptions[6]} onChange={o=>patchConfig('theme',o?.value||'theme-7')}/></label>
        <label><span>預設語系</span><Select className="admin-react-select" classNamePrefix="admin-react-select" unstyled isSearchable={false} options={UI_LOCALE_OPTIONS} value={UI_LOCALE_OPTIONS.find(o=>o.value===normalizeUiLocale(config.locale))||UI_LOCALE_OPTIONS[0]} onChange={o=>patchConfig('locale',normalizeUiLocale(o?.value))}/></label>
        <div className="admin-inline-flags">
          <label><input type="checkbox" checked={config.search_able!==false} onChange={e=>patchConfig('search_able',e.target.checked)}/> Search</label>
          <label><input type="checkbox" checked={config.statistics_able!==false} onChange={e=>patchConfig('statistics_able',e.target.checked)}/> Statistics</label>
          <label><input type="checkbox" checked={config.culture_able!==false} onChange={e=>patchConfig('culture_able',e.target.checked)}/> Culture</label>
        </div>
      </>:null}

      <label><span>Domain</span><input value={selected.domain||''} onChange={e=>patchRegistry('domain',e.target.value)}/></label>
      <label><span>Directory</span><input value={selected.directory||''} onChange={e=>patchRegistry('directory',e.target.value)}/></label>
      {selected.scope_id!=='loc'?<label><span>Parent</span><Select className="admin-react-select" classNamePrefix="admin-react-select" unstyled isSearchable={false} options={parentOptions} value={parentValue} onChange={o=>patchRegistry('parent_scope_id',o?.value||'')}/></label>:null}
      <label><span>排序</span><input type="number" value={selected.sort_order||0} onChange={e=>patchRegistry('sort_order',e.target.value)}/></label>
      {selected.scope_id!=='loc'?<label className="scope-setting-toggle"><input type="checkbox" checked={selected.active!==false} onChange={e=>patchRegistry('active',e.target.checked)}/> Active</label>:null}

      <div className="scope-tabs">
        <button type="button" className="loc-button primary" onClick={saveRegistryAndConfig}>儲存節點</button>
        <a className="loc-button" href={scopeHref(selected.scope_id)} target="_blank" rel="noreferrer">開啟 UI</a>
      </div>
    </>:null}

    {selected.scope_kind==='scope'?<section className="admin-node-mapping">
      <h3>Manage Mapping</h3>
      {scopeMappings.map(row=><article className="scope-inline-card" key={row.email}>
        <strong>{row.email}</strong>
        <div className="scope-management-fields">
          <label><span>Galaxy</span><input value={row.galaxy||'galaxy'} onChange={e=>patchMapping(row.email,'galaxy',e.target.value)}/></label>
          <label><span>Time</span><input value={row.time||'time'} onChange={e=>patchMapping(row.email,'time',e.target.value)}/></label>
          <label><span>Birthday</span><input type="date" value={row.birthday||''} onChange={e=>patchMapping(row.email,'birthday',e.target.value)}/></label>
        </div>
        <div className="scope-tabs"><button type="button" onClick={()=>saveMapping(row)}>儲存</button><button type="button" onClick={()=>removeMapping(row)}>移除</button></div>
      </article>)}
      <details>
        <summary>新增管理者</summary>
        <label><span>Email</span><input type="email" value={newMapping.email} onChange={e=>setNewMapping(v=>({...v,email:e.target.value}))}/></label>
        <button type="button" className="loc-button" onClick={addMapping}>新增</button>
      </details>
    </section>:null}

    {status?<p className="scope-status" role="status">{status}</p>:null}
  </aside>;
}

function CreateNodePanel({data,kind='scope',onClose}){
  const {registry,setStatus,refresh}=data;
  const groups=registry.filter(row=>row.scope_kind==='group'&&row.active!==false);
  const parentOptions=groups.map(row=>({value:row.scope_id,label:(row.display_name||row.scope_id)+' · '+row.scope_id}));
  const themeOptions=THEME_SLOTS.map(theme=>({value:theme.id,label:theme.label+' · '+theme.id}));
  const [scopeDraft,setScopeDraft]=useState({...EMPTY_SCOPE_CREATE});
  const [groupDraft,setGroupDraft]=useState({...EMPTY_GROUP_CREATE});

  async function createScope(){
    try{
      const id=String(scopeDraft.scope_id||'').trim().toLowerCase();
      if(!/^[a-z][a-z0-9]{0,14}$/.test(id))throw new Error('Scope ID 格式不正確。');
      await provisionScope({
        ...scopeDraft,scope_id:id,
        display_name:String(scopeDraft.display_name||'').trim(),
        email:String(scopeDraft.email||'').trim().toLowerCase(),
        domain:String(scopeDraft.domain||'').trim()||null,
        directory:String(scopeDraft.directory||'').trim()||null,
        birthday:scopeDraft.birthday||null
      });
      await updateRows('silver.'+id,{locale:normalizeUiLocale(scopeDraft.locale),updated_at:new Date().toISOString()},{filters:[{column:'id',operator:'eq',value:id}]});
      setStatus('Scope '+id+' 已建立。');refresh();onClose?.();
    }catch(error){setStatus(error?.message||'Scope 建立失敗。');}
  }

  async function createGroup(){
    try{
      const id=String(groupDraft.scope_id||'').trim().toLowerCase();
      if(!/^[a-z][a-z0-9]{0,14}$/.test(id))throw new Error('Group ID 格式不正確。');
      await manageScopeRegistry('create_group',id,{
        display_name:String(groupDraft.display_name||'').trim(),
        domain:String(groupDraft.domain||'').trim()||null,
        directory:String(groupDraft.directory||'').trim()||null,
        parent_scope_id:String(groupDraft.parent_scope_id||'loc').trim()||'loc',
        ...(String(groupDraft.sort_order||'').trim()?{sort_order:Number(groupDraft.sort_order)}:{})
      });
      setStatus('Scope Group '+id+' 已建立。');refresh();onClose?.();
    }catch(error){setStatus(error?.message||'Scope Group 建立失敗。');}
  }

  const parentValue=value=>parentOptions.find(o=>o.value===value)||parentOptions[0]||null;
  return <aside className="admin-context-panel">
    <div className="admin-node-heading"><h2>{kind==='group'?'新增 Scope Group':'新增 Scope'}</h2><button type="button" className="loc-button" onClick={onClose}>取消</button></div>
    {kind==='scope'?<>
      <label><span>Scope ID</span><input maxLength="15" value={scopeDraft.scope_id} onChange={e=>setScopeDraft(v=>({...v,scope_id:e.target.value.toLowerCase()}))}/></label>
      <label><span>顯示名稱</span><input value={scopeDraft.display_name} onChange={e=>setScopeDraft(v=>({...v,display_name:e.target.value}))}/></label>
      <label><span>Email</span><input type="email" value={scopeDraft.email} onChange={e=>setScopeDraft(v=>({...v,email:e.target.value}))}/></label>
      <label><span>Birthday</span><input type="date" value={scopeDraft.birthday} onChange={e=>setScopeDraft(v=>({...v,birthday:e.target.value}))}/></label>
      <label><span>Domain</span><input value={scopeDraft.domain} onChange={e=>setScopeDraft(v=>({...v,domain:e.target.value}))}/></label>
      <label><span>Directory</span><input value={scopeDraft.directory} onChange={e=>setScopeDraft(v=>({...v,directory:e.target.value}))}/></label>
      <label><span>Parent</span><Select className="admin-react-select" classNamePrefix="admin-react-select" unstyled isSearchable={false} options={parentOptions} value={parentValue(scopeDraft.parent_scope_id)} onChange={o=>setScopeDraft(v=>({...v,parent_scope_id:o?.value||'loc'}))}/></label>
      <label><span>Theme</span><Select className="admin-react-select" classNamePrefix="admin-react-select" unstyled isSearchable={false} options={themeOptions} value={themeOptions.find(o=>o.value===scopeDraft.theme)} onChange={o=>setScopeDraft(v=>({...v,theme:o?.value||'theme-7'}))}/></label>
      <label><span>預設語系</span><Select className="admin-react-select" classNamePrefix="admin-react-select" unstyled isSearchable={false} options={UI_LOCALE_OPTIONS} value={UI_LOCALE_OPTIONS.find(o=>o.value===scopeDraft.locale)||UI_LOCALE_OPTIONS[0]} onChange={o=>setScopeDraft(v=>({...v,locale:normalizeUiLocale(o?.value)}))}/></label>
      <label className="scope-setting-toggle"><input type="checkbox" checked={scopeDraft.copy_keywords!==false} onChange={e=>setScopeDraft(v=>({...v,copy_keywords:e.target.checked}))}/>複製 Rune66 Keyword Class</label>
      <button type="button" className="loc-button primary" onClick={createScope}>建立</button>
    </>:<>
      <label><span>Group ID</span><input maxLength="15" value={groupDraft.scope_id} onChange={e=>setGroupDraft(v=>({...v,scope_id:e.target.value.toLowerCase()}))}/></label>
      <label><span>Group 名稱</span><input value={groupDraft.display_name} onChange={e=>setGroupDraft(v=>({...v,display_name:e.target.value}))}/></label>
      <label><span>Domain</span><input value={groupDraft.domain} onChange={e=>setGroupDraft(v=>({...v,domain:e.target.value}))}/></label>
      <label><span>Directory</span><input value={groupDraft.directory} onChange={e=>setGroupDraft(v=>({...v,directory:e.target.value}))}/></label>
      <label><span>Parent</span><Select className="admin-react-select" classNamePrefix="admin-react-select" unstyled isSearchable={false} options={parentOptions} value={parentValue(groupDraft.parent_scope_id)} onChange={o=>setGroupDraft(v=>({...v,parent_scope_id:o?.value||'loc'}))}/></label>
      <label><span>排序</span><input type="number" value={groupDraft.sort_order} onChange={e=>setGroupDraft(v=>({...v,sort_order:e.target.value}))}/></label>
      <button type="button" className="loc-button primary" onClick={createGroup}>建立</button>
    </>}
  </aside>;
}

function AdminRegistry(){
  const data=useAdminScopeData();
  const {registry,configs,setRegistry,setStatus,refresh}=data;
  const [selectedId,setSelectedId]=useState('');
  const [createKind,setCreateKind]=useState('');

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
  return <section className="loc-card admin-workspace">
    <div className="admin-deployment-layout">
      <div>
        <div className="admin-registry-actions">
          <button type="button" className="loc-button" onClick={()=>setCreateKind('scope')}>＋ Scope</button>
          <button type="button" className="loc-button" onClick={()=>setCreateKind('group')}>＋ Group</button>
        </div>
        <DeploymentTree registry={registry} configs={configs} selectedId={selectedId} onSelect={selectNode} onMoveParent={moveParent}/>
      </div>
      {createKind?<CreateNodePanel data={data} kind={createKind} onClose={()=>setCreateKind('')}/>:<RegistryNodePanel data={data} selectedId={selectedId} onCreateMode={setCreateKind}/>}
    </div>
  </section>;
}

function DatabaseTarget(){
  const [rows,setRows]=useState([]);
  const [selectedId,setSelectedId]=useState('');
  const [status,setStatus]=useState('');
  const [revision,setRevision]=useState(0);

  useEffect(()=>{
    let active=true;
    (async()=>{
      const {data,error}=await dbAuthRelation('silver.database_targets').select('target_id,provider,label,project_id,project_url,selected,updated_at').order('provider').order('target_id');
      if(!active)return;
      if(error){setStatus(error.message||'讀取失敗。');return;}
      const next=data||[];setRows(next);
      setSelectedId(next.find(row=>row.selected)?.target_id||next[0]?.target_id||'');
    })();
    return()=>{active=false};
  },[revision]);

  const index=rows.findIndex(row=>row.target_id===selectedId);
  const row=index>=0?rows[index]:null;
  const options=rows.map(item=>({value:item.target_id,label:item.label+' · '+item.provider}));
  const patch=(key,value)=>setRows(current=>current.map((item,i)=>i===index?{...item,[key]:value}:item));

  async function save(){
    if(!row)return;
    setStatus('');
    try{
      const clear=await dbAuthRelation('silver.database_targets').update({selected:false,updated_at:new Date().toISOString()}).neq('target_id','');
      if(clear.error)throw new Error(clear.error.message||'Database Target 清除失敗。');
      for(const item of rows){
        const result=await dbAuthRelation('silver.database_targets').update({
          provider:item.provider,label:String(item.label||item.target_id).trim(),
          project_id:String(item.project_id||'').trim()||null,
          project_url:String(item.project_url||'').trim(),
          selected:item.target_id===row.target_id,
          updated_at:new Date().toISOString()
        }).eq('target_id',item.target_id);
        if(result.error)throw new Error(result.error.message||'Database Target 更新失敗。');
      }
      setStatus('Database Target 已更新。');setRevision(v=>v+1);
    }catch(error){setStatus(error?.message||'Database Target 儲存失敗。');}
  }

  return <section className="loc-card admin-workspace">
    <div className="admin-inline-select">
      <Select className="admin-react-select" classNamePrefix="admin-react-select" unstyled isSearchable={false} options={options} value={options.find(o=>o.value===selectedId)||null} onChange={o=>setSelectedId(o?.value||'')} aria-label="Database Target"/>
    </div>
    {row?<div className="scope-management-fields">
      <label><span>Provider</span><Select className="admin-react-select" classNamePrefix="admin-react-select" unstyled isSearchable={false} options={[{value:'supabase',label:'Supabase'},{value:'neon',label:'Neon'}]} value={{value:row.provider,label:row.provider==='supabase'?'Supabase':'Neon'}} onChange={o=>patch('provider',o?.value||'supabase')}/></label>
      <label><span>Label</span><input value={row.label||''} onChange={e=>patch('label',e.target.value)}/></label>
      <label><span>Project ID</span><input value={row.project_id||''} onChange={e=>patch('project_id',e.target.value)}/></label>
      <label><span>Project URL / Data API</span><input value={row.project_url||''} onChange={e=>patch('project_url',e.target.value)}/></label>
      <div className="scope-management-wide-field"><button type="button" className="loc-button primary" onClick={save}>設為搬遷／部署目標</button></div>
    </div>:null}
    {status?<p className="scope-status" role="status">{status}</p>:null}
  </section>;
}

function ThemeEditor(){
  const [rows,setRows]=useState([]);
  const [themeId,setThemeId]=useState('theme-1');
  const [draft,setDraft]=useState(null);
  const [status,setStatus]=useState('');
  const [revision,setRevision]=useState(0);

  useEffect(()=>{
    let active=true;
    (async()=>{
      const {data,error}=await dbAuthRelation('silver.loc_theme').select('theme_id,theme_name,theme_attr,theme_order').order('theme_order');
      if(!active)return;
      if(error){setStatus(error.message||'Theme 讀取失敗。');return;}
      setRows(data||[]);
    })();
    return()=>{active=false};
  },[revision]);

  useEffect(()=>{
    const override=rows.find(row=>row.theme_id===themeId)||null;
    setDraft(mergeThemeSlot(themeId,override));
  },[themeId,rows]);

  const options=(rows.length?rows:THEME_SLOTS).map(theme=>({
    value:theme.theme_id||theme.id,
    label:(theme.theme_name||theme.label||theme.theme_id||theme.id)+' · '+(theme.theme_id||theme.id)
  }));
  const setToken=(key,value)=>setDraft(current=>({...current,tokens:{...current.tokens,[key]:value}}));

  useEffect(()=>{
    if(draft)applyTheme(draft);
  },[draft]);

  async function save(){
    if(!draft)return;
    setStatus('');
    try{
      const existing=rows.find(row=>row.theme_id===themeId)||null;
      const payload={
        theme_id:themeId,
        theme_name:String(draft.label||themeId).trim(),
        theme_order:Number(existing?.theme_order)||Number(String(themeId).split('-')[1])||1,
        theme_attr:{
          scheme:draft.scheme==='dark'?'dark':'light',
          style_key:String(draft.styleKey||''),
          group:String(draft.group||''),
          identity_color:String(draft.identityColor||''),
          tokens:Object.fromEntries(THEME_TOKEN_KEYS.map(key=>[key,String(draft.tokens?.[key]||'').trim()]))
        }
      };
      const {error}=await dbAuthRelation('silver.loc_theme').upsert(payload,{onConflict:'theme_id'});
      if(error)throw new Error(error.message||'Theme 儲存失敗。');
      setStatus(themeId+' 已更新。');setRevision(v=>v+1);
    }catch(error){setStatus(error?.message||'Theme 儲存失敗。');}
  }

  return <section className="loc-card admin-workspace">
    <div className="admin-inline-select"><Select className="admin-react-select" classNamePrefix="admin-react-select" unstyled isSearchable={false} options={options} value={options.find(o=>o.value===themeId)||options[0]||null} onChange={o=>setThemeId(o?.value||'theme-1')}/></div>
    {draft?<>
      <div className="scope-management-fields">
        <label><span>名稱</span><input value={draft.label||''} onChange={e=>setDraft(v=>({...v,label:e.target.value}))}/></label>
        <label><span>Scheme</span><Select className="admin-react-select" classNamePrefix="admin-react-select" unstyled isSearchable={false} options={[{value:'light',label:'light'},{value:'dark',label:'dark'}]} value={{value:draft.scheme,label:draft.scheme}} onChange={o=>setDraft(v=>({...v,scheme:o?.value||'light'}))}/></label>
        <label><span>Group</span><input value={draft.group||''} onChange={e=>setDraft(v=>({...v,group:e.target.value}))}/></label>
        <label><span>Style Key</span><input value={draft.styleKey||''} onChange={e=>setDraft(v=>({...v,styleKey:e.target.value}))}/></label>
        <label><span>Identity Color</span><input value={draft.identityColor||''} onChange={e=>setDraft(v=>({...v,identityColor:e.target.value}))}/></label>
      </div>
      <div className="admin-theme-token-grid">
        {THEME_TOKEN_KEYS.map(key=>{
          const value=String(draft.tokens?.[key]||'');
          const color=/^#[0-9a-f]{6}$/i.test(value);
          return <label key={key}><span>{key}</span><div className="admin-theme-token-input">{color?<input type="color" value={value} onChange={e=>setToken(key,e.target.value)}/>:null}<input value={value} onChange={e=>setToken(key,e.target.value)}/></div></label>;
        })}
      </div>
      <button type="button" className="loc-button primary" onClick={save}>儲存 Theme</button>
    </>:null}
    {status?<p className="scope-status" role="status">{status}</p>:null}
  </section>;
}

function SearchKeywordReport(){
  const [rows,setRows]=useState([]);
  const [status,setStatus]=useState('');
  useEffect(()=>{
    let active=true;
    (async()=>{
      try{
        const since=new Date(Date.now()-7*24*60*60*1000).toISOString();
        const {data,error}=await dbAuthRelation('silver.loc_search_keywords').select('searched_at,scope_id,query_text').gte('searched_at',since).order('searched_at',{ascending:false});
        if(error)throw new Error(error.message||'搜尋關鍵詞讀取失敗。');
        if(active)setRows(data||[]);
      }catch(error){if(active)setStatus(error?.message||'搜尋關鍵詞讀取失敗。');}
    })();
    return()=>{active=false};
  },[]);
  const counts=new Map();
  for(const row of rows){const key=String(row.query_text||'').trim();if(key)counts.set(key,(counts.get(key)||0)+1);}
  const keywords=[...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,30);
  return <section className="loc-card admin-workspace"><h2>搜尋關鍵詞</h2><div className="scope-ranking">{keywords.map(([keyword,count])=><div key={keyword}><strong>{keyword}</strong><span>{count.toLocaleString()}</span></div>)}</div>{status?<p className="scope-status scope-error">{status}</p>:null}</section>;
}

export default function AdminHomeView(){
  const account=useAccount();
  const [section,setSection]=useState('registry');
  const selectedOption=ADMIN_OPTIONS.find(option=>option.value===section)||ADMIN_OPTIONS[0];

  if(account.loading||account.permissionLoading)return <section className="loc-view"><div className="loc-card">{UI_COPY.admin.checking}</div></section>;
  if(!account.user)return <Login account={account}/>;
  if(!account.canManageGlobalSync())return <section className="loc-view"><section className="loc-card"><p>{UI_COPY.admin.denied}</p><button type="button" onClick={account.signOut}>{UI_COPY.management.signOut}</button></section></section>;

  return <section className="loc-view scope-management-page">
    <header className="loc-hero loc-hero-context admin-hero">
      <div className="admin-hero-row"><h1>{UI_COPY.admin.eyebrow}</h1><button className="loc-button" type="button" onClick={account.signOut}>{UI_COPY.management.signOut}</button></div>
      <div className="admin-main-select">
        <Select className="admin-react-select" classNamePrefix="admin-react-select" unstyled isSearchable={false} options={ADMIN_OPTIONS} value={selectedOption} onChange={option=>setSection(option?.value||'registry')} aria-label="Admin 管理功能"/>
      </div>
    </header>
    {section==='registry'?<AdminRegistry/>:null}
    {section==='database'?<DatabaseTarget/>:null}
    {section==='themes'?<ThemeEditor/>:null}
    {section==='search'?<SearchKeywordReport/>:null}
  </section>;
}
