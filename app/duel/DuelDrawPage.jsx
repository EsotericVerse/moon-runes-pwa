import '../lunarunes/rune-atlas-governance.css';
import '../lunarunes/runes-content.css';
import RuneDrawClient from '../lunarunes/RuneDrawClient';

export default function DuelDrawPage({ drawKey }) {
  return <main className="loc-next-main">
    <RuneDrawClient drawKey={drawKey} />
  </main>;
}
