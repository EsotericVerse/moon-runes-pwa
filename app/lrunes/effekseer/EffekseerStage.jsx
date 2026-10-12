'use client';

import {useEffect,useRef,useState} from 'react';
import {AnimatePresence,motion,useReducedMotion} from 'motion/react';
import * as THREE from 'three';
import {runeGlyphProfile} from './rune-glyph-library.mjs';
import {runeEffectFor} from './rune-effect-library.mjs';

const SOURCE='/vendor/effekseer/';
const WASM=SOURCE+'effekseer.wasm';
// Only pre-authored Effekseer effects with semantically appropriate meanings.
// No custom emitters, particles, shaders, or synthetic effect substitutes.
let runtimePromise;
function loadRuntime(){
  if(typeof window==='undefined')return Promise.reject(new Error('僅支援瀏覽器'));
  if(window.effekseer)return Promise.resolve(window.effekseer);
  runtimePromise ||=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src=SOURCE+'effekseer.js';script.async=true;
    script.onload=()=>window.effekseer?resolve(window.effekseer):reject(Error('Effekseer 播放器未啟動'));
    script.onerror=()=>reject(Error('無法載入 Effekseer 播放器'));
    document.head.appendChild(script);
  }).catch(error=>{runtimePromise=null;throw error;});
  return runtimePromise;
}
let wasmPromise;
function readyRuntime(){
  wasmPromise ||=loadRuntime().then(api=>new Promise((resolve,reject)=>{
    let resolved=false;
    try{api.initRuntime(WASM,()=>{resolved=true;resolve(api);},error=>{
      if(!resolved)reject(new Error('Effekseer WebAssembly 載入失敗：'+String(error||'')));
    });}
    catch(error){reject(error);}
  })).catch(error=>{wasmPromise=null;throw error;});
  return wasmPromise;
}
function animationFor(word){
  // Text motion is handled by the existing Motion library; VFX are from Effekseer.
  if(word==='無')return{opacity:[0,1,0,0],scale:[.96,1,1,1]};
  if(word==='虛')return{opacity:[0,.85,.5,0],scale:[.85,1.08,.94,1]};
  if(word==='辰')return{opacity:[0,1,1,0],y:[12,0,0,-7]};
  if(word==='時')return{opacity:[0,1,1,0],y:[12,0,0,-7]};
  if(word==='緣')return{opacity:[0,1,1,0],y:[12,0,0,-7]};
  if(word==='幻')return{opacity:[0,1,.65,0],filter:['blur(12px)','blur(0px)','blur(5px)','blur(14px)']};
  return{opacity:[0,1,1,0],scale:[.76,1.04,1,.97],y:[28,0,0,-9]};
}
// These small semantic illustrations use the existing Motion library and Unicode
// pictograms. They are not particle systems or replacements for authored VFX.
function SemanticIllustration({word,reduced}){
  if(word==='啟')return <motion.span className="rune-effekseer-gesture rune-effekseer-gesture--awaken"
    aria-hidden="true" initial={reduced?false:{opacity:0,scale:.6,y:20}}
    animate={{opacity:1,scale:1,y:0}}
    transition={{duration:reduced?0:.55,delay:reduced?0:.55,ease:'backOut'}}>
      <span className="rune-effekseer-speech">💡</span>
    </motion.span>;
  if(!['緣','辰','時'].includes(word))return null;
  const actions={
    '緣':{rotate:[-13,10,-7,4,-2,0],scale:[1,1.03,1,1,1,1]},
    '辰':{scale:[.75,1.35,.8,1.2,1]},
    '時':{rotate:[0,0,180,180,360]}
  };
  return <motion.span aria-hidden="true" className="rune-effekseer-gesture rune-effekseer-gesture--hourglass"
    initial={reduced?false:{opacity:0,y:12}}
    animate={reduced?{opacity:1,y:0}:{opacity:[0,1,1,1],y:[12,0,0,0],...actions[word]}}
    transition={{duration:reduced?0:3.3,ease:'easeInOut'}} role="presentation">⌛</motion.span>;
}
function nameOf(rune){return String(rune?.rune_name||rune?.totem||'光').replace(/之符文$/,'').trim().slice(0,1)||'光';}
function EffekseerCanvas({effect,reduced,onReady}){
  const canvas=useRef(null);
  const [status,setStatus]=useState('正在啟動 Effekseer…');
  useEffect(()=>{
    let active=true,frame=0,observer;
    let renderer,context,clock;
    const target=canvas.current;
    if(reduced){setStatus('');onReady?.();return;}
    if(!effect){setStatus('');onReady?.();return;}
    (async()=>{
      try{
        const api=await readyRuntime();
        if(!active||!target)return;
        renderer=new THREE.WebGLRenderer({canvas:target,alpha:true,antialias:false,powerPreference:'high-performance'});
        renderer.setClearColor(0,0);
        const camera=new THREE.PerspectiveCamera(35,1,1,1000);
        camera.position.set(0,0,24);
        camera.lookAt(0,0,0);camera.updateMatrixWorld();
        const resize=()=>{
          const r=target.getBoundingClientRect();
          if(!r.width||!r.height)return;
          renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
          renderer.setSize(Math.round(r.width),Math.round(r.height),false);
          camera.aspect=r.width/r.height;camera.updateProjectionMatrix();camera.updateMatrixWorld();
        };
        resize();
        observer=new ResizeObserver(resize);
        observer.observe(target);
        context=api.createContext();
        context.init(renderer.getContext());
        // The effect data, materials and textures remain exactly as authored.
        const effectFile=effect.path;
        let loaded,started=false;
        loaded=context.loadEffect(effectFile,1,()=>{
          if(!active)return;
          setStatus('');
          try{context.play(loaded,0,0,0);started=true;}catch(error){setStatus('特效無法播放：'+String(error?.message||error));}
          onReady?.();
        },(message,url)=>{if(active){setStatus('特效素材載入失敗：'+String(message||url));onReady?.();}});
        clock=new THREE.Clock();
        let elapsed=0;
        const draw=()=>{
          if(!active)return;
          const delta=Math.min(clock.getDelta(),.05);
          if(started&&!document.hidden){
            elapsed+=delta;
            if(elapsed>=4.8){
              // One finite reveal, without a persistent blank WebGL animation loop.
              context.stopAll();
              renderer.clear();
              return;
            }
            context.update(delta*60);
            context.setProjectionMatrix(camera.projectionMatrix.elements);
            context.setCameraMatrix(camera.matrixWorldInverse.elements);
            renderer.clear();
            context.draw();
            renderer.resetState();
          }
          frame=requestAnimationFrame(draw);
        };
        draw();
      }catch(error){if(active){setStatus('Effekseer 無法啟動：'+String(error?.message||error));onReady?.();}}
    })();
    return()=>{
      active=false;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      try{context?.stopAll();}catch{}
      try{context?.release();}catch{}
      try{renderer?.dispose();}catch{}
    };
  },[effect,reduced]);
  return <div className="rune-effekseer-canvas-wrap">
    <canvas ref={canvas} className="rune-effekseer-canvas" aria-hidden="true"/>
    {status?<p className="rune-effekseer-status" role="status">{status}</p>:null}
  </div>;
}
export default function EffekseerStage({rune,onGlyphClick}){
  const reduced=useReducedMotion();
  const [replay,setReplay]=useState(0);
  const [visibleKey,setVisibleKey]=useState('');
  const word=nameOf(rune);
  const profile=runeGlyphProfile(rune);
  const key=String(rune?.rune_id??word)+'-'+word+'-'+replay;
  const effect=runeEffectFor(rune);
  const visualReady=reduced||!effect||visibleKey===key;
  return <div className="rune-effekseer-stage" data-source="effekseer" data-rune={word}>
    <EffekseerCanvas key={key} effect={effect} reduced={reduced} onReady={()=>setVisibleKey(key)}/>
    <div className="rune-effekseer-glyph-position">
      <AnimatePresence mode="wait">
        {visualReady?<motion.button key={key} type="button"
          className={'rune-effekseer-glyph rune-effekseer-glyph--'+profile.font}
          data-glyph-family={profile.family} data-glyph-finish={profile.finish}
          style={{'--rune-ink':profile.ink}}
          aria-label={'查看 '+word+' 之符文'} onClick={onGlyphClick}
          initial={reduced?false:{opacity:0,scale:.75}}
          animate={reduced?{opacity:1,scale:1}:animationFor(word)}
          exit={{opacity:0,transition:{duration:reduced?0:.12}}}
          transition={{duration:reduced?0:4.2,times:[0,.17,.78,1],ease:'easeInOut'}}>
          {word}
        </motion.button>:null}
      </AnimatePresence>
      {visualReady?<SemanticIllustration key={'gesture-'+key} word={word} reduced={reduced}/>:null}
      <span className="rune-effekseer-english">{rune?.english_name||''}</span>
    </div>
    <button type="button" className="rune-effekseer-replay" onClick={()=>setReplay(value=>value+1)}>重播文字與效果</button>
    <span className="rune-effekseer-source" aria-hidden="true">{rune?.group_name||''}</span>
  </div>;
}
