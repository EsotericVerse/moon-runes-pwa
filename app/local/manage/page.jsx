import LocApp from '../../loc/LocApp';
import {locMetadata} from '../../seo/metadata';
export const metadata=locMetadata({title:'本機資料管理｜我的手機',description:'本機 SQLite 與私人檔案管理。',path:'/local/manage/',noIndex:true});
export default function Page(){return <LocApp forcedView="setting" forcedScope="local"/>;}
