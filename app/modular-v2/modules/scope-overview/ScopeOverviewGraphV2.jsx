'use client';

const POSITIONS=Object.freeze([
  {x:600,y:125},
  {x:855,y:360},
  {x:600,y:595},
  {x:345,y:360}
]);

function parseSvgText(value){
  const tokens=String(value||'').split(/(<\/?strong>|<br\s*\/?\s*>|｜)/gi);
  const lines=[[]];
  let strong=false,hasStrong=false;
  for(const token of tokens){
    if(/^<strong>$/i.test(token)){strong=true;hasStrong=true;continue;}
    if(/^<\/strong>$/i.test(token)){strong=false;continue;}
    if(token==='｜'||/^<br\s*\/?\s*>$/i.test(token)){lines.push([]);continue;}
    if(token)lines[lines.length-1].push({text:token,strong});
  }
  return {lines,hasStrong};
}

function wrapSvgLines(lines,limit){
  const result=[];
  for(const sourceLine of lines){
    let line=[],length=0;
    for(const segment of sourceLine){
      for(const character of Array.from(segment.text)){
        if(length>=limit){result.push(line);line=[];length=0;}
        const last=line[line.length-1];
        if(last&&last.strong===segment.strong)last.text+=character;
        else line.push({text:character,strong:segment.strong});
        length++;
      }
    }
    result.push(line);
  }
  return result;
}

function plainText(lines){
  return lines.map(line=>line.map(segment=>segment.text).join('')).join(' ');
}

function renderLines(lines,{x,y,anchor='middle',fontSize=15,defaultWeight=400,lineHeight=18}){
  const centerY=y-((lines.length-1)*lineHeight/2);
  return <text x={x} y={centerY} textAnchor={anchor} fill="currentColor" pointerEvents="none">
    {lines.map((line,lineIndex)=><tspan key={lineIndex} x={x} dy={lineIndex===0?0:lineHeight}>
      {line.map((segment,segmentIndex)=><tspan key={segmentIndex} fontSize={fontSize} fontWeight={segment.strong?700:defaultWeight}>{segment.text}</tspan>)}
    </tspan>)}
  </text>;
}

export default function ScopeOverviewGraphV2({centerTitle='',centerSummary='',nodes=[]}){
  const visible=(Array.isArray(nodes)?nodes:[]).slice(0,4);

  return <div className="scope-overview-graph-wrap">
    <svg viewBox="0 0 1200 720" className="scope-overview-graph" role="group" aria-label="首頁 Graph 總覽">
      {visible.map((node,index)=>{
        const p=POSITIONS[index];
        return <line key={'edge-'+node.id} x1="600" y1="360" x2={p.x} y2={p.y} stroke="currentColor" strokeOpacity=".28" strokeWidth="2"/>;
      })}

      <g aria-hidden="true">
        <circle cx="600" cy="360" r="72" fill="var(--loc-panel-2)" stroke="currentColor" strokeWidth="2"/>
        <text x="600" y="352" textAnchor="middle" fill="currentColor" fontSize="16" fontWeight="700" textLength="132" lengthAdjust="spacingAndGlyphs">{centerTitle}</text>
        <text x="600" y="375" textAnchor="middle" fill="currentColor" fontSize="11" textLength="132" lengthAdjust="spacingAndGlyphs">{centerSummary}</text>
      </g>

      {visible.map((node,index)=>{
        const p=POSITIONS[index];
        const href=String(node.href||'');
        const titleMarkup=parseSvgText(node.title);
        const titleLines=wrapSvgLines(titleMarkup.lines,10);
        const summaryLines=href?[]:wrapSvgLines(parseSvgText(node.summary).lines,16);
        const summaryX=p.x<600?p.x-96:p.x+96;
        const summaryAnchor=p.x<600?'end':'start';
        const summaryY=p.y-((summaryLines.length-1)*9)+5;
        const label=plainText(titleMarkup.lines);
        const description=plainText(parseSvgText(node.summary).lines);
        return <g key={node.id} role={href?'link':'group'} tabIndex={href?0:undefined}
          aria-label={href?label+'；前往相關頁面。':label+'：'+description}
          onClick={href?()=>{window.location.href=href;}:undefined}
          onKeyDown={href?event=>{
            if(event.key==='Enter'){event.preventDefault();window.location.href=href;}
          }:undefined}
          style={href?{cursor:'pointer'}:undefined}>
          <circle cx={p.x} cy={p.y} r="74" fill="var(--loc-accent)" fillOpacity=".16" stroke="currentColor" strokeWidth="2"/>
          {renderLines(titleLines,{x:p.x,y:p.y,fontSize:15,defaultWeight:titleMarkup.hasStrong?400:700,lineHeight:18})}
          {!href&&<g aria-hidden="true">
            {renderLines(summaryLines,{x:summaryX,y:summaryY,anchor:summaryAnchor,fontSize:14,lineHeight:18})}
          </g>}
        </g>;
      })}
    </svg>
  </div>;
}
