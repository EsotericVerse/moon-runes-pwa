import { redirect } from 'next/navigation';

export const metadata={title:'治理管理｜LOC 月典'};

export default function ManagementPage(){
  redirect('/admin');
}
