'use client';
// Adapted directly from pmndrs/examples official complete template:
// https://github.com/pmndrs/examples/blob/main/examples/environment-blur-and-transitions/src/App.tsx
// Original: Environment, AccumulativeShadows, RandomizedLight, Center,
// OrbitControls, mesh and material preserved. Only Leva controls are replaced
// by incoming application parameters. No custom effect/geometry/animation code.
import {useState,useTransition} from 'react';
import {Canvas} from '@react-three/fiber';
import {AccumulativeShadows,RandomizedLight,Center,Environment,OrbitControls} from '@react-three/drei';

export default function OfficialEnvironmentExample({preset='night',blur=.65,roughness=1}){
  return <Canvas shadows camera={{position:[0,0,4.5],fov:50}}>
    <group position={[0,-.65,0]}>
      <Sphere roughness={roughness}/>
      <AccumulativeShadows temporal frames={200} color="purple" colorBlend={.5}
        opacity={1} scale={10} alphaTest={.75}>
        <RandomizedLight amount={8} radius={5} ambient={.5}
          position={[5,3,2]} bias={.001}/>
      </AccumulativeShadows>
    </group>
    <Env preset={preset} blur={blur}/>
    <OrbitControls autoRotate autoRotateSpeed={4} enablePan={false}
      enableZoom={false} minPolarAngle={Math.PI/2.1} maxPolarAngle={Math.PI/2.1}/>
  </Canvas>;
}
function Sphere({roughness}){
  return <Center top>
    <mesh castShadow>
      <sphereGeometry args={[.75,64,64]}/>
      <meshStandardMaterial metalness={1} roughness={roughness}/>
    </mesh>
  </Center>;
}
function Env({preset,blur}){
  // Match the official example's React transition for HDRI preset changes.
  const [activePreset,setActivePreset]=useState(preset);
  const [,startTransition]=useTransition();
  if(activePreset!==preset)startTransition(()=>setActivePreset(preset));
  return <Environment background preset={activePreset} backgroundBlurriness={blur}/>;
}
