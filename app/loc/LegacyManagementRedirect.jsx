'use client';
import {useEffect} from 'react';
export default function LegacyManagementRedirect({target}){
  useEffect(()=>{
    const next=new URL(target,window.location.origin);
    const old=new URL(window.location.href);
    for(const [key,value] of old.searchParams)
      if(!next.searchParams.has(key))next.searchParams.append(key,value);
    next.hash=old.hash;
    window.location.replace(next.href);
  },[target]);
  return <p className="scope-status" role="status">正在開啟管理入口…</p>;
}
