import LocApp from '../../loc/LocApp';
import {locMetadata} from '../../seo/metadata';

export const metadata=locMetadata({
  title:'本機資料管理｜我的手機',
  description:'管理此裝置的私人檔案及本機 SQLite 匯入。',
  path:'/local/governance/',
  noIndex:true
});

export default function Page(){return <LocApp forcedView="setting" forcedScope="local"/>;}
