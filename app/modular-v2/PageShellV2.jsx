import {scopeHrefV2} from './scope-registry.v2';

const LOCAL_MENUS=Object.freeze({
  context:[['說明與探索','#intro'],['關係圖(Graph)','#graph'],['節點(node)','#nodes'],['關聯(Edge)','#edges'],['情境(Scenarios)','#scenarios'],['趨勢(Trend)','#trend'],['每日符文統計分析(daily)','#daily']],
  culture:[['時期(Period)與時間線(Timeline)','#periods'],['軌跡(Trajectory)','#trajectory'],['歷史演變(History)','history'],['衍生作品(galaxy)','galaxy']],
  statics:[['統計排行榜','#rankings'],['關鍵字統計','#keywords'],['來源管理','#sources'],['匯入','#import'],['總排行榜','#total'],['關鍵字','#keywords'],['曲風','#genres'],['來源','#sources']],
  governance:[['原則理念','#governance-concepts'],['版權說明','#governance-law'],['FAQ','#faq'],['管理者功能','governance/manage']],
  runes:[['符文抽籤','duel/one'],['符文圖鑑','list'],['符文解牌','governance'],['符文遊戲','game']],
  author:[['簡介跟自述','#intro'],['主要身份','#identity'],['工作與合作','#work'],['LOC設計理念','#loc'],['公開創作內容','#works'],['其他說明','#about']]
});

function menuFor(featureId,scopeId){
  if(featureId==='context'||featureId==='culture'||featureId==='statics'||featureId==='governance')return LOCAL_MENUS[featureId];
  if(scopeId==='runes'&&featureId==='home')return LOCAL_MENUS.runes;
  if(scopeId==='lo3rwang'&&featureId==='home')return LOCAL_MENUS.author;
  return null;
}

export default function PageShellV2({eyebrow,title,subtitle,children,featureId=null,scopeId='loc'}){
  const menu=menuFor(featureId,scopeId);
  return <main className="scope-v2-main">
    <section className="scope-v2-page">
      <header className="scope-v2-hero">
        {eyebrow?<p className="scope-v2-eyebrow">{eyebrow}</p>:null}
        <h1>{title}</h1>
        {subtitle?<p className="scope-v2-subtitle">{subtitle}</p>:null}
        {menu?<nav className="scope-v2-local-menu" aria-label={`${title}小功能選單`}>
          {menu.map(([label,path])=><a key={`${label}-${path}`} href={path.startsWith('#')?path:scopeHrefV2(scopeId==='runes'?'runes':scopeId,path)}>{label}</a>)}
        </nav>:null}
      </header>
      <div className="scope-v2-content">{children}</div>
    </section>
  </main>;
}

export function ScopeCardV2({eyebrow,title,children,className=''}) {
  return <section className={`scope-v2-card ${className}`.trim()}>
    {eyebrow?<p className="scope-v2-eyebrow">{eyebrow}</p>:null}
    {title?<h2>{title}</h2>:null}
    {children}
  </section>;
}
