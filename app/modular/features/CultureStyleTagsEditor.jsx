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
function anchorIdList(value){
  const ids=(Array.isArray(value)?value:String(value||'').split(',')).map(id=>String(id||'0').trim()||'0');
  return ids.length>=2?ids:['0','0'];
}
function anchorDate(item){return String(item?.start_date||item?.date||'').slice(0,10);}
function anchorName(item){return String(item?.display_label||item?.title||item?.resource_id||'').trim();}
function anchorDescription(item){return String(item?.summary||item?.note||'').trim();}
function anchorCaption(item){
  if(!item)return '';
  return [anchorDate(item)||'日期未定',anchorName(item),anchorDescription(item)].filter(Boolean).join('｜');
}

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
export default function CultureStyleTagsEditor({period,anchors=[],scopeId,table,canEdit=false,onSaved=null}){
  const recordId=String(period?.record_id||'').trim();
  const storedTags=String(period?.style_tags||'');
  const storedDescriptions=descriptionMap(period?.style_tag_descriptions);
  const originalIds=anchorIdList(period?.anchor_ids);
  const availableAnchors=[...anchors].filter(item=>item?.entry_type==='anchor'&&item?.resource_id)
    .sort((a,b)=>anchorDate(a).localeCompare(anchorDate(b))||anchorName(a).localeCompare(anchorName(b)));
  const anchorById=new Map(availableAnchors.map(item=>[String(item.resource_id),item]));
  const [startAnchor,setStartAnchor]=useState(originalIds[0]);
  const [endAnchor,setEndAnchor]=useState(originalIds.at(-1));
  const [editing,setEditing]=useState(false);
  const [value,setValue]=useState(storedTags);
  const [descriptions,setDescriptions]=useState(storedDescriptions);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  useEffect(()=>{
    setValue(storedTags);
    setDescriptions(storedDescriptions);
    setStartAnchor(originalIds[0]);
    setEndAnchor(originalIds.at(-1));
    setEditing(false);
    setMessage('');
  },[recordId,storedTags,JSON.stringify(storedDescriptions),JSON.stringify(originalIds)]);

  function cancel(){
    setValue(storedTags);setDescriptions(storedDescriptions);setStartAnchor(originalIds[0]);setEndAnchor(originalIds.at(-1));setEditing(false);setMessage('');
  }
  async function save(){
    if(!recordId||!table)return;
    const tags=styleTagList(value);
    const missing=tags.find(tag=>!String(descriptions[tag]||'').trim());
    if(missing){setMessage('請為「'+missing+'」填寫搜尋顯示說明。');return;}
    const nextIds=[...originalIds];
    nextIds[0]=startAnchor;
    nextIds[nextIds.length-1]=endAnchor;
    for(const id of [startAnchor,endAnchor]){
      if(id!=='0'&&!anchorById.has(id)){setMessage('所選既有定錨點不存在，請重新選擇。');return;}
    }
    if((startAnchor==='0'&&originalIds[0]!=='0')||(endAnchor==='0'&&originalIds.at(-1)!=='0')){
      setMessage('不能將已指定的正式定錨點改成空白日期。');return;
    }
    // An existing Time range may also reference intermediate anchors. When
    // changing only its boundaries, preserve every intermediate ID and refuse
    // a choice that would reverse the entire ordered anchor sequence.
    if(nextIds.some(id=>id!=='0'&&!anchorById.has(id))){
      setMessage('有既有定錨點無法取得，請先回顧原始時期／事件，避免錯誤覆寫引用。');return;
    }
    const dated=nextIds.filter(id=>id!=='0')
      .map(id=>({id,date:anchorDate(anchorById.get(id))}))
      .filter(item=>item.date);
    for(let index=1;index<dated.length;index++){
      if(dated[index-1].date>=dated[index].date){
        setMessage('定錨點必須依時間先後排列；包含任何已建立的中間定錨點。');return;
      }
    }
    setBusy(true);setMessage('');
    try{
      const nextDescriptions=Object.fromEntries(tags.map(tag=>[tag,String(descriptions[tag]||'').trim()]));
      await updateRows(table,{
        style_tags:tags.length?tags.join(','):null,
        style_tag_descriptions:nextDescriptions,
        anchor_ids:nextIds,
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
      <p className="scope-status">風格定位：{originalIds.map(id=>id==='0'?'既有開放端':anchorCaption(anchorById.get(id))||'未找到定錨點 '+id).join(' → ')}</p>
      <CultureStyleTagsField value={storedTags} descriptions={storedDescriptions}/>
      {canEdit&&recordId?<button type="button" className="loc-button scope-style-tag-edit" onClick={()=>setEditing(true)}>編輯風格標籤與定錨位置</button>:null}
    </div>:<div className="scope-culture-style-editing">
      <div className="scope-management-fields">
        {[[0,'起點定錨點',startAnchor,setStartAnchor],[1,'終點定錨點',endAnchor,setEndAnchor]].map(([index,label,selected,setSelected])=><label key={label}>
          <span>{label}</span>
          <select className="scope-select" value={selected} onChange={event=>{setSelected(event.target.value);setMessage('')}}>
            {originalIds[index===0?0:originalIds.length-1]==='0'?<option value="0">保留原有開放端</option>:<option value="0" disabled>請選擇既有定錨點</option>}
            {availableAnchors.map(item=><option key={item.resource_id} value={item.resource_id}>{anchorCaption(item)}</option>)}
          </select>
          {selected!=='0'&&anchorById.has(selected)?<span className="scope-status">轉折原因：{anchorDescription(anchorById.get(selected))||'尚未寫入；可於定錨點編輯器補充。'}</span>:null}
        </label>)}
      </div>
      <p className="scope-status">沿用資料庫既有定錨點識別碼，不必重新輸入日期或新增相同定錨點。尚未正式建立的建議日期，請先由建議定錨清單建立正式定錨點。</p>
      <CultureStyleTagsField value={value} descriptions={descriptions} editable onChange={next=>{setValue(next.tags);setDescriptions(next.descriptions);setMessage('')}}/>
      <div className="scope-tabs">
        <button type="button" disabled={busy} onClick={save}>{busy?'儲存中…':'儲存風格標籤'}</button>
        <button type="button" disabled={busy} onClick={cancel}>取消</button>
      </div>
    </div>}
    {message?<p className={'scope-status'+(message.startsWith('儲存失敗')||message.startsWith('請為')?' scope-error':'')} role="status">{message}</p>:null}
  </div>;
}
