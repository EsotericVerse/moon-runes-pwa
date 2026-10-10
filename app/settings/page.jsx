import GlobalSettings from '../loc/GlobalSettings';
import {locMetadata} from '../seo/metadata';

export const metadata=locMetadata({
  title:'設定｜LOC 月典',
  description:'設定預設首頁、我的最愛、帳號登入與每日符文。',
  path:'/settings/',
  noIndex:true
});

export default function SettingsPage(){return <GlobalSettings/>;}
