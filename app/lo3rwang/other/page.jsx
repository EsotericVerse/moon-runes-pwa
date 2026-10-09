import AuthorHomeView from '../../loc/views/AuthorHomeView';
import {authorPageCopyMetadata} from '../../seo/metadata';

export async function generateMetadata(){
  return authorPageCopyMetadata({  path:'/lo3rwang/other/'
});
}

export default function AuthorOtherPage(){
  return <AuthorHomeView section="others"/>;
}
