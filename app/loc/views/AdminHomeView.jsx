'use client';

import {UI_COPY} from '../../i18n/ui-copy';
import {useEffect,useMemo,useState} from 'react';
import {SCOPES} from '../../modular/scope-registry';
import {THEME_SLOTS} from '../../modular/theme-registry';
import {useNeonAccount} from '../use-neon-account';
import {neonAuthRelation} from '../neon-client';

const ADMIN_OPTIONS=Object.freeze([
  {value:'scopes',label:UI_COPY.admin.overview},
  {value:'themes',label:UI_COPY.admin.theme}
]);
const EMPTY_MAPPING={id:'',email:'',role:'scope',galaxy:'galaxy',time:'time',birthday:''};

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
  const scopes=Object.values(SCOPES).filter(scope=>scope.id!=='admin');
  const dataScopeIds=useMemo(()=>new Set(scopes.filter(scope=>scope.id!=='loc').map(scope=>scope.id)),[scopes]);
  const [mappings,setMappings]=useState([]);
  const [draft,setDraft]=useState({...EMPTY_MAPPING});
  const [status,setStatus]=useState('');
  const [revision,setRevision]=useState(0);

  useEffect(()=>{
    let active=true;
    neonAuthRelation('silver.manage')
      .select('id,email,role,galaxy,time,birthday')
      .order('id',{ascending:true})
      .order('email',{ascending:true})
      .then(({data,error})=>{
        if(!active)return;
        if(error){setStatus(error.message||'Mapping 讀取失敗。');return;}
        setMappings((data||[]).map(row=>({...row,birthday:String(row.birthday||'').slice(0,10)})));
      });
    return()=>{active=false};
  },[revision]);

  const change=(index,key,value)=>setMappings(rows=>rows.map((row,rowIndex)=>rowIndex===index?{...row,[key]:value}:row));
  const validate=row=>{
    if(!dataScopeIds.has(String(row.id||'')))throw new Error('目前只能管理已部署的資料 Scope。');
    if(!/^\S+@\S+\.\S+$/.test(String(row.email||'')))throw new Error('Email 格式不正確。');
    if(!['admin','scope'].includes(row.role))throw new Error('Role 不正確。');
    for(const value of [row.galaxy||'galaxy',row.time||'time']){
      if(!/^[a-z][a-z0-9_]*$/.test(String(value)))throw new Error('galaxy / time mapping 只能使用小寫英數與底線。');
    }
  };

  const save=async index=>{
    const row=mappings[index];
    try{
      validate(row);
      const {error}=await neonAuthRelation('silver.manage')
        .update({
          role:row.role,
          galaxy:String(row.galaxy||'galaxy').trim()||'galaxy',
          time:String(row.time||'time').trim()||'time',
          birthday:row.birthday||null
        })
        .eq('id',row.id).eq('email',row.email);
      if(error)throw new Error(error.message);
      setStatus('Mapping 已更新。');setRevision(value=>value+1);
    }catch(error){setStatus(error.message||'Mapping 儲存失敗。');}
  };

  const add=async()=>{
    try{
      validate(draft);
      const {error}=await neonAuthRelation('silver.manage').insert({...draft,birthday:draft.birthday||null});
      if(error)throw new Error(error.message);
      setDraft({...EMPTY_MAPPING});setStatus('Mapping 已新增。');setRevision(value=>value+1);
    }catch(error){setStatus(error.message||'Mapping 新增失敗。');}
  };

  const remove=async row=>{
    if(!window.confirm('確定移除 '+row.id+' / '+row.email+' 的管理 Mapping？'))return;
    const {error}=await neonAuthRelation('silver.manage').delete().eq('id',row.id).eq('email',row.email);
    if(error){setStatus(error.message||'Mapping 刪除失敗。');return;}
    setStatus('Mapping 已移除。');setRevision(value=>value+1);
  };

  return <section className="loc-card scope-management-workspace">
    <p className="loc-eyebrow">Current Scope Registry</p>
    <h2>{UI_COPY.admin.overview}</h2>
    <p>Admin 管理系統身份、權限與資料表 Mapping；各 Scope 的內容請回到各自 Manage。</p>

    <div className="scope-list">
      {scopes.map(scope=><article className="scope-inline-card" key={scope.id}>
        <strong>{scope.label}</strong>
        <span>{scope.id} · {scope.domain||scope.mount?.path} · {scope.aggregateChildren?'Scope Group':'Scope'}</span>
      </article>)}
    </div>

    <h3>資料 Scope Mapping</h3>
    <div className="scope-management-records">
      {mappings.map((row,index)=><article className="scope-inline-card" key={row.id+':'+row.email}>
        <strong>{row.id} · {row.email}</strong>
        <div className="scope-management-fields">
          <label><span>Role</span><select value={row.role} onChange={event=>change(index,'role',event.target.value)}><option value="scope">scope</option><option value="admin">admin</option></select></label>
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
        <label><span>Scope</span><select value={draft.id} onChange={event=>setDraft(value=>({...value,id:event.target.value}))}>
          <option value="">選擇</option>{[...dataScopeIds].map(id=><option key={id} value={id}>{id}</option>)}
        </select></label>
        <label><span>Email</span><input type="email" value={draft.email} onChange={event=>setDraft(value=>({...value,email:event.target.value}))}/></label>
        <label><span>Role</span><select value={draft.role} onChange={event=>setDraft(value=>({...value,role:event.target.value}))}><option value="scope">scope</option><option value="admin">admin</option></select></label>
        <label><span>Galaxy</span><input value={draft.galaxy} onChange={event=>setDraft(value=>({...value,galaxy:event.target.value}))}/></label>
        <label><span>Time</span><input value={draft.time} onChange={event=>setDraft(value=>({...value,time:event.target.value}))}/></label>
        <label><span>Birthday</span><input type="date" value={draft.birthday} onChange={event=>setDraft(value=>({...value,birthday:event.target.value}))}/></label>
      </div>
      <button type="button" className="loc-button" onClick={add}>新增 Mapping</button>
    </section>
    {status?<p className="scope-status" role="status">{status}</p>:null}
  </section>;
}

function ThemeOverview(){
  return <section className="loc-card scope-management-workspace">
    <p className="loc-eyebrow">Theme Registry</p>
    <h2>{UI_COPY.admin.theme}</h2>
    <p>Theme 是畫面層，不是 Style Tag。八組 Theme 都在同一 registry；目前 Scope 的 canonical Theme assignment 仍由 deployment registry 定義。</p>
    <div className="scope-list">
      {Object.values(SCOPES).filter(scope=>scope.id!=='admin').map(scope=><article className="scope-inline-card" key={scope.id}>
        <strong>{scope.label}</strong>
        <span>{scope.theme?.mode==='fixed'?(scope.theme.themeId+' · fixed'):'auto'}</span>
      </article>)}
    </div>
    <h3>八組 Theme</h3>
    <div className="scope-list">
      {THEME_SLOTS.map(theme=><article className="scope-inline-card" key={theme.id}>
        <strong>{theme.label}</strong><span>{theme.id} · {theme.scheme}</span>
      </article>)}
    </div>
  </section>;
}

export default function AdminHomeView(){
  const account=useNeonAccount();
  const [section,setSection]=useState('scopes');
  if(account.loading||account.permissionLoading)return <section className="loc-view"><div className="loc-card">{UI_COPY.admin.checking}</div></section>;
  if(!account.user)return <Login account={account}/>;
  if(!account.canManageGlobalSync())return <section className="loc-view">
    <header className="loc-hero"><p className="loc-eyebrow">{UI_COPY.admin.eyebrow}</p><h1>{UI_COPY.admin.eyebrow}</h1></header>
    <section className="loc-card"><p>{UI_COPY.admin.denied}</p><button type="button" onClick={account.signOut}>{UI_COPY.management.signOut}</button></section>
  </section>;

  return <section className="loc-view scope-management-page">
    <header className="loc-hero">
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
    {section==='scopes'?<ScopeOverview/>:<ThemeOverview/>}
  </section>;
}
