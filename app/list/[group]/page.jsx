import {RuneGroupPage} from '../../lrunes/RuneDirectoryPages';
import {groupParams} from '../../lrunes/rune-directory.mjs';
import {lunarunesPageCopyMetadata} from '../../seo/metadata';

export function generateStaticParams(){return groupParams();}

export async function generateMetadata({params}){
  const {group}=await params;
  return lunarunesPageCopyMetadata({
    path:`/list/${group}/`
  });
}

export default async function Page({params}){
  const {group}=await params;
  return <RuneGroupPage groupId={group}/>;
}
