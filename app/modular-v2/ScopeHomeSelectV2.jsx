'use client';

import Select from 'react-select';
import {SCOPES_V2,scopeHrefV2} from './scope-registry.v2';
import {useScopeRuntimeV2} from './use-scope-runtime.v2';

function selectableScopes(){
  return Object.values(SCOPES_V2)
    .filter(scope=>!['loc','admin'].includes(scope.id))
    .map(scope=>({
      value:scope.id,
      label:scope.label,
      href:scopeHrefV2(scope.id)
    }));
}

const OPTIONS=Object.freeze([
  Object.freeze({
    label:'Scope',
    options:Object.freeze(selectableScopes())
  })
]);

export default function ScopeHomeSelectV2(){
  const {scopeId}=useScopeRuntimeV2();
  const selected=OPTIONS[0].options.find(option=>option.value===scopeId)||null;

  return <div className="scope-v2-scope-select" aria-label="Scope 首頁切換">
    <Select
      inputId="scope-home-select"
      className="scope-v2-react-select"
      classNamePrefix="scope-v2-react-select"
      unstyled
      isSearchable
      options={OPTIONS}
      value={selected}
      placeholder="Scope"
      noOptionsMessage={()=>"沒有符合的 Scope"}
      onChange={option=>{
        if(!option?.href)return;
        window.location.assign(option.href);
      }}
    />
  </div>;
}
