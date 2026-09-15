'use client';

import { useState } from 'react';

export default function ModelArchitectureExplorer({ modules }) {
  const [expanded, setExpanded] = useState(false);

  return <div className={`model-architecture-explorer${expanded ? ' is-expanded' : ''}`}>
    <button
      type="button"
      className="model-architecture-trigger"
      aria-expanded={expanded}
      aria-controls="model-module-menu"
      onClick={() => setExpanded(value => !value)}
    >
      <img src="/pics/LOC-FrameworkPic.png" alt="LOC 月典語言系統框架關係流程圖" />
      <span>{expanded ? '收合八個模組' : '點圖展開八個模組'}</span>
    </button>
    {expanded ? <div className="model-module-overlay" id="model-module-menu" aria-label="LOC 八個功能模組選單">
      <button type="button" className="model-module-close" onClick={() => setExpanded(false)} aria-label="關閉八個模組選單">×</button>
      <div className="model-module-grid">
        {modules.map(module => <a className={`model-module model-module-${module.key}${module.depth ? ' is-deep' : ''}`} href={module.href} key={module.key}>
          <span className="model-module-name">{module.name}｜{module.zh}</span>
          <strong>{module.summary}</strong>
          <p>{module.detail}</p>
        </a>)}
      </div>
    </div> : null}
  </div>;
}
