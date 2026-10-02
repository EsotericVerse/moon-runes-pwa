import RuneDrawClient from '../lrunes/RuneDrawClient';

export default function DuelDrawPage({ drawKey }) {
  return <main className="loc-next-main">
    <RuneDrawClient drawKey={drawKey} />
  </main>;
}
