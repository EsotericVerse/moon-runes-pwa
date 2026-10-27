'use client';
import {useState} from 'react';
import Select from 'react-select';
import {currentPopularOptions,readAutocompleteCurrent} from './autocomplete-current.mjs';

// Ordinary typing preserves react-select's existing matching behavior.
// Double-click alone switches the empty-input menu to the saved Scope top 10.
export default function PopularSelect({scopeId='',kind='space',options=[],onInputChange,
  onMenuClose,noOptionsMessage,...props}){
  const [popular,setPopular]=useState(false);
  const [snapshot,setSnapshot]=useState(null);
  const [loading,setLoading]=useState(false);
  const [inputText,setInputText]=useState('');
  const visible=popular&&!inputText.trim()
    ?currentPopularOptions(options,snapshot,kind):options;
  async function openPopular(event){
    if(props.isDisabled||event.target?.closest?.('button'))return;
    setInputText('');
    setPopular(true);
    setLoading(true);
    try{setSnapshot(await readAutocompleteCurrent(scopeId));}
    catch{setSnapshot(null);}
    finally{setLoading(false);}
  }
  return <div className="loc-popular-autocomplete" onDoubleClick={openPopular}
    style={{width:'100%',minWidth:0}}>
    <Select {...props} inputValue={inputText} options={popular&&!inputText.trim()?visible:options}
      onInputChange={(value,meta)=>{
        if(meta.action==='input-change'){setInputText(value);if(value.trim())setPopular(false);}
        return onInputChange?.(value,meta)??value;
      }}
      onMenuClose={()=>{setPopular(false);setInputText('');onMenuClose?.();}}
      menuIsOpen={popular?true:undefined}
      noOptionsMessage={ctx=>popular&&!loading&&!visible.length
        ?'尚無熱門候選，請由管理頁重新統計'
        :loading?'正在讀取前 10 名…':noOptionsMessage?.(ctx)??'沒有符合項目'}/>
  </div>;
}
