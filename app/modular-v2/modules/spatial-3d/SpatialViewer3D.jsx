'use client';

import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {useEffect,useMemo,useRef,useState} from 'react';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {SPATIAL_EVENT,readSpatialView} from './spatial-bridge';

function Controls(){
  const {camera,gl}=useThree();
  const ref=useRef(null);
  useEffect(()=>{
    const next=new OrbitControls(camera,gl.domElement);
    next.enableDamping=true;next.dampingFactor=.07;next.minDistance=4;next.maxDistance=24;
    ref.current=next;return()=>next.dispose();
  },[camera,gl]);
  useFrame(()=>ref.current?.update());
  return null;
}

function point(index,total){
  const ring=Math.floor(index/10);
  const slot=index%10;
  const count=Math.min(10,total-ring*10);
  const angle=(slot/Math.max(1,count))*Math.PI*2;
  const radius=2.2+ring*1.35;
  return [Math.cos(angle)*radius,(ring%3-1)*1.15,Math.sin(angle)*radius];
}

function Scene({items,selected,onSelect}){
  const positions=useMemo(()=>new Map(items.map((item,index)=>[item.id,point(index,items.length)])),[items]);
  const edges=useMemo(()=>{
    const out=[];const seen=new Set();
    for(const item of items)for(const target of item.relations||[]){
      if(!positions.has(target))continue;
      const key=[item.id,target].sort().join('|');if(seen.has(key))continue;seen.add(key);
      out.push([positions.get(item.id),positions.get(target),key]);
    }
    return out;
  },[items,positions]);
  return <>
    <ambientLight intensity={1.5}/><directionalLight position={[5,7,5]} intensity={2}/>
    {edges.map(([a,b,key])=>{const mid=a.map((v,i)=>(v+b[i])/2);const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2];const len=Math.hypot(dx,dy,dz);return <mesh key={key} position={mid} scale={[.025,.025,len]} lookAt={b}><cylinderGeometry args={[1,1,1,8]}/><meshStandardMaterial color="#777"/></mesh>})}
    {items.map((item,index)=>{const active=item.id===selected;return <mesh key={item.id} position={positions.get(item.id)} scale={active?1.35:1} onClick={e=>{e.stopPropagation();onSelect(item.id)}} onDoubleClick={()=>item.href&&(window.location.href=item.href)}>
      <sphereGeometry args={[.28,20,20]}/><meshStandardMaterial color={active?'#fff':'#888'} emissive={active?'#555':'#111'} emissiveIntensity={active?.4:.05}/>
    </mesh>})}
    <Controls/>
  </>;
}

export default function SpatialViewer3D(){
  const [payload,setPayload]=useState(null);
  const [selected,setSelected]=useState('');
  useEffect(()=>{
    const stored=readSpatialView();if(stored?.items?.length){setPayload(stored);setSelected(stored.focusId||stored.items[0]?.id||'')}
    const receive=event=>{const next=event.detail;if(!next?.items?.length)return;setPayload(next);setSelected(next.focusId||next.items[0]?.id||'')};
    window.addEventListener(SPATIAL_EVENT,receive);return()=>window.removeEventListener(SPATIAL_EVENT,receive);
  },[]);
  if(!payload?.items?.length)return null;
  const active=payload.items.find(item=>item.id===selected)||payload.items[0];
  return <section className="loc-spatial-viewer" aria-label="立體檢視">
    <div className="loc-spatial-viewer-bar"><strong>{payload.title}</strong><button type="button" onClick={()=>setPayload(null)}>關閉</button></div>
    <div className="loc-spatial-viewer-stage"><Canvas camera={{position:[0,5,9],fov:48}} dpr={[1,1.6]}><Scene items={payload.items} selected={selected} onSelect={setSelected}/></Canvas></div>
    <div className="loc-spatial-viewer-detail"><strong>{active?.label}</strong>{active?.date?<span>{active.date}</span>:null}{active?.href?<a href={active.href}>查看內容</a>:null}</div>
    <style jsx>{`
      .loc-spatial-viewer{position:fixed;inset:auto 1rem 1rem 1rem;z-index:80;border:1px solid var(--loc-border,currentColor);border-radius:18px;background:Canvas;box-shadow:0 16px 50px rgba(0,0,0,.25);overflow:hidden}
      .loc-spatial-viewer-bar,.loc-spatial-viewer-detail{display:flex;gap:.75rem;align-items:center;padding:.7rem 1rem}.loc-spatial-viewer-bar{justify-content:space-between}.loc-spatial-viewer-stage{height:min(56vh,520px)}.loc-spatial-viewer-stage :global(canvas){width:100%!important;height:100%!important;touch-action:none}.loc-spatial-viewer-detail{border-top:1px solid var(--loc-border,currentColor);flex-wrap:wrap}.loc-spatial-viewer-detail a{margin-left:auto}
      @media(max-width:700px){.loc-spatial-viewer{inset:auto .5rem .5rem .5rem}.loc-spatial-viewer-stage{height:46vh}}
    `}</style>
  </section>;
}
