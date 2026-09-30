import {RuneDetailPage} from '../../../lrunes/RuneDirectoryPages';
import {runeParams} from '../../../lrunes/rune-directory.mjs';

export function generateStaticParams(){return runeParams();}

export async function generateMetadata({params}){
  const {group,rune}=await params;
  return {title:`第 ${group} 組第 ${rune} 枚符文｜月之符文`,description:`查看月之符文第 ${group} 組第 ${rune} 枚符文的基本語意、月相、關鍵詞與相關說明。`};
}

export default async function Page({params}){
  const {group,rune}=await params;
  return <RuneDetailPage groupId={group} runeId={rune}/>;
}
