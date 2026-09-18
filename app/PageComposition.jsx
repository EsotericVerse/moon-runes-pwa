import LocalizedText from './LocalizedText';

export function PageHero({eyebrow,title,subtitle,intro,id='top'}){
  return <header className="loc-hero" id={id}>
    {eyebrow?<p className="loc-eyebrow"><LocalizedText value={eyebrow}/></p>:null}
    <h1><LocalizedText value={title}/></h1>
    {subtitle?<p className="loc-subtitle"><LocalizedText value={subtitle}/></p>:null}
    {intro}
  </header>;
}

export function PageFrame({eyebrow,title,subtitle,intro,children,className=''}) {
  return <section className={`loc-view loc-page-composition ${className}`.trim()}>
    <PageHero eyebrow={eyebrow} title={title} subtitle={subtitle} intro={intro}/>
    {children}
  </section>;
}

export function PageStatus({children,error=false}){
  if(!children)return null;
  return <p className={`loc-status${error?' error':''}`}>{children}</p>;
}

export function PagePager({page,pages,total,onPrevious,onNext,label='筆'}){
  if(!total)return null;
  return <div className="loc-pagination">
    <span>第 {page} / {pages} 頁 · 共 {total} {label}</span>
    <div>
      <button className="loc-button" type="button" disabled={page<=1} onClick={onPrevious}>上一頁</button>
      <button className="loc-button" type="button" disabled={page>=pages} onClick={onNext}>下一頁</button>
    </div>
  </div>;
}

export function CompositionLinks({items=[]}){
  if(!items.length)return null;
  return <div className="loc-link-list">
    {items.map(item=><a className="loc-link-card" href={item.href} key={`${item.href}-${String(item.label)}`}>
      <strong><LocalizedText value={item.label}/></strong>{item.text?<span><LocalizedText value={item.text}/></span>:null}
    </a>)}
  </div>;
}

export function PageComposition({eyebrow,title,subtitle,intro,sections=[]}){
  return <PageFrame eyebrow={eyebrow} title={title} subtitle={subtitle} intro={intro} className="scope-home-composition">
    {sections.map((section,index)=><section className="loc-card scope-home-section" id={section.id} key={section.id} data-composition-slot={index+1}>
      {section.eyebrow?<p className="loc-eyebrow"><LocalizedText value={section.eyebrow}/></p>:null}
      <h2><LocalizedText value={section.title}/></h2>
      {section.subtitle?<p className="loc-subtitle"><LocalizedText value={section.subtitle}/></p>:null}
      {section.content}
      <CompositionLinks items={section.links}/>
    </section>)}
  </PageFrame>;
}
