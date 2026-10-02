'use client';

import {UI_COPY} from '../i18n/ui-copy';

export default function WorkFullText({
  open=false,
  loading=false,
  error='',
  content='',
  onToggle,
  emptyText=UI_COPY.work.noBody
}){
  return <div className="scope-work-fulltext">
    <button type="button" onClick={onToggle} disabled={loading}>
      {open?(loading?UI_COPY.work.loadingBody:UI_COPY.work.collapseBody):UI_COPY.work.viewBody}
    </button>
    {open&&error?<p className="scope-status scope-error">{error}</p>:null}
    {open&&!loading&&!error?<div className="scope-inline-card">
      <p className="scope-prewrap">{content||emptyText}</p>
    </div>:null}
  </div>;
}
