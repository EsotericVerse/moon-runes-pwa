import PrivateArchiveWeb from '../loc/PrivateXArchiveWeb';
import {locMetadata} from '../seo/metadata';

export const metadata=locMetadata({
  title:'私人備份共用匯入｜LOC',
  description:'僅瀏覽器本機處理 X 與 Meta Facebook、Instagram、Messenger、Threads 等備份；不寫入公開資料庫。',
  path:'/private-import/',
  noIndex:true
});

export default function PrivateImportPage(){return <PrivateArchiveWeb/>;}
