import {RuneGroupPage} from '../../lrunes/RuneDirectoryPages';
import {groupParams} from '../../lrunes/rune-directory.mjs';

export function generateStaticParams(){return groupParams();}

export async function generateMetadata({params}){
  const {group}=await params;
  return {title:`第 ${group} 組符文｜月之符文`,description:`瀏覽月之符文第 ${group} 組的符文列表、基本語意、月相與相關說明。`};
}

export default async function Page({params}){
  const {group}=await params;
  return <RuneGroupPage groupId={group}/>;
}
