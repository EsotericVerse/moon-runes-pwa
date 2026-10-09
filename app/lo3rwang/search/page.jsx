import LocApp from '../../loc/LocApp';
import {authorPageCopyMetadata} from '../../seo/metadata';

export async function generateMetadata(){
  return authorPageCopyMetadata({  path:'/lo3rwang/search/',
  noIndex:true
});
}

export default function Page(){return <LocApp forcedView="search" forcedScope="lo3rwang"/>;}
