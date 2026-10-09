import LocApp from '../../loc/LocApp';
import {authorPageCopyMetadata} from '../../seo/metadata';

export async function generateMetadata(){
  return authorPageCopyMetadata({  path:'/lo3rwang/culture/'
});
}

export default function Page(){return <LocApp forcedView="culture" forcedScope="lo3rwang"/>;}
