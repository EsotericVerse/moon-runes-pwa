import LocApp from '../../loc/LocApp';
import {lunarunesPageCopyMetadata} from '../../seo/metadata';

export async function generateMetadata(){
  return lunarunesPageCopyMetadata({  path:'/search/',
  noIndex:true
});
}

export default function Page(){return <LocApp forcedView="search" forcedScope="lrunes"/>;}
