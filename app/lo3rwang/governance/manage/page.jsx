import LocApp from '../../../loc/LocApp';
import {authorPageCopyMetadata} from '../../../seo/metadata';

export async function generateMetadata(){
  return authorPageCopyMetadata({  path:'/lo3rwang/governance/manage/',
  noIndex:true
});
}

export default function Page(){return <LocApp forcedView="manage" forcedScope="lo3rwang"/>;}
