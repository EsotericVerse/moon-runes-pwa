'use client';

import {useEffect} from 'react';

export default function LegacyList2Redirect(){
  useEffect(()=>{window.location.replace('/card/list/');},[]);
  return <main className="loc-next-main"><p>圖鑑測試已移至 <a href="/card/list/">/card/list/</a>。</p></main>;
}
