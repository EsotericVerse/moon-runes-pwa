'use client';

import {useEffect,useState} from 'react';
import Select from 'react-select';
import {SCOPES_V2,scopeHrefV2} from './scope-registry.v2';
import {useScopeRuntimeV2} from './use-scope-runtime.v2';

function selectableHomes(){
  return Object.values(SCOPES_V2)
    .filter(scope=>!['loc','admin'].includes(scope.id))
    .map(scope=>({
      value:scope.id,
      label:scope.label,
      href:scopeHrefV2(scope.id)
    }));
}

const OPTIONS=Object.freeze(selectableHomes());

export default function ScopeHomeSelectV2(){
  const {scopeId}=useScopeRuntimeV2();
  const [portalTarget,setPortalTarget]=useState(null);
  const selected=OPTIONS.find(option=>option.value===scopeId)||null;

  useEffect(()=>{
    setPortalTarget(document.body);
  },[]);

  return <div className="scope-v2-scope-select" aria-label="首頁切換">
    <Select
      inputId="scope-home-select"
      className="scope-v2-home-select"
      classNamePrefix="scope-v2-home-select"
      unstyled
      isSearchable={false}
      options={OPTIONS}
      value={selected}
      placeholder="首頁"
      noOptionsMessage={()=>"沒有其他首頁"}
      menuPortalTarget={portalTarget}
      menuPosition="fixed"
      menuPlacement="auto"
      onChange={option=>{
        if(!option?.href)return;
        window.location.assign(option.href);
      }}
    />
  </div>;
}
