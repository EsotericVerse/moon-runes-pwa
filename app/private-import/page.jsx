import PrivateXArchiveWeb from '../loc/PrivateXArchiveWeb';
import {locMetadata} from '../seo/metadata';

export const metadata=locMetadata({
  title:'私人 X 備份匯入｜LOC',
  description:'僅瀏覽器本機處理 X／Twitter 備份；不寫入 LOC 公開資料庫。',
  path:'/private-import/',
  noIndex:true
});

export default function PrivateImportPage(){return <PrivateXArchiveWeb/>;}
