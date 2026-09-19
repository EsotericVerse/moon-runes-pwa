import {redirect} from 'next/navigation';

export const metadata={title:'管理者首頁｜治理｜LOC 月典'};

export default function LegacyManagePage(){
  redirect('/governance/manage');
}
