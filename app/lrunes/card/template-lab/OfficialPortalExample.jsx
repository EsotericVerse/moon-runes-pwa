'use client';
// Adapted from complete pmndrs official portals example (not a custom scene):
// https://github.com/pmndrs/examples/blob/main/examples/portals/src/App.tsx
// Its original GLB, nested MeshPortalMaterial scenes, Float, PivotControls,
// ContactShadows, Environment and OrbitControls are preserved.
// Leva controls are replaced by application-level preset parameters.
import {useState} from 'react';
import {Canvas} from '@react-three/fiber';
import {useGLTF,PivotControls,MeshPortalMaterial,Sky,Environment,
  OrbitControls,Float,ContactShadows} from '@react-three/drei';

// Same original official model; served as an external original GLB asset.
// Avoid re-implementing meshes or writing model-generation code.
const MODEL_URL='https://raw.githubusercontent.com/pmndrs/examples/main/examples/portals/src/ao_shapes.glb';
function Model({name,floatIntensity=10,...props}){
  const {nodes}=useGLTF(MODEL_URL);
  const [hovered,hover]=useState(false);
  return <Float {...props} rotationIntensity={2} floatIntensity={floatIntensity} speed={1}>
    <mesh onPointerOver={e=>(e.stopPropagation(),hover(true))}
      onPointerOut={()=>hover(false)}
      geometry={nodes[name].geometry} material={nodes[name].material}
      material-color={hovered?'lightgreen':'white'} rotation={[Math.PI/2,0,0]}/>
  </Float>;
}
useGLTF.preload(MODEL_URL);

export default function OfficialPortalExample({worldUnits=false,portal1=.25,portal2=.25,envBlur=.2}){
  return <Canvas camera={{position:[8,-3,10],fov:75}}>
    <Sky/>
    <ambientLight intensity={.7*Math.PI}/>
    <spotLight position={[10,10,10]} intensity={Math.PI} decay={0} angle={.5} penumbra={1}/>
    <pointLight position={[-10,-10,-10]} intensity={Math.PI} decay={0}/>
    <group position={[0,-2,0]}>
      <Model scale={1.5} position={[0,3,0]} rotation={[0,Math.PI,0]} name="VR_Headset"/>
      <ContactShadows renderOrder={-100} position={[0,-2,0]} opacity={.5}
        blur={1.5} far={10} scale={50}/>
      <PivotControls offset={[0,5,-5]} scale={3} activeAxes={[true,true,false]}>
        <mesh position={[0,5,-5]}>
          <circleGeometry args={[7,64]}/>
          <MeshPortalMaterial worldUnits={worldUnits} transparent blur={portal1} resolution={512}>
            <ambientLight intensity={.7*Math.PI}/>
            <Model scale={.4} position={[0,0,-2.55]} name="Headphones" floatIntensity={30}/>
            <Environment preset="city" background backgroundBlurriness={envBlur}/>
            <mesh position={[0,0,-10]}>
              <circleGeometry args={[5,64]}/>
              <MeshPortalMaterial transparent blur={portal2} resolution={512}>
                <ambientLight intensity={.7*Math.PI}/>
                <Model scale={.15} position={[0,-1,-10]} rotation={[0,0,0]}
                  name="Roundcube001" floatIntensity={100}/>
                <Environment preset="dawn" background backgroundBlurriness={envBlur}/>
              </MeshPortalMaterial>
            </mesh>
          </MeshPortalMaterial>
        </mesh>
      </PivotControls>
    </group>
    <OrbitControls makeDefault/>
  </Canvas>;
}
