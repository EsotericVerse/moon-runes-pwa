const LOCAL_MENUS=Object.freeze({
  context:[['說明與探索','/context'],['關係圖(Graph)','/context/graph'],['節點(node)','/context/node'],['關聯(Edge)','/context/edge'],['情境(Scenarios)','/context/scenarios'],['趨勢(Trend)','/context/trend'],['每日符文統計分析(daily)','/context/dailtrunes']],
  culture:[['時期(Perid)與時間線(Timeline)','/culture'],['軌跡(Trajectory)','/culture/trajectory'],['歷史演變(History)','/culture/history'],['衍生作品(galaxy)','/culture/galaxy']],
  galaxy:[['推薦作品','/culture/galaxy'],['創作文章','/culture/galaxy/literary'],['小說','/culture/galaxy/novel'],['音樂','/culture/galaxy/music'],['圖片','/culture/galaxy/pics'],['多媒體','/culture/galaxy/multimedia']],
  statics:[['統計排行榜','/statics'],['關鍵字統計','/statics/keyword'],['來源管理','/statics/source'],['匯入','/statics/import'],['總排行榜','/statics/total'],['關鍵字','/statics/keyword/total'],['曲風','/statics/music/total'],['來源','/statics/source/total']],
  governance:[['原則理念','/governance'],['版權說明','/governance/law'],['FAQ','/governance/faq'],['管理者功能','/governance/manage']],
  runes:[['符文簡介','/'],['符文抽籤','/duel'],['符文圖鑑','/list'],['符文解牌','/algorithm'],['符文遊戲','/game']],
  author:[['簡介跟自述','/lo3rwang'],['主要身份','/lo3rwang/style'],['工作與合作','/lo3rwang/work'],['LOC設計理念','/lo3rwang/design'],['公開創作內容','/lo3rwang/galaxy'],['其他說明','/lo3rwang/others'],['聯絡方式','/lo3rwang/email']]
});

function menuFor(featureId,scopeId){
  if(featureId==='context'||featureId==='culture'||featureId==='statics'||featureId==='governance')return LOCAL_MENUS[featureId];
  if(featureId==='galaxy')return LOCAL_MENUS.galaxy;
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
          {menu.map(([label,path])=><a key={`${label}-${path}`} href={path}>{label}</a>)}
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
