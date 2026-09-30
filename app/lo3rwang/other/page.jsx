import AuthorHomeView from '../../loc/views/AuthorHomeView';
import {authorMetadata} from '../../seo/metadata';

export const metadata=authorMetadata({
  title:'其他介紹｜政德｜月典',
  description:'補充政德在創作、語言建築與個人資料整理之外的相關介紹。',
  path:'/lo3rwang/other/'
});

export default function AuthorOtherPage(){
  return <AuthorHomeView section="others"/>;
}
