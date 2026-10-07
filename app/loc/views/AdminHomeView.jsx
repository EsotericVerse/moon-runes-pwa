'use client';

import {UI_COPY} from '../../i18n/ui-copy';
import {useEffect,useMemo,useRef,useState} from 'react';
import Select from 'react-select';
import {SCOPES,scopeHref} from '../../modular/scope-registry';
import {THEME_SLOTS} from '../../modular/theme-registry';
import {useAccount} from '../use-account';
import {
  deleteRows,insertRows,dbAuthRelation,manageScopeRegistry,provisionScope,selectAuthRow,syncManageScopeRow,updateRows
} from '../db-client.mjs';

const ADMIN_OPTIONS=Object.freeze([
  {value:'deployment',label:'UI 部署'},
  {value:'create',label:'建立 Scope'},
  {value:'permissions',label:'權限 Mapping'},
  {value:'search',label:'搜尋關鍵詞'}
]);
const CREATE_OPTIONS=Object.freeze([
  {value:'scope',label:'建立 Scope'},
  {value:'group',label:'建立 Scope Group'}
]);
const EMPTY_MAPPING={id:'',email:'',galaxy:'galaxy',time:'time',birthday:''};
const EMPTY_SCOPE_CREATE={scope_id:'',display_name:'',email:'',birthday:'',domain:'',directory:'',parent_scope_id:'loc',theme:'theme-7',copy_keywords:true};
const EMPTY_GROUP_CREATE={scope_id:'',display_name:'',domain:'',directory:'',parent_scope_id:'loc',sort_order:''};

function Login({account}){
  return <section className="loc-view">
    <header className="loc-hero"><p className="loc-eyebrow">{UI_COPY.admin.eyebrow}</p><h1>{UI_COPY.admin.loginTitle}</h1></header>
    <section className="loc-card">
      <p>{UI_COPY.admin.loginIntro}</p>
      <button className="loc-button primary" type="button" onClick={()=>account.signIn(scopeHref('admin'))}>{UI_COPY.admin.signIn}</button>
      {account.error?<p className="scope-status scope-error">{account.error}</p>:null}
    </section>
  </section>;
}


function useAdminScopeData(){
  const [registry,setRegistry]=useState([]);
  const [mappings,setMappings]=useState([]);
  const [presentationNames,setPresentationNames]=useState({});
  const [status,setStatus]=useState('');
  const [revision,setRevision]=useState(0);

  useEffect(()=>{
    let active=true;
    (async()=>{
      try{
        const [mappingResult,registryResult]=await Promise.all([
          dbAuthRelation('silver.manage')
            .select('id,email,role,galaxy,time,birthday')
            .order('id',{ascending:true})
            .order('email',{ascending:true}),
          dbAuthRelation('silver.scope_registry')
            .select('scope_id,display_name,scope_kind,domain,directory,parent_scope_id,active,sort_order')
            .order('sort_order',{ascending:true})
            .order('scope_id',{ascending:true})
        ]);
        if(mappingResult.error)throw new Error(mappingResult.error.message||'Mapping 讀取失敗。');
        if(registryResult.error)throw new Error(registryResult.error.message||'Scope Registry 讀取失敗。');

        const registryRows=registryResult.data||[];
        const names={};
        await Promise.all(registryRows.filter(row=>row.scope_kind==='scope').map(async row=>{
          try{
            const {data,error}=await dbAuthRelation('silver.'+row.scope_id)
              .select('display_name')
              .eq('id',row.scope_id)
              .limit(1);
            if(!error&&data?.[0]?.display_name)names[row.scope_id]=String(data[0].display_name);
          }catch{}
        }));

        if(active){
          setMappings((mappingResult.data||[]).map(row=>({...row,birthday:String(row.birthday||'').slice(0,10)})));
          setRegistry(registryRows);
          setPresentationNames(names);
          setStatus('');
        }
      }catch(error){
        if(active){
          setMappings([]);
          setRegistry([]);
          setPresentationNames({});
          setStatus(error?.message||'Admin 資料讀取失敗。');
        }
      }
    })();
    return()=>{active=false};
  },[revision]);

  return {
    registry,setRegistry,mappings,setMappings,presentationNames,status,setStatus,
    refresh:()=>setRevision(value=>value+1)
  };
}

function DeploymentTree({registry=[],presentationNames={},selectedId='',onSelect}){
  const containerRef=useRef(null);
  const networkRef=useRef(null);

  useEffect(()=>{
    let cancelled=false;
    let network=null;
    const roots=registry.filter(row=>!row.parent_scope_id);
    const nodes=[
      {id:'__admin__',label:'Admin\nadmin.lo3rwang.cc',shape:'box',level:0},
      ...registry.map(row=>({
        id:row.scope_id,
        label:(presentationNames[row.scope_id]||row.display_name||row.scope_id)+'\n'+row.scope_id+(row.active===false?' · 停用':''),
        shape:row.scope_kind==='group'?'box':'ellipse'
      }))
    ];
    const edges=[
      ...roots.map(row=>({from:'__admin__',to:row.scope_id,arrows:'to'})),
      ...registry.filter(row=>row.parent_scope_id).map(row=>({from:row.parent_scope_id,to:row.scope_id,arrows:'to'}))
    ];

    import('vis-network/standalone').then(({Network})=>{
      if(cancelled||!containerRef.current)return;
      network=new Network(containerRef.current,{nodes,edges},{
        autoResize:true,
        physics:{enabled:false},
        layout:{
          hierarchical:{
            enabled:true,
            direction:'UD',
            sortMethod:'directed',
            levelSeparation:110,
            nodeSpacing:170,
            treeSpacing:190
          }
        },
        interaction:{hover:true,dragNodes:false,dragView:true,zoomView:true,selectable:true},
        nodes:{borderWidth:1,margin:10,font:{multi:false}},
        edges:{smooth:{enabled:true,type:'cubicBezier',forceDirection:'vertical',roundness:.35}}
      });
      networkRef.current=network;
      network.on('selectNode',params=>{
        const id=String(params?.nodes?.[0]||'');
        if(id&&id!=='__admin__')onSelect?.(id);
      });
      if(selectedId&&registry.some(row=>row.scope_id===selectedId)){
        network.selectNodes([selectedId]);
        network.focus(selectedId,{scale:1,animation:false});
      }
    }).catch(()=>{});
    return()=>{cancelled=true;network?.destroy();if(networkRef.current===network)networkRef.current=null;};
  },[registry,presentationNames,onSelect]);

  useEffect(()=>{
    const network=networkRef.current;
    if(!network||!selectedId)return;
    try{
      network.selectNodes([selectedId]);
      network.focus(selectedId,{scale:1,animation:{duration:220,easingFunction:'easeInOutQuad'}});
    }catch{}
  },[selectedId]);

  return <div ref={containerRef} className="admin-deployment-tree" role="region" aria-label="Scope UI 部署階層"/>;
}

function AdminDeployment(){
  const data=useAdminScopeData();
  const {registry,setRegistry,presentationNames,status,setStatus,refresh}=data;
  const [selectedId,setSelectedId]=useState('');

  useEffect(()=>{
    if(selectedId&&registry.some(row=>row.scope_id===selectedId))return;
    setSelectedId(registry.find(row=>row.scope_id==='loc')?.scope_id||registry[0]?.scope_id||'');
  },[registry,selectedId]);

  const selectedIndex=registry.findIndex(row=>row.scope_id===selectedId);
  const selected=selectedIndex>=0?registry[selectedIndex]:null;
  const groups=registry.filter(row=>row.scope_kind==='group'&&row.active!==false&&row.scope_id!==selectedId);
  const parentOptions=[
    {value:'',label:'—'},
    ...groups.map(row=>({value:row.scope_id,label:(row.display_name||row.scope_id)+' · '+row.scope_id}))
  ];
  const parentValue=parentOptions.find(option=>option.value===String(selected?.parent_scope_id||''))||parentOptions[0];

  const change=(key,value)=>setRegistry(rows=>rows.map((row,index)=>index===selectedIndex?{...row,[key]:value}:row));

  async function save(){
    if(!selected||selected.scope_kind==='system')return;
    setStatus('');
    try{
      const hasDomain=Boolean(String(selected.domain||'').trim());
      const hasDirectory=Boolean(String(selected.directory||'').trim());
      if(hasDomain===hasDirectory)throw new Error('Domain / Directory 必須二選一。');
      if(selected.scope_kind==='group'&&!String(selected.display_name||'').trim())throw new Error('Group 名稱不可為空。');
      await manageScopeRegistry('update',selected.scope_id,{
        display_name:String(selected.display_name||selected.scope_id).trim(),
        domain:String(selected.domain||'').trim()||null,
        directory:String(selected.directory||'').trim()||null,
        parent_scope_id:selected.scope_id==='loc'?null:(String(selected.parent_scope_id||'').trim()||null),
        active:selected.scope_id==='loc'?true:selected.active!==false,
        sort_order:Number(selected.sort_order)||0
      });
      setStatus(selected.scope_id+' 已更新。');
      refresh();
    }catch(error){
      setStatus(error?.message||'UI 部署更新失敗。');
    }
  }

  return <section className="loc-card admin-workspace">
    <div className="admin-deployment-layout">
      <DeploymentTree
        registry={registry}
        presentationNames={presentationNames}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
      <aside className="admin-context-panel">
        {selected?<>
          <p className="loc-eyebrow">{selected.scope_kind==='group'?'Scope Group':'Scope'}</p>
          <h2>{presentationNames[selected.scope_id]||selected.display_name||selected.scope_id}</h2>
          <p className="scope-status">{selected.scope_id}</p>

          {selected.scope_kind==='group'?<label>
            <span>Group 名稱</span>
            <input value={selected.display_name||''} onChange={event=>change('display_name',event.target.value)}/>
          </label>:null}

          <label><span>Domain</span><input value={selected.domain||''} onChange={event=>change('domain',event.target.value)}/></label>
          <label><span>Directory</span><input value={selected.directory||''} onChange={event=>change('directory',event.target.value)}/></label>

          {selected.scope_id!=='loc'?<label>
            <span>Parent</span>
            <Select
              className="admin-react-select"
              classNamePrefix="admin-react-select"
              unstyled
              isSearchable={false}
              options={parentOptions}
              value={parentValue}
              onChange={option=>change('parent_scope_id',option?.value||'')}
              aria-label="Parent Scope Group"
            />
          </label>:null}

          <label><span>排序</span><input type="number" value={selected.sort_order||0} onChange={event=>change('sort_order',event.target.value)}/></label>
          {selected.scope_id!=='loc'?<label className="scope-setting-toggle">
            <input type="checkbox" checked={selected.active!==false} onChange={event=>change('active',event.target.checked)}/>
            Active
          </label>:null}

          <div className="scope-tabs">
            <button type="button" onClick={save}>儲存</button>
            <a className="loc-button" href={scopeHref(selected.scope_id)} target="_blank" rel="noreferrer">開啟 UI</a>
          </div>
        </>:<p className="scope-status">選擇一個節點。</p>}
        {status?<p className="scope-status" role="status">{status}</p>:null}
      </aside>
    </div>
  </section>;
}

function AdminCreateScope(){
  const data=useAdminScopeData();
  const {registry,status,setStatus,refresh}=data;
  const groups=registry.filter(row=>row.scope_kind==='group'&&row.active!==false);
  const [kind,setKind]=useState('scope');
  const [scopeDraft,setScopeDraft]=useState({...EMPTY_SCOPE_CREATE});
  const [groupDraft,setGroupDraft]=useState({...EMPTY_GROUP_CREATE});

  const parentOptions=groups.map(group=>({value:group.scope_id,label:(group.display_name||group.scope_id)+' · '+group.scope_id}));
  const scopeParent=parentOptions.find(option=>option.value===scopeDraft.parent_scope_id)||parentOptions[0]||null;
  const groupParent=parentOptions.find(option=>option.value===groupDraft.parent_scope_id)||parentOptions[0]||null;
  const themeOptions=THEME_SLOTS.map(theme=>({value:theme.id,label:theme.label+' · '+theme.id}));

  async function createScope(){
    setStatus('');
    try{
      const id=String(scopeDraft.scope_id||'').trim().toLowerCase();
      if(!/^[a-z][a-z0-9]{0,14}$/.test(id))throw new Error('Scope ID 必須是 1–15 字小寫英數，且以英文字母開頭。');
      if(!String(scopeDraft.display_name||'').trim())throw new Error('顯示名稱不可為空。');
      if(!/^\S+@\S+\.\S+$/.test(String(scopeDraft.email||'')))throw new Error('Email 格式不正確。');
      const hasDomain=Boolean(String(scopeDraft.domain||'').trim());
      const hasDirectory=Boolean(String(scopeDraft.directory||'').trim());
      if(hasDomain===hasDirectory)throw new Error('Domain / Directory 必須二選一。');

      await provisionScope({
        ...scopeDraft,
        scope_id:id,
        display_name:String(scopeDraft.display_name||'').trim(),
        email:String(scopeDraft.email||'').trim().toLowerCase(),
        domain:String(scopeDraft.domain||'').trim()||null,
        directory:String(scopeDraft.directory||'').trim()||null,
        birthday:scopeDraft.birthday||null
      });
      setScopeDraft({...EMPTY_SCOPE_CREATE});
      setStatus('Scope '+id+' 已建立。');
      refresh();
    }catch(error){setStatus(error?.message||'Scope 建立失敗。');}
  }

  async function createGroup(){
    setStatus('');
    try{
      const id=String(groupDraft.scope_id||'').trim().toLowerCase();
      if(!/^[a-z][a-z0-9]{0,14}$/.test(id))throw new Error('Scope Group ID 必須是 1–15 字小寫英數，且以英文字母開頭。');
      if(!String(groupDraft.display_name||'').trim())throw new Error('Group 名稱不可為空。');
      const hasDomain=Boolean(String(groupDraft.domain||'').trim());
      const hasDirectory=Boolean(String(groupDraft.directory||'').trim());
      if(hasDomain===hasDirectory)throw new Error('Domain / Directory 必須二選一。');

      await manageScopeRegistry('create_group',id,{
        display_name:String(groupDraft.display_name||'').trim(),
        domain:String(groupDraft.domain||'').trim()||null,
        directory:String(groupDraft.directory||'').trim()||null,
        parent_scope_id:String(groupDraft.parent_scope_id||'loc').trim()||'loc',
        ...(String(groupDraft.sort_order||'').trim()?{sort_order:Number(groupDraft.sort_order)}:{})
      });
      setGroupDraft({...EMPTY_GROUP_CREATE});
      setStatus('Scope Group '+id+' 已建立。');
      refresh();
    }catch(error){setStatus(error?.message||'Scope Group 建立失敗。');}
  }

  return <section className="loc-card admin-workspace">
    <div className="admin-inline-select">
      <Select
        className="admin-react-select"
        classNamePrefix="admin-react-select"
        unstyled
        isSearchable={false}
        options={CREATE_OPTIONS}
        value={CREATE_OPTIONS.find(option=>option.value===kind)}
        onChange={option=>setKind(option?.value||'scope')}
        aria-label="建立類型"
      />
    </div>

    {kind==='scope'?<div className="scope-management-fields">
      <label><span>Scope ID</span><input maxLength="15" value={scopeDraft.scope_id} onChange={event=>setScopeDraft(value=>({...value,scope_id:event.target.value.toLowerCase()}))}/></label>
      <label><span>顯示名稱</span><input value={scopeDraft.display_name} onChange={event=>setScopeDraft(value=>({...value,display_name:event.target.value}))}/></label>
      <label><span>Email</span><input type="email" value={scopeDraft.email} onChange={event=>setScopeDraft(value=>({...value,email:event.target.value}))}/></label>
      <label><span>Birthday</span><input type="date" value={scopeDraft.birthday} onChange={event=>setScopeDraft(value=>({...value,birthday:event.target.value}))}/></label>
      <label><span>Domain</span><input value={scopeDraft.domain} onChange={event=>setScopeDraft(value=>({...value,domain:event.target.value}))}/></label>
      <label><span>Directory</span><input value={scopeDraft.directory} onChange={event=>setScopeDraft(value=>({...value,directory:event.target.value}))}/></label>
      <label><span>Parent</span><Select className="admin-react-select" classNamePrefix="admin-react-select" unstyled isSearchable={false} options={parentOptions} value={scopeParent} onChange={option=>setScopeDraft(value=>({...value,parent_scope_id:option?.value||'loc'}))}/></label>
      <label><span>Theme</span><Select className="admin-react-select" classNamePrefix="admin-react-select" unstyled isSearchable={false} options={themeOptions} value={themeOptions.find(option=>option.value===scopeDraft.theme)} onChange={option=>setScopeDraft(value=>({...value,theme:option?.value||'theme-7'}))}/></label>
      <label className="scope-setting-toggle"><input type="checkbox" checked={scopeDraft.copy_keywords!==false} onChange={event=>setScopeDraft(value=>({...value,copy_keywords:event.target.checked}))}/>複製目前 Rune66 Keyword Class</label>
      <div className="scope-management-wide-field"><button type="button" className="loc-button primary" onClick={createScope}>建立 Scope</button></div>
    </div>:<div className="scope-management-fields">
      <label><span>Group ID</span><input maxLength="15" value={groupDraft.scope_id} onChange={event=>setGroupDraft(value=>({...value,scope_id:event.target.value.toLowerCase()}))}/></label>
      <label><span>Group 名稱</span><input value={groupDraft.display_name} onChange={event=>setGroupDraft(value=>({...value,display_name:event.target.value}))}/></label>
      <label><span>Domain</span><input value={groupDraft.domain} onChange={event=>setGroupDraft(value=>({...value,domain:event.target.value}))}/></label>
      <label><span>Directory</span><input value={groupDraft.directory} onChange={event=>setGroupDraft(value=>({...value,directory:event.target.value}))}/></label>
      <label><span>Parent</span><Select className="admin-react-select" classNamePrefix="admin-react-select" unstyled isSearchable={false} options={parentOptions} value={groupParent} onChange={option=>setGroupDraft(value=>({...value,parent_scope_id:option?.value||'loc'}))}/></label>
      <label><span>排序</span><input type="number" value={groupDraft.sort_order} onChange={event=>setGroupDraft(value=>({...value,sort_order:event.target.value}))}/></label>
      <div className="scope-management-wide-field"><button type="button" className="loc-button primary" onClick={createGroup}>建立 Scope Group</button></div>
    </div>}

    {status?<p className="scope-status" role="status">{status}</p>:null}
  </section>;
}

function AdminPermissions(){
  const data=useAdminScopeData();
  const {registry,mappings,setMappings,status,setStatus,refresh}=data;
  const dataScopes=registry.filter(row=>row.scope_kind==='scope'&&row.active!==false);
  const scopeOptions=dataScopes.map(row=>({value:row.scope_id,label:(row.display_name||row.scope_id)+' · '+row.scope_id}));
  const [scopeId,setScopeId]=useState('');
  const [draft,setDraft]=useState({...EMPTY_MAPPING});

  useEffect(()=>{
    if(scopeId&&dataScopes.some(row=>row.scope_id===scopeId))return;
    setScopeId(dataScopes[0]?.scope_id||'');
  },[dataScopes,scopeId]);

  useEffect(()=>{
    if(!scopeId)return;
    const existing=mappings.find(row=>row.id===scopeId);
    setDraft(value=>({
      ...value,
      id:scopeId,
      galaxy:String(existing?.galaxy||'galaxy'),
      time:String(existing?.time||'time'),
      birthday:String(existing?.birthday||'').slice(0,10)
    }));
  },[scopeId,mappings]);

  const visible=mappings.filter(row=>row.id===scopeId);
  const selectedScope=scopeOptions.find(option=>option.value===scopeId)||null;

  const changeMapping=(email,key,value)=>setMappings(rows=>rows.map(row=>row.id===scopeId&&row.email===email?{...row,[key]:value}:row));

  async function save(row){
    setStatus('');
    try{
      await syncManageScopeRow(
        {galaxy:String(row.galaxy||'galaxy').trim()||'galaxy',time:String(row.time||'time').trim()||'time',birthday:row.birthday||null},
        {scopeId:row.id,email:row.email}
      );
      setStatus('Mapping 已更新。');
      refresh();
    }catch(error){setStatus(error?.message||'Mapping 更新失敗。');}
  }

  async function remove(row){
    if(!window.confirm('確定移除 '+row.email+'？'))return;
    setStatus('');
    try{
      await deleteRows('silver.manage',{filters:[
        {column:'id',operator:'eq',value:row.id},
        {column:'email',operator:'eq',value:row.email}
      ]});
      setStatus('Mapping 已移除。');
      refresh();
    }catch(error){setStatus(error?.message||'Mapping 刪除失敗。');}
  }

  async function add(){
    setStatus('');
    try{
      if(!scopeId)throw new Error('請選擇 Scope。');
      if(!/^\S+@\S+\.\S+$/.test(String(draft.email||'')))throw new Error('Email 格式不正確。');
      const existing=mappings.find(row=>row.id===scopeId);
      const galaxy=String(existing?.galaxy||draft.galaxy||'galaxy');
      const time=String(existing?.time||draft.time||'time');
      const birthday=String(existing?.birthday||draft.birthday||'').slice(0,10)||null;
      await insertRows('silver.manage',[{
        id:scopeId,email:String(draft.email||'').trim().toLowerCase(),role:'scope',galaxy,time,birthday
      }]);
      setDraft(value=>({...EMPTY_MAPPING,id:scopeId,galaxy,time,birthday:birthday||''}));
      setStatus('Mapping 已新增。');
      refresh();
    }catch(error){setStatus(error?.message||'Mapping 新增失敗。');}
  }

  return <section className="loc-card admin-workspace">
    <div className="admin-inline-select">
      <Select
        className="admin-react-select"
        classNamePrefix="admin-react-select"
        unstyled
        isSearchable
        options={scopeOptions}
        value={selectedScope}
        onChange={option=>setScopeId(option?.value||'')}
        placeholder="選擇 Scope"
        aria-label="權限 Scope"
      />
    </div>

    <div className="admin-permission-list">
      {visible.map(row=><article className="scope-inline-card" key={row.id+':'+row.email}>
        <strong>{row.email}</strong>
        <div className="scope-management-fields">
          <label><span>Role</span><input value={row.role} readOnly/></label>
          <label><span>Galaxy</span><input value={row.galaxy||'galaxy'} onChange={event=>changeMapping(row.email,'galaxy',event.target.value)}/></label>
          <label><span>Time</span><input value={row.time||'time'} onChange={event=>changeMapping(row.email,'time',event.target.value)}/></label>
          <label><span>Birthday</span><input type="date" value={row.birthday||''} onChange={event=>changeMapping(row.email,'birthday',event.target.value)}/></label>
        </div>
        <div className="scope-tabs">
          <button type="button" onClick={()=>save(row)}>儲存</button>
          <button type="button" onClick={()=>remove(row)}>移除</button>
        </div>
      </article>)}
      {!visible.length?<p className="scope-status">此 Scope 尚無 Mapping。</p>:null}
    </div>

    <section className="scope-inline-card">
      <h3>新增管理者</h3>
      <label><span>Email</span><input type="email" value={draft.email} onChange={event=>setDraft(value=>({...value,email:event.target.value}))}/></label>
      <button type="button" className="loc-button" onClick={add}>新增 Mapping</button>
    </section>

    {status?<p className="scope-status" role="status">{status}</p>:null}
  </section>;
}

function SearchKeywordReport(){
  const [rows,setRows]=useState([]);
  const [status,setStatus]=useState('');

  useEffect(()=>{
    let active=true;
    (async()=>{
      setStatus('');
      try{
        const since=new Date(Date.now()-7*24*60*60*1000).toISOString();
        const {data,error}=await dbAuthRelation('silver.loc_search_keywords')
          .select('searched_at,scope_id,query_text')
          .gte('searched_at',since)
          .order('searched_at',{ascending:false});
        if(error)throw new Error(error.message||'搜尋關鍵詞讀取失敗。');
        if(active)setRows(data||[]);
      }catch(error){
        if(active){setRows([]);setStatus(error?.message||'搜尋關鍵詞讀取失敗。');}
      }
    })();
    return()=>{active=false};
  },[]);

  const keywordCounts=new Map();
  const scopeCounts=new Map();
  for(const row of rows){
    const keyword=String(row.query_text||'').trim();
    const scope=String(row.scope_id||'').trim();
    if(keyword)keywordCounts.set(keyword,(keywordCounts.get(keyword)||0)+1);
    if(scope)scopeCounts.set(scope,(scopeCounts.get(scope)||0)+1);
  }
  const keywords=[...keywordCounts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,30);
  const scopes=[...scopeCounts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));

  return <section className="loc-card scope-management-workspace">
    <h2>搜尋關鍵詞</h2>
    <div className="scope-ranking">
      <div><strong>7 天搜尋</strong><span>{rows.length.toLocaleString()}</span></div>
      {scopes.map(([scope,count])=><div key={scope}><strong>{scope}</strong><span>{count.toLocaleString()}</span></div>)}
    </div>
    <h3>關鍵詞</h3>
    <div className="scope-ranking">
      {keywords.map(([keyword,count])=><div key={keyword}><strong>{keyword}</strong><span>{count.toLocaleString()}</span></div>)}
    </div>
    {status?<p className="scope-status scope-error">{status}</p>:null}
  </section>;
}

function ThemeOverview({account}){
  const [rows,setRows]=useState([]);
  const [status,setStatus]=useState('');
  const [busyId,setBusyId]=useState('');
  const [revision,setRevision]=useState(0);

  useEffect(()=>{
    let active=true;
    (async()=>{
      setStatus('');
      try{
        const {data,error}=await dbAuthRelation('silver.manage')
          .select('id')
          .order('id',{ascending:true});
        if(error)throw new Error(error.message||'Scope 設定讀取失敗。');
        const ids=[...new Set((data||[]).map(row=>String(row.id||'').trim()).filter(Boolean))];
        const loaded=[];
        const failures=[];
        for(const id of ids){
          const config=account.scopeDataFor(id)?.config;
          if(!config){failures.push(id+'：Scope config 未解析');continue;}
          try{
            const row=await selectAuthRow(config,{
              idColumn:'id',id,
              columns:'id,theme,search_able,statistics_able,culture_able'
            });
            if(!row)failures.push(id+'：找不到 Scope config');
            else loaded.push({...row,config});
          }catch(error){
            failures.push(id+'：'+String(error?.message||error||'Scope config 讀取失敗'));
          }
        }
        if(active){
          setRows(loaded);
          if(failures.length)setStatus('部分 Scope 設定讀取失敗：'+failures.join('；'));
        }
      }catch(error){
        if(active)setStatus(error.message||'Scope 設定讀取失敗。');
      }
    })();
    return()=>{active=false;};
  },[account.scopes,revision]);

  const change=(index,key,value)=>setRows(current=>current.map((row,rowIndex)=>rowIndex===index?{...row,[key]:value}:row));

  async function save(index){
    const row=rows[index];
    setBusyId(row.id);setStatus('');
    try{
      await updateRows(row.config,{
        theme:String(row.theme||'').trim(),
        search_able:Boolean(row.search_able),
        statistics_able:Boolean(row.statistics_able),
        culture_able:Boolean(row.culture_able),
        updated_at:new Date().toISOString()
      },{filters:[{column:'id',operator:'eq',value:row.id}]});
      setStatus(row.id+' 設定已更新。');setRevision(value=>value+1);
    }catch(error){setStatus(error.message||'Scope 設定儲存失敗。');}
    finally{setBusyId('');}
  }

  return <section className="loc-card scope-management-workspace">
    <p className="loc-eyebrow">Scope Presentation</p>
    <h2>{UI_COPY.admin.theme}</h2>
    <p>Theme 與公開功能開關直接寫回各 Scope 既有設定；Theme 與 Style Tag 仍是不同責任。</p>

    <div className="scope-management-records">
      {rows.map((row,index)=><article className="scope-inline-card" key={row.id}>
        <strong>{SCOPES[row.id]?.label||row.id}</strong>
        <div className="scope-management-fields">
          <label><span>Theme</span><select value={row.theme||''} onChange={event=>change(index,'theme',event.target.value)}>
            {THEME_SLOTS.map(theme=><option key={theme.id} value={theme.id}>{theme.label} · {theme.id}</option>)}
          </select></label>
          <label className="scope-setting-toggle"><input type="checkbox" checked={Boolean(row.search_able)} onChange={event=>change(index,'search_able',event.target.checked)}/><span>Search 公開</span></label>
          <label className="scope-setting-toggle"><input type="checkbox" checked={Boolean(row.statistics_able)} onChange={event=>change(index,'statistics_able',event.target.checked)}/><span>Statistics 公開</span></label>
          <label className="scope-setting-toggle"><input type="checkbox" checked={Boolean(row.culture_able)} onChange={event=>change(index,'culture_able',event.target.checked)}/><span>Culture 公開</span></label>
        </div>
        <button type="button" className="loc-button" disabled={busyId===row.id} onClick={()=>save(index)}>{busyId===row.id?'儲存中…':'儲存設定'}</button>
      </article>)}
      {!rows.length&&!status?<p className="scope-status">沒有可管理的 Scope 設定。</p>:null}
    </div>

    <h3>八組 Theme</h3>
    <div className="scope-list">
      {THEME_SLOTS.map(theme=><article className="scope-inline-card" key={theme.id}>
        <strong>{theme.label}</strong><span>{theme.id} · {theme.scheme}</span>
      </article>)}
    </div>
    {status?<p className="scope-status" role="status">{status}</p>:null}
  </section>;
}

export default function AdminHomeView(){
  const account=useAccount();
  const [section,setSection]=useState('deployment');
  const selectedOption=ADMIN_OPTIONS.find(option=>option.value===section)||ADMIN_OPTIONS[0];

  if(account.loading||account.permissionLoading)return <section className="loc-view"><div className="loc-card">{UI_COPY.admin.checking}</div></section>;
  if(!account.user)return <Login account={account}/>;
  if(!account.canManageGlobalSync())return <section className="loc-view">
    <header className="loc-hero"><p className="loc-eyebrow">{UI_COPY.admin.eyebrow}</p><h1>{UI_COPY.admin.eyebrow}</h1></header>
    <section className="loc-card"><p>{UI_COPY.admin.denied}</p><button type="button" onClick={account.signOut}>{UI_COPY.management.signOut}</button></section>
  </section>;

  return <section className="loc-view scope-management-page">
    <header className="loc-hero loc-hero-context admin-hero">
      <p className="loc-eyebrow">{UI_COPY.admin.eyebrow}</p>
      <div className="admin-hero-row">
        <h1>{UI_COPY.admin.eyebrow}</h1>
        <button className="loc-button" type="button" onClick={account.signOut}>{UI_COPY.management.signOut}</button>
      </div>
      <div className="admin-main-select">
        <Select
          className="admin-react-select"
          classNamePrefix="admin-react-select"
          unstyled
          isSearchable={false}
          options={ADMIN_OPTIONS}
          value={selectedOption}
          onChange={option=>setSection(option?.value||'deployment')}
          aria-label="Admin 管理功能"
        />
      </div>
    </header>

    {section==='deployment'?<AdminDeployment/>:null}
    {section==='create'?<AdminCreateScope/>:null}
    {section==='permissions'?<AdminPermissions/>:null}
    {section==='search'?<SearchKeywordReport/>:null}
  </section>;
}
