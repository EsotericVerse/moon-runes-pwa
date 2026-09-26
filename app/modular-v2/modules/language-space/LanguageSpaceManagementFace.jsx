'use client';

import {useState} from 'react';
import {useScopeRuntimeV2} from '../../use-scope-runtime.v2';
import {useNeonAccount} from '../../../loc/use-neon-account';
import CultureTimelineEditor from '../../features/CultureTimelineEditor';
import KeywordSettingsV2 from '../../features/KeywordSettingsV2';
import MediaMetaSettingsV2 from '../../features/MediaMetaSettingsV2';
import ThemeAdmin from '../../../loc/ThemeAdmin';

const TOOLS=Object.freeze([
  ['time','時間'],
  ['text','文字關鍵詞'],
  ['media','多媒體'],
  ['appearance','顯示設定']
]);

export default function LanguageSpaceManagementFace(){
  const {scopeId,scope}=useScopeRuntimeV2();
  const account=useNeonAccount();
  const [tool,setTool]=useState('time');
  const databaseScopeId=scope?.databaseScopeId||scopeId;

  if(account.loading||account.permissionLoading)return <p className="scope-v2-status">正在確認管理權限…</p>;
  if(!account.user)return <section className="scope-v2-inline-card"><h3>管理</h3><p>登入後才能進入管理面。</p><button type="button" onClick={account.signIn}>登入</button></section>;
  if(!account.canManage)return <section className="scope-v2-inline-card"><h3>管理</h3><p>目前帳號沒有這個區域的管理權限。</p></section>;

  return <section className="language-space-management" aria-label="管理面">
    <div className="scope-v2-tabs" role="group" aria-label="管理項目">
      {TOOLS.map(([id,label])=><button key={id} type="button" aria-pressed={tool===id} onClick={()=>setTool(id)}>{label}</button>)}
    </div>
    {tool==='time'?<CultureTimelineEditor scopeId={scopeId}/>:null}
    {tool==='text'?<KeywordSettingsV2 scopeId={scopeId} databaseScopeId={databaseScopeId}/>:null}
    {tool==='media'?<MediaMetaSettingsV2 databaseScopeId={databaseScopeId}/>:null}
    {tool==='appearance'?<section className="scope-v2-inline-card"><h3>顯示設定</h3><ThemeAdmin/></section>:null}
  </section>;
}
