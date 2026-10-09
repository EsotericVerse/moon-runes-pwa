import LocApp from '../../loc/LocApp';
import {lunarunesPageCopyMetadata} from '../../seo/metadata';

export async function generateMetadata(){
  return lunarunesPageCopyMetadata({  path:'/statics/'
});
}

export default function Page(){return <LocApp forcedView="statics" forcedScope="lrunes"/>;}
