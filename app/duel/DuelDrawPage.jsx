import '../runes/rune-atlas-governance.css';
import '../runes/runes-content.css';
import RuneDrawClient from '../runes/RuneDrawClient';

export default function DuelDrawPage({ drawKey }) {
  return <main className="loc-next-main">
    <RuneDrawClient drawKey={drawKey} />
  </main>;
}
