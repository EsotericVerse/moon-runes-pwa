import '../lrunes/rune-atlas-governance.css';
import '../lrunes/runes-content.css';
import RuneDrawClient from '../lrunes/RuneDrawClient';

export default function DuelDrawPage({ drawKey }) {
  return <main className="loc-next-main">
    <RuneDrawClient drawKey={drawKey} />
  </main>;
}
