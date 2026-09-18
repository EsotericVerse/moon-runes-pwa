import '../runes/rune-atlas-governance.css';
import '../runes/runes-content.css';
import RuneDrawClient from '../runes/RuneDrawClient';

export default function DuelDrawPage({ mode }) {
  return <main className="loc-next-main">
    <RuneDrawClient initialModeKey={mode} />
  </main>;
}
