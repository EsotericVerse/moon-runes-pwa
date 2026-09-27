'use client';

export const DEFAULT_PAGE_SIZE=20;

export function pageCount(total,pageSize=DEFAULT_PAGE_SIZE){
  const size=Math.max(1,Number(pageSize)||DEFAULT_PAGE_SIZE);
  return Math.max(1,Math.ceil(Math.max(0,Number(total)||0)/size));
}

export function pageNumber(offset,pageSize=DEFAULT_PAGE_SIZE){
  const size=Math.max(1,Number(pageSize)||DEFAULT_PAGE_SIZE);
  return Math.floor(Math.max(0,Number(offset)||0)/size)+1;
}

export default function PagedResultV2({
  totalCount=0,
  offset=0,
  pageSize=DEFAULT_PAGE_SIZE,
  hasMore=false,
  onPrevious,
  onNext,
  label='結果'
}){
  const total=Math.max(0,Number(totalCount)||0);
  const current=pageNumber(offset,pageSize);
  const pages=pageCount(total,pageSize);
  if(total<=pageSize)return total?<p className="scope-v2-status">{label}共 {total.toLocaleString()} 筆。</p>:null;
  return <nav className="scope-v2-pagination" aria-label={label+'分頁'}>
    <button type="button" disabled={offset<=0} onClick={onPrevious}>上一頁</button>
    <span>{label}共 {total.toLocaleString()} 筆｜第 {current} / {pages} 頁</span>
    <button type="button" disabled={!hasMore} onClick={onNext}>下一頁</button>
  </nav>;
}
