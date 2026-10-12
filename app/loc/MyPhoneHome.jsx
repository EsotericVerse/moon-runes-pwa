'use client';

import {useEffect,useState} from 'react';
import {Capacitor} from '@capacitor/core';
import PrivateLocalFiles from './PrivateLocalFiles';

export default function MyPhoneHome(){
  const [native,setNative]=useState(false);
  useEffect(()=>{
    setNative(Capacitor.isNativePlatform()&&Capacitor.getPlatform()==='ios');
  },[]);

  return <main className="scope-main"><section className="scope-page">
    <header className="loc-hero"><h1>我的手機</h1></header>
    {native?<div className="scope-content"><PrivateLocalFiles/></div>:
      <section className="loc-card"><p>僅在 iOS App 提供。</p></section>}
  </section></main>;
}
