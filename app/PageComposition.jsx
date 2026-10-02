function CompositionLinks({items=[]}){
  if(!items.length)return null;
  return <div className="loc-link-list">
    {items.map(item=><a className="loc-link-card" href={item.href} key={`${item.href}-${String(item.label)}`}>
      <strong>{item.label}</strong>{item.text?<span>{item.text}</span>:null}
    </a>)}
  </div>;
}

export function PageComposition({eyebrow,title,subtitle,intro,heroVisual=null,sections=[],localMenu=[]}){
  return <section className="loc-view scope-home-composition">
    {heroVisual?<header className="loc-hero scope-home-hero-with-visual" id="top">
      <div className="scope-home-hero-copy">
        {eyebrow?<p className="loc-eyebrow">{eyebrow}</p>:null}
        <div className="home-title-row">
          <h1>{title}</h1>
          {subtitle?<p className="loc-subtitle">{subtitle}</p>:null}
        </div>
        {intro}
        {localMenu.length?<nav className="scope-v2-local-menu" aria-label="頁面小功能選單">{localMenu.map(item=><a href={item.href} key={item.href}>{item.label}</a>)}</nav>:null}
      </div>
      <figure className="home-hero-visual scope-home-hero-visual">{heroVisual}</figure>
    </header>:<header className="loc-hero" id="top">
      {eyebrow?<p className="loc-eyebrow">{eyebrow}</p>:null}
      <div className="home-title-row">
        <h1>{title}</h1>
        {subtitle?<p className="loc-subtitle">{subtitle}</p>:null}
      </div>
      {intro}
      {localMenu.length?<nav className="scope-v2-local-menu" aria-label="頁面小功能選單">{localMenu.map(item=><a href={item.href} key={item.href}>{item.label}</a>)}</nav>:null}
    </header>}

    {sections.map((section,index)=><section className="loc-card scope-home-section" id={section.id} key={section.id} data-composition-slot={index+1}>
      {section.eyebrow?<p className="loc-eyebrow">{section.eyebrow}</p>:null}
      <h2>{section.title}</h2>
      {section.subtitle?<p className="loc-subtitle">{section.subtitle}</p>:null}
      {section.content}
      <CompositionLinks items={section.links}/>
    </section>)}
  </section>;
}
