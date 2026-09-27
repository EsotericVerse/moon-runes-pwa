'use client';

export default function ContentEditorV2({
  draft,
  setDraft,
  onSave,
  onCancel=null,
  busy=false,
  error='',
  showTitle=true,
  showBody=true,
  bodyLabel='全文',
  extraFields=null,
  showVisibility=true
}){
  if(!draft)return null;
  const change=(key,value)=>setDraft(current=>({...current,[key]:value}));
  return <div className="scope-v2-editor">
    {showTitle?<label>標題<input value={draft.title||''} onChange={event=>change('title',event.target.value)}/></label>:null}
    {showBody?<label>{bodyLabel}<textarea rows={10} value={draft.body||''} onChange={event=>change('body',event.target.value)}/></label>:null}
    {extraFields}
    {showVisibility?<div className="scope-v2-editor-options">
      <label><input type="checkbox" checked={draft.includeStatistics!==false} onChange={event=>change('includeStatistics',event.target.checked)}/>列入統計</label>
      <label><input type="checkbox" checked={draft.fullText===true} onChange={event=>change('fullText',event.target.checked)}/>全文顯示（未勾選為簡文）</label>
      <label><input type="checkbox" checked={draft.hidden===true} onChange={event=>change('hidden',event.target.checked)}/>私密／隱藏</label>
      <label><input type="checkbox" checked={draft.showLink!==false} onChange={event=>change('showLink',event.target.checked)}/>顯示連結</label>
      <label><input type="checkbox" checked={draft.showSource!==false} onChange={event=>change('showSource',event.target.checked)}/>顯示來源</label>
    </div>:null}
    {error?<p role="alert" className="scope-v2-error">{error}</p>:null}
    <div className="scope-v2-tabs">
      <button type="button" disabled={busy} onClick={onSave}>{busy?'儲存中…':'儲存'}</button>
      {onCancel?<button type="button" disabled={busy} onClick={onCancel}>取消</button>:null}
    </div>
  </div>;
}
