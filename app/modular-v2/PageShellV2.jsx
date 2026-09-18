import ScopeNavV2 from './ScopeNavV2';
import ScopeFooterV2 from './ScopeFooterV2';

export default function PageShellV2({eyebrow,title,subtitle,children,footer=true}){
  return <div className="scope-v2-shell">
    <header className="scope-v2-global"><ScopeNavV2/></header>
    <main className="scope-v2-main">
      <section className="scope-v2-page">
        <header className="scope-v2-hero">
          {eyebrow?<p className="scope-v2-eyebrow">{eyebrow}</p>:null}
          <h1>{title}</h1>
          {subtitle?<p className="scope-v2-subtitle">{subtitle}</p>:null}
        </header>
        <div className="scope-v2-content">{children}</div>
      </section>
    </main>
    {footer?<ScopeFooterV2/>:null}
  </div>;
}

export function ScopeCardV2({eyebrow,title,children,className=''}) {
  return <section className={`scope-v2-card ${className}`.trim()}>
    {eyebrow?<p className="scope-v2-eyebrow">{eyebrow}</p>:null}
    {title?<h2>{title}</h2>:null}
    {children}
  </section>;
}
