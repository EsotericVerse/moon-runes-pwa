'use client';

import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {dbAuthRelation,insertRows,updateRows} from './db-client.mjs';
import {useAccount} from './use-account';

const TABLE='silver.scope_content_types';
export const validContentTypeCode=code=>/^[a-z0-9][a-z0-9_-]{0,63}$/.test(String(code||''));

export function useImportContentTypes(scopeId){
  const account=useAccount();
  const allowed=account.canManageScopeSync(scopeId);
  const query=useQuery({
    queryKey:['scope-import-content-types',scopeId],
    enabled:allowed&&Boolean(scopeId),
    queryFn:async()=>{
      const {data,error}=await dbAuthRelation(TABLE)
        .select('scope_id,type_code,display_name,enabled')
        .eq('scope_id',scopeId).order('type_code');
      if(error)throw new Error(error.message||'作品類型清單讀取失敗');
      return data||[];
    },
    staleTime:60_000
  });
  return {...query,types:query.data||[]};
}

export default function ImportContentTypeCatalog({scopeId,catalog,busy=false}){
  const account=useAccount();
  const [code,setCode]=useState('');
  const [name,setName]=useState('');
  const [labels,setLabels]=useState({});
  const [saving,setSaving]=useState(false);
  const [status,setStatus]=useState('');
  if(!account.canManageScopeSync(scopeId))return null;
  async function addType(event){
    event.preventDefault();
    const key=code.trim().toLowerCase();
    const label=name.trim()||key;
    if(!validContentTypeCode(key)){setStatus('分類代碼須為 1～64 位小寫英數、底線或連字號。');return;}
    if(!label||label.length>80){setStatus('分類名稱須為 1～80 字。');return;}
    if(catalog.types.some(row=>row.type_code===key)){setStatus('這個分類代碼已存在，可以直接選用或啟用。');return;}
    setSaving(true);setStatus('');
    try{
      await insertRows(TABLE,[{scope_id:scopeId,type_code:key,display_name:label,enabled:true}]);
      await catalog.refetch();
      setCode('');setName('');setStatus('已新增作品類型：'+label);
    }catch(error){setStatus('新增失敗：'+(error?.message||error));}
    finally{setSaving(false);}
  }
  async function toggle(row){
    setSaving(true);setStatus('');
    try{
      await updateRows(TABLE,{enabled:!row.enabled},{
        filters:[{column:'scope_id',operator:'eq',value:scopeId},{column:'type_code',operator:'eq',value:row.type_code}]
      });
      await catalog.refetch();
    }catch(error){setStatus('更新失敗：'+(error?.message||error));}
    finally{setSaving(false);}
  }
  async function rename(row){
    const display=String(labels[row.type_code]??row.display_name).trim();
    if(!display||display.length>80){setStatus('顯示名稱須為 1～80 字。');return;}
    setSaving(true);setStatus('');
    try{
      await updateRows(TABLE,{display_name:display},{
        filters:[{column:'scope_id',operator:'eq',value:scopeId},{column:'type_code',operator:'eq',value:row.type_code}]
      });
      await catalog.refetch();
      setLabels(values=>({...values,[row.type_code]:display}));
    }catch(error){setStatus('更新名稱失敗：'+(error?.message||error));}
    finally{setSaving(false);}
  }
  return <section className="scope-inline-card scope-import-content-types">
    <h3>作品類型管理</h3>
    {catalog.isPending?<p className="scope-status">讀取作品類型…</p>:null}
    {catalog.error?<p className="scope-status scope-error">{String(catalog.error.message||catalog.error)}</p>:null}
    <form className="scope-stat-controls" onSubmit={addType}>
      <label>分類代碼
        <input value={code} maxLength={64} autoCapitalize="none" placeholder="例如 essay" onChange={e=>setCode(e.target.value)} disabled={saving||busy}/>
      </label>
      <label>顯示名稱
        <input value={name} maxLength={80} placeholder="例如 散文" onChange={e=>setName(e.target.value)} disabled={saving||busy}/>
      </label>
      <button type="submit" className="loc-button" disabled={saving||busy||!code.trim()}>新增作品類型</button>
    </form>
    {catalog.types.length?<div className="scope-management-records">
      {catalog.types.map(row=><div key={row.type_code} className="scope-inline-card">
        <label>顯示名稱
          <input value={labels[row.type_code]??row.display_name} maxLength={80}
            onChange={event=>setLabels(values=>({...values,[row.type_code]:event.target.value}))}
            disabled={saving||busy}/>
        </label>
        <span>{row.type_code}</span>
        <div className="scope-tabs">
          <button type="button" className="loc-button" disabled={saving||busy||!String(labels[row.type_code]??row.display_name).trim()}
            onClick={()=>rename(row)}>儲存名稱</button>
          <button type="button" className="loc-button" disabled={saving||busy}
            onClick={()=>toggle(row)}>{row.enabled?'停用':'啟用'}</button>
        </div>
      </div>)}
    </div>:null}
    {status?<p className="scope-status" role="status">{status}</p>:null}
  </section>;
}
