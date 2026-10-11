'use client';
import {useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {Sparkles} from '@react-three/drei';
import * as THREE from 'three';

// Eight distinct spatial magic auras + the separate ninth special group.
// These are not part of the glyph material or drawing-direction halo.
const COLORS=['#d2b2ff','#ffadd1','#8ff0b7','#a1e0ac','#c4d0ff','#ffc68d','#a5d7ff','#edaffc','#ffdfac'];
const COUNTS=[25,18,30,18,17,35,12,39,20];
const SPEED=[.23,.34,.55,.25,.19,.95,.16,1.14,.22];
function Ring({radius=1.7,color,rotation=[0,0,0],sides=120,opacity=.7}){
  return <mesh rotation={rotation}>
    <ringGeometry args={[radius-.012,radius+.012,sides]}/>
    <meshBasicMaterial color={color} transparent opacity={opacity}
      side={THREE.DoubleSide} depthWrite={false} toneMapped={false}/>
  </mesh>;
}
function Node({a,r=1.82,kind='ball',color='#e0ddfa',size=.12,z=0}){
  return <mesh position={[Math.cos(a)*r,Math.sin(a)*r,z]} rotation={[a*.35,a*.52,a]}>
    {kind==='crystal'?<octahedronGeometry args={[size,0]}/>:
     kind==='leaf'?<coneGeometry args={[size,size*3,3]}/>:
     kind==='chaos'?<tetrahedronGeometry args={[size,0]}/>:
     <sphereGeometry args={[size,10,8]}/>}
    <meshPhysicalMaterial color={color} metalness={.64} roughness={.2}
      emissive={color} emissiveIntensity={.23}/>
  </mesh>;
}
export default function RuneAuraFX({groupIndex=0}){
  const outer=useRef(),inner=useRef();
  const g=Math.min(8,Math.max(0,groupIndex|0)),color=COLORS[g];
  useFrame(({clock},delta)=>{
    const t=clock.elapsedTime;
    if(outer.current){
      outer.current.rotation.z+=delta*(g===7?-.24:.12);
      outer.current.rotation.y=Math.sin(t*.3+g)*.19;
      outer.current.rotation.x=Math.cos(t*.26+g)*.14;
      outer.current.scale.setScalar(1+.035*Math.sin(t*(g===7?3.2:1.2)));
    }
    if(inner.current){inner.current.rotation.z-=delta*(g===5?.48:.23);
      inner.current.rotation.y=Math.sin(t*.31)*.32;}
  });
  return <group ref={outer} position={[0,0,-.52]} scale={.9}>
    {g===0?<>
      <Ring radius={1.63} color="#eacfff"/>
      <group ref={inner} rotation={[.6,.3,0]}>
        <Ring radius={1.86} color="#c9b3ff" opacity={.38}/>
        <Ring radius={2.08} color="#f2d7fc" opacity={.26}/>
      </group>
    </>:null}
    {g===1?<group ref={inner}>
      {[0,1,2,3,4].map(i=><Ring key={i} radius={1.8} color="#ffbfdc"
        rotation={[0,i*Math.PI/5,i*.22]} opacity={.47}/>)}
      {Array.from({length:7},(_,i)=><Node key={i} a={i*Math.PI*2/7}
        color="#ffd5ec" size={.10} z={Math.sin(i)*.25}/>)}
    </group>:null}
    {g===2?<>
      <Ring radius={1.84} color="#8cf5bc" opacity={.54}/>
      {Array.from({length:8},(_,i)=><mesh key={i} rotation-z={i*Math.PI/4}>
        <sphereGeometry args={[.24,15,8]}/>
        <meshBasicMaterial transparent opacity={.34} color="#adffd2"/>
      </mesh>)}
      {Array.from({length:8},(_,i)=><Node key={i} a={i*Math.PI/4} color="#b5ffd2" size={.15}/>)}
    </>:null}
    {g===3?<group ref={inner}>
      {Array.from({length:13},(_,i)=><Node key={i} a={i*Math.PI*2/13}
        r={1.65+(i%3)*.16} z={Math.sin(i*2)*.34} kind="leaf"
        color={i%2?'#89d7b5':'#c5ee97'} size={.12}/>)}
      <Ring radius={1.93} color="#c3edb1" opacity={.45}/>
    </group>:null}
    {g===4?<group ref={inner}>
      {Array.from({length:12},(_,i)=><Node key={i} a={i*Math.PI/6} kind="crystal"
        z={Math.sin(i*2)*.43} color={i%2?'#b3bdff':'#ebdfff'}
        size={i%3===0?.24:.15}/>)}
      <Ring radius={2.0} color="#c5d0ff" opacity={.48}/>
    </group>:null}
    {g===5?<group ref={inner}>
      {['#ffb783','#a6d8ff','#fff0a0','#d8b9ff'].map((c,i)=><group key={c} rotation-z={i*Math.PI/2}>
        <Ring radius={1.7+i*.10} color={c} rotation={[i*.21,i*.3,0]}/>
        <Node a={i*Math.PI/2} r={1.65+i*.11} color={c} size={.18}/>
      </group>)}
    </group>:null}
    {g===6?<group ref={inner}>
      <Ring radius={1.77} color="#a1d8ff" sides={6} opacity={.9}/>
      <Ring radius={2.04} color="#dae9ff" sides={12} opacity={.6}
        rotation={[.19,.21,.22]}/>
      {Array.from({length:6},(_,i)=><Node key={i} a={i*Math.PI/3}
        r={1.78} color="#bde8ff" size={.09}/>)}
    </group>:null}
    {g===7?<group ref={inner}>
      {Array.from({length:20},(_,i)=><Node key={i} a={i*Math.PI*2/20}
        r={1.43+(i%5)*.19} z={Math.sin(i*4)*.46} kind="chaos"
        color={i%2?'#f6a9ff':'#9e8aea'} size={.11+(i%4)*.04}/>)}
      <Ring radius={1.81} color="#e0a0fa" sides={13} opacity={.6}/>
    </group>:null}
    {g===8?<group ref={inner}>
      <Ring radius={1.75} color="#ffe9bd" opacity={.75}/>
      <Ring radius={2.01} color="#f1d5a7" rotation={[.46,.19,0]} opacity={.49}/>
    </group>:null}
    <Sparkles count={COUNTS[g]} size={g===7?3.6:2.7} scale={[4.5,4.5,1.7]}
      speed={SPEED[g]} color={color}/>
  </group>;
}
