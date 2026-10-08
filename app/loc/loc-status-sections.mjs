// Keep the LOC status card's authored HTML intact while restoring its visual
// <h2>-separated text frames. This is presentation-only: never rewrite DB data.
export function splitStatusContentSections(value=''){
  const html=String(value??'').trim();
  if(!html)return [];
  const markers=[...html.matchAll(/<h[2-4]\b[^>]*>[\s\S]*?<\/h[2-4]>/gi)];
  if(!markers.length)return [{key:'body',html}];
  const sections=[];
  const prefix=html.slice(0,markers[0].index);
  if(prefix.trim())sections.push({key:'intro',html:prefix});
  for(let index=0;index<markers.length;index+=1){
    const start=markers[index].index;
    const end=index+1<markers.length?markers[index+1].index:html.length;
    const fragment=html.slice(start,end);
    if(fragment.trim())sections.push({key:'section-'+index,html:fragment});
  }
  return sections;
}
