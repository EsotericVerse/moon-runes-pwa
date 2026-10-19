'use client';
import {useEffect,useState} from 'react';
import UiText from '../../../i18n/UiText';
import FieldText from '../../../i18n/FieldText';
import {SQL_ENGINE_OPTIONS} from '../../providers/sql-engine-ports.mjs';
import {databaseProviderChoices,normalizeDatabaseLocation} from '../../providers/database-link.mjs';
import {dbAuthClient,dbAuthRelation} from '../../db-client.mjs';

export default function DatabaseTarget(){
  const [rows,setRows]=useState([]);
  const [selectedId,setSelectedId]=useState('');
  const [status,setStatus]=useState('');
  const [revision,setRevision]=useState(0);
  const [saving,setSaving]=useState(false);
  const [username,setUsername]=useState('');
  const [password,setPassword]=useState('');
  const [database,setDatabase]=useState('');
  const [primaryId,setPrimaryId]=useState('');
  const [backupId,setBackupId]=useState('');
  const [routingMode,setRoutingMode]=useState('single');
  useEffect(()=>{
    let active=true;
    (async()=>{
      const {data,error}=await dbAuthRelation('silver.database_targets')
        .select('target_id,provider,engine,connection_alias,connection_mode,label,project_id,project_url,region,selected,updated_at')
        .order('provider').order('target_id');
      if(!active)return;
      if(error){setStatus(error.message||'資料庫目標讀取失敗。');return;}
      const next=data||[];setRows(next);
      setPrimaryId(next.find(item=>item.selected)?.target_id||'');
      setBackupId(next.find(item=>item.backup_selected)?.target_id||'');
      setRoutingMode(next.find(item=>item.selected)?.routing_mode==='db-managed'?'db-managed':'single');
      setSelectedId(current=>next.some(item=>item.target_id===current)?current:(next.find(item=>item.selected)?.target_id||next[0]?.target_id||''));
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
    if(!row||row.selected||row.backup_selected){setStatus('無法刪除正在使用的資料庫。');return;}
    if(row._new){const next=rows.filter(item=>item.target_id!==row.target_id);setRows(next);pick(next[0]?.target_id||'');return;}
    const result=await dbAuthRelation('silver.database_targets').delete().eq('target_id',row.target_id);
    if(result.error){setStatus(result.error.message||'刪除資料庫目標失敗。');return;}
    setStatus('已刪除資料庫目標。');setRevision(v=>v+1);
  }
  async function saveRouting(){
    if(saving||!primaryId||backupId===primaryId){setStatus('主要與次要資料庫不可相同。');return}
    if(rows.some(item=>(item.target_id===primaryId||item.target_id===backupId)&&item._new)){
      setStatus('請先儲存新增的資料庫。');return;
    }
    setSaving(true);
    try{
      const {error}=await dbAuthClient.schema('silver').rpc('set_database_routing',{
        p_routing:{primary_id:primaryId,backup_id:backupId||null,mode:routingMode}
      });
      if(error)throw new Error(error.message||'資料庫路由設定失敗');
      window.dispatchEvent(new Event('loc-database-target-changed'));
      window.location.reload();
    }catch(error){setStatus(error?.message||'資料庫路由設定失敗')}
    finally{setSaving(false)}
  }
  async function save({switchTarget=false}={}){
    if(!row||saving)return;
    if(switchTarget&&!window.confirm(row.provider==='neon'?'確定切換至 Neon 唯讀備援？此模式不支援備援寫入，管理功能仍由 Supabase 控制。':'確定切換至這個資料庫？請確認目標已完成連線與權限設定。'))return;
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
        activate:switchTarget||row.selected===true
      };
      const {error}=await dbAuthClient.schema('silver').rpc('save_database_target',{p_target:payload});
      if(error)throw new Error(error.message||'資料庫儲存或切換失敗。');
      setPassword('');setUsername('');setDatabase('');
      setStatus(switchTarget?(row.provider==='neon'?'已切換至 Neon 唯讀備援，寫入仍由 Supabase 控制。':'已切換至所選資料庫。'):(row.selected?'目前使用中的資料庫設定已儲存。':'備用資料庫設定已儲存，主要資料庫維持不變。'));
      if(switchTarget){
        window.dispatchEvent(new Event('loc-database-target-changed'));
        window.location.reload(); // Prevent mixed cached rows after a global source switch.
      }
      setRevision(v=>v+1);
    }catch(error){setStatus(error?.message||'儲存失敗，原目標維持不變。');}
    finally{setSaving(false);}
  }
  return <section className="loc-card admin-workspace">
    <div className="scope-management-fields">
      <label><span><UiText id="uiExtra.adminView.primaryDatabase"/></span><select className="admin-native-select" value={primaryId} onChange={event=>setPrimaryId(event.target.value)}>
        {rows.filter(item=>!item._new).map(item=><option key={item.target_id} value={item.target_id}>{item.label}</option>)}
      </select></label>
      <label><span><UiText id="uiExtra.adminView.backupDatabase"/></span><select className="admin-native-select" value={backupId} onChange={event=>setBackupId(event.target.value)}>
        <option value=""><UiText id="uiExtra.adminView.none"/></option>
        {rows.filter(item=>!item._new&&item.target_id!==primaryId).map(item=><option key={item.target_id} value={item.target_id}>{item.label}</option>)}
      </select></label>
      <label><span><UiText id="uiExtra.adminView.routingMode"/></span><select className="admin-native-select" value={routingMode} onChange={event=>setRoutingMode(event.target.value)}>
        <option value="single"><UiText id="uiExtra.adminView.singleDatabase"/></option><option value="db-managed"><UiText id="uiExtra.adminView.dbManagedReplication"/></option>
      </select></label>
      <div className="scope-management-wide-field"><button type="button" className="loc-button primary" onClick={saveRouting} disabled={saving||!primaryId}><FieldText text={saving?'處理中…':'套用'}/></button></div>
    </div>
    <div className="admin-inline-select">
      <label><span><UiText id="uiExtra.adminView.savedDatabases"/></span><select className="admin-native-select" value={selectedId} onChange={event=>pick(event.target.value)}>
        {rows.map(item=><option key={item.target_id} value={item.target_id}>{item.label} {item.selected?<UiText id="uiExtra.adminView.active"/>:null}</option>)}
      </select></label>
      <button type="button" className="loc-button" onClick={add}><UiText id="uiExtra.adminView.addDatabase"/></button>
    </div>
    {row?<div className="scope-management-fields">
      <label><span>Type</span><select className="admin-native-select" value={row.engine||'postgres'} disabled={isManaged} onChange={event=>{
        const engine=event.target.value;
        setRows(current=>current.map(item=>item.target_id===selectedId?{...item,engine,provider:engine==='postgres'?item.provider:'custom',connection_mode:'direct'}:item));
      }}>
        {SQL_ENGINE_OPTIONS.map(option=><option key={option.value} value={option.value} disabled={option.value==='sqlite'}>{option.label}{option.value==='sqlite'?'（需本機／Gateway）':''}</option>)}
      </select></label>
      <label><span><UiText id="uiExtra.adminView.provider"/></span><select className="admin-native-select" value={row.provider} disabled={isManaged} onChange={event=>patch('provider',event.target.value)}>
        {databaseProviderChoices(row.engine).map(option=><option key={option.value} value={option.value}><FieldText text={option.label}/></option>)}
      </select></label>
      <label><span>{cloud?'Link / Project':'DB Host:Port'}</span><input value={row.project_url||''} onChange={event=>patch('project_url',event.target.value)}
        placeholder={row.provider==='supabase'?'Project ID 或 https://xxx.supabase.co':row.provider==='neon'?'Neon DB Endpoint 或 Data API URL':'db.example.com:5432'}/></label>
      <label><span><UiText id="uiExtra.adminView.regionArea"/></span><input value={row.region||''} onChange={event=>patch('region',event.target.value)} placeholder="例如 ap-southeast-1、eastus"/></label>
      <label><span>Database</span><input value={database} onChange={event=>setDatabase(event.target.value)} autoComplete="off" placeholder={row.provider==='supabase'?'postgres':row.provider==='neon'?'neondb':'Database name'}/></label>
      <label><span>User</span><input value={username} onChange={event=>setUsername(event.target.value)} autoComplete="off" placeholder={row.provider==='supabase'?'postgres':'DB username'}/></label>
      <label><span>Password</span><input type="password" value={password} onChange={event=>setPassword(event.target.value)} autoComplete="new-password" placeholder="已有憑證可留空"/></label>
      <div className="scope-management-wide-field">
        <button type="button" className="loc-button primary" onClick={()=>save()} disabled={saving}><FieldText text={saving?'儲存中…':'儲存設定'}/></button>
        {!row.selected?<button type="button" className="loc-button" onClick={()=>save({switchTarget:true})} disabled={saving}><FieldText text={saving?'處理中…':'切換至此資料庫'}/></button>:null}
        {!row.selected&&!isManaged?<button type="button" className="loc-button" onClick={remove} disabled={saving}><UiText id="uiExtra.adminView.delete"/></button>:null}
      </div>
    </div>:null}
    {status?<p className="scope-status" role="status">{status}</p>:null}
  </section>;
}
