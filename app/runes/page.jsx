import './rune-atlas-governance.css';
import RuneDrawClient from './RuneDrawClient';
import LunaRunesNav from './LunaRunesNav';

export const metadata = {
  title: '月之符文｜LOC',
  description: '月之符文 LunaRunes：群組、圖鑑、抽牌、每日符文、脈絡、統計與符文演算法的實驗與參照入口。'
};

export default function RunesPage() {
  return <main className="loc-next-main">
    <section className="loc-view">
      <header className="loc-hero">
        <p className="loc-eyebrow">LunaRunes · 月之符文</p>
        <h1>月之符文</h1>
        <p>月典的符號式語言模組，也是 LOC 功能實驗與參照區。既有功能在這裡逐步整併、模組化並驗證。</p>
      </header>

      <LunaRunesNav />

      <section className="loc-card" id="groups">
        <p className="loc-eyebrow">Groups · 群組分類</p>
        <h2>八個基礎群組</h2>
        <p>靈魂、連結、生命、自然、礦物、元素、秩序、無序。群組說明維持為月之符文自己的知識入口，不與全域 LOC 分析混在一起。</p>
      </section>

      <RuneDrawClient />
    </section>
  </main>;
}
