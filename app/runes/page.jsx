import './rune-atlas-governance.css';
import RuneAtlasClient from './RuneAtlasClient';

export const metadata = {
  title: '月之符文圖鑑｜LOC',
  description: 'LunaRunes 66 符文圖鑑、群組、定義與方向。'
};

export default function RunesPage() {
  return <RuneAtlasClient/>;
}
