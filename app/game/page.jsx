import LocApp from '../loc/LocApp';
import {lunarunesMetadata} from '../seo/metadata';

export const metadata=lunarunesMetadata({
  title:'月之符文遊戲｜符文卡牌與事件',
  description:'以月之符文、事件卡、八種職業與 De 值變化構成的卡牌遊戲，可查看規則、角色與符文行動。',
  path:'/game/'
});

export default function GamePage(){
  return <LocApp forcedView="game" forcedScope="lunarunes"/>;
}
