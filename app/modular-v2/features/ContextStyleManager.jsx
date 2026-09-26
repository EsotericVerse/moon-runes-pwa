'use client';

import {useEffect,useMemo,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useNeonAccount} from '../../loc/use-neon-account';
import {deleteNeonRows,insertNeonRows,selectNeonRows,updateNeonRows} from '../../loc/neon-repository';

function normalizeStyleRows(rows=[]){
  return [...rows]
    .filter(row=>row.node_type==='style')
    .sort((a,b)=>String(a.parent_group_name||'').localeCompare(String(b.parent_group_name||''))||Number(a.order_no)-Number(b.order_no)||Number(a.style_no)-Number(b.style_no));
}

function groupStyles(rows=[]){
  const groups=new Map();
  for(const row of rows){
    const key=String(row.parent_group_name||'').trim()||'__ungrouped__';
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(row);
  }
  return [...groups.entries()].map(([key,styles])=>({
    key,
    name:key==='__ungrouped__'?'尚未設定大群組':key,
    styles
  }));
}

export default function ContextStyleManager({scopeId='lo3rwang'}){
  const account=useNeonAccount();
  const queryClient=useQueryClient();
  const [canEdit,setCanEdit]=useState(false);
  const [editing,setEditing]=useState(null);
  const [draft,setDraft]=useState({representative_name:'',parent_group_name:'',basic_principle:''});
  const [newStyle,setNewStyle]=useState({representative_name:'',parent_group_name:'',basic_principle:''});
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');

  useEffect(()=>{
    let active=true;
    setCanEdit(false);
    if(account.permissionLoading||!account.user||scopeId!=='lo3rwang')return()=>{active=false};
    Promise.all([account.canManageGlobal(),account.canManageScope(scopeId)])
      .then(values=>{if(active)setCanEdit(values.some(Boolean));})
      .catch(()=>{if(active)setCanEdit(false);});
    return()=>{active=false};
  },[account.user?.email,account.permissionLoading,account.canManageGlobal,account.canManageScope,scopeId]);

  const stylesQuery=useQuery({
    queryKey:['lo3rwang-style-groups',scopeId],
    enabled:scopeId==='lo3rwang',
    queryFn:async()=>{
      const result=await selectNeonRows('silver.lo3rwang_style',{
        columns:'style_no,node_type,representative_name,parent_group_name,basic_principle,order_no',
        filters:[{column:'node_type',operator:'eq',value:'style'}],
        orders:[{column:'order_no',ascending:true},{column:'style_no',ascending:true}],
        limit:5000
      });
      return normalizeStyleRows(result.rows);
    },
    staleTime:30000
  });

  const rows=stylesQuery.data||[];
  const groups=useMemo(()=>groupStyles(rows),[rows]);
  const refresh=()=>queryClient.invalidateQueries({queryKey:['lo3rwang-style-groups',scopeId]});
  const run=async action=>{
    setBusy(true);setMessage('');
    try{await action();await refresh();setMessage('風格設定已儲存。');}
    catch(error){setMessage(error?.message||'風格設定儲存失敗。');}
    finally{setBusy(false);}
  };

  const save=row=>run(async()=>{
    if(!canEdit)throw new Error('沒有修改風格設定的權限。');
    const name=String(draft.representative_name||'').trim();
    const parent=String(draft.parent_group_name||'').trim();
    if(!name)throw new Error('請填寫風格標籤。');
    if(!parent)throw new Error('請填寫大群組名稱。');
    await updateNeonRows('silver.lo3rwang_style',{
      representative_name:name,
      parent_group_name:parent,
      basic_principle:String(draft.basic_principle||'').trim()||null
    },{filters:[
      {column:'style_no',operator:'eq',value:Number(row.style_no)},
      {column:'node_type',operator:'eq',value:'style'}
    ]});
    setEditing(null);
  });

  const add=()=>run(async()=>{
    if(!canEdit)throw new Error('沒有新增風格設定的權限。');
    const name=String(newStyle.representative_name||'').trim();
    const parent=String(newStyle.parent_group_name||'').trim();
    if(!name)throw new Error('請填寫風格標籤。');
    if(!parent)throw new Error('請填寫大群組名稱。');
    const styleNo=Math.max(0,...rows.map(row=>Number(row.style_no)||0))+1;
    await insertNeonRows('silver.lo3rwang_style',[{
      style_no:styleNo,
      node_type:'style',
      representative_name:name,
      parent_group_name:parent,
      basic_principle:String(newStyle.basic_principle||'').trim()||null,
      keyword_group:null,
      keyword:null,
      order_no:styleNo
    }]);
    setNewStyle({representative_name:'',parent_group_name:'',basic_principle:''});
  });

  const remove=row=>run(async()=>{
    if(!canEdit)throw new Error('沒有刪除風格設定的權限。');
    await deleteNeonRows('silver.lo3rwang_style',{filters:[
      {column:'style_no',operator:'eq',value:Number(row.style_no)},
      {column:'node_type',operator:'eq',value:'style'}
    ],returning:null});
    setEditing(null);
  });

  if(scopeId!=='lo3rwang')return null;

  return <div className="scope-v2-style-settings">
    <section className="scope-v2-inline-card">
      <h3>風格群組</h3>
      <p>風格標籤就是小群組名稱；多個風格標籤可以歸入同一個大群組。這裡只管理分類名稱，不處理關鍵詞規則。</p>
      {stylesQuery.isPending?<p className="scope-v2-status">{FEATURE_LOADING_MESSAGE}</p>:null}
      {stylesQuery.error?<p className="scope-v2-status scope-v2-error">{stylesQuery.error.message}</p>:null}
      {!stylesQuery.isPending&&!stylesQuery.error&&!rows.length?<p className="scope-v2-status">目前沒有風格設定。</p>:null}
      {groups.map(group=><article className="scope-v2-inline-card" key={group.key}>
        <p className="loc-eyebrow">大群組</p>
        <h4>{group.name}</h4>
        <ul>
          {group.styles.map(row=><li key={row.style_no}>
            <strong>{row.representative_name||('未命名風格 '+row.style_no)}</strong>
            {row.basic_principle?<span> · {row.basic_principle}</span>:null}
            {canEdit?<button type="button" onClick={()=>{setEditing(Number(row.style_no));setDraft({
              representative_name:row.representative_name||'',
              parent_group_name:row.parent_group_name||'',
              basic_principle:row.basic_principle||''
            });}}>編輯</button>:null}
          </li>)}
        </ul>
      </article>)}
    </section>

    {canEdit?<section className="scope-v2-inline-card">
      <h4>新增風格標籤</h4>
      <form onSubmit={event=>{event.preventDefault();add();}}>
        <label><span>大群組名稱</span><input className="scope-v2-search-input" value={newStyle.parent_group_name} onChange={event=>setNewStyle(current=>({...current,parent_group_name:event.target.value}))} required/></label>
        <label><span>風格標籤</span><input className="scope-v2-search-input" value={newStyle.representative_name} onChange={event=>setNewStyle(current=>({...current,representative_name:event.target.value}))} required/></label>
        <label><span>基本說明</span><textarea className="scope-v2-search-input" value={newStyle.basic_principle} onChange={event=>setNewStyle(current=>({...current,basic_principle:event.target.value}))}/></label>
        <button type="submit" disabled={busy}>新增</button>
      </form>
    </section>:null}

    {canEdit&&editing!==null?(()=>{
      const row=rows.find(item=>Number(item.style_no)===Number(editing));
      if(!row)return null;
      return <section className="scope-v2-inline-card">
        <h4>編輯風格標籤</h4>
        <form onSubmit={event=>{event.preventDefault();save(row);}}>
          <label><span>大群組名稱</span><input className="scope-v2-search-input" value={draft.parent_group_name} onChange={event=>setDraft(current=>({...current,parent_group_name:event.target.value}))} required/></label>
          <label><span>風格標籤</span><input className="scope-v2-search-input" value={draft.representative_name} onChange={event=>setDraft(current=>({...current,representative_name:event.target.value}))} required/></label>
          <label><span>基本說明</span><textarea className="scope-v2-search-input" value={draft.basic_principle} onChange={event=>setDraft(current=>({...current,basic_principle:event.target.value}))}/></label>
          <div className="scope-v2-tabs">
            <button type="submit" disabled={busy}>儲存</button>
            <button type="button" onClick={()=>setEditing(null)}>取消</button>
            <button type="button" disabled={busy} onClick={()=>remove(row)}>刪除</button>
          </div>
        </form>
      </section>;
    })():null}
    {message?<p className="scope-v2-status" role="status">{message}</p>:null}
  </div>;
}
