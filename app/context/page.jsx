import {redirect} from 'next/navigation';
export const metadata={title:'關鍵詞設定｜統計｜LOC 月典'};
export default function ContextPage(){redirect('/statics?statTab=keywords');}
