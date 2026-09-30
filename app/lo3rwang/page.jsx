import LocApp from '../loc/LocApp';
import JsonLd from '../seo/JsonLd';
import {authorMetadata,authorProfileJsonLd} from '../seo/metadata';

export const metadata=authorMetadata({
  title:'政德｜LOC 月典',
  description:'政德的作者頁，整理創作、工作方向、語言建築與 LOC 月典相關介紹。',
  path:'/lo3rwang/'
});

export default function Lo3rwangScopePage(){
  return <><JsonLd data={authorProfileJsonLd()}/><LocApp forcedView="home" forcedScope="lo3rwang"/></>;
}
