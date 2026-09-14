import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { LOC_DATA } from '../../loc/data-paths.mjs';
import LunaRunesNav from '../LunaRunesNav';
import RuneLibraryClient from './RuneLibraryClient';

const runeSourcePath = resolve(process.cwd(), LOC_DATA.RUNES.replace(/^\//, ''));
const runes = JSON.parse(readFileSync(runeSourcePath, 'utf8'));

export const metadata = {
  title: '符文圖鑑｜月之符文｜LOC',
  description: '月之符文 1–66 完整圖鑑。'
};

export default function RuneListPage() {
  const canonicalRunes = (runes || [])
    .filter(row => Number(row?.編號) >= 1 && Number(row?.編號) <= 66)
    .sort((a, b) => Number(a.編號) - Number(b.編號));

  return <main className="loc-next-main">
    <section className="loc-view">
      <header className="loc-hero">
        <p className="loc-eyebrow">LunaRunes · 月之符文</p>
        <h1>符文圖鑑</h1>
        <p>月之符文 1–66 的圖鑑與群組查詢。</p>
      </header>

      <LunaRunesNav current="/runes/list" />
      <RuneLibraryClient runes={canonicalRunes} />
    </section>
  </main>;
}
