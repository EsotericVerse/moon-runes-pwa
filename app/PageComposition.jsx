export function CompositionLinks({items=[]}){
  if(!items.length)return null;
  return <div className="loc-link-list">
    {items.map(item=><a className="loc-link-card" href={item.href} key={`${item.href}-${item.label}`}>
      <strong>{item.label}</strong>{item.text?<span>{item.text}</span>:null}
    </a>)}
  </div>;
}

export function PageComposition({eyebrow,title,subtitle,intro,sections=[]}){
  return <section className="loc-view scope-home-composition">
    <header className="loc-hero" id="top">
      {eyebrow?<p className="loc-eyebrow">{eyebrow}</p>:null}
      <h1>{title}</h1>
      {subtitle?<p className="loc-subtitle">{subtitle}</p>:null}
      {intro}
    </header>

    {sections.map((section,index)=><section className="loc-card scope-home-section" id={section.id} key={section.id} data-composition-slot={index+1}>
      {section.eyebrow?<p className="loc-eyebrow">{section.eyebrow}</p>:null}
      <h2>{section.title}</h2>
      {section.subtitle?<p className="loc-subtitle">{section.subtitle}</p>:null}
      {section.content}
      <CompositionLinks items={section.links}/>
    </section>)}
  </section>;
}
