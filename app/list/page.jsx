import {RuneDirectoryRoot} from '../lrunes/RuneDirectoryPages';
import {lunarunesPageCopyMetadata} from '../seo/metadata';

export async function generateMetadata(){
  return lunarunesPageCopyMetadata({  path:'/list/'
});
}

export default function Page(){return <RuneDirectoryRoot/>;}
