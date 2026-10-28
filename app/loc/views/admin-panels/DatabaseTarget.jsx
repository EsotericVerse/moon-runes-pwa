'use client';
import {useEffect,useRef,useState} from 'react';
import Select from 'react-select';
import UiText from '../../../i18n/UiText';
import FieldText from '../../../i18n/FieldText';
import {registerDefaultSection} from '../../../i18n/ui-copy';
import {useUiSection} from '../../../i18n/ui-locale';
import adminViewZh from '../../../i18n/sections/uiExtra.adminView.zh_tw.js';
import {SQL_ENGINE_OPTIONS} from '../../providers/sql-engine-ports.mjs';
import {databaseProviderChoices,normalizeDatabaseLocation} from '../../providers/database-link.mjs';
import {dbAuthRelation} from '../../db-client.mjs';
import {resolveDatabaseRouting} from '../../providers/routing-config.mjs';
import {scopedDatabaseListRelation} from '../../providers/database-list-relation.mjs';
import {useEditDockForm} from '../../../modular/edit-dock';
registerDefaultSection('uiExtra.adminView',adminViewZh);
const STATIC_ROUTING=resolveDatabaseRouting();

export default function DatabaseTarget({scopeGroup}){
  const listRelation=scopedDatabaseListRelation(scopeGroup);
  useUiSection('uiExtra.adminView');
  const [rows,setRows]=useState([]);
  const [selectedId,setSelectedId]=useState('');
  const [status,setStatus]=useState('');
  const [revision,setRevision]=useState(0);
  const [saving,setSaving]=useState(false);
  const original=useRef({rows:[]});
  useEffect(()=>{
    let active=true;
    (async()=>{
      const {data,error}=await dbAuthRelation(listRelation)
        .select('target_id,provider,engine,connection_alias,connection_mode,label,project_id,project_url,region,selected,updated_at')
        .order('provider').order('target_id');
      if(!active)return;
      if(error){setStatus(error.message||'資料庫目標讀取失敗。');return;}
      const next=data||[];
      original.current={rows:next};
      setRows(next);
      setSelectedId(current=>next.some(item=>item.target_id===current)?current:
        (next.find(item=>item.target_id===STATIC_ROUTING.primaryId)?.target_id||next[0]?.target_id||''));
    })();
    return()=>{active=false};
  },[revision,listRelation]);
  const index=rows.findIndex(item=>item.target_id===selectedId);
  const row=index<0?null:rows[index];
  const isManaged=row?.target_id==='supabase-current'||row?.target_id==='neon-current';
  const protectedTarget=Boolean(row&&(row.target_id===STATIC_ROUTING.primaryId||
    row.target_id===STATIC_ROUTING.backupId||row.selected));
  const patch=(key,value)=>setRows(current=>current.map(item=>item.target_id===selectedId?{...item,[key]:value}:item));
  const savedRow=item=>original.current.rows.find(saved=>saved.target_id===item.target_id);
  const rowDirty=item=>Boolean(item&&JSON.stringify(item)!==JSON.stringify(savedRow(item)));
  const discardCurrent=()=>{
    if(!rowDirty(row))return true;
    if(!window.confirm('目前資料庫有尚未儲存的修改，確定放棄嗎？'))return false;
    setRows(current=>row._new?current.filter(item=>item.target_id!==selectedId):
      current.map(item=>item.target_id===selectedId?savedRow(item)||item:item));
    return true;
  };
  const pick=id=>{
    if(id===selectedId||saving)return;
    if(!discardCurrent())return;
    setSelectedId(id);setStatus('');
  };
  const add=()=>{
    if(saving||!discardCurrent())return;
    const id='target_'+crypto.randomUUID().replaceAll('-','').slice(0,20);
    setRows(current=>[...current,{target_id:id,provider:'custom',engine:'postgres',connection_alias:id,connection_mode:'direct',label:'新資料庫',project_id:'',project_url:'',region:'',selected:false,_new:true}]);
    setSelectedId(id);setStatus('');
  };
  async function remove(){
    if(!row||saving)return;
    if(protectedTarget){setStatus('主要或備援資料庫不可在仍被系統使用時刪除。');return;}
    if(!window.confirm('確定刪除資料庫「'+(row.label||row.target_id)+'」？'))return;
    if(row._new){
      setRows(current=>current.filter(item=>item.target_id!==row.target_id));
      setSelectedId(rows.find(item=>item.target_id!==row.target_id)?.target_id||'');
      setStatus('已取消新增資料庫。');
      return;
    }
    setSaving(true);setStatus('');
    try{
      const {error}=await dbAuthRelation(listRelation).delete().eq('target_id',row.target_id);
      if(error)throw new Error(error.message||'刪除資料庫目標失敗。');
      setStatus('已刪除資料庫目標。');setRevision(v=>v+1);
    }catch(error){setStatus(error?.message||'刪除失敗。');}
    finally{setSaving(false);}
  }
  async function save(){
    if(!row||saving)return false;
    if(!rowDirty(row))return true;
    setSaving(true);setStatus('');
    try{
      const name=String(row.label||'').trim();
      if(!name||name.length>120)throw new Error('請輸入 1–120 字的資料庫名稱。');
      const previous=savedRow(row);
      const location=!row._new&&previous?.project_url===row.project_url&&previous?.provider===row.provider
        ?{link:row.project_url}
        :normalizeDatabaseLocation(row.provider,row.project_url);
      // Only non-sensitive target metadata belongs here. The former
      // save_database_target endpoint is absent; admin RLS secures writes.
      const payload={
        engine:row.provider==='custom'?row.engine:'postgres',
        provider:row.provider,
        connection_alias:row.connection_alias,
        connection_mode:row.provider==='supabase'?(row.connection_mode||'pooler'):row.connection_mode,
        label:name,
        project_id:row.project_id||null,
        project_url:location.link,
        region:row.region||'',
        updated_at:new Date().toISOString()
      };
      const relation=dbAuthRelation(listRelation);
      const changes=row._new?payload:Object.fromEntries(
        Object.entries(payload).filter(([key])=>key==='updated_at'||row[key]!==previous?.[key])
      );
      const {error}=row._new
        ?await relation.insert({...changes,target_id:row.target_id,selected:false,
            backup_selected:false,routing_mode:'single'})
        :await relation.update(changes).eq('target_id',row.target_id);
      if(error)throw new Error(error.message||'資料庫目標資訊儲存失敗。');
      setStatus('資料庫設定已儲存。');
      setRevision(v=>v+1);
      return true;
    }catch(error){setStatus(error?.message||'儲存失敗，原目標維持不變。');return false;}
    finally{setSaving(false);}
  }
  const changedRows=rows.filter(item=>JSON.stringify(item)!==JSON.stringify(original.current.rows.find(saved=>saved.target_id===item.target_id)));
  useEditDockForm({
    isBusy:()=>saving,
    isDirty:()=>changedRows.length>0,
    save:async()=>{
      if(changedRows.some(item=>item.target_id!==selectedId)){
        setStatus('其他資料庫仍有未儲存資料，請逐筆儲存後再切換分區。');
        return false;
      }
      return save();
    }
  });
  return <section className="loc-card admin-workspace">
    <h2><UiText id="uiExtra.adminView.databaseRouting"/></h2>
    <p className="scope-status">主要：{STATIC_ROUTING.primaryId}｜備援：{STATIC_ROUTING.backupId||'停用'}</p>
    <h3><UiText id="uiExtra.adminView.savedDatabaseConnections"/></h3>
    <div className="admin-inline-select">
      <div>
        <label htmlFor="admin-database-target-select"><UiText id="uiExtra.adminView.savedDatabases"/></label>
        <Select
          inputId="admin-database-target-select"
          instanceId="admin-database-target-select"
          unstyled
          className="loc-settings-select"
          classNamePrefix="loc-settings-select"
          isSearchable={rows.length>5}
          isClearable={false}
          isDisabled={saving}
          options={rows.map(item=>({value:item.target_id,label:item.label||item.target_id}))}
          value={rows.map(item=>({value:item.target_id,label:item.label||item.target_id})).find(option=>option.value===selectedId)||null}
          onChange={option=>{if(option)pick(option.value);}}
        />
      </div>
      <button type="button" className="loc-button" onClick={add}><UiText id="uiExtra.adminView.addDatabase"/></button>
    </div>
    {row?<div className="scope-management-fields">
      <h3 className="admin-workspace-section-heading"><UiText id="uiExtra.adminView.connectionDetails"/></h3>
      <label><span><UiText id="uiExtra.adminView.databaseName"/></span>
        <input value={row.label||''} maxLength={120} onChange={event=>patch('label',event.target.value)}/></label>
      <label><span><UiText id="uiExtra.adminView.databaseType"/></span><select className="admin-native-select" value={row.engine||'postgres'} disabled={isManaged} onChange={event=>{
        const engine=event.target.value;
        setRows(current=>current.map(item=>item.target_id===selectedId?{...item,engine,provider:engine==='postgres'?item.provider:'custom',connection_mode:'direct'}:item));
      }}>
        {SQL_ENGINE_OPTIONS.map(option=><option key={option.value} value={option.value} disabled={option.value==='sqlite'}>{option.label}{option.value==='sqlite'?'（需本機／Gateway）':''}</option>)}
      </select></label>
      <label><span><UiText id="uiExtra.adminView.provider"/></span><select className="admin-native-select" value={row.provider} disabled={isManaged} onChange={event=>patch('provider',event.target.value)}>
        {databaseProviderChoices(row.engine).map(option=><option key={option.value} value={option.value}><FieldText text={option.label}/></option>)}
      </select></label>
      <label><span><UiText id="uiExtra.adminView.databaseEndpoint"/></span><input value={row.project_url||''} onChange={event=>patch('project_url',event.target.value)}
        placeholder={row.provider==='supabase'?'Project ID 或 https://xxx.supabase.co':row.provider==='neon'?'Neon DB Endpoint 或 Data API URL':'db.example.com:5432'}/></label>
      <label><span><UiText id="uiExtra.adminView.regionArea"/></span><input value={row.region||''} onChange={event=>patch('region',event.target.value)} placeholder="例如 ap-southeast-1、eastus"/></label>
      <div className="scope-management-wide-field">
        <button type="button" className="loc-button" onClick={remove} disabled={saving||protectedTarget}
          title={protectedTarget?'主要或備援資料庫使用中，不可刪除':undefined}><UiText id="uiExtra.adminView.delete"/></button>
      </div>
    </div>:null}
    {status?<p className="scope-status" role="status">{status}</p>:null}
  </section>;
}
