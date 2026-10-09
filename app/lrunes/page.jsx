import LocApp from '../loc/LocApp';
import JsonLd from '../seo/JsonLd';
import {lunarunesPageCopyMetadata,lunarunesWebSiteJsonLd} from '../seo/metadata';

export async function generateMetadata(){
  return lunarunesPageCopyMetadata({  path:'/'
});
}

export default function LunaRunesScopePage(){
  return <><JsonLd data={lunarunesWebSiteJsonLd()}/><LocApp forcedView="home" forcedScope="lrunes"/></>;
}
