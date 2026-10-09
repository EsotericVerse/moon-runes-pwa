import LocApp from '../loc/LocApp';
import {lunarunesPageCopyMetadata} from '../seo/metadata';

export async function generateMetadata(){
  return lunarunesPageCopyMetadata({  path:'/game/'
});
}

export default function GamePage(){
  return <LocApp forcedView="game" forcedScope="lrunes"/>;
}
