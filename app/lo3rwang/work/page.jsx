import AuthorHomeView from '../../loc/views/AuthorHomeView';
import {authorPageCopyMetadata} from '../../seo/metadata';

export async function generateMetadata(){
  return authorPageCopyMetadata({  path:'/lo3rwang/work/'
});
}

export default function AuthorWorkPage(){
  return <AuthorHomeView section="work"/>;
}
