'use client';

import {useState} from 'react';
import {useScopeRuntimeV2} from '../../use-scope-runtime.v2';
import {useNeonAccount} from '../../../loc/use-neon-account';
import CultureTimelineEditor from '../../features/CultureTimelineEditor';
import KeywordSettingsV2 from '../../features/KeywordSettingsV2';
import MediaMetaSettingsV2 from '../../features/MediaMetaSettingsV2';
import ThemeAdmin from '../../../loc/ThemeAdmin';

const TOOLS=Object.freeze([
  ['time','時期設定'],
  ['text','文字關鍵詞'],
  ['media','多媒體'],
  ['appearance','顯示設定']
]);

export default function LanguageSpaceManagementFace(){
  const {scopeId,scope}=useScopeRuntimeV2();
  const account=useNeonAccount();
  const [tool,setTool]=useState('time');
  const databaseScopeId=scope?.databaseScopeId||scopeId;

  if(account.loading||account.permissionLoading)return null;
  if(!account.canManage)return null;

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
