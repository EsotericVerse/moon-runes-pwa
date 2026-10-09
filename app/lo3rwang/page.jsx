import LocApp from '../loc/LocApp';
import JsonLd from '../seo/JsonLd';
import {authorPageCopyMetadata,authorProfileJsonLd} from '../seo/metadata';

export async function generateMetadata(){
  return authorPageCopyMetadata({  path:'/lo3rwang/'
});
}

export default function Lo3rwangScopePage(){
  return <><JsonLd data={authorProfileJsonLd()}/><LocApp forcedView="home" forcedScope="lo3rwang"/></>;
}
