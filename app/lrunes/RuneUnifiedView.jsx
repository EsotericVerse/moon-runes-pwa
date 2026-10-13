'use client';

import {useEffect,useState} from 'react';
import dynamic from 'next/dynamic';
import './rune-presentation-switch.css';

// Keep the canonical 2D original-art module entirely independent of the
// licensed Effekseer/Three.js renderer. Load only the selected presentation.
const VISUALS=Object.freeze({
  duel:{
    '2d':dynamic(()=>import('./duel2/RuneRitualLab'),{ssr:false}),
    '3d':dynamic(()=>import('./Rune3DPreview'),{ssr:false})
  },
  daily:{
    '2d':dynamic(()=>import('./daily3d/RuneDaily3D'),{ssr:false}),
    '3d':dynamic(()=>import('./Rune3DPreview'),{ssr:false})
  },
  list:{
    '2d':dynamic(()=>import('./list2/RuneAtlasLab'),{ssr:false}),
    '3d':dynamic(()=>import('./Rune3DLibrary'),{ssr:false})
  }
});
const TITLES=Object.freeze({duel:'符文抽牌',daily:'每日符文',list:'符文圖鑑'});

function canonicalView(queryValue,defaultView){
  return queryValue==='2d'||queryValue==='3d'?queryValue:defaultView;
}

export default function RuneUnifiedView({feature='duel',defaultView='2d'}){
  const selectedFeature=Object.hasOwn(VISUALS,feature)?feature:'duel';
  const fallback=canonicalView(defaultView,'2d');
  const [view,setView]=useState(fallback);
  useEffect(()=>{
    const getView=()=>canonicalView(new URLSearchParams(window.location.search).get('view'),fallback);
    setView(getView());
    const onHistory=()=>setView(getView());
    window.addEventListener('popstate',onHistory);
    return()=>window.removeEventListener('popstate',onHistory);
  },[fallback]);

  const selectView=next=>{
    if(next!=='2d'&&next!=='3d')return;
    setView(next);
    const url=new URL(window.location.href);
    url.searchParams.set('view',next);
    window.history.replaceState(window.history.state,'',url.pathname+url.search+url.hash);
  };
  const modeControl=<nav className="rune-presentation-switch" role="group"
    aria-label={TITLES[selectedFeature]+'的顯示方式'}>
    <span className="rune-presentation-switch-title">{TITLES[selectedFeature]} · 顯示方式</span>
    <div className="rune-presentation-switch-options">
      <button type="button" aria-pressed={view==='2d'}
        className="rune-presentation-switch-option" onClick={()=>selectView('2d')}>2D 原創美術</button>
      <button type="button" aria-pressed={view==='3d'}
        className="rune-presentation-switch-option" onClick={()=>selectView('3d')}>3D 符文特效</button>
    </div>
  </nav>;
  const Component=VISUALS[selectedFeature][view];
  return <Component key={selectedFeature+'-'+view}
    {...(view==='3d'&&selectedFeature!=='list'?{mode:selectedFeature}:{})}
    presentationSwitcher={modeControl}/>;
}
