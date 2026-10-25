import LocApp from '../../loc/LocApp';
import {locMetadata} from '../../seo/metadata';

export const metadata=locMetadata({
  title:'作品分類｜LOC 月典',
  description:'管理 LOC 的全站作品分類，獨立於各 Scope 的個人分類。',
  path:'/culture/manage/',
  noIndex:true
});

export default function Page(){return <LocApp forcedView="sourceManage" forcedScope="loc"/>;}
