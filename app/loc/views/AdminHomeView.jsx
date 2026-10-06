'use client';

import {UI_COPY} from '../../i18n/ui-copy';
import {useEffect,useState} from 'react';
import {SCOPES} from '../../modular/scope-registry';
import {THEME_SLOTS} from '../../modular/theme-registry';
import {useAccount} from '../use-account';
import {
  deleteRows,insertRows,dbAuthRelation,provisionScope,selectAuthRow,syncManageScopeRow,updateRows
} from '../db-client.mjs';

const ADMIN_OPTIONS=Object.freeze([
  {value:'scopes',label:UI_COPY.admin.overview},
  {value:'search',label:'搜尋關鍵詞'},
  {value:'themes',label:UI_COPY.admin.theme}
]);
const EMPTY_MAPPING={id:'',email:'',galaxy:'galaxy',time:'time',birthday:''};
const EMPTY_SCOPE_CREATE={scope_id:'',display_name:'',email:'',birthday:'',domain:'',directory:'',parent_scope_id:'loc',theme:'theme-7',copy_keywords:true};

function Login({account}){
  return <section className="loc-view">
    <header className="loc-hero"><p className="loc-eyebrow">{UI_COPY.admin.eyebrow}</p><h1>{UI_COPY.admin.loginTitle}</h1></header>
    <section className="loc-card">
      <p>{UI_COPY.admin.loginIntro}</p>
      <button className="loc-button primary" type="button" onClick={account.signIn}>{UI_COPY.admin.signIn}</button>
      {account.error?<p className="scope-status scope-error">{account.error}</p>:null}
    </section>
  </section>;
}

function ScopeOverview(){
  const deployedScopes=Object.values(SCOPES).filter(scope=>scope.id!=='admin');
  const [registry,setRegistry]=useState([]);
  const dataScopeIds=registry.filter(scope=>scope.active!==false&&scope.scope_kind==='scope').map(scope=>scope.scope_id);
  const scopeGroups=registry.filter(scope=>scope.active!==false&&scope.scope_kind==='group');
  const [mappings,setMappings]=useState([]);
  const [draft,setDraft]=useState({...EMPTY_MAPPING});
  const [createDraft,setCreateDraft]=useState({...EMPTY_SCOPE_CREATE});
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
        if(active){
          setMappings((mappingResult.data||[]).map(row=>({...row,birthday:String(row.birthday||'').slice(0,10)})));
          setRegistry(registryResult.data||[]);
        }
      }catch(error){
        if(active){setMappings([]);setRegistry([]);setStatus(error?.message||'Scope 設定讀取失敗。');}
      }
    })();
    return()=>{active=false};
  },[revision]);

  const change=(index,key,value)=>setMappings(rows=>rows.map((row,rowIndex)=>rowIndex===index?{...row,[key]:value}:row));

  const validate=row=>{
    if(!dataScopeIds.includes(String(row.id||'')))throw new Error('目前只能管理 DB Scope Registry 中已建立的資料 Scope。');
    if(!/^\S+@\S+\.\S+$/.test(String(row.email||'')))throw new Error('Email 格式不正確。');
    for(const value of [row.galaxy||'galaxy',row.time||'time']){
      if(!/^[a-z][a-z0-9_]*$/.test(String(value)))throw new Error('galaxy / time mapping 只能使用小寫英數與底線。');
    }
  };

  const validateNewMapping=row=>{
    validate(row);
    const existing=mappings.find(item=>item.id===row.id);
    if(!existing)return;
    if(String(existing.galaxy||'galaxy')!==String(row.galaxy||'galaxy')||String(existing.time||'time')!==String(row.time||'time')){
      throw new Error('同一 Scope 的 Galaxy / Time mapping 必須一致。');
    }
    const existingBirthday=String(existing.birthday||'').slice(0,10);
    const nextBirthday=String(row.birthday||'').slice(0,10);
    if(existingBirthday&&nextBirthday&&existingBirthday!==nextBirthday){
      throw new Error('同一 Scope 的生日設定必須一致。');
    }
  };

  const validateCreate=row=>{
    const id=String(row.scope_id||'').trim().toLowerCase();
    if(!/^[a-z][a-z0-9]{0,14}$/.test(id))throw new Error('Scope ID 必須是 1–15 字小寫英數，且以英文字母開頭。');
    if(!String(row.display_name||'').trim())throw new Error('顯示名稱不可為空。');
    if(!/^\S+@\S+\.\S+$/.test(String(row.email||'')))throw new Error('Email 格式不正確。');
    const hasDomain=Boolean(String(row.domain||'').trim());
    const hasDirectory=Boolean(String(row.directory||'').trim());
    if(hasDomain===hasDirectory)throw new Error('Domain / Directory 必須二選一。');
    if(!scopeGroups.some(group=>group.scope_id===row.parent_scope_id))throw new Error('Parent Scope Group 無效。');
    return id;
  };

  const createScope=async()=>{
    setStatus('');
    try{
      const id=validateCreate(createDraft);
      const result=await provisionScope({
        ...createDraft,
        scope_id:id,
        display_name:String(createDraft.display_name||'').trim(),
        email:String(createDraft.email||'').trim().toLowerCase(),
        domain:String(createDraft.domain||'').trim()||null,
        directory:String(createDraft.directory||'').trim()||null,
        birthday:createDraft.birthday||null
      });
      setCreateDraft({...EMPTY_SCOPE_CREATE});
      setStatus(
        'Scope '+String(result.scope_id||id)+' 已建立；'
        +(createDraft.copy_keywords!==false?'預設 Rune66 關鍵詞 '+Number(result.keyword_rows||0).toLocaleString()+' 筆已獨立複製。':'未複製預設關鍵詞。')
      );
      setRevision(value=>value+1);
    }catch(error){setStatus(error.message||'Scope 建立失敗。');}
  };

  const save=async index=>{
    const row=mappings[index];
    setStatus('');
    try{
      validate(row);
      const galaxy=String(row.galaxy||'galaxy').trim()||'galaxy';
      const time=String(row.time||'time').trim()||'time';
      const birthday=row.birthday||null;
      await syncManageScopeRow(
        {galaxy,time,birthday},
        {scopeId:row.id,email:row.email}
      );
      setStatus('Scope Mapping 已同步更新。');setRevision(value=>value+1);
    }catch(error){setStatus(error.message||'Mapping 儲存失敗。');}
  };

  const selectDraftScope=id=>{
    const existing=mappings.find(row=>row.id===id);
    setDraft(value=>({
      ...value,id,
      galaxy:String(existing?.galaxy||'galaxy'),
      time:String(existing?.time||'time'),
      birthday:String(existing?.birthday||'').slice(0,10)
    }));
  };

  const add=async()=>{
    setStatus('');
    try{
      validateNewMapping(draft);
      await insertRows('silver.manage',[{...draft,role:'scope',birthday:draft.birthday||null}]);
      setDraft({...EMPTY_MAPPING});setStatus('Mapping 已新增。');setRevision(value=>value+1);
    }catch(error){setStatus(error.message||'Mapping 新增失敗。');}
  };

  const remove=async row=>{
    if(!window.confirm('確定移除 '+row.id+' / '+row.email+' 的管理 Mapping？'))return;
    setStatus('');
    try{
      await deleteRows('silver.manage',{filters:[
        {column:'id',operator:'eq',value:row.id},
        {column:'email',operator:'eq',value:row.email}
      ]});
      setStatus('Mapping 已移除。');setRevision(value=>value+1);
    }catch(error){setStatus(error.message||'Mapping 刪除失敗。');}
  };

  return <section className="loc-card scope-management-workspace">
    <p className="loc-eyebrow">Current Scope Registry</p>
    <h2>{UI_COPY.admin.overview}</h2>
    <p>Admin 負責 Scope 建立、上下層 Registry、身份權限與資料表 Mapping；各 Scope 的內容與關鍵詞請回到各自 Manage。</p>

    <h3>目前 UI 部署</h3>
    <div className="scope-list">
      {deployedScopes.map(scope=><article className="scope-inline-card" key={scope.id}>
        <strong>{scope.label}</strong>
        <span>{scope.id} · {scope.domain||scope.mount?.path} · {scope.aggregateChildren?'Scope Group':'Scope'}</span>
      </article>)}
    </div>

    <h3>DB Scope Registry</h3>
    <div className="scope-list">
      {registry.map(scope=><article className="scope-inline-card" key={scope.scope_id}>
        <strong>{scope.display_name||scope.scope_id}</strong>
        <span>{scope.scope_id} · {scope.scope_kind} · {scope.domain||scope.directory||'—'}{scope.parent_scope_id?' · parent: '+scope.parent_scope_id:''}</span>
      </article>)}
    </div>

    <section className="scope-inline-card">
      <h3>建立 Scope</h3>
      <p>一次建立固定 Config / Galaxy / Galaxy Media / Time / Keywords 五件套、Scope Registry、第一筆管理權限與預設 Keyword Class。</p>
      <div className="scope-management-fields">
        <label><span>Scope ID</span><input maxLength="15" value={createDraft.scope_id} placeholder="newscope" onChange={event=>setCreateDraft(value=>({...value,scope_id:event.target.value.toLowerCase()}))}/></label>
        <label><span>顯示名稱</span><input value={createDraft.display_name} onChange={event=>setCreateDraft(value=>({...value,display_name:event.target.value}))}/></label>
        <label><span>Email</span><input type="email" value={createDraft.email} onChange={event=>setCreateDraft(value=>({...value,email:event.target.value}))}/></label>
        <label><span>Birthday</span><input type="date" value={createDraft.birthday} onChange={event=>setCreateDraft(value=>({...value,birthday:event.target.value}))}/></label>
        <label><span>Domain</span><input value={createDraft.domain} placeholder="scope.example.com" onChange={event=>setCreateDraft(value=>({...value,domain:event.target.value}))}/></label>
        <label><span>Directory</span><input value={createDraft.directory} placeholder="/newscope" onChange={event=>setCreateDraft(value=>({...value,directory:event.target.value}))}/></label>
        <label><span>Parent Scope Group</span><select value={createDraft.parent_scope_id} onChange={event=>setCreateDraft(value=>({...value,parent_scope_id:event.target.value}))}>
          {scopeGroups.map(group=><option key={group.scope_id} value={group.scope_id}>{group.display_name||group.scope_id} · {group.scope_id}</option>)}
        </select></label>
        <label><span>Theme</span><select value={createDraft.theme} onChange={event=>setCreateDraft(value=>({...value,theme:event.target.value}))}>
          {THEME_SLOTS.map(theme=><option key={theme.id} value={theme.id}>{theme.label} · {theme.id}</option>)}
        </select></label>
      </div>
      <label className="scope-setting-toggle"><input type="checkbox" checked={createDraft.copy_keywords!==false} onChange={event=>setCreateDraft(value=>({...value,copy_keywords:event.target.checked}))}/><span>預設複製目前 Rune66 Keyword Class（獨立 UUID / 66 筆）</span></label>
      <p className="scope-status">Domain / Directory 二選一；新 Scope 預設掛在選定的 Scope Group 下。</p>
      <button type="button" className="loc-button primary" onClick={createScope}>建立 Scope</button>
    </section>

    <h3>資料 Scope Mapping</h3>
    <div className="scope-management-records">
      {mappings.map((row,index)=><article className="scope-inline-card" key={row.id+':'+row.email}>
        <strong>{row.id} · {row.email}</strong>
        <div className="scope-management-fields">
          <label><span>Role</span><input value={row.role} readOnly aria-readonly="true"/></label>
          <label><span>Galaxy</span><input value={row.galaxy||'galaxy'} onChange={event=>change(index,'galaxy',event.target.value)}/></label>
          <label><span>Time</span><input value={row.time||'time'} onChange={event=>change(index,'time',event.target.value)}/></label>
          <label><span>Birthday</span><input type="date" value={row.birthday||''} onChange={event=>change(index,'birthday',event.target.value)}/></label>
        </div>
        <div className="scope-tabs">
          <button type="button" onClick={()=>save(index)}>儲存</button>
          <button type="button" onClick={()=>remove(row)}>移除</button>
        </div>
      </article>)}
    </div>

    <section className="scope-inline-card">
      <h3>新增既有 Scope 權限</h3>
      <div className="scope-management-fields">
        <label><span>Scope</span><select value={draft.id} onChange={event=>selectDraftScope(event.target.value)}>
          <option value="">選擇</option>{dataScopeIds.map(id=><option key={id} value={id}>{id}</option>)}
        </select></label>
        <label><span>Email</span><input type="email" value={draft.email} onChange={event=>setDraft(value=>({...value,email:event.target.value}))}/></label>
        <label><span>Galaxy</span><input value={draft.galaxy} onChange={event=>setDraft(value=>({...value,galaxy:event.target.value}))}/></label>
        <label><span>Time</span><input value={draft.time} onChange={event=>setDraft(value=>({...value,time:event.target.value}))}/></label>
        <label><span>Birthday</span><input type="date" value={draft.birthday} onChange={event=>setDraft(value=>({...value,birthday:event.target.value}))}/></label>
      </div>
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
  const [section,setSection]=useState('scopes');
  if(account.loading||account.permissionLoading)return <section className="loc-view"><div className="loc-card">{UI_COPY.admin.checking}</div></section>;
  if(!account.user)return <Login account={account}/>;
  if(!account.canManageGlobalSync())return <section className="loc-view">
    <header className="loc-hero"><p className="loc-eyebrow">{UI_COPY.admin.eyebrow}</p><h1>{UI_COPY.admin.eyebrow}</h1></header>
    <section className="loc-card"><p>{UI_COPY.admin.denied}</p><button type="button" onClick={account.signOut}>{UI_COPY.management.signOut}</button></section>
  </section>;

  return <section className="loc-view scope-management-page">
    <header className="loc-hero loc-hero-context">
      <p className="loc-eyebrow">{UI_COPY.admin.eyebrow}</p>
      <h1>{UI_COPY.admin.eyebrow}</h1>
      <p>系統級設定與 Scope Manage 分離；這裡只處理全域責任。</p>
      <div className="scope-management-select">
        <label htmlFor="admin-management-section">{UI_COPY.admin.item}</label>
        <select id="admin-management-section" className="scope-select" value={section} onChange={event=>setSection(event.target.value)}>
          {ADMIN_OPTIONS.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>
      <p><button type="button" onClick={account.signOut}>{UI_COPY.management.signOut}</button></p>
    </header>
    {section==='scopes'?<ScopeOverview/>:section==='search'?<SearchKeywordReport/>:<ThemeOverview account={account}/>} 
  </section>;
}
