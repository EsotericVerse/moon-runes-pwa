'use client';

import {useEffect,useState} from 'react';
import {fetchThemeStylesV2,updateThemeStyleV2} from '../migration-bridges/theme-admin-neon.v2';
import {useNeonAccount} from './use-neon-account';

export default function ThemeAdmin(){
  const account=useNeonAccount();
  const [rows,setRows]=useState([]);
  const [drafts,setDrafts]=useState({});
  const [status,setStatus]=useState('');

  const load=async()=>{
    try{
      const next=await fetchThemeStylesV2();
      setRows(next);
      setDrafts(Object.fromEntries(next.map(item=>[item.style_key,JSON.stringify(item.css_vars||{},null,2)])));
      setStatus('');
    }catch(error){setStatus(String(error?.message||error))}
  };

  useEffect(()=>{load()},[]);

  if(account.loading)return <p>正在確認 Neon session…</p>;
  if(!account.user)return <p>登入後才能管理全站風格。</p>;
  if(account.user.role!=='admin')return <p>目前帳號不是 Admin；全站風格維持唯讀。</p>;

  const save=async row=>{
    try{
      const css_vars=JSON.parse(drafts[row.style_key]||'{}');
      await updateThemeStyleV2(row.style_key,{css_vars});
      setStatus(row.name_zh+'已更新');
      await load();
    }catch(error){setStatus(String(error?.message||error))}
  };

  return <div className="loc-theme-admin">
    <p className="loc-subtitle">八種風格共用同一套 CSS token；只有頁面管理者可以設定 <code>--loc-*</code> 變數。</p>
    {rows.map(row=><section className="loc-theme-admin-row" key={row.style_key}>
      <div>
        <strong>{row.name_zh}</strong>
        <small>{row.style_key}</small>
      </div>
      <textarea
        value={drafts[row.style_key]??'{}'}
        onChange={event=>setDrafts(current=>({...current,[row.style_key]:event.target.value}))}
        rows={6}
        aria-label={row.name_zh+' CSS variables JSON'}
      />
      <button type="button" className="loc-button" onClick={()=>save(row)}>儲存 {row.name_zh}</button>
    </section>)}
    {status&&<p className="loc-status">{status}</p>}
  </div>;
}
