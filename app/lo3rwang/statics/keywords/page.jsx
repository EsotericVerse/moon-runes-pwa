import LocApp from '../../../loc/LocApp';
import {authorPageCopyMetadata} from '../../../seo/metadata';

export async function generateMetadata(){
  return authorPageCopyMetadata({  path:'/lo3rwang/statics/keywords/'
});
}
export default function Page(){return <LocApp forcedView="keywords" forcedScope="lo3rwang"/>;}
