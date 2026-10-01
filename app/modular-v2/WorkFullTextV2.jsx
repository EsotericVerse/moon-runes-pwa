'use client';

import {UI_COPY} from '../i18n/ui-copy';

export default function WorkFullTextV2({
  open=false,
  loading=false,
  error='',
  content='',
  onToggle,
  emptyText=UI_COPY.work.noBody
}){
  return <div className="scope-v2-work-fulltext">
    <button type="button" onClick={onToggle} disabled={loading}>
      {open?(loading?UI_COPY.work.loadingBody:UI_COPY.work.collapseBody):UI_COPY.work.viewBody}
    </button>
    {open&&error?<p className="scope-v2-status scope-v2-error">{error}</p>:null}
    {open&&!loading&&!error?<div className="scope-v2-inline-card">
      <p className="scope-v2-prewrap">{content||emptyText}</p>
    </div>:null}
  </div>;
}
