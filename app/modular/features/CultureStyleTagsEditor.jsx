'use client';

import {useEffect,useState} from 'react';
import {updateRows} from '../../loc/db-client.mjs';

export function styleTagList(value){
  return [...new Set(String(value||'').split(/[,，]/g).map(item=>item.trim()).filter(Boolean))];
}

function descriptionMap(value){
  return value&&typeof value==='object'&&!Array.isArray(value)?{...value}:{};
}
function tagKey(value){return String(value||'').normalize('NFKC').trim().toLocaleLowerCase('zh-Hant');}

/**
 * Reusable visual tag editor. Edit the chips users actually see; the related
 * search-introduction text belongs to the selected chip, not to an unrelated textarea list.
 */
export function CultureStyleTagsField({value='',descriptions={},onChange=null,editable=false}){
  const tags=styleTagList(value);
  const detail=descriptionMap(descriptions);
  const [selected,setSelected]=useState('');
  const [renameText,setRenameText]=useState('');
  const [newName,setNewName]=useState('');
  const [error,setError]=useState('');
  const active=tags.includes(selected)?selected:'';

  function emit(nextTags,nextDescriptions){
    onChange?.({tags:nextTags.join(','),descriptions:nextDescriptions});
    setError('');
  }
  function open(tag){setSelected(tag);setRenameText(tag);setError('');}
  function add(event){
    event?.preventDefault?.();
    const name=newName.trim();
    if(!name||name.includes(',')||name.includes('，')){setError('請輸入不含逗號的風格名稱。');return;}
    if(tags.some(tag=>tagKey(tag)===tagKey(name))){setError('風格標籤已經存在。');return;}
    emit([...tags,name],{...detail,[name]:''});
    setNewName('');
    open(name);
  }
  function rename(event){
    event?.preventDefault?.();
    if(!active)return;
    const name=renameText.trim();
    if(!name||name.includes(',')||name.includes('，')){setError('風格名稱不可為空或含逗號。');return;}
    if(tags.some(tag=>tag!==active&&tagKey(tag)===tagKey(name))){setError('已有相同的風格標籤。');return;}
    if(name!==active){
      const next={...detail};
      const text=String(next[active]||'');
      delete next[active];
      next[name]=text;
      emit(tags.map(tag=>tag===active?name:tag),next);
      open(name);
    }
  }
  function remove(tag){
    const next={...detail};
    delete next[tag];
    emit(tags.filter(item=>item!==tag),next);
    if(selected===tag)setSelected('');
  }
  return <div className="scope-style-tag-editor">
    <div className="scope-style-tags" aria-label="風格標籤">
      {tags.map(tag=>editable
        ?<button key={tag} type="button" className={'scope-style-tag-chip'+(active===tag?' is-selected':'')} onClick={()=>open(tag)} title={String(detail[tag]||'')||'點選編輯此風格'} aria-pressed={active===tag}>{tag}</button>
        :<span key={tag} title={String(detail[tag]||'')}>{tag}</span>)}
    </div>
    {editable?<div className="scope-style-tag-tools">
      <form className="scope-style-tag-add" onSubmit={add}>
        <label><span className="sr-only">新增風格標籤</span><input value={newName} onChange={event=>setNewName(event.target.value)} placeholder="新增風格標籤" aria-label="新增風格標籤"/></label>
        <button type="submit" className="loc-button">＋ 新增</button>
      </form>
      {active?<div className="scope-style-tag-details">
        <label><span>風格名稱</span><input value={renameText} onChange={event=>setRenameText(event.target.value)} onKeyDown={event=>{if(event.key==='Enter')rename(event)}}/></label>
        <div className="scope-style-tag-actions">
          <button type="button" className="loc-button" onClick={rename}>重新命名</button>
          <button type="button" className="loc-button" onClick={()=>remove(active)}>移除標籤</button>
        </div>
        <label><span>「{active}」搜尋顯示說明</span>
          <textarea rows={3} value={String(detail[active]||'')} onChange={event=>emit(tags,{...detail,[active]:event.target.value})} placeholder="搜尋此風格時，顯示的簡短介紹"/>
        </label>
      </div>:null}
      {error?<p className="scope-status scope-error" role="alert">{error}</p>:null}
    </div>:null}
  </div>;
}

/** Save directly onto the canonical time record, never into a separate tag table. */
export default function CultureStyleTagsEditor({period,scopeId,table,canEdit=false,onSaved=null}){
  const recordId=String(period?.record_id||'').trim();
  const storedTags=String(period?.style_tags||'');
  const storedDescriptions=descriptionMap(period?.style_tag_descriptions);
  const [editing,setEditing]=useState(false);
  const [value,setValue]=useState(storedTags);
  const [descriptions,setDescriptions]=useState(storedDescriptions);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  useEffect(()=>{
    setValue(storedTags);
    setDescriptions(storedDescriptions);
    setEditing(false);
    setMessage('');
  },[recordId,storedTags,JSON.stringify(storedDescriptions)]);

  function cancel(){
    setValue(storedTags);setDescriptions(storedDescriptions);setEditing(false);setMessage('');
  }
  async function save(){
    if(!recordId||!table)return;
    const tags=styleTagList(value);
    const missing=tags.find(tag=>!String(descriptions[tag]||'').trim());
    if(missing){setMessage('請為「'+missing+'」填寫搜尋顯示說明。');return;}
    setBusy(true);setMessage('');
    try{
      const nextDescriptions=Object.fromEntries(tags.map(tag=>[tag,String(descriptions[tag]||'').trim()]));
      await updateRows(table,{
        style_tags:tags.length?tags.join(','):null,
        style_tag_descriptions:nextDescriptions,
        updated_at:new Date().toISOString()
      },{filters:[{column:'record_id',operator:'eq',value:recordId}]});
      await onSaved?.();
      setEditing(false);
      setMessage('風格標籤已儲存。');
    }catch(error){setMessage('儲存失敗：'+(error?.message||String(error)));}
    finally{setBusy(false);}
  }
  if(!recordId&&!storedTags)return null;
  return <div className="scope-culture-style-surface" data-scope={scopeId}>
    {!editing?<div className="scope-style-tag-row">
      <CultureStyleTagsField value={storedTags} descriptions={storedDescriptions}/>
      {canEdit&&recordId?<button type="button" className="loc-button scope-style-tag-edit" onClick={()=>setEditing(true)}>編輯風格標籤</button>:null}
    </div>:<div className="scope-culture-style-editing">
      <CultureStyleTagsField value={value} descriptions={descriptions} editable onChange={next=>{setValue(next.tags);setDescriptions(next.descriptions);setMessage('')}}/>
      <div className="scope-tabs">
        <button type="button" disabled={busy} onClick={save}>{busy?'儲存中…':'儲存風格標籤'}</button>
        <button type="button" disabled={busy} onClick={cancel}>取消</button>
      </div>
    </div>}
    {message?<p className={'scope-status'+(message.startsWith('儲存失敗')||message.startsWith('請為')?' scope-error':'')} role="status">{message}</p>:null}
  </div>;
}
