import LocApp from '../../../loc/LocApp';
import {lunarunesPageCopyMetadata} from '../../../seo/metadata';

export async function generateMetadata(){
  return lunarunesPageCopyMetadata({  path:'/governance/manage/',
  noIndex:true
});
}

export default function Page(){return <LocApp forcedView="manage" forcedScope="lrunes"/>;}
