import TextConstructionGameClient from './TextConstructionGameClient';

export const metadata = {
  title: '文字建造遊戲｜LOC 月典',
  description: '以 LunaRunes 符號式語言進行源、轉、合三卡文字建造的 Playable Alpha。',
};

export default function GamePage() {
  return <TextConstructionGameClient />;
}
