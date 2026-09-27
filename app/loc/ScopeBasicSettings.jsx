'use client';

import {useEffect,useState} from 'react';
import {selectNeonRows,updateNeonRows} from './neon-repository';
import {useNeonAccount} from './use-neon-account';
import ScopeDefaultThemeSetting from './ScopeDefaultThemeSetting';

function target(scopeId){
  if(scopeId==='loc')return {record_type:'group',column:'group_id',id:'loc'};
  return {record_type:'scope',column:'scope_id',id:scopeId==='lunarunes'?'lrunes':scopeId};
}

export default function ScopeBasicSettings({scopeId}){
  const account=useNeonAccount();
  const [row,setRow]=useState(null);
  const [status,setStatus]=useState('');
  const canManage=account.canManageScopeSync(scopeId);
  const t=target(scopeId);

  useEffect(()=>{
    let live=true;
    if(!account.user||!canManage)return()=>{live=false};
    selectNeonRows('silver.manage',{
      columns:'record_id,label,scope_name,display_text,include_in_global_search,include_in_global_stats,include_in_time,default_theme_id',
      filters:[
        {column:'record_type',operator:'eq',value:t.record_type},
        {column:t.column,operator:'eq',value:t.id}
      ],
      limit:1
    }).then(({rows})=>{if(live)setRow(rows[0]||null)})
      .catch(error=>{if(live)setStatus(error?.message||'基本設定讀取失敗。')});
    return()=>{live=false};
  },[scopeId,account.user?.email,canManage]);

  if(!canManage)return null;
  if(!row)return <section className="scope-v2-inline-card"><h3>基本設定</h3><p>{status||'正在讀取…'}</p></section>;

  async function patch(values){
    const next={...values,updated_at:new Date().toISOString()};
    setRow(current=>({...current,...values}));
    setStatus('更新中…');
    try{
      await updateNeonRows('silver.manage',next,{filters:[
        {column:'record_id',operator:'eq',value:row.record_id}
      ],returning:'record_id,label,scope_name,display_text,include_in_global_search,include_in_global_stats,include_in_time,default_theme_id'});
      setStatus('已更新');
    }catch(error){
      setStatus(error?.message||'更新失敗。');
    }
  }

  function textBlur(field,event){
    const value=String(event.target.value||'').trim();
    if(value!==String(row[field]||''))patch({[field]:value||null});
  }

  return <section className="scope-v2-inline-card">
    <h3>基本設定</h3>
    <p>文字欄位離開欄位時儲存；開關與 Theme 即時更新，不需要確認。</p>

    <div className="scope-v2-stat-controls">
      <label><span>中文顯示名稱</span><input defaultValue={row.label||''} onBlur={event=>textBlur('label',event)}/></label>
      <label><span>英文名稱</span><input defaultValue={row.scope_name||''} onBlur={event=>textBlur('scope_name',event)}/></label>
    </div>
    <label><span>簡介</span><textarea rows={4} defaultValue={row.display_text||''} onBlur={event=>textBlur('display_text',event)}/></label>

    <div className="scope-v2-editor-options">
      <label><input type="checkbox" checked={row.include_in_global_search!==false} onChange={event=>patch({include_in_global_search:event.target.checked})}/>搜尋參加</label>
      <label><input type="checkbox" checked={row.include_in_global_stats!==false} onChange={event=>patch({include_in_global_stats:event.target.checked})}/>統計參加</label>
      <label><input type="checkbox" checked={row.include_in_time!==false} onChange={event=>patch({include_in_time:event.target.checked})}/>時間參加</label>
    </div>

    <ScopeDefaultThemeSetting scopeId={scopeId}/>
    {status?<p className="scope-v2-status">{status}</p>:null}
  </section>;
}
