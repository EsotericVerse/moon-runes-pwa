'use client';

export default function WorkFullTextV2({
  open=false,
  loading=false,
  error='',
  content='',
  onToggle,
  emptyText='此作品目前沒有正文。'
}){
  return <div className="scope-v2-work-fulltext">
    <button type="button" onClick={onToggle} disabled={loading}>
      {open?(loading?'載入全文中…':'收合全文'):'查看全文'}
    </button>
    {open&&error?<p className="scope-v2-status scope-v2-error">{error}</p>:null}
    {open&&!loading&&!error?<div className="scope-v2-inline-card">
      <p style={{whiteSpace:'pre-wrap'}}>{content||emptyText}</p>
    </div>:null}
  </div>;
}
