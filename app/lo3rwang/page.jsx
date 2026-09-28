import LocApp from '../loc/LocApp';

export const metadata={
  title:'政德｜LOC 月典',
  description:'lo3rwang 作者頁，整合於 LOC 月典。'
};

export default function Lo3rwangScopePage(){
  return <LocApp forcedView="home" forcedScope="lo3rwang"/>;
}
