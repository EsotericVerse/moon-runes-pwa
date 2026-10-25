import LocApp from '../../loc/LocApp';
import {locMetadata} from '../../seo/metadata';

export const metadata=locMetadata({
  title:'人員作品管理｜LOC 月典',
  description:'管理 LOC 的人員與作品群組分類，並維護保留名稱；Scope 的作品自訂分類保持獨立。',
  path:'/culture/manage/',
  noIndex:true
});

export default function Page(){return <LocApp forcedView="sourceManage" forcedScope="loc"/>;}
