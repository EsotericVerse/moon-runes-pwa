import LocApp from '../../loc/LocApp';
import {locMetadata} from '../../seo/metadata';
export const metadata=locMetadata({title:'文章管理｜LOC 月典',description:'LOC 文章管理與搜尋工作區。',path:'/admin/search/',noIndex:true});
export default function Page(){return <LocApp forcedView="searchManage" forcedScope="loc"/>;}
