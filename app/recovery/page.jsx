import RecoveryConsole from '../loc/RecoveryConsole';
export const metadata={
  title:'LOC 獨立復原控制',
  description:'管理員專用資料庫故障復原入口。',
  robots:{index:false,follow:false}
};
export default function RecoveryPage(){return <RecoveryConsole/>;}
