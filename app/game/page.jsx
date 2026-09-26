import LocApp from '../loc/LocApp';

export const metadata={title:'遊戲｜LunaRunes｜LOC 月典'};

export default function GamePage(){
  return <LocApp forcedView="game" forcedScope="lunarunes"/>;
}
