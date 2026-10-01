import LocApp from '../../loc/LocApp';
import {authorMetadata} from '../../seo/metadata';

export const metadata=authorMetadata({
  title:'作品來源與著作權｜Lucas Oscar Wang 政德',
  description:'說明 Lucas Oscar Wang 政德作品的來源、版本、署名與著作權原則。',
  path:'/lo3rwang/governance/'
});

export default function Page(){return <LocApp forcedView="governance" forcedScope="lo3rwang"/>;}
