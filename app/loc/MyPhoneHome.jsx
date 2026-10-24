'use client';
import FieldText from '../i18n/FieldText';

import {useEffect,useState} from 'react';
import {Capacitor} from '@capacitor/core';
import PrivateLocalFiles from './PrivateLocalFiles';
import ScopeLink from '../modular/ScopeLink';
import {navigationHref} from '../modular/scope-registry';

export default function MyPhoneHome(){
  const [native,setNative]=useState(false);
  useEffect(()=>{
    setNative(Capacitor.isNativePlatform()&&Capacitor.getPlatform()==='ios');
  },[]);

  return <main className="scope-main"><section className="scope-page">
    <header className="loc-hero"><h1><FieldText text="我的手機"/></h1></header>
    {native?<div className="scope-content">
      <section className="loc-card">
        <p className="scope-status">本機資料空間 · SQLite（local）</p>
        <p>下方保留原始檔案；要將內容疊加入本機 SQLite，請到「設定 → 文件匯入」選 Yes。</p>
        <div className="scope-result-links">
          {[
            {id:'culture',label:'文化'},
            {id:'statics',label:'統計'},
            {id:'search',label:'搜尋'},
            {id:'governance',label:'管理'}
          ].map(item=><ScopeLink key={item.id} native href={navigationHref('local',item.id,true)}>{item.label}</ScopeLink>)}
        </div>
      </section>
      <PrivateLocalFiles/>
    </div>:
      <section className="loc-card"><p>僅在 iOS App 提供。</p></section>}
  </section></main>;
}
