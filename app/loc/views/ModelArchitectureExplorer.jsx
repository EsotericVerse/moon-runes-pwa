'use client';

import {useState} from 'react';

export default function ModelArchitectureExplorer({modules}){
  const [expanded,setExpanded]=useState(false);

  return <div className={`model-architecture-explorer${expanded?' is-expanded':''}`}>
    <button
      type="button"
      className="model-architecture-trigger"
      aria-expanded={expanded}
      aria-controls="model-module-menu"
      onClick={()=>setExpanded(value=>!value)}
    >
      <img src="/pics/LOC-FrameworkPic.png" alt="LOC 月典架構圖" />
      <span>{expanded?'收合八個入口':'點圖展開八個入口'}</span>
    </button>
    {expanded?<div className="model-module-overlay" id="model-module-menu" aria-label="LOC 八個架構入口選單">
      <button type="button" className="model-module-close" onClick={()=>setExpanded(false)} aria-label="關閉八個入口">×</button>
      <div className="model-module-grid">
        {modules.map(module=>{
          const className=`model-module model-module-${module.key}${module.href?'':' is-static'}`;
          const content=<>
            <span className="model-module-name">{module.name}｜{module.zh}</span>
            <strong>{module.summary}</strong>
            <p>{module.detail}</p>
          </>;
          return module.href
            ?<a className={className} href={module.href} key={module.key}>{content}</a>
            :<div className={className} key={module.key}>{content}</div>;
        })}
      </div>
    </div>:null}
  </div>;
}
