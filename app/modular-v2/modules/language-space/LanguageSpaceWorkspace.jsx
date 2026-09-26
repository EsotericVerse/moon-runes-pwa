'use client';

import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {useEffect,useMemo,useRef,useState} from 'react';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {filterLanguageItems} from './language-space-model';

const FACES=Object.freeze([
  ['time','時間長河'],
  ['space','空間分析'],
  ['extension','延伸'],
  ['manage','管理']
]);
const TYPE_LABELS={text:'文字',media:'多媒體',time:'時間',keyword:'關鍵詞'};

function Controls(){
  const {camera,gl}=useThree();
  const controls=useRef(null);
  useEffect(()=>{
    const next=new OrbitControls(camera,gl.domElement);
    next.enableDamping=true;
    next.dampingFactor=.08;
    next.minDistance=4;
    next.maxDistance=30;
    next.enablePan=true;
    controls.current=next;
    return()=>next.dispose();
  },[camera,gl]);
  useFrame(()=>controls.current?.update());
  return null;
}

function hash(value){
  let h=2166136261;
  for(const ch of String(value||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}
  return Math.abs(h>>>0);
}
function dateExtent(items){
  const values=items.map(item=>Date.parse(item.date||'')).filter(Number.isFinite);
  if(!values.length)return [0,1];
  const min=Math.min(...values),max=Math.max(...values);
  return min===max?[min,min+86400000]:[min,max];
}
function scale(value,min,max,a=-4.8,b=4.8){
  if(!Number.isFinite(value))return 0;
  return a+(value-min)*(b-a)/(max-min||1);
}
function coordinates(items,face){
  const [minDate,maxDate]=dateExtent(items);
  const maxValue=Math.max(1,...items.map(item=>Number(item.value)||1));
  return new Map(items.map((item,index)=>{
    const t=Date.parse(item.date||'');
    const value=Math.max(1,Number(item.value)||1);
    if(face==='time'){
      const x=Number.isFinite(t)?scale(t,minDate,maxDate):(index%11-5)*.7;
      const y=item.kind==='time'?0:item.kind==='media'?2:item.kind==='keyword'?-2:-1;
      const z=Math.log2(value+1)/Math.log2(maxValue+1)*3.2;
      return [x,y,z];
    }
    if(face==='extension'){
      const x=Number.isFinite(t)?scale(t,minDate,maxDate):(index%9-4)*1.05;
      const y=((hash(item.source)%9)-4)*.55;
      const z=Math.log2(value+1)/Math.log2(maxValue+1)*3.4;
      return [x,y,z];
    }
    const key=hash(item.tags||item.source||item.label);
    const angle=(key%360)*Math.PI/180;
    const radius=1.6+((key>>8)%360)/100;
    const y=item.kind==='keyword'?1.6:item.kind==='media'?.8:-.8;
    const z=Math.log2(value+1)/Math.log2(maxValue+1)*3;
    return [Math.cos(angle)*radius,y+z*.22,Math.sin(angle)*radius];
  }));
}

function Edge({a,b}){
  const ref=useRef(null);
  const length=Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2]);
  useEffect(()=>{
    if(!ref.current)return;
    ref.current.position.set((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);
    ref.current.lookAt(b[0],b[1],b[2]);
  },[a,b]);
  return <mesh ref={ref} scale={[.014,.014,length]}>
    <cylinderGeometry args={[1,1,1,6]}/>
    <meshStandardMaterial color="#777" transparent opacity={.34}/>
  </mesh>;
}

function Scene({items,face,selected,onSelect}){
  const points=useMemo(()=>coordinates(items,face),[items,face]);
  const edges=useMemo(()=>{
    const out=[];const seen=new Set();
    for(const item of items)for(const target of item.relations||[]){
      if(!points.has(target))continue;
      const key=[item.id,target].sort().join('|');
      if(seen.has(key))continue;
      seen.add(key);
      out.push({key,a:points.get(item.id),b:points.get(target)});
    }
    return out;
  },[items,points]);
  return <>
    <ambientLight intensity={1.25}/>
    <directionalLight position={[5,8,6]} intensity={1.8}/>
    <gridHelper args={[14,14]}/>
    {edges.map(edge=><Edge key={edge.key} a={edge.a} b={edge.b}/>)}
    {items.map(item=>{
      const active=item.id===selected;
      const isMedia=item.kind==='media';
      const isTime=item.kind==='time';
      const isKeyword=item.kind==='keyword';
      const size=Math.min(.68,.22+Math.log2(Math.max(1,item.value||1)+1)*.035);
      return <mesh key={item.id} position={points.get(item.id)} scale={active?1.45:1}
        onClick={event=>{event.stopPropagation();onSelect(item.id)}}>
        {isTime?<octahedronGeometry args={[size,0]}/>:isMedia?<boxGeometry args={[size,size,size]}/>:isKeyword?<tetrahedronGeometry args={[size,0]}/>:<sphereGeometry args={[size,18,18]}/>}
        <meshStandardMaterial color={active?'#fff':isMedia?'#999':isTime?'#777':isKeyword?'#aaa':'#bbb'} emissive={active?'#555':'#111'} emissiveIntensity={active?.45:.05}/>
      </mesh>;
    })}
    <Controls/>
  </>;
}

export default function LanguageSpaceWorkspace({
  items=[],title='立體語言空間',initialQuery='',searchQuery='',
  onSearchQueryChange=()=>{},onSearch=()=>{},searching=false,
  management=null,initialFace='space',onSelect=()=>{}
}){
  const [face,setFace]=useState(initialFace);
  const [query,setQuery]=useState(searchQuery||initialQuery);
  const [start,setStart]=useState('');
  const [end,setEnd]=useState('');
  const [selected,setSelected]=useState('');

  useEffect(()=>{setQuery(searchQuery||initialQuery)},[searchQuery,initialQuery]);
  useEffect(()=>{if(face==='manage'&&!management)setFace('space')},[face,management]);

  const faceKinds=face==='extension'?['media']:face==='time'?['time','text','media']:['text','keyword','media'];
  const visible=useMemo(()=>filterLanguageItems(items,{
    query:face==='space'?query:'',
    start,
    end,
    kinds:faceKinds
  }),[items,face,query,start,end]);

  useEffect(()=>{if(selected&&!visible.some(item=>item.id===selected))setSelected('')},[visible,selected]);
  const active=visible.find(item=>item.id===selected)||null;
  const counts=useMemo(()=>visible.reduce((acc,item)=>{acc[item.kind]=(acc[item.kind]||0)+1;return acc},{}),[visible]);

  function choose(id){
    setSelected(id);
    const item=visible.find(entry=>entry.id===id);
    if(item)onSelect(item);
  }
  function changeQuery(value){
    setQuery(value);
    onSearchQueryChange(value);
  }
  function submitSearch(event){
    event.preventDefault();
    onSearch(query);
  }

  return <section className="language-space-workspace" aria-label={title}>
    <header className="language-space-heading">
      <div><h3>{title}</h3></div>
      <div className="language-space-face-switch" role="group" aria-label="立體功能面">
        {FACES.map(([id,label])=>{
          if(id==='manage'&&!management)return null;
          return <button key={id} type="button" aria-pressed={face===id} onClick={()=>setFace(id)}>{label}</button>;
        })}
      </div>
    </header>

    {face==='manage'&&management?<div className="language-space-management">{management}</div>:<>
      <div className="language-space-tools">
        {face==='space'?<form onSubmit={submitSearch} className="language-space-search">
          <label><span>搜尋</span><input value={query} onChange={event=>changeQuery(event.target.value)} placeholder="搜尋文字、作品、多媒體、關鍵詞"/></label>
          <button type="submit" disabled={searching}>{searching?'搜尋中…':'搜尋'}</button>
        </form>:null}
        {(face==='time'||face==='extension')?<div className="language-space-time-filter">
          <label><span>從</span><input type="date" value={start} onChange={event=>setStart(event.target.value)}/></label>
          <label><span>到</span><input type="date" value={end} onChange={event=>setEnd(event.target.value)}/></label>
        </div>:null}
        <div className="language-space-counts" aria-label="目前資料量">
          {face!=='extension'?<span>文字 {Number(counts.text||0).toLocaleString()}</span>:null}
          {face==='space'?<span>關鍵詞 {Number(counts.keyword||0).toLocaleString()}</span>:null}
          <span>多媒體 {Number(counts.media||0).toLocaleString()}</span>
          {face==='time'?<span>時間 {Number(counts.time||0).toLocaleString()}</span>:null}
        </div>
      </div>

      <div className="language-space-canvas">
        {visible.length?<Canvas camera={{position:[0,6.5,11],fov:48}} dpr={[1,1.6]}>
          <Scene items={visible} face={face} selected={selected} onSelect={choose}/>
        </Canvas>:<p className="scope-v2-status">目前沒有可呈現資料。</p>}
      </div>

      {active?<article className="language-space-detail">
        <strong>{active.label}</strong>
        <span>{TYPE_LABELS[active.kind]||active.kind}</span>
        {active.date?<time>{String(active.date).slice(0,10)}</time>:null}
        {active.source?<span>{active.source}</span>:null}
        {active.text?<p>{active.text.slice(0,260)}</p>:null}
        {active.href?<a href={active.href} target={/^https?:/.test(active.href)?'_blank':undefined} rel={/^https?:/.test(active.href)?'noreferrer':undefined}>查看內容</a>:null}
      </article>:null}
    </>}

    <style jsx>{`
      .language-space-workspace{display:grid;gap:1rem}.language-space-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap}.language-space-heading h3{margin:0}.language-space-face-switch,.language-space-tools,.language-space-counts,.language-space-time-filter,.language-space-detail{display:flex;gap:.6rem;align-items:center;flex-wrap:wrap}.language-space-face-switch button[aria-pressed="true"]{font-weight:800}.language-space-tools{justify-content:space-between}.language-space-search{display:flex;gap:.5rem;align-items:end;flex:1;min-width:min(100%,320px)}.language-space-search label{display:grid;gap:.25rem;flex:1}.language-space-search input{min-width:0}.language-space-time-filter label{display:grid;gap:.25rem}.language-space-counts{font-size:.92rem;opacity:.8}.language-space-canvas{height:520px;border:1px solid currentColor;border-radius:16px;overflow:hidden}.language-space-canvas :global(canvas){width:100%!important;height:100%!important;touch-action:none}.language-space-detail{border-top:1px solid currentColor;padding-top:.8rem}.language-space-detail p{flex-basis:100%;margin:0}.language-space-detail a{margin-left:auto}.language-space-management{display:grid;gap:1rem}
      @media(max-width:780px){.language-space-canvas{height:420px}.language-space-search{flex-basis:100%}.language-space-detail a{margin-left:0}}
    `}</style>
  </section>;
}
