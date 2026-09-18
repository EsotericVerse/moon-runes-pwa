import { LOC_SYSTEM_LINKS } from './loc/system-links';

export default function LocSystemQuickLinks(){
  return <nav className="loc-card loc-system-quick-links" aria-label="LOC 體系快速入口">
    <div className="loc-actions">
      {LOC_SYSTEM_LINKS.map(item=><a className="loc-button" href={item.href} key={item.key}>{item.zh}</a>)}
    </div>
  </nav>;
}
