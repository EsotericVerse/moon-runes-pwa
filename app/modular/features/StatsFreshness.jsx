'use client';

import {useEffect,useState} from 'react';

// A manual statistics refresh may run at most once per cooldown window.
export const STATS_REFRESH_COOLDOWN_MS=5*60*1000;

export function useRefreshCooldown(updatedAt){
  const readyAt=(Number(updatedAt)||0)+STATS_REFRESH_COOLDOWN_MS;
  const [now,setNow]=useState(()=>Date.now());
  const cooling=Boolean(updatedAt)&&readyAt>now;
  useEffect(()=>{
    if(!cooling)return undefined;
    const timer=setInterval(()=>setNow(Date.now()),1000);
    return()=>clearInterval(timer);
  },[cooling]);
  return {cooling,remainingMs:cooling?readyAt-now:0};
}

const clock=ms=>new Date(ms).toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Asia/Taipei'});
const countdown=ms=>{
  const seconds=Math.ceil(Math.max(0,ms)/1000);
  return String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
};

export default function StatsFreshness({updatedAt,remainingMs=0}){
  if(!updatedAt)return null;
  return <p className="scope-status" role="status">
    此統計為 {clock(updatedAt)} 的文章統計；{remainingMs>0?'下一次統計需等待 '+countdown(remainingMs):'可以重新統計'}
  </p>;
}
