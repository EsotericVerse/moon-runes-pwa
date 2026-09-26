'use client';

import {useMemo,useState} from 'react';
import {SCOPES_V2,featureHrefV2,scopeHrefV2} from '../../modular-v2/scope-registry.v2';

const DISPLAY_LAYERS=Object.freeze({
  time:Object.freeze({
    id:'time',label:'時',title:'時間展示層',
    description:'Period（風格群組）／Event／Anchor：沿時間觀看風格集合與演變。',
    feature:'culture',
    nodes:Object.freeze(['Period · 風格群組','Event · 事件','Anchor · 定錨'])
  }),
  space:Object.freeze({
    id:'space',label:'空',title:'空間展示層',
    description:'Style（風格個體）／Keyword／Source／Distribution：觀看分類、來源與分布。',
    feature:'statics',
    nodes:Object.freeze(['Style · 風格個體','Keyword Group · 關鍵詞群組','Keyword · 關鍵詞','Source · 來源','Distribution · 分布'])
  })
});

const BUILDING_SCOPES=Object.freeze(['loc','runes','lo3rwang']);

export default function ScopeArchitecture3D(){
  const [layer,setLayer]=useState('time');
  const [scopeId,setScopeId]=useState('loc');
  const [rotation,setRotation]=useState({x:-18,y:28});
  const [drag,setDrag]=useState(null);
  const active=DISPLAY_LAYERS[layer];
  const scope=SCOPES_V2[scopeId]||SCOPES_V2.loc;
  const targetHref=useMemo(()=>featureHrefV2(scopeId,active.feature),[scopeId,active.feature]);

  const startDrag=(event)=>{
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDrag({x:event.clientX,y:event.clientY,rx:rotation.x,ry:rotation.y});
  };
  const moveDrag=(event)=>{
    if(!drag)return;
    setRotation({
      x:Math.max(-70,Math.min(70,drag.rx-(event.clientY-drag.y)*.35)),
      y:drag.ry+(event.clientX-drag.x)*.45
    });
  };
  const stopDrag=()=>setDrag(null);

  return <div className="loc-architecture-3d">
    <div className="loc-architecture-toolbar" aria-label="LOC 3D 展示層">
      <div className="loc-architecture-layer-tabs" role="group" aria-label="選擇展示層">
        {Object.values(DISPLAY_LAYERS).map(item=><button key={item.id} type="button" className={layer===item.id?'is-active':''} onClick={()=>setLayer(item.id)}><b>{item.label}</b><span>{item.title}</span></button>)}
      </div>
      <div className="loc-architecture-scope-tabs" role="group" aria-label="選擇 Scope">
        {BUILDING_SCOPES.map(id=><button key={id} type="button" className={scopeId===id?'is-active':''} onClick={()=>setScopeId(id)}>{SCOPES_V2[id].label}</button>)}
      </div>
    </div>

    <div className="loc-architecture-layout">
      <div className="loc-building-stage">
        <div className="loc-building-caption"><span>Admin</span><b>統合 Scope 建築</b></div>
        <div className="loc-building" aria-label="多個 Scope 立方體組成 LOC 建築">
          {BUILDING_SCOPES.map((id,index)=><button key={id} type="button" className={'loc-building-cube '+(scopeId===id?'is-active':'')} style={{'--cube-index':index}} onClick={()=>setScopeId(id)} aria-label={'進入 '+SCOPES_V2[id].label+' Scope'}>
            <span>{SCOPES_V2[id].label}</span><small>{id}</small>
          </button>)}
        </div>
      </div>

      <div className="loc-cube-stage"
        onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={stopDrag} onPointerCancel={stopDrag}
        aria-label={scope.label+' Scope 3D 立方體，可拖曳旋轉'}>
        <div className="loc-scope-cube" style={{transform:`rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`}}>
          <div className="loc-cube-face front"><strong>{scope.label}</strong><span>Scope</span></div>
          <div className="loc-cube-face back"><strong>Governance</strong><span>治理</span></div>
          <div className="loc-cube-face right"><strong>空</strong><span>Statistics</span></div>
          <div className="loc-cube-face left"><strong>時</strong><span>Culture</span></div>
          <div className="loc-cube-face top"><strong>Admin</strong><span>統合</span></div>
          <div className="loc-cube-face bottom"><strong>Data</strong><span>Neon SSOT</span></div>
        </div>
        <p className="loc-cube-hint">拖曳旋轉 · 選「時／空」進入對應展示層</p>
      </div>

      <aside className="loc-architecture-detail">
        <p className="loc-eyebrow">{scope.label} · {active.label}</p>
        <h3>{active.title}</h3>
        <p>{active.description}</p>
        <div className="loc-architecture-nodes">
          {active.nodes.map(node=><span key={node}>{node}</span>)}
        </div>
        <div className="loc-actions">
          <a className="loc-button primary" href={targetHref}>進入{active.label}層</a>
          <a className="loc-button" href={scopeHrefV2(scopeId)}>進入 Scope</a>
        </div>
      </aside>
    </div>

    <style jsx>{`
      .loc-architecture-3d{display:grid;gap:1rem}
      .loc-architecture-toolbar{display:flex;gap:.8rem;justify-content:space-between;align-items:center;flex-wrap:wrap}
      .loc-architecture-layer-tabs,.loc-architecture-scope-tabs{display:flex;gap:.5rem;flex-wrap:wrap}
      button{font:inherit;color:inherit}
      .loc-architecture-layer-tabs button,.loc-architecture-scope-tabs button{border:1px solid var(--loc-border,currentColor);background:transparent;border-radius:999px;padding:.55rem .8rem;cursor:pointer}
      .loc-architecture-layer-tabs button{display:flex;gap:.5rem;align-items:center}
      .loc-architecture-layer-tabs b{font-size:1.1rem}
      button.is-active{outline:2px solid currentColor;outline-offset:2px}
      .loc-architecture-layout{display:grid;grid-template-columns:minmax(150px,.7fr) minmax(260px,1.2fr) minmax(220px,1fr);gap:1rem;align-items:stretch}
      .loc-building-stage,.loc-cube-stage,.loc-architecture-detail{border:1px solid var(--loc-border,currentColor);border-radius:18px;padding:1rem;min-width:0}
      .loc-building-caption{display:grid;gap:.15rem;margin-bottom:1rem}.loc-building-caption span{font-size:.78rem;opacity:.65}
      .loc-building{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.55rem;align-items:end}
      .loc-building-cube{aspect-ratio:1;border:1px solid currentColor;background:transparent;border-radius:8px;display:grid;place-content:center;gap:.15rem;cursor:pointer;transform:translateY(calc(var(--cube-index) * -5px));box-shadow:inset -10px -10px 0 rgba(127,127,127,.08)}
      .loc-building-cube span{font-weight:700}.loc-building-cube small{opacity:.6}
      .loc-cube-stage{min-height:310px;display:grid;place-items:center;perspective:850px;cursor:grab;touch-action:pan-y;user-select:none;overflow:hidden}
      .loc-cube-stage:active{cursor:grabbing}
      .loc-scope-cube{position:relative;width:150px;height:150px;transform-style:preserve-3d;transition:transform .12s ease-out}
      .loc-cube-face{position:absolute;inset:0;border:1px solid currentColor;background:color-mix(in srgb,Canvas 86%,transparent);backdrop-filter:blur(4px);display:grid;place-content:center;text-align:center;gap:.3rem}
      .loc-cube-face span{font-size:.8rem;opacity:.65}.front{transform:translateZ(75px)}.back{transform:rotateY(180deg) translateZ(75px)}.right{transform:rotateY(90deg) translateZ(75px)}.left{transform:rotateY(-90deg) translateZ(75px)}.top{transform:rotateX(90deg) translateZ(75px)}.bottom{transform:rotateX(-90deg) translateZ(75px)}
      .loc-cube-hint{align-self:end;margin:0;font-size:.78rem;opacity:.65;text-align:center}
      .loc-architecture-detail{display:flex;flex-direction:column;gap:.75rem}.loc-architecture-detail h3,.loc-architecture-detail p{margin:0}
      .loc-architecture-nodes{display:flex;gap:.45rem;flex-wrap:wrap}.loc-architecture-nodes span{border:1px solid var(--loc-border,currentColor);border-radius:999px;padding:.35rem .55rem;font-size:.8rem}
      @media(max-width:820px){.loc-architecture-layout{grid-template-columns:1fr}.loc-building{grid-template-columns:repeat(3,minmax(0,1fr))}.loc-cube-stage{min-height:280px}}
      @media(prefers-reduced-motion:reduce){.loc-scope-cube{transition:none}}
    `}</style>
  </div>;
}
