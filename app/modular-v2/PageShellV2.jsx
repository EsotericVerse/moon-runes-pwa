export default function PageShellV2({eyebrow,title,subtitle,description,children}){
  return <main className="scope-v2-main">
    <section className="scope-v2-page">
      <header className="loc-card scope-v2-hero">
        {eyebrow?<p className="loc-eyebrow scope-v2-eyebrow">{eyebrow}</p>:null}
        <div className="home-title-row">
          <h1>{title}</h1>
          {subtitle?<p className="loc-subtitle scope-v2-subtitle">{subtitle}</p>:null}
        </div>
        {description?<div className="scope-v2-hero-description">{description}</div>:null}
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
