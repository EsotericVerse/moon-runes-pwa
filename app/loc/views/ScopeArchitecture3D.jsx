'use client';

import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {useEffect,useMemo,useRef,useState} from 'react';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {SCOPES_V2,featureHrefV2,scopeHrefV2} from '../../modular-v2/scope-registry.v2';

const BUILDING_SCOPES=Object.freeze(['loc','runes','lo3rwang']);
const DIMENSIONS=Object.freeze([
  {id:'river',label:'時間長河',feature:'culture',position:[-2.6,0,0],scale:[1.35,2.4,.18]},
  {id:'keywords',label:'關鍵詞分布',feature:'statics',position:[0,0,0],scale:[1.35,2.4,.18]},
  {id:'media',label:'多媒體分布',feature:'statics',position:[2.6,0,0],scale:[1.35,2.4,.18]}
]);

function Controls(){
  const {camera,gl}=useThree();
  const controls=useRef(null);
  useEffect(()=>{
    const next=new OrbitControls(camera,gl.domElement);
    next.enableDamping=true;
    next.dampingFactor=.07;
    next.minDistance=5;
    next.maxDistance=14;
    next.target.set(0,0,0);
    controls.current=next;
    return ()=>next.dispose();
  },[camera,gl]);
  useFrame(()=>controls.current?.update());
  return null;
}

function ArchitectureScene({activeDimension,onDimension}){
  return <>
    <ambientLight intensity={1.35}/>
    <directionalLight position={[4,6,7]} intensity={2.1}/>
    <gridHelper args={[10,10]} position={[0,-2.55,0]}/>
    {DIMENSIONS.map((item,index)=>{
      const active=item.id===activeDimension;
      return <group key={item.id} position={item.position}>
        <mesh
          scale={item.scale}
          onClick={(event)=>{event.stopPropagation();onDimension(item.id);}}
          onPointerOver={(event)=>{event.stopPropagation();document.body.style.cursor='pointer';}}
          onPointerOut={()=>{document.body.style.cursor='';}}>
          <boxGeometry args={[1,1,1]}/>
          <meshStandardMaterial
            color={active?'#ffffff':'#8a8a8a'}
            emissive={active?'#555555':'#111111'}
            emissiveIntensity={active?.35:.08}
            roughness={.55}
            metalness={.12}
            transparent
            opacity={active?.9:.48}/>
        </mesh>
        <mesh position={[0,-2.05,.35]} scale={[.52,.1,.1]}>
          <boxGeometry args={[1,1,1]}/>
          <meshStandardMaterial color={active?'#ffffff':'#777777'}/>
        </mesh>
        {index<2&&<mesh position={[1.3,0,0]} scale={[.55,.035,.035]} rotation={[0,0,0]}>
          <boxGeometry args={[1,1,1]}/><meshStandardMaterial color="#777777"/>
        </mesh>}
      </group>;
    })}
    <mesh position={[0,2.15,-.55]} scale={[4.1,.16,.16]}>
      <boxGeometry args={[1,1,1]}/><meshStandardMaterial color="#888888"/>
    </mesh>
    <Controls/>
  </>;
}

export default function ScopeArchitecture3D(){
  const [scopeId,setScopeId]=useState('loc');
  const [dimension,setDimension]=useState('river');
  const scope=SCOPES_V2[scopeId]||SCOPES_V2.loc;
  const active=useMemo(()=>DIMENSIONS.find(item=>item.id===dimension)||DIMENSIONS[0],[dimension]);
  const targetHref=featureHrefV2(scopeId,active.feature);

  return <div className="loc-architecture-3d">
    <div className="loc-architecture-toolbar">
      <div>
        <p className="loc-eyebrow">LOC · 4D Language Architecture Framework</p>
        <strong>3D Language Space + Time</strong>
      </div>
      <div className="loc-architecture-scope-tabs" role="group" aria-label="選擇 Scope">
        {BUILDING_SCOPES.map(id=><button key={id} type="button" className={scopeId===id?'is-active':''} onClick={()=>setScopeId(id)}>{SCOPES_V2[id].label}</button>)}
      </div>
    </div>

    <div className="loc-architecture-layout">
      <div className="loc-r3f-stage" aria-label="LOC 四維語言建築互動場景">
        <Canvas camera={{position:[6,4.2,7.5],fov:45}} dpr={[1,1.75]}>
          <ArchitectureScene activeDimension={dimension} onDimension={setDimension}/>
        </Canvas>
        <div className="loc-r3f-overlay">
          <span>拖曳旋轉</span><span>滾輪縮放</span><span>點選分布面</span>
        </div>
      </div>

      <aside className="loc-architecture-detail">
        <p className="loc-eyebrow">{scope.label} · {active.label}</p>
        <h3>{active.label}</h3>
        {active.id==='river'&&<p>Period／Event／Anchor 沿時間排列；時間是 3D 語言空間的第四維。</p>}
        {active.id==='keywords'&&<p>Style／Keyword Group／Keyword 形成文字與作品的關鍵詞分布。</p>}
        {active.id==='media'&&<p>galaxy_media 與 meta_tags 形成獨立多媒體分布；無正文作品仍保有位置。</p>}
        <div className="loc-dimension-tabs" role="group" aria-label="選擇分布面向">
          {DIMENSIONS.map(item=><button key={item.id} type="button" className={dimension===item.id?'is-active':''} onClick={()=>setDimension(item.id)}>{item.label}</button>)}
        </div>
        <div className="loc-actions">
          <a className="loc-button primary" href={targetHref}>進入{active.label}</a>
          <a className="loc-button" href={scopeHrefV2(scopeId)}>進入 Scope</a>
        </div>
      </aside>
    </div>

    <style jsx>{`
      .loc-architecture-3d{display:grid;gap:1rem}
      .loc-architecture-toolbar{display:flex;gap:1rem;justify-content:space-between;align-items:center;flex-wrap:wrap}
      .loc-architecture-toolbar p{margin:0 0 .2rem}
      .loc-architecture-scope-tabs,.loc-dimension-tabs{display:flex;gap:.5rem;flex-wrap:wrap}
      button{font:inherit;color:inherit;border:1px solid var(--loc-border,currentColor);background:transparent;border-radius:999px;padding:.5rem .75rem;cursor:pointer}
      button.is-active{outline:2px solid currentColor;outline-offset:2px}
      .loc-architecture-layout{display:grid;grid-template-columns:minmax(0,2fr) minmax(240px,.8fr);gap:1rem}
      .loc-r3f-stage,.loc-architecture-detail{border:1px solid var(--loc-border,currentColor);border-radius:18px;overflow:hidden}
      .loc-r3f-stage{position:relative;min-height:480px;background:radial-gradient(circle at 50% 35%,rgba(127,127,127,.16),transparent 58%)}
      .loc-r3f-stage :global(canvas){display:block;width:100%!important;height:480px!important;touch-action:none}
      .loc-r3f-overlay{position:absolute;left:1rem;bottom:1rem;display:flex;gap:.4rem;flex-wrap:wrap;pointer-events:none}
      .loc-r3f-overlay span{border:1px solid var(--loc-border,currentColor);border-radius:999px;padding:.3rem .5rem;font-size:.75rem;background:color-mix(in srgb,Canvas 82%,transparent);backdrop-filter:blur(6px)}
      .loc-architecture-detail{padding:1rem;display:flex;flex-direction:column;gap:.8rem}
      .loc-architecture-detail h3,.loc-architecture-detail p{margin:0}
      .loc-actions{margin-top:auto}
      @media(max-width:820px){.loc-architecture-layout{grid-template-columns:1fr}.loc-r3f-stage,.loc-r3f-stage :global(canvas){min-height:390px;height:390px!important}}
    `}</style>
  </div>;
}
