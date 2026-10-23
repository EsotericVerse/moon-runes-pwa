'use client';
import {useEffect,useRef,useState} from 'react';
import UiText from '../../../i18n/UiText';
import FieldText from '../../../i18n/FieldText';
import {registerDefaultSection} from '../../../i18n/ui-copy';
import {useUiSection} from '../../../i18n/ui-locale';
import adminViewZh from '../../../i18n/sections/uiExtra.adminView.zh_tw.js';
import {SQL_ENGINE_OPTIONS} from '../../providers/sql-engine-ports.mjs';
import {databaseProviderChoices,normalizeDatabaseLocation} from '../../providers/database-link.mjs';
import {dbAuthClient,dbAuthRelation} from '../../db-client.mjs';
import {DATABASE_ROUTING_CONFIG,resolveDatabaseRouting} from '../../providers/routing-config.mjs';
import {useEditDockForm} from '../../../modular/edit-dock';
registerDefaultSection('uiExtra.adminView',adminViewZh);
const STATIC_ROUTING=resolveDatabaseRouting();

export default function DatabaseTarget(){
  useUiSection('uiExtra.adminView');
  const [rows,setRows]=useState([]);
  const [selectedId,setSelectedId]=useState('');
  const [status,setStatus]=useState('');
  const [revision,setRevision]=useState(0);
  const [saving,setSaving]=useState(false);
  const [username,setUsername]=useState('');
  const [password,setPassword]=useState('');
  const [database,setDatabase]=useState('');
  const original=useRef({rows:[]});
  useEffect(()=>{
    let active=true;
    (async()=>{
      const {data,error}=await dbAuthRelation('silver.database_targets')
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
  },[revision]);
  const index=rows.findIndex(item=>item.target_id===selectedId);
  const row=index<0?null:rows[index];
  const isManaged=row?.target_id==='supabase-current'||row?.target_id==='neon-current';
  const cloud=row?.provider==='supabase'||row?.provider==='neon';
  const patch=(key,value)=>setRows(current=>current.map(item=>item.target_id===selectedId?{...item,[key]:value}:item));
  const pick=id=>{setSelectedId(id);setPassword('');setUsername('');setDatabase('');setStatus('');};
  const add=()=>{
    const id='target_'+crypto.randomUUID().replaceAll('-','').slice(0,20);
    setRows(current=>[...current,{target_id:id,provider:'custom',engine:'postgres',connection_alias:id,connection_mode:'direct',label:'新資料庫',project_id:'',project_url:'',region:'',selected:false,_new:true}]);
    pick(id);
  };
  async function remove(){
    if(!row||row.target_id===STATIC_ROUTING.primaryId||row.target_id===STATIC_ROUTING.backupId||row.selected){setStatus('無法刪除目前路由設定使用的資料庫。');return;}
    if(row._new){const next=rows.filter(item=>item.target_id!==row.target_id);setRows(next);pick(next[0]?.target_id||'');return;}
    const result=await dbAuthRelation('silver.database_targets').delete().eq('target_id',row.target_id);
    if(result.error){setStatus(result.error.message||'刪除資料庫目標失敗。');return;}
    setStatus('已刪除資料庫目標。');setRevision(v=>v+1);
  }
  async function save(){
    if(!row||saving)return false;
    setSaving(true);setStatus('');
    try{
      const location=normalizeDatabaseLocation(row.provider,row.project_url);
      const payload={
        target_id:row.target_id,
        engine:row.provider==='custom'?row.engine:'postgres',
        provider:row.provider,
        connection_alias:row.connection_alias,
        connection_mode:row.provider==='supabase'?(row.connection_mode||'pooler'):row.connection_mode,
        label:row.label||row.target_id,
        project_id:row.project_id||null,
        project_url:location.link,
        region:row.region||'',
        username,
        database,
        password,
        activate:false
      };
      const {error}=await dbAuthClient.schema('silver').rpc('save_database_target',{p_target:payload});
      if(error)throw new Error(error.message||'資料庫儲存或切換失敗。');
      setPassword('');setUsername('');setDatabase('');
      setStatus('連線資料已儲存；資料庫 Routing 仍由 repo config 決定。');
      setRevision(v=>v+1);
      return true;
    }catch(error){setStatus(error?.message||'儲存失敗，原目標維持不變。');return false;}
    finally{setSaving(false);}
  }
  const changedRows=rows.filter(item=>JSON.stringify(item)!==JSON.stringify(original.current.rows.find(saved=>saved.target_id===item.target_id)));
  const unsavedConnections=Boolean(username||password||database);
  useEditDockForm({
    isBusy:()=>saving,
    isDirty:()=>changedRows.length>0||unsavedConnections,
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
    <p className="scope-status">主要：{STATIC_ROUTING.primaryId}｜備援：{STATIC_ROUTING.backupId||'停用'}｜黑名單：{DATABASE_ROUTING_CONFIG.blacklist.length?DATABASE_ROUTING_CONFIG.blacklist.join('、'):'無'}</p>
    <p className="scope-status">資料來源由 repo 的 app/loc/providers/routing-config.mjs 決定，修改需重新部署。管理介面不再執行即時路由切換。</p>
    <h3><UiText id="uiExtra.adminView.savedDatabaseConnections"/></h3>
    <div className="admin-inline-select">
      <label><span><UiText id="uiExtra.adminView.savedDatabases"/></span><select className="admin-native-select" value={selectedId} onChange={event=>pick(event.target.value)}>
        {rows.map(item=><option key={item.target_id} value={item.target_id}>{item.label} {item.target_id===STATIC_ROUTING.primaryId?<UiText id="uiExtra.adminView.active"/>:null}</option>)}
      </select></label>
      <button type="button" className="loc-button" onClick={add}><UiText id="uiExtra.adminView.addDatabase"/></button>
    </div>
    {row?<div className="scope-management-fields">
      <h3 className="admin-workspace-section-heading"><UiText id="uiExtra.adminView.connectionDetails"/></h3>
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
      <label><span><UiText id="uiExtra.adminView.databaseName"/></span><input value={database} onChange={event=>setDatabase(event.target.value)} autoComplete="off" placeholder={row.provider==='supabase'?'postgres':row.provider==='neon'?'neondb':'Database name'}/></label>
      <label><span><UiText id="uiExtra.adminView.databaseUser"/></span><input value={username} onChange={event=>setUsername(event.target.value)} autoComplete="off" placeholder={row.provider==='supabase'?'postgres':'DB username'}/></label>
      <label><span><UiText id="uiExtra.adminView.databasePassword"/></span><input type="password" value={password} onChange={event=>setPassword(event.target.value)} autoComplete="new-password" placeholder="已有憑證可留空"/></label>
      <div className="scope-management-wide-field">
        <button type="button" className="loc-button primary" onClick={()=>save()} disabled={saving}><FieldText text={saving?'儲存中…':'儲存設定'}/></button>

        {!row.selected&&!isManaged?<button type="button" className="loc-button" onClick={remove} disabled={saving}><UiText id="uiExtra.adminView.delete"/></button>:null}
      </div>
    </div>:null}
    {status?<p className="scope-status" role="status">{status}</p>:null}
  </section>;
}
