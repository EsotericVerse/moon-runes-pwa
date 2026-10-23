'use client';

import {useEffect,useRef,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {dbAuthRelation} from './db-client.mjs';
import {useEditDock} from '../modular/edit-dock';

const TABLE='silver.loc_keywords';
const SCOPE=/^[a-z][a-z0-9]{0,14}$/;
const HASH=/^[0-9a-f]{32}$/;
const EMPTY={scope_id:'lo3rwang',class_name:'',hash:''};
const keyOf=row=>JSON.stringify([row.scope_id,row.class_name]);

async function readRegistry(){
  const {data,error}=await dbAuthRelation(TABLE)
    .select('scope_id,class_name,hash')
    .order('scope_id',{ascending:true})
    .order('class_name',{ascending:true});
  if(error)throw Error(error.message||'關鍵詞管理資料讀取失敗');
  return data||[];
}

export default function LocKeywordManagement(){
  const queryClient=useQueryClient();
  const {data=[],isPending,error,refetch}=useQuery({
    queryKey:['loc-keywords-admin'],
    queryFn:readRegistry,
    staleTime:60_000
  });
  const editDock=useEditDock();
  const [original,setOriginal]=useState(null);
  const [draft,setDraft]=useState({...EMPTY});
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const saveRef=useRef(null);

  function choose(row){
    setOriginal(row?{scope_id:row.scope_id,class_name:row.class_name}:null);
    setDraft(row?{scope_id:row.scope_id,class_name:row.class_name,hash:row.hash}:{...EMPTY});
    setNotice('');
  }

  async function save(){
    if(busy)return false;
    const payload={
      scope_id:String(draft.scope_id||'').trim().toLowerCase(),
      class_name:String(draft.class_name||'').trim(),
      hash:String(draft.hash||'').trim().toLowerCase()
    };
    if(!SCOPE.test(payload.scope_id)||!payload.class_name||payload.class_name.length>120||!HASH.test(payload.hash)){
      setNotice('請確認 Scope ID、大群組名稱（1–120 字）及 32 位十六進位 Hash。');
      return false;
    }
    setBusy(true);setNotice('');
    try{
      const relation=dbAuthRelation(TABLE);
      const result=original
        ?await relation.update(payload)
          .eq('scope_id',original.scope_id)
          .eq('class_name',original.class_name)
          .select('scope_id,class_name,hash')
        :await relation.insert(payload).select('scope_id,class_name,hash');
      if(result.error)throw Error(result.error.message);
      if(!result.data?.length)throw Error('資料未更新，請檢查 Admin 權限及資料庫 RLS。');
      await queryClient.invalidateQueries({queryKey:['loc-keywords-admin']});
      choose(result.data[0]);
      setNotice('已儲存。');
      return true;
    }catch(e){
      const message=String(e?.message||e);
      setNotice(message);
      editDock?.setNotice(message);
      return false;
    }finally{setBusy(false);}
  }
  saveRef.current=save;

  useEffect(()=>{
    if(!editDock?.active||editDock.scopeId!=='loc')return;
    return editDock.register({save:()=>saveRef.current()});
  },[editDock?.active,editDock?.scopeId,editDock?.register]);

  async function remove(){
    if(!original||busy)return;
    if(!window.confirm('確定刪除此大群組的 LOC 管理紀錄？不會刪除 Scope 內的原始關鍵詞。'))return;
    setBusy(true);setNotice('');
    try{
      const {data:removed,error:deleteError}=await dbAuthRelation(TABLE).delete()
        .eq('scope_id',original.scope_id)
        .eq('class_name',original.class_name)
        .select('scope_id');
      if(deleteError)throw Error(deleteError.message);
      if(!removed?.length)throw Error('沒有刪除資料，請檢查 Admin 權限。');
      await queryClient.invalidateQueries({queryKey:['loc-keywords-admin']});
      choose(null);setNotice('已刪除管理紀錄。');
    }catch(e){setNotice(String(e?.message||e));}
    finally{setBusy(false);}
  }

  return <section className="loc-card admin-workspace">
    <h2>關鍵詞管理</h2>
    <p className="scope-status">LOC 管理大群組的 Scope、名稱和 Hash。Scope 內的關鍵詞明細維持原有管理方式。</p>
    {isPending?<p role="status">正在讀取關鍵詞大群組…</p>:null}
    {error?<p className="scope-status scope-error" role="alert">{String(error.message||error)}</p>:null}
    <div className="scope-stat-controls">
      <label><span>選擇大群組</span>
        <select className="scope-select" value={original?keyOf(original):''}
          disabled={busy} onChange={e=>choose(data.find(row=>keyOf(row)===e.target.value)||null)}>
          <option value="">新增管理紀錄</option>
          {data.map(row=><option key={keyOf(row)} value={keyOf(row)}>
            {row.scope_id} · {row.class_name}
          </option>)}
        </select>
      </label>
      <button type="button" className="loc-button" onClick={()=>refetch()} disabled={busy}>重新載入</button>
    </div>
    <div className="scope-stat-controls">
      <label><span>Scope ID</span>
        <input value={draft.scope_id} maxLength={15} disabled={busy}
          onChange={e=>setDraft(current=>({...current,scope_id:e.target.value}))}/>
      </label>
      <label><span>大群組名稱</span>
        <input value={draft.class_name} maxLength={120} disabled={busy}
          onChange={e=>setDraft(current=>({...current,class_name:e.target.value}))}/>
      </label>
      <label><span>Hash</span>
        <input value={draft.hash} maxLength={32} disabled={busy} spellCheck={false}
          onChange={e=>setDraft(current=>({...current,hash:e.target.value}))}/>
      </label>
    </div>
    <div className="scope-stat-controls">
      <button type="button" className="loc-button primary" disabled={busy} onClick={save}>
        {busy?'正在處理…':'儲存'}
      </button>
      <button type="button" className="loc-button" disabled={busy} onClick={()=>choose(null)}>取消／新增</button>
      {original?<button type="button" className="loc-button" disabled={busy} onClick={remove}>刪除管理紀錄</button>:null}
    </div>
    {notice?<p role="status" className="scope-status">{notice}</p>:null}
  </section>;
}
