'use client';

import {useEffect,useState} from 'react';
import {detectNavScope} from './nav-route-map';
import LocApp from './loc/LocApp';
import ContextView from './loc/views/ContextView';
import SearchView from './loc/views/SearchView';
import LunaRunesStaticsView from './runes/LunaRunesStaticsView';
import LunaRunesEvolutionView from './runes/LunaRunesEvolutionView';
import LunaRunesGovernanceView from './runes/LunaRunesGovernanceView';

function LunaRunesFeature({feature}){
  if(feature==='context')return <ContextView scope="lunarunes"/>;
  if(feature==='statics')return <LunaRunesStaticsView/>;
  if(feature==='evolution')return <LunaRunesEvolutionView/>;
  if(feature==='governance')return <LunaRunesGovernanceView/>;
  if(feature==='search')return <SearchView fixedCollectionId="月之符文"/>;
  return null;
}

export default function ScopedFeaturePage({feature}){
  const [scope,setScope]=useState(null);
  useEffect(()=>setScope(detectNavScope(window.location.pathname,window.location.hostname)),[]);
  if(scope===null)return <main className="loc-next-main"><section className="loc-view"><div className="loc-loading">載入目前 Scope…</div></section></main>;
  if(scope==='runes')return <main className="loc-next-main"><LunaRunesFeature feature={feature}/></main>;
  return <LocApp/>;
}
