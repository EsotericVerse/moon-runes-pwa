import LocApp from '../../loc/LocApp';
import {authorPageCopyMetadata} from '../../seo/metadata';

export async function generateMetadata(){
  return authorPageCopyMetadata({  path:'/lo3rwang/governance/'
});
}

export default function Page(){return <LocApp forcedView="governance" forcedScope="lo3rwang"/>;}
