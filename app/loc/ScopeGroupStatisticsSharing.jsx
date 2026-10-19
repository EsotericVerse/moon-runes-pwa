'use client';
import UiText,{useUiText} from '../i18n/UiText';

import {useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {dbAuthRelation} from './db-client.mjs';
import {useAccount} from './use-account';
import {useSourceCategories} from './SourceCategoryEditor';

const RELATION='silver.scope_group_source_sharing';

// The checkbox applies to this member's *group* source categories, not to
// personal custom sources and not to the member's own statistics.
export default function ScopeGroupStatisticsSharing({scopeId}){
  const t=useUiText();
  const account=useAccount(),client=useQueryClient(),groups=useSourceCategories();
  const [busy,setBusy]=useState(''),[notice,setNotice]=useState('');
  const enabled=Boolean(scopeId&&account.canManageScopeSync(scopeId));
  const query=useQuery({
    queryKey:['scope-group-source-sharing',scopeId],
    enabled,
    queryFn:async()=>{
      const {data,error}=await dbAuthRelation(RELATION)
        .select('scope_id,category_code,share_enabled').eq('scope_id',scopeId);
      if(error)throw Error(error.message);
      return data||[];
    },
    staleTime:0,refetchOnWindowFocus:true
  });
  if(!enabled)return null;
  const permissions=new Map((query.data||[]).map(row=>[row.category_code,row.share_enabled!==false]));
  async function update(categoryCode,shareEnabled){
    setBusy(categoryCode);setNotice('');
    try{
      const {error}=await dbAuthRelation(RELATION).upsert({
        scope_id:scopeId,category_code:categoryCode,share_enabled:shareEnabled,
        updated_at:new Date().toISOString()
      },{onConflict:'scope_id,category_code'});
      if(error)throw Error(error.message);
      await query.refetch();
      await Promise.all([
        client.invalidateQueries({queryKey:['cross-statistics-sharing']}),
        client.invalidateQueries({queryKey:['loc-member-cross']}),
        client.invalidateQueries({queryKey:['loc-source-categories']})
      ]);
      setNotice(t('uiExtra.sharing.updated'));
    }catch(error){setNotice(String(error.message||error));}
    finally{setBusy('');}
  }
  return <section className="scope-inline-card" aria-label={t('uiExtra.sharing.aria')}>
    <h3><UiText id="uiExtra.sharing.title"/></h3>
    <p className="scope-status"><UiText id="uiExtra.sharing.guide"/></p>
    <div className="scope-management-records">
      {(groups.data?.categories||[]).filter(row=>row.enabled!==false).map(row=>
        <label key={row.category_code} className="scope-inline-card scope-setting-toggle">
          <input type="checkbox" checked={permissions.get(row.category_code)!==false}
            disabled={Boolean(busy)||query.isPending||Boolean(query.error)}
            onChange={event=>update(row.category_code,event.target.checked)}/>
          {row.display_name} · <UiText id="uiExtra.sharing.allow"/>
        </label>
      )}
    </div>
    {query.isPending||groups.isPending?<p className="scope-status"><UiText id="uiExtra.sharing.loading"/></p>:null}
    {query.error||groups.error?<p className="scope-status scope-error">{String(query.error?.message||groups.error?.message)}</p>:null}
    {notice?<p className="scope-status" role="status">{notice}</p>:null}
  </section>;
}
