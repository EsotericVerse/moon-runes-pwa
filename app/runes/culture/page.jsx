import EvolutionView from '../../loc/views/EvolutionView';

export const metadata = { title: '符文軌跡（文化）｜月之符文｜LOC' };

export default function RuneCulturePage() {
  return <main className="loc-next-main" data-loc-view="evolution">
    <EvolutionView />
  </main>;
}
