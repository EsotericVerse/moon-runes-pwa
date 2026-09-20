import LocalizedText from './LocalizedText';

export function CompositionLinks({items=[]}){
  if(!items.length)return null;
  return <div className="loc-link-list">
    {items.map(item=><a className="loc-link-card" href={item.href} key={`${item.href}-${String(item.label)}`}>
      <strong><LocalizedText value={item.label}/></strong>{item.text?<span><LocalizedText value={item.text}/></span>:null}
    </a>)}
  </div>;
}

export function PageComposition({eyebrow,title,subtitle,intro,sections=[],localMenu=[]}){
  return <section className="loc-view scope-home-composition">
    <header className="loc-hero" id="top">
      {eyebrow?<p className="loc-eyebrow"><LocalizedText value={eyebrow}/></p>:null}
      <h1><LocalizedText value={title}/></h1>
      {subtitle?<p className="loc-subtitle"><LocalizedText value={subtitle}/></p>:null}
      {intro}
      {localMenu.length?<nav className="scope-v2-local-menu" aria-label="頁面小功能選單">{localMenu.map(item=><a href={item.href} key={item.href}>{item.label}</a>)}</nav>:null}
    </header>

    {sections.map((section,index)=><section className="loc-card scope-home-section" id={section.id} key={section.id} data-composition-slot={index+1}>
      {section.eyebrow?<p className="loc-eyebrow"><LocalizedText value={section.eyebrow}/></p>:null}
      <h2><LocalizedText value={section.title}/></h2>
      {section.subtitle?<p className="loc-subtitle"><LocalizedText value={section.subtitle}/></p>:null}
      {section.content}
      <CompositionLinks items={section.links}/>
    </section>)}
  </section>;
}
