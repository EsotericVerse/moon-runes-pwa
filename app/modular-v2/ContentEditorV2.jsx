'use client';

import {UI_COPY} from '../i18n/ui-copy';

export default function ContentEditorV2({
  draft,
  setDraft,
  onSave,
  onCancel=null,
  busy=false,
  error='',
  showTitle=true,
  showBody=true,
  bodyLabel=UI_COPY.common.body,
  extraFields=null,
  showVisibility=true
}){
  if(!draft)return null;
  const change=(key,value)=>setDraft(current=>({...current,[key]:value}));
  return <div className="scope-v2-editor">
    {showTitle?<label>{UI_COPY.common.title}<input value={draft.title||''} onChange={event=>change('title',event.target.value)}/></label>:null}
    {showBody?<label>{bodyLabel}<textarea rows={10} value={draft.body||''} onChange={event=>change('body',event.target.value)}/></label>:null}
    {extraFields}
    {showVisibility?<div className="scope-v2-editor-options">
      <label><input type="checkbox" checked={draft.hidden===true} onChange={event=>change('hidden',event.target.checked)}/>{UI_COPY.common.hiddenFromSearch}</label>
    </div>:null}
    {error?<p role="alert" className="scope-v2-error">{error}</p>:null}
    <div className="scope-v2-tabs">
      <button type="button" disabled={busy} onClick={onSave}>{busy?UI_COPY.common.saving:UI_COPY.common.save}</button>
      {onCancel?<button type="button" disabled={busy} onClick={onCancel}>{UI_COPY.common.cancel}</button>:null}
    </div>
  </div>;
}
