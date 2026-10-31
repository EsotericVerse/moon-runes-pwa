'use client';
import {useEffect,useState} from 'react';
import {useAccount} from './use-account';
import {useEditDock} from '../modular/edit-dock';
import {FeaturePage} from '../modular/ui';
import {editorSessionStatus,clearEditorSession,touchEditorSession} from './edit-session-ttl.mjs';
import {getAccountSession,dbAuthClient} from './db-client.mjs';
import {setAuthorization,createScopeAuthorizer} from './authorization-runtime.mjs';

const granted=(grants,id,level)=>level==='global'
  ?Boolean(grants?.canManageGlobalSync())
  :level==='group'?Boolean(grants?.canManageGroupSync(id))
  :Boolean(grants?.canManageScopeSync(id));

export default function ManagementAccess({scopeId,level='scope',featureId='manage',children}){
  const account=useAccount(),dock=useEditDock();
  const [locked,setLocked]=useState(false);
  const [renewing,setRenewing]=useState(false);
  const [error,setError]=useState('');
  const ready=!account.loading&&!account.permissionLoading;
  const allowed=Boolean(ready&&account.user&&granted(account.authorizer,scopeId,level));
  const entered=Boolean(dock?.active&&dock.scopeId===scopeId);
  useEffect(()=>{
    if(!allowed||entered)return;
    if(editorSessionStatus(window.sessionStorage).expired){setLocked(true);return;}
    setLocked(false);
    dock?.begin(scopeId);
  },[allowed,entered,scopeId,dock?.begin]);
  async function renew(){
    if(renewing||!allowed||entered||!locked)return;
    setRenewing(true);setError('');
    try{
      const verified=await getAccountSession();
      if(!verified?.user||String(verified.user.id)!==String(account.user.id)||
        String(verified.user.email||'').toLowerCase()!==String(account.email||'').toLowerCase())
        throw Error('登入身分已變更，請重新登入。');
      const {data,error:permissionError}=await dbAuthClient.schema('silver').rpc('get_my_scope_management');
      if(permissionError)throw Error('管理權限重新驗證失敗：'+permissionError.message);
      setAuthorization(verified.user,Array.isArray(data)?data:[]);
      if(!granted(createScopeAuthorizer(verified.user),scopeId,level))
        throw Error('重新驗證後，沒有此管理範圍的權限。');
      clearEditorSession(window.sessionStorage);
      if(!touchEditorSession(window.sessionStorage))throw Error('無法重建編輯 Session。');
      setLocked(false);
      dock?.begin(scopeId);
    }catch(cause){setError(String(cause?.message||cause));}
    finally{setRenewing(false);}
  }
  if(!ready||!account.user||!allowed||!entered)return <FeaturePage featureId={featureId}>
    <section className="loc-card scope-feature-card">
      {!ready?<p role="status">正在確認管理權限…</p>
        :!account.user?<p>{account.error?'登入 Session 驗證失敗，請重新登入。':'請先登入才能進入管理。'}</p>
        :!allowed?<p role="alert">{account.error?'管理權限確認失敗，暫時無法編輯。':<>沒有此 {level==='group'?'Scope Group':level==='global'?'系統':'Scope'} 的管理權限。</>}</p>
        :locked?<><p role="status">編輯 Session 已鎖定，請重新驗證後進入管理。</p>
          <button className="loc-button" type="button" disabled={renewing} onClick={renew}>
            {renewing?'正在重新驗證…':'重新驗證並進入管理'}
          </button></>:<p role="status">正在啟用管理介面…</p>}
      {account.error?<p className="scope-status scope-error" role="alert">{account.error}</p>:null}
      {!allowed&&account.user&&account.error?<button className="loc-button" type="button"
        onClick={()=>void account.refresh({forceVerify:true}).catch(()=>{})}>重新確認管理權限</button>:null}
      {ready&&!allowed?<button className="loc-button" type="button" onClick={()=>{
        try{window.localStorage.removeItem('loc-auth-provider');}catch{}
        window.location.assign('/local/settings/');
      }}>改用原本登入方式</button>:null}
      {error?<p className="scope-status scope-error" role="alert">{error}</p>:null}
    </section>
  </FeaturePage>;
  return children;
}
