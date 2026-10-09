import LocApp from '../../loc/LocApp';
import {lunarunesPageCopyMetadata} from '../../seo/metadata';

export async function generateMetadata(){
  return lunarunesPageCopyMetadata({  path:'/governance/'
});
}

export default function Page(){return <LocApp forcedView="governance" forcedScope="lrunes"/>;}
