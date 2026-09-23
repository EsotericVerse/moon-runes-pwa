'use client';

const POSITIONS=Object.freeze([
  {x:600,y:120,textY:70},
  {x:940,y:360,textY:330},
  {x:600,y:600,textY:660},
  {x:260,y:360,textY:330}
]);

export default function ScopeOverviewGraphV2({centerTitle='',centerSummary='',nodes=[]}){
  const visible=(Array.isArray(nodes)?nodes:[]).slice(0,4);

  return <div className="scope-overview-graph-wrap">
    <svg viewBox="0 0 1200 720" className="scope-overview-graph" role="img" aria-label="首頁 Graph 總覽">
      {visible.map((node,index)=>{
        const p=POSITIONS[index];
        return <line key={'edge-'+node.id} x1="600" y1="360" x2={p.x} y2={p.y} stroke="currentColor" strokeOpacity=".28" strokeWidth="2"/>;
      })}

      <g>
        <circle cx="600" cy="360" r="62" fill="var(--loc-panel-2)" stroke="currentColor" strokeWidth="2"/>
        <text x="600" y="350" textAnchor="middle" fill="currentColor" fontSize="18" fontWeight="700">{centerTitle}</text>
        <text x="600" y="378" textAnchor="middle" fill="currentColor" fontSize="13">{centerSummary}</text>
      </g>

      {visible.map((node,index)=>{
        const p=POSITIONS[index];
        const href=String(node.href||'');
        return <g key={node.id} role={href?'link':undefined} tabIndex={href?0:undefined}
          onClick={()=>{if(href)window.location.href=href;}}
          onKeyDown={event=>{if(href&&(event.key==='Enter'||event.key===' ')){event.preventDefault();window.location.href=href;}}}
          style={href?{cursor:'pointer'}:undefined}>
          <circle cx={p.x} cy={p.y} r="20" fill="var(--loc-accent)" stroke="currentColor" strokeWidth="2"/>
          <text x={p.x} y={p.textY} textAnchor="middle" fill="currentColor">
            <tspan x={p.x} fontSize="15" fontWeight="700">{node.title}</tspan>
            <tspan x={p.x} dy="22" fontSize="12">{node.summary}</tspan>
          </text>
        </g>;
      })}
    </svg>
  </div>;
}
