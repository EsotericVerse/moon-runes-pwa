import GlobalSettings from '../../loc/GlobalSettings';
import {locMetadata} from '../../seo/metadata';

export const metadata=locMetadata({
  title:'設定｜本機',
  description:'設定本機私人匯入資料，供首頁、文化、統計與搜尋使用。',
  path:'/local/settings/',
  noIndex:true
});

export default function LocalSettingsPage(){
  return <GlobalSettings initialSection="files" localScopeOnly/>;
}
