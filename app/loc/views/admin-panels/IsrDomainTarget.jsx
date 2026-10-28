'use client';

import {useEffect,useState} from 'react';
import {CACHE_POLICY} from '../../cache-policy.config.mjs';
import {CACHE_MODE_OPTIONS,browserCacheChoice,setBrowserCacheChoice,resetBrowserCacheChoice} from '../../cache-mode-client.mjs';

export default function IsrDomainTarget(){
  const [choice,setChoice]=useState({mode:CACHE_POLICY.mode,provider:CACHE_POLICY.provider});
  const [notice,setNotice]=useState('');
  useEffect(()=>{setChoice(browserCacheChoice());},[]);
  const selected=CACHE_POLICY.domains.find(item=>item.id===choice.provider);
  const serverEnabled=CACHE_POLICY.mode==='isr'&&Boolean(CACHE_POLICY.origin);
  const update=next=>{
    try{
      setBrowserCacheChoice(next);
      setChoice(next);
      setNotice('已套用這台瀏覽器的快取設定。');
    }catch(error){setNotice(String(error?.message||error));}
  };
  const restore=()=>{
    try{
      resetBrowserCacheChoice();
      setChoice({mode:CACHE_POLICY.mode,provider:CACHE_POLICY.provider});
      setNotice('已恢復全站預設。');
    }catch(error){setNotice(String(error?.message||error));}
  };
  return <section className="loc-card admin-workspace">
    <h2>快取</h2>
    <div className="scope-management-fields">
      <label>快取模式
        <select className="scope-select" aria-label="快取模式" value={choice.mode}
          onChange={event=>update({...choice,mode:event.target.value})}>
          {CACHE_MODE_OPTIONS.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </label>
      <label>ISR 網域
        <select className="scope-select" aria-label="ISR 網域" value={choice.provider}
          onChange={event=>update({...choice,provider:event.target.value})}>
          {CACHE_POLICY.domains.map(item=><option key={item.id} value={item.id}>{item.label} · {item.origin}</option>)}
        </select>
      </label>
      <p className="scope-status" role="status">
        本機：{CACHE_MODE_OPTIONS.find(item=>item.value===choice.mode)?.label||choice.mode}
        {choice.mode==='isr'?' · '+(selected?.origin||'未設定'):''}
      </p>
      <p className="scope-status">
        全站 ISR：{serverEnabled?'已啟用':'尚未啟用'}。
        {choice.mode==='isr'&&!serverEnabled?'目前實際採用一般快取，不發送額外 ISR 請求。':''}
      </p>
      <button type="button" className="loc-button" onClick={restore}>恢復全站預設</button>
      {notice?<p className="scope-status" role="status">{notice}</p>:null}
    </div>
  </section>;
}
