import {Fragment} from 'react';
import {scopeHrefV2,scopeOriginV2} from './scope-registry.v2';

const LOCAL_MENUS=Object.freeze({
  context:[['關係圖 Graph','/context']],
  culture:[['時間長河','/culture']],
  statics:[['統計','/statics']],
  governance:[['原則理念','/governance'],['版權說明','/governance/law'],['FAQ','/governance/faq'],['管理者功能','/governance/manage']],
  runes:[['符文抽籤','/'],['符文圖鑑','/list'],['符文解牌','/algorithm'],['符文遊戲','/game']],
  author:[['簡介跟自述','/lo3rwang'],['主要身份','/lo3rwang/style'],['工作與合作','/lo3rwang/work'],['LOC設計理念','/lo3rwang/design'],['公開創作內容','/lo3rwang/galaxy'],['其他說明','/lo3rwang/others'],['聯絡方式','/lo3rwang/email']]
});

function menuFor(featureId,scopeId){
  if(featureId==='context'||featureId==='culture'||featureId==='statics'||featureId==='governance')return LOCAL_MENUS[featureId];
  if(scopeId==='runes'&&featureId==='home')return LOCAL_MENUS.runes;
  if(scopeId==='lo3rwang'&&featureId==='home')return LOCAL_MENUS.author;
  return null;
}

export default function PageShellV2({eyebrow,title,subtitle,children,featureId=null,scopeId='loc',expandedPath=null}){
  const menu=menuFor(featureId,scopeId);
  const menuHref=path=>scopeId==='runes'
    ? `${scopeOriginV2(scopeId)}${String(path||'/').startsWith('/')?path:`/${path}`}`
    : scopeHrefV2(scopeId,path);
  const renderMenu=(items,level=0)=><div className={level?'scope-v2-local-menu-children':'scope-v2-local-menu-row'}>{items.map(([label,path,children])=><Fragment key={`${label}-${path}`}><a href={menuHref(path)}>{label}</a>{children?.length&&path===expandedPath?renderMenu(children,level+1):null}</Fragment>)}</div>;
  return <main className="scope-v2-main">
    <section className="scope-v2-page">
      <header className="scope-v2-hero">
        {eyebrow?<p className="scope-v2-eyebrow">{eyebrow}</p>:null}
        <h1>{title}</h1>
        {subtitle?<p className="scope-v2-subtitle">{subtitle}</p>:null}
        {menu?<nav className="scope-v2-local-menu" aria-label={`${title}小功能選單`}>{renderMenu(menu)}</nav>:null}
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
