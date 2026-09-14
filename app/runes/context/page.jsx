import RuneContextView from '../RuneContextView';
import LunaRunesNav from '../LunaRunesNav';

export const metadata = { title: '符文語意圖｜月之符文｜LOC' };

export default function RuneContextPage() {
  return <main className="loc-next-main" data-loc-view="rune-context">
    <section className="loc-view">
      <LunaRunesNav current="/runes/context" />
      <RuneContextView />
    </section>
  </main>;
}
