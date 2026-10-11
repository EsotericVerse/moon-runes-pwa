'use client';

import {Component,useEffect,useMemo,useRef,useState} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {OrbitControls,Sparkles,Stars} from '@react-three/drei';
import {EffectComposer,Bloom} from '@react-three/postprocessing';
import * as THREE from 'three';
import * as opentype from 'opentype.js';
import RuneAuraFX from './RuneAuraFX';

const FONT_URL='https://raw.githubusercontent.com/google/fonts/main/ofl/notoseriftc/NotoSerifTC%5Bwght%5D.ttf';
let fontPromise;
function loadRuneFont(){
  fontPromise ||= fetch(FONT_URL).then(response=>{
    if(!response.ok)throw Error('符文字型未能下載');
    return response.arrayBuffer();
  }).then(buffer=>opentype.parse(buffer)).catch(()=>null);
  return fontPromise;
}
const GROUP_COLORS=['#d6b5fa','#ffbbce','#8be8bb','#bce9a2','#c8d0ff','#ffc98b','#98caff','#e2a5e8','#e8d5af'];
function glyphName(card){
  return String(card?.rune_name||card?.label||'').replace(/之符文$/,'').trim().slice(0,1)||'月';
}
function gradientTexture(){
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
  const ctx=canvas.getContext('2d');
  const gradient=ctx.createRadialGradient(64,64,3,64,64,64);
  gradient.addColorStop(0,'rgba(220,191,255,.42)');
  gradient.addColorStop(.32,'rgba(137,112,232,.23)');
  gradient.addColorStop(1,'rgba(70,45,172,0)');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  return new THREE.CanvasTexture(canvas);
}
function labelTexture(text,foreground='#f8efdf'){
  const canvas=document.createElement('canvas');canvas.width=384;canvas.height=160;
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,384,160);ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.shadowColor='#f7deff';ctx.shadowBlur=22;ctx.fillStyle=foreground;
  const max=text.length>4?43:58;
  ctx.font='700 '+max+'px "Noto Serif TC","PingFang TC",serif';
  ctx.fillText(text,192,80,372);
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  return texture;
}
function makeGlyphGeometry(font,text){
  if(!font||!text)return null;
  const path=font.getPath(text,0,0,1000,{kerning:false});
  const outline=new THREE.ShapePath();
  for(const c of path.commands){
    if(c.type==='M')outline.moveTo(c.x,c.y);
    else if(c.type==='L')outline.lineTo(c.x,c.y);
    else if(c.type==='Q')outline.quadraticCurveTo(c.x1,c.y1,c.x,c.y);
    else if(c.type==='C')outline.bezierCurveTo(c.x1,c.y1,c.x2,c.y2,c.x,c.y);
    else if(c.type==='Z')outline.currentPath?.closePath();
  }
  const shapes=outline.toShapes(false);
  if(!shapes.length)return null;
  const geometry=new THREE.ExtrudeGeometry(shapes,{
    depth:63,steps:1,bevelEnabled:true,bevelThickness:18,bevelSize:12,
    bevelSegments:3,curveSegments:4
  });
  geometry.computeBoundingBox();
  const box=geometry.boundingBox;
  const width=box.max.x-box.min.x,height=box.max.y-box.min.y;
  if(!width||!height){geometry.dispose();return null;}
  const scale=1.85/Math.max(width,height);
  geometry.scale(scale,-scale,scale);
  geometry.center();geometry.computeVertexNormals();
  return geometry;
}
function useFont(){
  const [font,setFont]=useState(null);
  useEffect(()=>{let active=true;loadRuneFont().then(value=>{if(active)setFont(value);});return()=>{active=false;};},[]);
  return font;
}
function Moon({onTap}){
  const sphere=useRef();
  useFrame(({clock})=>{
    if(sphere.current)sphere.current.rotation.y=clock.elapsedTime*.017;
  });
  return <group position={[0,.1,-.65]} onClick={e=>{e.stopPropagation();onTap?.();}}>
    <mesh ref={sphere}>
      <sphereGeometry args={[1.04,64,64]}/>
      <meshPhysicalMaterial color="#dedaf5" roughness={.56} metalness={.07} clearcoat={.18}
        emissive="#7274af" emissiveIntensity={.38}/>
    </mesh>
    <mesh scale={1.23}>
      <sphereGeometry args={[1.03,36,36]}/>
      <meshBasicMaterial color="#acb8ff" transparent opacity={.085} depthWrite={false} blending={THREE.AdditiveBlending}/>
    </mesh>
    <pointLight color="#ced8ff" intensity={25} distance={18} decay={2}/>
    <pointLight position={[.6,.7,1.3]} color="#fff7de" intensity={10} distance={9}/>
    <Sparkles count={55} scale={[3.5,3.5,3.5]} size={2.6} speed={.28} color="#f4e3c6"/>
  </group>;
}
function StarField(){
  return <group>
    <Stars radius={80} depth={35} count={3600} factor={3} saturation={.34} fade speed={.14}/>
    <Sparkles count={230} scale={[13,8,9]} size={2.2} speed={.2} color="#d0c7ff"/>
  </group>;
}
function Nebula(){
  const group=useRef();
  const texture=useMemo(()=>typeof document==='undefined'?null:gradientTexture(),[]);
  const clouds=useMemo(()=>Array.from({length:29},(_,i)=>({
    x:Math.sin(i*1.79)*6.0,y:Math.cos(i*2.29)*3.2,
    z:-1.8+(i%7)*.55,scale:1.7+(i%5)*.57,phase:i*.73
  })),[]);
  useFrame(({clock})=>{
    if(!group.current)return;
    const t=clock.elapsedTime;
    for(let i=0;i<group.current.children.length;i++){
      const cloud=group.current.children[i],seed=clouds[i];
      cloud.position.x=seed.x+Math.sin(t*.09+seed.phase)*.55;
      cloud.position.y=seed.y+Math.cos(t*.13+seed.phase)*.27;
      cloud.rotation.z=Math.sin(t*.07+seed.phase)*.25;
    }
  });
  useEffect(()=>()=>texture?.dispose(),[texture]);
  if(!texture)return null;
  return <group ref={group}>
    {clouds.map((seed,i)=><mesh key={i} position={[seed.x,seed.y,seed.z]} scale={[seed.scale*2,seed.scale,1]}>
      <planeGeometry args={[1,1]}/>
      <meshBasicMaterial map={texture} transparent opacity={.33+(i%3)*.055}
        depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending}/>
    </mesh>)}
  </group>;
}
const FLOW_POINTS=[
  [-2.6,-3.7,1.0],[-.1,-3.1,1.25],[2.0,-2.6,.8],
  [2.2,-1.55,.25],[-1.0,-1.12,.6],[-1.6,-.05,.15],
  [1.1,.7,.0],[.25,1.6,-.5],[0,2.4,-.5]
];
function EnergyRiver({visible=false}){
  const curve=useMemo(()=>new THREE.CatmullRomCurve3(FLOW_POINTS.map(p=>new THREE.Vector3(...p))),[]);
  const ribbons=useMemo(()=>Array.from({length:6},(_,i)=>{
    const shifted=new THREE.CatmullRomCurve3(FLOW_POINTS.map((p,k)=>new THREE.Vector3(
      p[0]+Math.sin(k*.95+i*2.2)*(.065+i*.025),
      p[1],p[2]+Math.cos(k*1.34+i)*(.06+i*.035)
    )));
    return new THREE.TubeGeometry(shifted,180,.012+i*.006,6,false);
  }),[]);
  const embers=useRef();
  useFrame(({clock})=>{
    const t=clock.elapsedTime;
    if(!embers.current)return;
    embers.current.children.forEach((m,i)=>{
      const v=(t*(.055+i%4*.016)+i/embers.current.children.length)%1;
      m.position.copy(curve.getPointAt(v));
      m.scale.setScalar(.65+.45*Math.sin(t*2+i));
    });
  });
  useEffect(()=>()=>ribbons.forEach(g=>g.dispose()),[ribbons]);
  if(!visible)return null;
  return <group>
    {ribbons.map((geometry,i)=><mesh key={i} geometry={geometry}>
      <meshBasicMaterial color={i%2?'#f0c789':'#d5baf2'} transparent opacity={.46}
        blending={THREE.AdditiveBlending} depthWrite={false}/>
    </mesh>)}
    <group ref={embers}>{Array.from({length:55},(_,i)=><mesh key={i}>
      <sphereGeometry args={[i%5===0?.044:.019,7,7]}/>
      <meshBasicMaterial color={i%3?'#ffe8ac':'#e3bfff'} toneMapped={false}/>
    </mesh>)}</group>
    <Sparkles count={170} scale={[5,7,3]} position={[0,-.8,0]} speed={.45} size={2.4} color="#ead4a9"/>
  </group>;
}
function OrbitPath({radius=3.45}){
  const ref=useRef();
  useFrame(({clock})=>{if(ref.current)ref.current.rotation.z=clock.elapsedTime*.017;});
  return <group rotation-x={.22} ref={ref}>
    <mesh>
      <torusGeometry args={[radius,.012,6,192]}/>
      <meshBasicMaterial color="#b8a4e2" transparent opacity={.42}/>
    </mesh>
    <mesh rotation-z={.15}>
      <torusGeometry args={[radius+.07,.006,5,192]}/>
      <meshBasicMaterial color="#e4c58e" transparent opacity={.26}/>
    </mesh>
  </group>;
}
function GroupOrb({group,index,total,onClick}){
  const ref=useRef(),pulse=useRef(0);
  const texture=useMemo(()=>typeof document==='undefined'?null:labelTexture(String(group.name||group.group_id||group.label||index+1)),[group.name,group.group_id,group.label,index]);
  const color=GROUP_COLORS[index%GROUP_COLORS.length];
  useFrame(({clock,camera},delta)=>{
    if(!ref.current)return;
    const t=clock.elapsedTime;
    const angle=2*Math.PI*index/Math.max(1,total)+t*.115;
    ref.current.position.set(Math.cos(angle)*3.55,Math.sin(angle)*2.3+.23*Math.sin(t*.8+index),Math.sin(angle)*2.35);
    ref.current.quaternion.copy(camera.quaternion);
    pulse.current=Math.max(0,pulse.current-delta*1.7);
    const s=1+Math.sin(t*1.5+index)*.028+pulse.current*.18;
    ref.current.scale.setScalar(s);
  });
  useEffect(()=>()=>texture?.dispose(),[texture]);
  return <group ref={ref} onClick={e=>{e.stopPropagation();pulse.current=1;onClick?.(group);}}
    onPointerOver={()=>{document.body.style.cursor='pointer';}}
    onPointerOut={()=>{document.body.style.cursor='';}}>
    <mesh>
      <icosahedronGeometry args={[.53,5]}/>
      <meshPhysicalMaterial color={color} metalness={.48} roughness={.14} clearcoat={1}
        clearcoatRoughness={.08} emissive={color} emissiveIntensity={.28}/>
    </mesh>
    <mesh rotation-z={index*.31}>
      <torusGeometry args={[.77,.019,9,90]}/>
      <meshBasicMaterial color={color} toneMapped={false}/>
    </mesh>
    <mesh rotation-y={Math.PI/2.8}>
      <torusGeometry args={[.69,.008,7,90]}/>
      <meshBasicMaterial color="#ffe9bc" transparent opacity={.58}/>
    </mesh>
    {texture?<sprite position={[0,0,.61]} scale={[.98,.42,1]}>
      <spriteMaterial map={texture} transparent depthWrite={false} toneMapped={false}/>
    </sprite>:null}
    <Sparkles count={10} scale={1.5} speed={.45} size={2.1} color={color}/>
  </group>;
}
function GroupOrbits({items,onSelect}){
  return <group>
    <OrbitPath radius={3.55}/>
    {items.map((group,i)=><GroupOrb key={group.id||group.group_id||i} group={group} index={i} total={items.length} onClick={onSelect}/>)}
  </group>;
}
const DIRECTION_RING={
  '正位':['#359cff',false],'半正位':['#91c9ff',true],
  '半逆位':['#ffa2b4',true],'逆位':['#ff436a',false]
};
function RuneShape({card,font,color}){
  const glyph=glyphName(card);
  const geometry=useMemo(()=>makeGlyphGeometry(font,glyph),[font,glyph]);
  const texture=useMemo(()=>typeof document==='undefined'?null:labelTexture(glyph,'#f5dfb2'),[glyph]);
  useEffect(()=>()=>{geometry?.dispose();texture?.dispose();},[geometry,texture]);
  return <group>
    {geometry?<mesh geometry={geometry} rotation-y={.045}>
      <meshPhysicalMaterial color={color} metalness={.67} roughness={.22} clearcoat={1}
        clearcoatRoughness={.1} emissive={color} emissiveIntensity={.12}/>
    </mesh>:<group>
      <mesh>
        <boxGeometry args={[1.65,1.85,.18]}/>
        <meshPhysicalMaterial color="#282841" metalness={.5} roughness={.18} clearcoat={1}/>
      </mesh>
      {texture?<mesh position={[0,0,.1]}>
        <planeGeometry args={[1.55,1.54]}/>
        <meshBasicMaterial map={texture} transparent toneMapped={false}/>
      </mesh>:null}
    </group>}
  </group>;
}
function RuneActor({item,index,total,font,mode,onSelect,quality='high'}){
  const root=useRef(),bounce=useRef(0);
  const phase=useRef(index*.73);
  const card=item.card||item;
  const color=GROUP_COLORS[(Number(card.rune_id)>=1&&Number(card.rune_id)<=64?Math.floor((Number(card.rune_id)-1)/8):8)%9];
  const halo=item.direction?DIRECTION_RING[item.direction]:null;
  const birth=Number(item.birth||0);
  const elapsed=useRef(0);
  const wasNew=useRef(false);
  useEffect(()=>{elapsed.current=0;wasNew.current=Boolean(birth);},[birth]);
  useFrame(({clock,camera},delta)=>{
    if(!root.current)return;
    const t=clock.elapsedTime;
    elapsed.current+=delta;
    bounce.current=Math.max(0,bounce.current-delta*2.4);
    const angle=index*Math.PI*2/Math.max(total,1)+t*(mode==='draw'?.13:.105);
    const radius=total===1?2.05:total===2?2.45:total<=8?3.5:3.85;
    const orbit=new THREE.Vector3(Math.cos(angle)*radius,Math.sin(angle)*Math.min(radius*.65,2.45),Math.sin(angle)*2.1);
    if(mode==='draw'&&wasNew.current&&elapsed.current<1.05){
      const v=Math.min(1,elapsed.current/1.05);
      const eased=v*v*(3-2*v);
      const start=new THREE.Vector3(0,-4.8,2.3),mid=new THREE.Vector3(-2.3,-1.5,2.8);
      const curve=new THREE.QuadraticBezierCurve3(start,mid,orbit);
      root.current.position.copy(curve.getPoint(eased));
      root.current.scale.setScalar(.24+eased*.76);
    }else{
      root.current.position.copy(orbit);
      root.current.scale.setScalar(1+bounce.current*.16);
    }
    root.current.position.y+=Math.sin(t*1.3+phase.current)*.17+bounce.current*.45;
    root.current.quaternion.copy(camera.quaternion);
    root.current.rotation.z+=Math.sin(t*.9+index)*.045;
  });
  return <group ref={root} onClick={e=>{e.stopPropagation();bounce.current=1;onSelect?.(card);}}
    onPointerOver={()=>{document.body.style.cursor='pointer';}}
    onPointerOut={()=>{document.body.style.cursor='';}}>
    <RuneShape card={card} font={font} color={color}/>
    <RuneAuraFX groupIndex={Number(card.rune_id)>=1&&Number(card.rune_id)<=64?Math.floor((Number(card.rune_id)-1)/8):8}/>
    <mesh position={[0,0,-.25]}>
      <torusGeometry args={[1.35,.018,10,90]}/>
      <meshBasicMaterial color={color} transparent opacity={.48} toneMapped={false}/>
    </mesh>
    {halo&&!halo[1]?<mesh position={[0,0,-.1]}>
      <torusGeometry args={[1.23,.026,10,halo[1]?24:120,Math.PI*2]}/>
      <meshBasicMaterial color={halo[0]} toneMapped={false} transparent opacity={.9}/>
    </mesh>:null}
    {halo&&halo[1]?Array.from({length:8},(_,i)=><mesh key={i} position={[0,0,-.085]} rotation-z={i*Math.PI/4}>
      <torusGeometry args={[1.23,.036,5,9,Math.PI/9]}/>
      <meshBasicMaterial color={halo[0]} toneMapped={false}/>
    </mesh>):null}
    {card?.moon_phase?<group position={[1.05,1.15,.15]}>
      <mesh>
        <sphereGeometry args={[.19,20,20]}/>
        <meshStandardMaterial color="#eee4cb" emissive="#c6bdff" emissiveIntensity={.27}/>
      </mesh>
      <mesh position={[0,0,.18]}><planeGeometry args={[.29,.29]}/>
        <meshBasicMaterial color="#fcf1cf" transparent opacity={.1}/></mesh>
    </group>:null}
    {quality==='high'?<Sparkles count={15} scale={[3.5,3.2,1.4]} speed={.5} size={2.6} color={color}/>:null}
  </group>;
}
function OrbitingRunes({items,mode,onSelect,quality}){
  const font=useFont();
  return <group>
    <OrbitPath radius={items.length>2?3.5:2.45}/>
    {items.map((item,i)=><RuneActor key={(item.card||item).rune_id} item={item} index={i}
      total={items.length} mode={mode} font={font} quality={quality} onSelect={onSelect}/>)}
  </group>;
}
function Scene({mode,items,onSelect,onBackgroundClick,quality}){
  const {camera}=useThree();
  useEffect(()=>{camera.position.set(0,.15,12.8);camera.lookAt(0,0,0);},[camera]);
  return <>
    <color attach="background" args={['#080b1d']}/>
    <fog attach="fog" args={['#080b1d',12,38]}/>
    <ambientLight intensity={.45}/>
    <hemisphereLight args={['#a3b6ff','#1c1633',1.3]}/>
    <directionalLight position={[-4,6,6]} intensity={2.3} color="#f6e1ae"/>
    <StarField/>
    <Nebula/>
    <Moon onTap={mode==='draw'?onBackgroundClick:undefined}/>
    <EnergyRiver visible={mode==='draw'} />
    {mode==='groups'?<GroupOrbits items={items} onSelect={onSelect}/>:
      <OrbitingRunes items={items} mode={mode} onSelect={onSelect} quality={quality}/>}
    <OrbitControls enablePan={false} enableZoom minDistance={10.5} maxDistance={17}
      minPolarAngle={Math.PI*.25} maxPolarAngle={Math.PI*.75} enableDamping dampingFactor={.045}/>
    {quality==='high'?<EffectComposer multisampling={0}><Bloom mipmapBlur intensity={.9} luminanceThreshold={.58} luminanceSmoothing={.25}/></EffectComposer>:null}
  </>;
}
class RuneSceneBoundary extends Component {
  constructor(props){super(props);this.state={error:null};}
  static getDerivedStateFromError(error){return {error};}
  componentDidCatch(error){console.error('LunaRunes WebGL scene failed',error);}
  render(){
    if(this.state.error)return <div className="rune-world-failed" role="alert">
      即時 3D 場景無法在此裝置啟動，請確認瀏覽器支援 WebGL。
      <a href={this.props.mode==='draw'?'/duel/one/':'/list/'}>返回原有頁面</a>
    </div>;
    return this.props.children;
  }
}
export default function RuneWorld({mode='groups',items=[],onSelect,onBackgroundClick,quality='high'}){
  return <div className="rune-world-canvas" data-renderer="threejs">
    <RuneSceneBoundary mode={mode}>
    <Canvas camera={{position:[0,.15,12.8],fov:45}} dpr={quality==='high'?[1.5,2]:[1,1.5]}
      gl={{antialias:true,alpha:false,powerPreference:'high-performance'}}
      onCreated={({gl})=>{gl.toneMapping=THREE.ACESFilmicToneMapping;}}
      onPointerMissed={()=>onBackgroundClick?.()}
      fallback={<div className="rune-world-failed" role="alert">
        此瀏覽器無法啟動 WebGL 真 3D。<a href={mode==='draw'?'/duel/one/':'/list/'}>開啟原版頁面</a>
      </div>}>
      <Scene mode={mode} items={items} onSelect={onSelect} onBackgroundClick={onBackgroundClick} quality={quality}/>
    </Canvas>
    </RuneSceneBoundary>
  </div>;
}
