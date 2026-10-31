'use client';

import {useState} from 'react';
import {useAsyncResource} from './use-async-resource';
import {useUiText} from '../i18n/UiText';
import {readScopeSearchSummary,refreshScopeSearchSummary,summaryScopeIds} from './scope-search-summary.mjs';

export default function SearchSummary({scopeIds=[],managementMode=false}){
  const t=useUiText();
  const ids=summaryScopeIds(scopeIds);
  const key=ids.join('|');
  const query=useAsyncResource({
    queryKey:['scope-search-summary',key],
    queryFn:()=>readScopeSearchSummary(ids),
    enabled:ids.length>0,
    revalidateOnFocus:false,
    revalidateOnReconnect:false
  });
  const [refreshing,setRefreshing]=useState(false);
  const [refreshError,setRefreshError]=useState('');
  const [refreshComplete,setRefreshComplete]=useState(false);
  const summary=query.data?.summary;
  const numbers=new Intl.NumberFormat();
  const summaryText=summary
    ?summary.articleCount===0
      ?t('uiExtra.searchUI.summaryEmpty')
      :t('uiExtra.searchUI.summaryText',{
        articles:numbers.format(summary.articleCount),
        chars:numbers.format(summary.wordCount),
        first:summary.firstDate||'—',
        last:summary.lastDate||'—'
      })
    :!ids.length||query.isPending
      ?t('uiExtra.searchUI.summaryLoading')
      :query.isError
        ?t('uiExtra.searchUI.summaryFailed')
        :t('uiExtra.searchUI.summaryMissing');
  async function refresh(){
    if(refreshing||!ids.length)return;
    setRefreshing(true);
    setRefreshError('');
    setRefreshComplete(false);
    try{
      for(const id of ids)await refreshScopeSearchSummary(id);
      await query.refetch();
      setRefreshComplete(true);
    }catch(error){
      setRefreshError(String(error?.message||error));
      await query.refetch().catch(()=>{});
    }finally{
      setRefreshing(false);
    }
  }
  return <div className="scope-search-total-bubble" role="status">
    <p className="scope-search-total-copy">{summaryText}</p>
    {managementMode?<button type="button" className="loc-button" disabled={refreshing||!ids.length}
      onClick={refresh}>{refreshing?t('uiExtra.searchUI.summaryRefreshing'):t('uiExtra.searchUI.summaryRefresh')}</button>:null}
    {managementMode&&refreshError?<small className="scope-error">{t('uiExtra.searchUI.summaryRefreshFailed',{error:refreshError})}</small>:null}
    {managementMode&&refreshComplete?<small>{t('uiExtra.searchUI.summaryRefreshed')}</small>:null}
  </div>;
}
