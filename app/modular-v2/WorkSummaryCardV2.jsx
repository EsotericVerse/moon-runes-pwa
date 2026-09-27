'use client';

function externalLink(link){
  const href=String(link?.href||'').trim();
  return /^https?:\/\//i.test(href)?href:'';
}
function relationValue(value){
  return String(value||'').trim();
}

export default function WorkSummaryCardV2({
  title='未命名作品',
  source='',
  date='',
  body='',
  hidden=false,
  sourceId='',
  targetId='',
  refId='',
  links=[],
  destinations=[],
  showSource=true,
  showLinks=true,
  children=null
}){
  const relations=[
    ['source_id',relationValue(sourceId)],
    ['target_id',relationValue(targetId)],
    ['ref_id',relationValue(refId)]
  ].filter(([,value])=>value);
  const safeLinks=(Array.isArray(links)?links:[])
    .map((link,index)=>typeof link==='string'?{id:String(index),href:link,label:'查看連結'}:link)
    .filter(link=>externalLink(link));

  return <article className="scope-v2-inline-card scope-v2-work-summary">
    <header className="scope-v2-culture-work-heading">
      <div>
        {showSource&&source?<p className="loc-eyebrow">{source}</p>:null}
        <strong>{title}</strong>
      </div>
      {date?<time>{date}</time>:null}
    </header>

    {hidden?<p className="scope-v2-status">此項目目前隱藏（僅管理者可見）</p>:null}
    {body?<p className="scope-v2-culture-work-meta-description">{body}</p>:null}

    {relations.length?<dl className="scope-v2-work-relations">
      {relations.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl>:null}

    {showLinks&&safeLinks.length?<div className="scope-v2-result-links">
      {safeLinks.map((link,index)=><a key={link.id||link.href||index} href={externalLink(link)} target="_blank" rel="noreferrer">{link.label||`連結 ${index+1}`}</a>)}
    </div>:null}

    {destinations?.length?<div className="scope-v2-result-links">
      {destinations.map(destination=><a key={destination.id||destination.href} href={destination.href}>{destination.label}</a>)}
    </div>:null}

    {children}
  </article>;
}
