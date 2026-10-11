'use client';

import {useEffect} from 'react';

export default function LegacyDuel2Redirect(){
  useEffect(()=>{window.location.replace('/card/duel/');},[]);
  return <main className="loc-next-main"><p>抽牌測試已移至 <a href="/card/duel/">/card/duel/</a>。</p></main>;
}
