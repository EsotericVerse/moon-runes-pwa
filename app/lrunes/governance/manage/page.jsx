import LunaRunesManagement from '../../LunaRunesManagement';
import {lunarunesMetadata} from '../../../seo/metadata';

export const metadata=lunarunesMetadata({
  title:'管理｜月之符文',
  description:'月之符文的治理與資料管理入口。',
  path:'/governance/manage/',
  noIndex:true
});

export default function Page(){return <LunaRunesManagement/>;}
