const O='https://lrunes.lo3rwang.cc/duel';
const MODES=[['單卡','one'],['每日','daily'],['雙卡','two'],['三卡','three'],['五卡','five'],['OW3gs','ow3gs'],['卡牌拓展桌遊','fight']];
export const metadata={title:'Duel｜月之符文',description:'月之符文玩法入口。'};
export default function DuelPage(){return <main className="loc-next-main"><header className="loc-hero"><p className="loc-eyebrow">LunaRunes · Duel</p><h1>抽牌與對局</h1></header><section className="loc-card"><div className="runes-highlight-grid">{MODES.map(([name,path])=><a className="runes-highlight-bubble interactive" href={`${O}/${path}`} key={path}><strong>{name}</strong></a>)}</div></section></main>}
