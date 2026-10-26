'use client';

import {useEffect,useMemo,useState} from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import {Index,Charset} from 'flexsearch';
import {loadScopeSearchTerms} from '../../loc/search-terms-client.mjs';
import {rankScopeSearchSuggestions} from '../../loc/search-terms-model.mjs';

// A transient memory index scoped to this mounted input, never a shared or
// persistent cache. Each keystroke stays entirely local; normal full search
// still runs only through the parent form's submit handler.
export default function SearchTermAutocomplete({scopeId,query,onQueryChange,placeholder,label}){
  const [terms,setTerms]=useState([]);
  useEffect(()=>{
    const controller=new AbortController();
    setTerms([]);
    loadScopeSearchTerms(scopeId,{signal:controller.signal}).then(rows=>{
      if(!controller.signal.aborted)setTerms(rows);
    }).catch(()=>{
      // Autocomplete is optional; a missing/unauthorized table must never
      // block plain Search, including mobile-local database sessions.
      if(!controller.signal.aborted)setTerms([]);
    });
    return ()=>controller.abort();
  },[scopeId]);

  const index=useMemo(()=>{
    if(!terms.length)return null;
    const next=new Index({tokenize:'forward',encoder:Charset.CJK});
    terms.forEach((row,i)=>next.add(i,row.term));
    return next;
  },[terms]);
  const options=useMemo(()=>rankScopeSearchSuggestions(index,terms,query,8),[index,terms,query]);

  return <Autocomplete
    freeSolo
    size="small"
    options={options}
    inputValue={query}
    filterOptions={items=>items}
    open={Boolean(query.trim()&&options.length)}
    onInputChange={(_event,value,reason)=>{
      if(reason==='input'||reason==='clear')onQueryChange(value);
    }}
    onChange={(_event,value)=>{if(typeof value==='string')onQueryChange(value);}}
    clearOnBlur={false}
    blurOnSelect
    autoHighlight
    sx={{flex:'1 1 20rem',minWidth:0}}
    renderInput={params=><TextField {...params}
      id="scope-search-query"
      label={undefined}
      placeholder={placeholder}
      inputProps={{...params.inputProps,'aria-label':label,autoComplete:'off'}}
    />}
  />;
}
