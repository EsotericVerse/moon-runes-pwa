'use client';

import {UI_COPY} from '../../i18n/ui-copy';

import {useEffect,useMemo,useState} from 'react';
import Select from 'react-select';
import {SCOPES_V2} from '../../modular-v2/scope-registry.v2';
import {THEME_SLOTS_V2} from '../../modular-v2/theme-registry.v2';
import {useNeonAccount} from '../use-neon-account';
import {neonAuthClient} from '../neon-client';

const ADMIN_OPTIONS=Object.freeze([
  {value:'scopes',label:UI_COPY.admin.overview},
  {value:'themes',label:UI_COPY.admin.theme}
]);

function Login({account}){
  return <section className="loc-view">
    <header className="loc-hero"><p className="loc-eyebrow">{UI_COPY.admin.eyebrow}</p><h1>{UI_COPY.admin.loginTitle}</h1></header>
    <section className="loc-card">
      <p>{UI_COPY.admin.loginIntro}</p>
      <button className="loc-button primary" type="button" onClick={account.signIn}>{UI_COPY.admin.signIn}</button>
      {account.error?<p className="scope-v2-status scope-v2-error">{account.error}</p>:null}
    </section>
  </section>;
}

function ScopeOverview(){
  const scopes=Object.values(SCOPES_V2).filter(scope=>scope.id!=='admin');
  const [mappings,setMappings]=useState([]);
  const [status,setStatus]=useState('');
  useEffect(()=>{
    let active=true;
    neonAuthClient.schema('silver').from('manage')
      .select('id,email,role,galaxy,time,birthday')
      .order('id',{ascending:true})
      .order('email',{ascending:true})
      .then(({data,error})=>{
        if(!active)return;
        if(error){setStatus(error.message||'Mapping 讀取失敗。');return;}
        setMappings(data||[]);
      });
    return()=>{active=false};
  },[]);
  const change=(index,key,value)=>setMappings(rows=>rows.map((row,rowIndex)=>rowIndex===index?{...row,[key]:value}:row));
  const save=async(index)=>{
    const row=mappings[index];
    const galaxy=String(row?.galaxy||'galaxy').trim()||'galaxy';
    const time=String(row?.time||'time').trim()||'time';
    if(!/^[a-z][a-z0-9_]*$/.test(galaxy)||!/^[a-z][a-z0-9_]*$/.test(time)){setStatus('galaxy / time mapping 只能使用小寫英數與底線。');return;}
    const {error}=await neonAuthClient.schema('silver').from('manage')
      .update({galaxy,time})
      .eq('id',row.id)
      .eq('email',row.email);
    setStatus(error?(error.message||'Mapping 儲存失敗。'):'Mapping 已更新。');
  };
  return <section className="loc-card">
    <p className="loc-eyebrow">Current Scope Registry</p>
    <h2>{UI_COPY.admin.overview}</h2>
    <div className="scope-v2-list">
      {scopes.map(scope=><article className="scope-v2-inline-card" key={scope.id}>
        <strong>{scope.label}</strong>
        <span>{scope.id} · {scope.scopeType}</span>
      </article>)}
    </div>
    <h3>資料表 Mapping</h3>
    <p>每個 (id, email) 可各自指定 Galaxy 與 Time suffix；空值會回到 galaxy / time。</p>
    <div className="scope-v2-list">
      {mappings.map((row,index)=><article className="scope-v2-inline-card" key={row.id+':'+row.email}>
        <strong>{row.id} · {row.email}</strong>
        <span>{row.role}</span>
        <div className="scope-v2-stat-controls">
          <label><span>Galaxy</span><input value={row.galaxy||'galaxy'} onChange={event=>change(index,'galaxy',event.target.value)}/></label>
          <label><span>Time</span><input value={row.time||'time'} onChange={event=>change(index,'time',event.target.value)}/></label>
          <button type="button" onClick={()=>save(index)}>儲存 Mapping</button>
        </div>
      </article>)}
    </div>
    {status?<p className="scope-v2-status" role="status">{status}</p>:null}
  </section>;
}

function ThemeOverview(){
  return <section className="loc-card">
    <p className="loc-eyebrow">Theme Registry</p>
    <h2>{UI_COPY.admin.theme}</h2>
    <p>目前先檢視 8 組完整預設 Theme，不在這裡直接改色。未來可由 Admin 覆寫整組設定；沒有管理設定時一律回到預設 Theme。</p>
    <div className="scope-v2-list">
      {THEME_SLOTS_V2.map(theme=><article className="scope-v2-inline-card" key={theme.id}>
        <strong>{theme.label}</strong>
        <span>{theme.id} · {theme.scheme}</span>
      </article>)}
    </div>
  </section>;
}

export default function AdminHomeView(){
  const account=useNeonAccount();
  const [section,setSection]=useState('scopes');
  const selected=useMemo(()=>ADMIN_OPTIONS.find(option=>option.value===section)||ADMIN_OPTIONS[0],[section]);

  if(account.loading||account.permissionLoading)return <section className="loc-view"><div className="loc-card">{UI_COPY.admin.checking}</div></section>;
  if(!account.user)return <Login account={account}/>;
  if(!account.canManageGlobalSync())return <section className="loc-view">
    <header className="loc-hero"><p className="loc-eyebrow">{UI_COPY.admin.eyebrow}</p><h1>{UI_COPY.admin.eyebrow}</h1></header>
    <section className="loc-card"><p>{UI_COPY.admin.denied}</p><button type="button" onClick={account.signOut}>{UI_COPY.management.signOut}</button></section>
  </section>;

  return <section className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">{UI_COPY.admin.eyebrow}</p>
      <h1>{UI_COPY.admin.eyebrow}</h1>
      <p>先保持簡單；Scope 的完整管理仍由各 Scope 自己負責。</p>
      <div className="scope-v2-management-select">
        <label htmlFor="admin-management-section">{UI_COPY.admin.item}</label>
        <Select
          inputId="admin-management-section"
          className="scope-v2-react-select"
          classNamePrefix="scope-v2-react-select"
          unstyled
          options={ADMIN_OPTIONS}
          value={selected}
          onChange={option=>option?.value&&setSection(option.value)}
        />
      </div>
      <p><button type="button" onClick={account.signOut}>{UI_COPY.management.signOut}</button></p>
    </header>
    {section==='scopes'?<ScopeOverview/>:<ThemeOverview/>}
  </section>;
}
