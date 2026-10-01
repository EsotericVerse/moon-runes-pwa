import LocApp from '../../loc/LocApp';
import {authorMetadata} from '../../seo/metadata';

export const metadata=authorMetadata({
  title:'個人資料與作品治理｜Lucas Oscar Wang 政德',
  description:'說明 Lucas Oscar Wang 政德的個人資料、作品權利、來源標示與分析原則。',
  path:'/lo3rwang/governance/'
});

export default function Page(){return <LocApp forcedView="governance" forcedScope="lo3rwang"/>;}
