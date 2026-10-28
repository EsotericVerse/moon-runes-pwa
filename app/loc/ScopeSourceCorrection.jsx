'use client';
import {useState} from 'react';
import {useAsyncResource} from './use-async-resource';
import {dbAuthClient,dbAuthRelation,readScopeCategoryTotals} from './db-client.mjs';
import {useAccount} from './use-account';
import {useEditDock,useEditDockForm} from '../modular/edit-dock';
import {defaultScopeData} from './scope-data';
export default function ScopeSourceCorrection({scopeId}){
  const account=useAccount();
  const dock=useEditDock();
  const allowed=Boolean(account.user&&dock?.active&&dock.scopeId===scopeId&&account.canManageScopeSync(scopeId));
  const [before,setBefore]=useState(''),[after,setAfter]=useState('');
  const [preview,setPreview]=useState(null),[busy,setBusy]=useState(false);
  const [notice,setNotice]=useState(''),[completed,setCompleted]=useState(0);
  const sourceLists=useAsyncResource({
    queryKey:['scope-source-rename-lists',scopeId],enabled:allowed,
    queryFn:async()=>{
      const lists=await Promise.all(['loc',scopeId].map(async id=>{
        const {data,error}=await dbAuthRelation('silver.'+id).select('txt_class').eq('id',id).maybeSingle();
        if(error)throw new Error(error.message);
        return Array.isArray(data?.txt_class)?data.txt_class:[];
      }));
      const totals=await readScopeCategoryTotals(scopeId);
      return [...new Set([...lists[0],...lists[1],...(totals||[]).filter(row=>row.kind==='source').map(row=>row.category)].filter(Boolean))];
    }
  });
  const dirty=Boolean(before.trim()&&after.trim()&&before.trim()!==after.trim());
  const signature=before+'\u0000'+after;
  const table=account.scopeDataFor(scopeId)?.galaxy||defaultScopeData(scopeId)?.galaxy;
  const clearPreview=()=>{setPreview(null);setNotice('');setCompleted(0);};
  async function inspect(){
    if(!allowed||busy||!dirty||!table)return;
    setBusy(true);setNotice('');
    try{
      const {count,error}=await dbAuthRelation(table).select('uid',{head:true,count:'exact'}).eq('source_name',before.trim());
      if(error)throw new Error(error.message);
      setPreview({signature,count:Number(count)||0});
      setNotice('符合的文章 '+Number(count||0).toLocaleString()+' 篇；只修改來源名稱，不修改文章內容。');
    }catch(e){setPreview(null);setNotice(String(e.message||e));}
    finally{setBusy(false);}
  }
  async function save(){
    if(!allowed||busy||!dirty||!preview||preview.signature!==signature||!preview.count)return false;
    setBusy(true);setNotice('正在更正來源名稱…');
    let changed=0;
    try{
      for(let batch=0;batch<1000;batch++){
        const {data,error}=await dbAuthClient.schema('silver').rpc('rename_scope_source_name_batch',{
          p_scope_id:scopeId,p_before:before.trim(),p_after:after.trim(),p_batch_size:1000
        });
        if(error)throw new Error(error.message);
        const count=Number(data)||0;
        if(count===0)break;
        changed+=count;setCompleted(changed);
        if(count<1000)break;
        if(batch===999)throw new Error('來源更正已達安全批次上限，請重新預覽剩餘筆數。');
      }
      setBefore('');setAfter('');setPreview(null);
      setNotice('已更正 '+changed.toLocaleString()+' 篇文章，UID 與原文未變更。');
      await sourceLists.refetch();
      return true;
    }catch(e){setPreview(null);setNotice('已處理 '+changed.toLocaleString()+' 篇；其餘尚未更正：'+String(e.message||e));return false;}
    finally{setBusy(false);}
  }
  useEditDockForm({save,isDirty:()=>dirty,isBusy:()=>busy,
    discard:()=>{setBefore('');setAfter('');setPreview(null);setNotice('');setCompleted(0);}});
  if(!allowed)return <p className="scope-status scope-error" role="alert">請先從 Scope 首頁進入編輯模式，並確認此 Scope 管理權限。</p>;
  return <section className="loc-card scope-feature-card">
    <h2>匯入來源更正</h2>
    <p className="scope-status">僅更正此 Scope 的 Galaxy source_name，大小寫精確區分。系統分類由 Group 管理；個人分類可自行定義。</p>
    {sourceLists.error?<p role="alert" className="scope-status scope-error">無法載入來源清單：{String(sourceLists.error.message||sourceLists.error)}</p>:null}
    <datalist id={'scope-source-names-'+scopeId}>{(sourceLists.data||[]).map(name=><option key={name} value={name}/>)}</datalist>
    <div className="scope-management-fields">
      <label>目前來源名稱<input type="text" list={'scope-source-names-'+scopeId} value={before} maxLength={80} disabled={busy}
        onChange={e=>{setBefore(e.target.value);clearPreview();}}/></label>
      <label>更正為<input type="text" list={'scope-source-names-'+scopeId} value={after} maxLength={80} disabled={busy}
        onChange={e=>{setAfter(e.target.value);clearPreview();}}/></label>
    </div>
    <button type="button" className="loc-button" onClick={inspect} disabled={busy||!dirty}>預覽更正筆數</button>
    {preview?.signature===signature?<p role="status" className="scope-status">精確符合 {preview.count.toLocaleString()} 篇。請使用首頁編輯功能列的「儲存」確認更正。</p>:null}
    {completed>0?<p role="status" className="scope-status">已更正 {completed.toLocaleString()} 篇。</p>:null}
    {notice?<p className="scope-status" role="status">{notice}</p>:null}
  </section>;
}
