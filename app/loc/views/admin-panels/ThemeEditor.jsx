'use client';
import {useEffect,useState} from 'react';
import UiText from '../../../i18n/UiText';
import FieldText from '../../../i18n/FieldText';
import {registerDefaultSection} from '../../../i18n/ui-copy';
import {useUiSection} from '../../../i18n/ui-locale';
import adminViewZh from '../../../i18n/sections/uiExtra.adminView.zh_tw.js';
import {THEME_SLOTS,THEME_TOKEN_KEYS} from '../../../modular/theme-registry';
import {mergeThemeSlot,THEME_DB_COLUMNS,themeColumnForToken,themeUiId,themeNumber} from '../../theme-data';
import {dbAuthRelation} from '../../db-client.mjs';
registerDefaultSection('uiExtra.adminView',adminViewZh);

export default function ThemeEditor(){
  useUiSection('uiExtra.adminView');
  const [rows,setRows]=useState([]);
  const [themeId,setThemeId]=useState(()=>{
    const current=typeof document==='undefined'?'':String(document.documentElement.dataset.themeId||'');
    return THEME_SLOTS.some(item=>item.id===current)?current:'theme-7';
  });
  const [draft,setDraft]=useState(null);
  const [status,setStatus]=useState('');
  const [revision,setRevision]=useState(0);

  useEffect(()=>{
    let active=true;
    (async()=>{
      const {data,error}=await dbAuthRelation('silver.loc_theme').select(THEME_DB_COLUMNS).order('theme_order');
      if(!active)return;
      if(error){setStatus(error.message||'Theme 讀取失敗。');return;}
      setRows((data||[]).map(row=>({
        ...row,
        theme_id:themeUiId(row.theme_id),
        theme_db_numeric:typeof row.theme_id==='number'
      })));
    })();
    return()=>{active=false};
  },[revision]);

  useEffect(()=>{
    const override=rows.find(row=>row.theme_id===themeId)||null;
    setDraft(mergeThemeSlot(themeId,override));
  },[themeId,rows]);

  const options=(rows.length?rows:THEME_SLOTS).map(theme=>({
    value:theme.theme_id||theme.id,
    label:theme.theme_name||theme.label||THEME_SLOTS.find(slot=>slot.id===(theme.theme_id||theme.id))?.label||theme.theme_id||theme.id
  }));
  const setToken=(key,value)=>setDraft(current=>({...current,tokens:{...current.tokens,[key]:value}}));

  async function save(){
    if(!draft)return;
    setStatus('');
    try{
      const existing=rows.find(row=>row.theme_id===themeId)||null;
      const payload={
        theme_id:existing?.theme_db_numeric?themeNumber(themeId):themeId,
        theme_name:String(draft.label||themeId).trim(),
        theme_order:Number(existing?.theme_order)||Number(String(themeId).split('-')[1])||1,
        scheme:draft.scheme==='dark'?'dark':'light',
        style_key:String(draft.styleKey||''),
        identity_color:String(draft.identityColor||'').trim(),
        ...Object.fromEntries(THEME_TOKEN_KEYS.map(key=>[
          themeColumnForToken(key),String(draft.tokens?.[key]||'').trim()
        ]))
      };
      const {error}=await dbAuthRelation('silver.loc_theme').upsert(payload,{onConflict:'theme_id'});
      if(error)throw new Error(error.message||'Theme 儲存失敗。');
      setStatus((draft.label||'主題')+' 已更新。');setRevision(v=>v+1);
    }catch(error){setStatus(error?.message||'Theme 儲存失敗。');}
  }

  return <section className="loc-card admin-workspace">
    <div className="admin-inline-select"><label><span><UiText id="uiExtra.adminView.editingTheme"/></span><select className="admin-native-select" value={themeId} onChange={e=>setThemeId(e.target.value||'theme-7')}>{options.map(option=><option value={option.value} key={option.value}><FieldText text={option.label}/></option>)}</select></label></div>
    {draft?<>
      <div className="scope-management-fields">
        <label><span><UiText id="uiExtra.adminView.name"/></span><input value={draft.label||''} onChange={e=>setDraft(v=>({...v,label:e.target.value}))}/></label>
        <label><span>Scheme</span><select className="admin-native-select" value={draft.scheme||'light'} onChange={e=>setDraft(v=>({...v,scheme:e.target.value||'light'}))}><option value="light">light</option><option value="dark">dark</option></select></label>
        <label><span>Group</span><input value={draft.label||''} disabled title="Group 使用主題名稱，不重複儲存"/></label>
        <label><span>Style Key</span><input value={draft.styleKey||''} onChange={e=>setDraft(v=>({...v,styleKey:e.target.value}))}/></label>
        <label><span>Identity Color</span><input value={draft.identityColor||''} onChange={e=>setDraft(v=>({...v,identityColor:e.target.value}))}/></label>
      </div>
      <section className="scope-inline-card admin-theme-local-preview" aria-label="主題局部預覽" style={{background:draft.tokens?.['--loc-bg']||'transparent',color:draft.tokens?.['--loc-text']||'inherit',borderColor:draft.tokens?.['--loc-line']||'currentColor'}}>
        <strong>局部預覽：{draft.label||themeId}</strong>
        <p>這裡只預覽目前草稿，不會套用到網站。按下儲存只會更新主題資料，不會改變當前選用的主題。</p>
        <span style={{color:draft.tokens?.['--loc-accent']||'inherit'}}>主題強調文字</span>
      </section>
      <div className="admin-theme-token-grid">
        {THEME_TOKEN_KEYS.map(key=>{
          const value=String(draft.tokens?.[key]||'');
          const color=/^#[0-9a-f]{6}$/i.test(value);
          return <label key={key}><span>{key}</span><div className="admin-theme-token-input">{color?<input type="color" value={value} onChange={e=>setToken(key,e.target.value)}/>:null}<input value={value} onChange={e=>setToken(key,e.target.value)}/></div></label>;
        })}
      </div>
      <button type="button" className="loc-button primary" onClick={save}><UiText id="uiExtra.adminView.saveThemeSettings"/></button>
    </>:null}
    {status?<p className="scope-status" role="status">{status}</p>:null}
  </section>;
}
