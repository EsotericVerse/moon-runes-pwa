'use client';

import {useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {dbAuthRelation} from './db-client.mjs';
import {useAccount} from './use-account';
import {useSourceCategories} from './SourceCategoryEditor';

const RELATION='silver.scope_group_source_sharing';

// The checkbox applies to this member's *group* source categories, not to
// personal custom sources and not to the member's own statistics.
export default function ScopeGroupStatisticsSharing({scopeId}){
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
  const permissions=new Map((query.data||[]).map(row=>[row.category_code,row.share_enabled===true]));
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
        client.invalidateQueries({queryKey:['scope-density','loc']}),
        client.invalidateQueries({queryKey:['loc-member-cross']}),
        client.invalidateQueries({queryKey:['loc-source-categories']})
      ]);
      setNotice('已更新群組來源分類的統計開放設定。');
    }catch(error){setNotice(String(error.message||error));}
    finally{setBusy('');}
  }
  return <section className="scope-inline-card" aria-label="群組來源分類統計開放設定">
    <h3>群組來源分類 · 對外統計</h3>
    <p className="scope-status">各來源群組可單獨決定是否納入 LOC 合併統計及其他成員的交互統計。未勾選即不參與；不影響自己的統計、搜尋與文化頁。個人自訂來源分類不另外設定。</p>
    <div className="scope-management-records">
      {(groups.data?.categories||[]).filter(row=>row.enabled!==false).map(row=>
        <label key={row.category_code} className="scope-inline-card scope-setting-toggle">
          <input type="checkbox" checked={permissions.get(row.category_code)===true}
            disabled={Boolean(busy)||query.isPending||Boolean(query.error)}
            onChange={event=>update(row.category_code,event.target.checked)}/>
          {row.display_name} · 允許納入其他人的統計
        </label>
      )}
    </div>
    {query.isPending||groups.isPending?<p className="scope-status">讀取分類開放設定…</p>:null}
    {query.error||groups.error?<p className="scope-status scope-error">{String(query.error?.message||groups.error?.message)}</p>:null}
    {notice?<p className="scope-status" role="status">{notice}</p>:null}
  </section>;
}
