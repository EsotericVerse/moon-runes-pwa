'use client';

import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {useEffect,useMemo,useRef,useState} from 'react';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {filterLanguageItems} from './language-space-model';

const TYPE_LABELS={text:'文字',media:'多媒體',time:'時間',keyword:'關鍵詞'};

function Controls(){
  const {camera,gl}=useThree();
  const controls=useRef(null);
  useEffect(()=>{
    const next=new OrbitControls(camera,gl.domElement);
    next.enableDamping=true;
    next.dampingFactor=.08;
    next.minDistance=4;
    next.maxDistance=28;
    controls.current=next;
    return()=>next.dispose();
  },[camera,gl]);
  useFrame(()=>controls.current?.update());
  return null;
}

function hash(value){
  let h=0;for(const ch of String(value||''))h=((h<<5)-h)+ch.charCodeAt(0);
  return Math.abs(h);
}

function coordinates(items){
  const dated=items.map(item=>Date.parse(item.date||'')).filter(Number.isFinite);
  const min=dated.length?Math.min(...dated):0;
  const max=dated.length?Math.max(...dated):0;
  return new Map(items.map((item,index)=>{
    const t=Date.parse(item.date||'');
    const x=Number.isFinite(t)&&max>min?((t-min)/(max-min)-.5)*10:(index%9-4)*1.1;
    const lane=item.kind==='text'?-2.4:item.kind==='media'?2.4:item.kind==='keyword'?0:0;
    const z=(hash(item.source||item.label)%11-5)*.52;
    return [x,lane,z];
  }));
}

function SpaceScene({items,selected,onSelect}){
  const points=useMemo(()=>coordinates(items),[items]);
  return <>
    <ambientLight intensity={1.25}/>
    <directionalLight position={[5,7,6]} intensity={1.6}/>
    <gridHelper args={[14,14]}/>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,0,0]}>
      <planeGeometry args={[13,9]}/>
      <meshBasicMaterial transparent opacity={.035}/>
    </mesh>
    {items.map(item=>{
      const active=item.id===selected;
      const isMedia=item.kind==='media';
      const isTime=item.kind==='time';
      return <mesh key={item.id} position={points.get(item.id)} scale={active?1.45:1}
        onClick={event=>{event.stopPropagation();onSelect(item.id)}}>
        {isTime?<octahedronGeometry args={[.28,0]}/>:isMedia?<boxGeometry args={[.42,.42,.42]}/>:<sphereGeometry args={[.25,18,18]}/>}
        <meshStandardMaterial color={active?'#ffffff':isMedia?'#999999':isTime?'#777777':'#b7b7b7'} emissive={active?'#666666':'#111111'} emissiveIntensity={active?.45:.06}/>
      </mesh>;
    })}
    <Controls/>
  </>;
}

export default function LanguageSpaceWorkspace({items=[],title='立體語言空間',initialQuery='',onSelect=()=>{}}){
  const [query,setQuery]=useState(initialQuery);
  const [start,setStart]=useState('');
  const [end,setEnd]=useState('');
  const [kinds,setKinds]=useState(['text','media','time','keyword']);
  const [selected,setSelected]=useState('');
  const visible=useMemo(()=>filterLanguageItems(items,{query,start,end,kinds}),[items,query,start,end,kinds]);
  useEffect(()=>{
    if(selected&&!visible.some(item=>item.id===selected))setSelected('');
  },[visible,selected]);
  const active=visible.find(item=>item.id===selected)||null;
  const counts=useMemo(()=>visible.reduce((acc,item)=>{acc[item.kind]=(acc[item.kind]||0)+1;return acc},{}),[visible]);
  function toggle(kind){setKinds(current=>current.includes(kind)?current.filter(value=>value!==kind):[...current,kind]);}
  function choose(id){setSelected(id);const item=visible.find(entry=>entry.id===id);if(item)onSelect(item);}
  return <section className="language-space-workspace" aria-label={title}>
    <header className="language-space-heading">
      <div><h3>{title}</h3><p>時間、空間與精準搜尋同步作用；文字與多媒體並列。</p></div>
      <span aria-label="目前顯示項目">{visible.length.toLocaleString()}</span>
    </header>
    <div className="language-space-faces">
      <section className="language-space-face" aria-label="精準搜尋">
        <strong>搜尋</strong>
        <input value={query} onChange={event=>setQuery(event.target.value)} placeholder="搜尋文字、作品、多媒體、關鍵詞" aria-label="精準搜尋"/>
      </section>
      <section className="language-space-face" aria-label="時間篩選">
        <strong>時間</strong>
        <label>從 <input type="date" value={start} onChange={event=>setStart(event.target.value)}/></label>
        <label>到 <input type="date" value={end} onChange={event=>setEnd(event.target.value)}/></label>
      </section>
      <section className="language-space-face" aria-label="空間內容">
        <strong>空間</strong>
        {Object.keys(TYPE_LABELS).map(kind=><label key={kind}>
          <input type="checkbox" checked={kinds.includes(kind)} onChange={()=>toggle(kind)}/>
          {TYPE_LABELS[kind]} {Number(counts[kind]||0).toLocaleString()}
        </label>)}
      </section>
    </div>
    <div className="language-space-canvas">
      <Canvas camera={{position:[0,7,11],fov:48}} dpr={[1,1.6]}>
        <SpaceScene items={visible} selected={selected} onSelect={choose}/>
      </Canvas>
    </div>
    <div className="language-space-legend" aria-label="立體空間說明">
      <span>左側：文字</span><span>中央：時間／關鍵詞</span><span>右側：多媒體</span>
    </div>
    {active?<article className="language-space-detail">
      <strong>{active.label}</strong>
      <span>{TYPE_LABELS[active.kind]||active.kind}</span>
      {active.date?<time>{String(active.date).slice(0,10)}</time>:null}
      {active.source?<span>{active.source}</span>:null}
      {active.text?<p>{active.text.slice(0,260)}</p>:null}
      {active.href?<a href={active.href} target={/^https?:/.test(active.href)?'_blank':undefined} rel={/^https?:/.test(active.href)?'noreferrer':undefined}>查看內容</a>:null}
    </article>:null}
    <style jsx>{`
      .language-space-workspace{display:grid;gap:1rem}.language-space-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem}.language-space-heading h3{margin:0}.language-space-heading p{margin:.35rem 0 0}.language-space-heading>span{font-weight:700}
      .language-space-faces{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.75rem}.language-space-face{display:flex;gap:.65rem;align-items:center;flex-wrap:wrap;padding:.8rem;border:1px solid currentColor;border-radius:14px}.language-space-face input[type="text"],.language-space-face input:not([type]){min-width:0}.language-space-face:first-child input{flex:1;min-width:12rem}
      .language-space-canvas{height:520px;border:1px solid currentColor;border-radius:16px;overflow:hidden}.language-space-canvas :global(canvas){width:100%!important;height:100%!important;touch-action:none}.language-space-legend{display:flex;justify-content:space-between;gap:.75rem;flex-wrap:wrap;font-size:.9rem;opacity:.8}.language-space-detail{display:flex;gap:.75rem;align-items:center;flex-wrap:wrap;padding:.8rem 0}.language-space-detail p{flex-basis:100%;margin:0}.language-space-detail a{margin-left:auto}
      @media(max-width:780px){.language-space-faces{grid-template-columns:1fr}.language-space-canvas{height:420px}.language-space-detail a{margin-left:0}}
    `}</style>
  </section>;
}
