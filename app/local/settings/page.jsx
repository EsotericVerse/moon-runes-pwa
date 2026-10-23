import {Suspense} from 'react';
import GlobalSettings from '../../loc/GlobalSettings';
import {locMetadata} from '../../seo/metadata';

export const metadata=locMetadata({
  title:'設定｜本機',
  description:'設定預設首頁、我的最愛、帳號登入與每日符文。',
  path:'/local/settings/',
  noIndex:true
});

export default function LocalSettingsPage(){
  return <Suspense fallback={<p role="status">正在載入設定…</p>}>
    <GlobalSettings/>
  </Suspense>;
}
