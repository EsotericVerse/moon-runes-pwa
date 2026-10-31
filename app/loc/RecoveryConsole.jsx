'use client';
import {useEffect,useRef,useState} from 'react';

// Recovery only: no Clerk script, session probe, Authority lookup or control
// request is loaded by LOC's public homepage, Culture, Search or Statistics.
const publishableKey=process.env.NEXT_PUBLIC_LOC_CLERK_PUBLISHABLE_KEY||'';
const clerkHost=process.env.NEXT_PUBLIC_LOC_CLERK_FRONTEND_API_URL||'';
const controlUrl=(process.env.NEXT_PUBLIC_LOC_CONTROL_URL||'').replace(/\/$/,'');
const engines=[['postgres','PostgreSQL'],['mysql','MySQL / MariaDB'],['mssql','SQL Server / Azure SQL']];
const emptyTarget={id:'',label:'',engine:'postgres',host:'',port:'5432',database:'',username:'',password:''};

function loadScript(url,{publishableKey=''}={}){
  return new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src=url;script.async=true;script.crossOrigin='anonymous';
    if(publishableKey)script.setAttribute('data-clerk-publishable-key',publishableKey);
    script.onload=resolve;script.onerror=()=>reject(new Error('Clerk 介面載入失敗'));
    document.head.appendChild(script);
  });
}
function clerkBase(){
  const value=String(clerkHost||'').trim();
  if(!value)throw new Error('尚未設定 Clerk Frontend API URL');
  const parsed=new URL(value);
  if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.search||parsed.hash||parsed.pathname!=='/')
    throw new Error('Clerk 前端網址必須是 HTTPS 網域');
  return parsed.origin;
}
async function openClerk(){
  if(!publishableKey)throw new Error('尚未設定 Clerk Publishable Key');
  const base=clerkBase();
  if(!window.__internal_ClerkUICtor)await loadScript(base+'/npm/@clerk/ui@1/dist/ui.browser.js');
  if(!window.Clerk)await loadScript(base+'/npm/@clerk/clerk-js@6/dist/clerk.browser.js',{publishableKey});
  await window.Clerk.load({ui:{ClerkUI:window.__internal_ClerkUICtor}});
  return window.Clerk;
}
export default function RecoveryConsole(){
  const [clerk,setClerk]=useState(null);
  const [identityRevision,setIdentityRevision]=useState(0);
  const [checking,setChecking]=useState(true);
  const [status,setStatus]=useState('');
  const [authorized,setAuthorized]=useState(false);
  const [targets,setTargets]=useState([]);
  const [grants,setGrants]=useState([]);
  const [grantForm,setGrantForm]=useState({provider:'clerk',subject:'',scope:'',actions:['read'],days:30});
  const [primary,setPrimary]=useState('');
  const [form,setForm]=useState(emptyTarget);
  const [busy,setBusy]=useState(false);
  const loginSlot=useRef(null);
  useEffect(()=>{
    let active=true;
    openClerk().then(value=>{if(active){setClerk(value);setChecking(false);}})
      .catch(error=>{if(active){setStatus(error.message);setChecking(false);}});
    return()=>{active=false};
  },[]);
  useEffect(()=>{
    if(!clerk||clerk.isSignedIn||!loginSlot.current)return;
    clerk.mountSignIn(loginSlot.current);
    return()=>{try{clerk.unmountSignIn(loginSlot.current)}catch{}};
  },[clerk]);
  useEffect(()=>{
    if(!clerk)return;
    const unsubscribe=clerk.addListener(({user,session})=>{
      setIdentityRevision(value=>value+1);
      if(!user||!session){setAuthorized(false);setTargets([]);setGrants([]);}
    });
    return()=>unsubscribe();
  },[clerk]);
  async function request(path,{method='GET',body}={}){
    if(!controlUrl||new URL(controlUrl).protocol!=='https:')
      throw new Error('尚未設定獨立 Authority Control URL');
    const token=await clerk?.session?.getToken();
    if(!token)throw new Error('請先完成 Clerk 登入');
    const response=await fetch(controlUrl+path,{
      method,credentials:'omit',cache:'no-store',
      headers:{authorization:'Bearer '+token,...(body?{'content-type':'application/json'}:{})},
      ...(body?{body:JSON.stringify(body)}:{})
    });
    const result=await response.json().catch(()=>null);
    if(!response.ok)throw new Error(result?.error||'控制服務回應 '+response.status);
    return result;
  }
  async function refresh(){
    setBusy(true);setStatus('');
    try{
      await request('/v1/me');
      const [data,grantsData]=await Promise.all([request('/v1/state'),request('/v1/grants')]);
      setAuthorized(true);setTargets(data.targets||[]);setGrants(grantsData.grants||[]);
      setPrimary(data.primary_id||'');
      setStatus('LOC 獨立管理身分已驗證，設定來自控制層，不依賴業務資料庫。');
    }catch(error){setAuthorized(false);setStatus(error.message);}
    finally{setBusy(false);}
  }
  async function save(event){
    event.preventDefault();setBusy(true);setStatus('');
    try{
      const id=String(form.id||'').trim();
      if(!/^[a-z][a-z0-9_-]{0,63}$/.test(id))throw new Error('目標 ID 應以英文字母開頭');
      await request('/v1/targets/'+id,{method:'PUT',body:{
        label:form.label,engine:form.engine,host:form.host,
        port:Number(form.port),database:form.database,username:form.username,
        ...(form.password?{password:form.password}:{})
      }});
      const data=await request('/v1/state');
      setTargets(data.targets||[]);setForm({...form,password:''});
      setStatus('資料庫連線設定已獨立加密儲存；尚未對正式資料庫執行切換。');
    }catch(error){setStatus(error.message);}
    finally{setBusy(false);}
  }
  async function saveGrant(event){
    event.preventDefault();setBusy(true);setStatus('');
    try{
      const days=Number(grantForm.days);
      if(!Number.isSafeInteger(days)||days<1||days>365)throw new Error('有效期限限 1–365 天');
      await request('/v1/grants',{method:'PUT',body:{
        provider:grantForm.provider,subject:grantForm.subject,scope:grantForm.scope,
        actions:grantForm.actions,expires_at:Date.now()+days*86400000
      }});
      const result=await request('/v1/grants');
      setGrants(result.grants||[]);
      setStatus('Scope 授權已儲存於獨立 Authority，非業務資料庫。');
    }catch(error){setStatus(error.message);}
    finally{setBusy(false);}
  }
  async function revokeGrant(key){
    if(!window.confirm('確定立即撤銷這筆授權？'))return;
    setBusy(true);setStatus('');
    try{
      await request('/v1/revoke',{method:'POST',body:{key}});
      const result=await request('/v1/grants');
      setGrants(result.grants||[]);setStatus('權限已撤銷。');
    }catch(error){setStatus(error.message);}
    finally{setBusy(false);}
  }
  async function selectPrimary(id){
    setBusy(true);setStatus('');
    try{
      const data=await request('/v1/primary',{method:'POST',body:{id}});
      setPrimary(data.primary_id);
      setStatus('已保存復原目標；目前主站資料路由尚未接上獨立 Gateway，不能視為已切換。');
    }catch(error){setStatus(error.message);}
    finally{setBusy(false);}
  }
  return <main className="loc-view" style={{maxWidth:760,margin:'0 auto',padding:'2rem 1rem'}}>
    <section className="loc-card">
      <h1>LOC · 獨立復原控制</h1>
      <p>此入口只供資料庫連線故障時使用。Clerk 登入與 LOC 控制服務不經 Supabase 或 Neon；公開首頁不載入此功能。</p>
      {checking?<p role="status">載入獨立登入介面…</p>:null}
      {!checking&&clerk&&!clerk.isSignedIn?<div ref={loginSlot} aria-label="Clerk 登入"/>:null}
      {!checking&&clerk?.isSignedIn?<div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
        <button type="button" className="loc-button primary" disabled={busy} onClick={refresh}>驗證管理員並載入控制設定</button>
        <button type="button" className="loc-button" disabled={busy} onClick={()=>clerk.signOut().then(()=>location.reload())}>登出 Clerk</button>
      </div>:null}
      {status?<p role="status" className="scope-status">{status}</p>:null}
    </section>
    {authorized?<section className="loc-card" style={{marginTop:20}}>
      <h2>資料庫控制清單</h2>
      <p className="scope-status">目前記錄的復原目標：{primary||'未設定'}。此清單獨立於業務資料庫。</p>
      {targets.map(target=><div key={target.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,marginBottom:8}}>
        <span>{target.label} · {target.engine} · {target.host}:{target.port}</span>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <button className="loc-button" type="button" disabled={busy} onClick={()=>setForm({...target,password:''})}>編輯</button>
          <button className="loc-button" type="button" disabled={busy||target.id===primary} onClick={()=>selectPrimary(target.id)}>記為復原目標</button>
        </div>
      </div>)}
      <form onSubmit={save} className="scope-management-fields" style={{marginTop:18}}>
        <h3>新增／編輯連線</h3>
        <label>代號<input required value={form.id} onChange={event=>setForm({...form,id:event.target.value})}/></label>
        <label>名稱<input required value={form.label} onChange={event=>setForm({...form,label:event.target.value})}/></label>
        <label>SQL 引擎<select value={form.engine} onChange={event=>setForm({...form,engine:event.target.value,port:event.target.value==='mysql'?'3306':event.target.value==='mssql'?'1433':'5432'})}>
          {engines.map(([value,label])=><option key={value} value={value}>{label}</option>)}
        </select></label>
        <label>主機<input required value={form.host} onChange={event=>setForm({...form,host:event.target.value})}/></label>
        <label>連接埠<input required type="number" min="1" max="65535" value={form.port} onChange={event=>setForm({...form,port:event.target.value})}/></label>
        <label>資料庫<input required value={form.database} onChange={event=>setForm({...form,database:event.target.value})}/></label>
        <label>帳號<input required value={form.username} autoComplete="off" onChange={event=>setForm({...form,username:event.target.value})}/></label>
        <label>密碼（編輯時可留空保留舊值）<input type="password" autoComplete="new-password" value={form.password} onChange={event=>setForm({...form,password:event.target.value})}/></label>
        <button className="loc-button primary" type="submit" disabled={busy}>加密儲存連線設定</button>
      </form>
      <p className="scope-status">此控制面板不直接執行 SQL。獨立 SQL Gateway 尚未啟用前，修改設定不會變更網站當前資料來源。</p>
    </section>:null}
    {authorized?<section className="loc-card" style={{marginTop:20}}>
      <h2>LOC Authority · Scope 授權</h2>
      <p className="scope-status">此權限獨立於所有業務 SQL 資料庫；不會因 Scope Tree 關係自行繼承。過期或撤銷後立即拒絕。</p>
      {grants.map(grant=><div key={grant.key} style={{display:'flex',justifyContent:'space-between',gap:12,marginBottom:8}}>
        <span>{grant.provider} · {grant.subject} · {grant.scope} · {grant.actions.join('/')} · {new Date(grant.expires_at).toLocaleDateString()}</span>
        <button type="button" className="loc-button" disabled={busy} onClick={()=>revokeGrant(grant.key)}>撤銷</button>
      </div>)}
      <form onSubmit={saveGrant} className="scope-management-fields">
        <h3>新增／更新授權</h3>
        <label>身分提供者<select value={grantForm.provider} onChange={event=>setGrantForm({...grantForm,provider:event.target.value})}>
          <option value="clerk">Clerk</option><option value="secondary">Secondary OIDC</option>
        </select></label>
        <label>已驗證的使用者 ID<input required value={grantForm.subject} onChange={event=>setGrantForm({...grantForm,subject:event.target.value})}/></label>
        <label>Scope ID<input required value={grantForm.scope} onChange={event=>setGrantForm({...grantForm,scope:event.target.value})}/></label>
        <fieldset><legend>允許的操作</legend>
          {['read','write','manage','configure'].map(action=><label key={action} style={{marginRight:14}}>
            <input type="checkbox" checked={grantForm.actions.includes(action)} onChange={event=>setGrantForm({...grantForm,actions:event.target.checked?[...grantForm.actions,action]:grantForm.actions.filter(item=>item!==action)})}/>{action}
          </label>)}
        </fieldset>
        <label>有效天數（1–365）<input required type="number" min="1" max="365" value={grantForm.days} onChange={event=>setGrantForm({...grantForm,days:event.target.value})}/></label>
        <button className="loc-button primary" type="submit" disabled={busy||!grantForm.actions.length}>儲存 Scope 授權</button>
      </form>
    </section>:null}
  </main>;
}
