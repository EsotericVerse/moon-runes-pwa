'use client';

import {useMemo,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {updateNeonRows} from '../../loc/neon-repository';
import {selectSourceCatalog} from '../../loc/aggregate-query';
import {useNeonAccount} from '../../loc/use-neon-account';
import {FEATURE_LOADING_MESSAGE,featureDataErrorMessage} from '../feature-data-state.v2';

async function readSources(scopeId){
  if(scopeId!=='lo3rwang')return [];
  const result=await selectSourceCatalog({scopeId:'lo3rwang',limit:64,offset:0});
  return result.rows.map(row=>({
    source:row.source_name,
    count:Number(row.work_count)||0,
    first_created_at:row.first_created_at,
    last_created_at:row.last_created_at
  }));
}

async function renameSource(scopeId,from,to){
  const target=String(to||'').trim();
  if(!target)throw new Error('來源名稱不可空白。');
  if(target===from)return;

  if(scopeId==='lo3rwang'){
    await Promise.all([
      updateNeonRows('silver.lo3rwang_galaxy',{source_name:target},{filters:[{column:'source_name',operator:'eq',value:from}],returning:null}),
      updateNeonRows('silver.lo3rwang_galaxy_media',{source_name:target},{filters:[{column:'source_name',operator:'eq',value:from}],returning:null})
    ]);
  }
}

export default function SourceSettingsV2({scopeId='loc'}){
  const account=useNeonAccount();
  const queryClient=useQueryClient();
  const [editing,setEditing]=useState('');
  const [value,setValue]=useState('');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);

  const query=useQuery({
    queryKey:['source-settings',scopeId],
    queryFn:()=>readSources(scopeId),
    staleTime:30_000
  });

  const canEdit=useMemo(()=>{
    if(account.loading||account.permissionLoading||!account.user)return false;
    if(scopeId==='loc')return account.canManageGlobalSync();
    return account.canManageScopeSync(scopeId);
  },[scopeId,account.loading,account.permissionLoading,account.user,account.canManageGlobalSync,account.canManageScopeSync]);

  async function save(source){
    setBusy(true);setMessage('');
    try{
      await renameSource(scopeId,source,value);
      await Promise.all([
        queryClient.invalidateQueries({queryKey:['source-settings',scopeId]}),
        queryClient.invalidateQueries({queryKey:['statistics-ranking',scopeId]}),
        queryClient.invalidateQueries({queryKey:['statistics-ranking-all',scopeId]})
      ]);
      setEditing('');setValue('');setMessage('作品來源已更新。');
    }catch(error){setMessage(error?.message||'來源更新失敗。');}
    finally{setBusy(false);}
  }

  return <section className="scope-v2-inline-card">
    <h3>作品來源設定</h3>
    <p>統一管理目前 Scope 的作品來源名稱。需要合併時可直接批次改名，排行榜、統計圖與 Time River 會直接依相同來源名稱分組。</p>
    {query.isPending?<p className="scope-v2-status">{FEATURE_LOADING_MESSAGE}</p>:null}
    {query.error?<p className="scope-v2-status scope-v2-error">{featureDataErrorMessage(query.error)}</p>:null}
    {message?<p className="scope-v2-status">{message}</p>:null}
    <div className="scope-v2-context-list">
      {(query.data||[]).map(row=><article key={row.source} className="scope-v2-inline-card">
        {editing===row.source?<div className="scope-v2-stat-controls">
          <label><span>來源名稱</span><input className="scope-v2-search-input" value={value} onChange={event=>setValue(event.target.value)}/></label>
          <button type="button" disabled={busy} onClick={()=>save(row.source)}>儲存</button>
          <button type="button" disabled={busy} onClick={()=>{setEditing('');setValue('')}}>取消</button>
        </div>:<>
          <strong>{row.source}</strong>
          <span>{row.count.toLocaleString()} 筆</span>
          {canEdit?<button type="button" onClick={()=>{setEditing(row.source);setValue(row.source);setMessage('')}}>編輯</button>:null}
        </>}
      </article>)}
    </div>
    {!query.isPending&&!query.error&&!query.data?.length?<p className="scope-v2-status">目前沒有作品來源資料。</p>:null}
  </section>;
}
