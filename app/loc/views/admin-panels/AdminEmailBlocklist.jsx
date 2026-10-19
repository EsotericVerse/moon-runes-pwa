'use client';
import {useCallback,useEffect,useState} from 'react';
import UiText from '../../../i18n/UiText';
import {useAccount} from '../../use-account';
import {dbAuthRelation} from '../../db-client.mjs';

export default function AdminEmailBlocklist(){
  const account=useAccount();
  const [emails,setEmails]=useState([]);
  const [email,setEmail]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [loading,setLoading]=useState(true);

  const load=useCallback(async()=>{
    setLoading(true);
    try{
      const {data,error}=await dbAuthRelation('silver.email_blocklist')
        .select('email,created_at').order('email',{ascending:true});
      if(error)throw new Error(error.message||'系統黑名單讀取失敗');
      setEmails(data||[]);
    }catch(error){setMessage(String(error?.message||error));}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{load();},[load]);

  async function add(){
    const value=String(email||'').trim().toLowerCase();
    if(!/^\S+@\S+\.\S+$/.test(value)){setMessage('Email 格式不正確。');return;}
    if(value===String(account.email||'').toLowerCase()){
      setMessage('不可將目前登入的 Admin 帳號加入黑名單。');return;
    }
    setBusy(true);setMessage('');
    try{
      const {error}=await dbAuthRelation('silver.email_blocklist').insert({email:value});
      if(error)throw new Error(error.message||'新增黑名單失敗');
      setEmail('');setMessage(value+' 已加入系統黑名單。');
      await load();
    }catch(error){setMessage(String(error?.message||error));}
    finally{setBusy(false);}
  }
  async function remove(value){
    if(!window.confirm('確認將 '+value+' 移出系統黑名單？'))return;
    setBusy(true);setMessage('');
    try{
      const {error}=await dbAuthRelation('silver.email_blocklist').delete().eq('email',value);
      if(error)throw new Error(error.message||'移出黑名單失敗');
      setMessage(value+' 已移出黑名單。');
      await load();
    }catch(error){setMessage(String(error?.message||error));}
    finally{setBusy(false);}
  }
  return <section className="loc-card admin-workspace">
    <h2>系統黑名單（Email Block List）</h2>
    <label><span>Email</span><input type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>
    <button type="button" className="loc-button primary" onClick={add} disabled={busy}><UiText id="uiExtra.adminView.addToBlocklist"/></button>
    {loading?<p className="scope-status">讀取中…</p>:null}
    {!loading&&emails.length===0?<p className="scope-status">目前沒有封鎖 Email。</p>:null}
    <div className="scope-list">
      {emails.map(item=><article className="scope-inline-card" key={item.email}>
        <strong>{item.email}</strong>
        <button type="button" className="loc-button" onClick={()=>remove(item.email)} disabled={busy}><UiText id="uiExtra.adminView.removeFromBlocklist"/></button>
      </article>)}
    </div>
    {message?<p className="scope-status" role="status">{message}</p>:null}
  </section>;
}
