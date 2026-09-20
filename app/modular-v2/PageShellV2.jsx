export default function PageShellV2({eyebrow,title,subtitle,children}){
  return <main className="scope-v2-main">
    <section className="scope-v2-page">
      <header className="scope-v2-hero">
        {eyebrow?<p className="scope-v2-eyebrow">{eyebrow}</p>:null}
        <h1>{title}</h1>
        {subtitle?<p className="scope-v2-subtitle">{subtitle}</p>:null}
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
