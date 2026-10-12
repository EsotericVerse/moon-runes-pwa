'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {AnimatePresence,motion,useReducedMotion} from 'motion/react';
import * as THREE from 'three';
import {runeGlyphProfile} from './rune-glyph-library.mjs';
import {runeEffectFor} from './rune-effect-library.mjs';
import {runeIconFor} from './rune-semantic-icons.mjs';

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
  if(word==='虛')return{opacity:[0,.9,.7,0],scale:[1.3,1,.42,0]};
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
// Choreography is a Motion transform on pre-authored pictograms, never DIY particles.
// The stage effect always comes from the distinct licensed Effekseer package.
function iconMotionFor(word){
  const base={opacity:[0,.93,.93,0],scale:[.8,1,1,1]};
  const visual={
    '悟':{scale:[.42,.78,1.24,1],opacity:[0,.55,1,0]},
    '誤':{x:[-24,17,-10,0],rotate:[-14,15,-8,0]},
    '老':{scale:[1.19,1.02,.91,.83],y:[-12,0,15,26]},
    '韻':{scale:[.61,1.22,.8,1.12],opacity:[0,1,.57,0]},
    '葉':{x:[-34,-8,18,0],rotate:[-18,12,-9,0]},
    '草':{y:[45,10,-5,0],scale:[.22,.57,1.11,1]},
    '根':{scaleY:[.07,.37,.75,1],y:[-32,-18,-7,0]},
    '枝':{scaleX:[.18,.49,.86,1.12]},
    '金':{scale:[.61,.93,1.14,1]},
    '玉':{scale:[.84,1.06,.95,1],rotate:[-7,0,2,0]},
    '晶':{scale:[.68,.91,1.08,1],rotate:[-8,-2,4,0]},
    '地':{scale:[.49,.77,.95,1],y:[22,7,1,0]},
    '石':{y:[-65,-14,5,0],rotate:[-9,0,2,0]},
    '鑽':{scale:[.95,1,1,1],opacity:[0,.67,1,0]},
    '礦':{scale:[.43,.68,.88,1],opacity:[0,.38,.75,0]},
    '塵':{x:[-42,-6,40,78],y:[30,5,-12,-31]},
    '火':{y:[33,8,-12,-31],scale:[.66,.86,1,1.05]},
    '氣':{x:[-77,-20,36,96]},
    '日':{scale:[.38,.73,1.05,1],opacity:[0,.67,1,0]},
    '月':{scale:[.95,1,1,1],y:[28,8,0,-3]},
    '星':{x:[50,25,-22,-76],y:[-90,-14,100,170],rotate:[25,28,34,38]},
    '辰':{scale:[.65,1.28,.84,1]},
    '明':{filter:['blur(10px)','blur(3px)','blur(0px)','blur(0px)']},
    '時':{rotate:[0,90,270,360]},
    '空':{scale:[.52,.77,1.16,1.3]},
    '因':{scale:[.38,.67,.93,1],rotate:[-17,-7,0,0]},
    '禍':{scale:[.72,1.2,.87,1],rotate:[-12,8,-4,0]},
    '無':{opacity:[0,.75,.22,0],scale:[1,1,.96,.96]},
    '幻':{filter:['blur(9px)','blur(0px)','blur(4px)','blur(12px)']},
    '緣':{rotate:[-18,13,-6,0]},
    '虛':{scale:[1.27,1,.38,0]},
    '果':{x:[-51,-11,2,0],scale:[.55,.86,1.06,1]},
    '玄':{x:[-18,22,-11,0],rotate:[-23,37,-29,16],scale:[.7,1.2,.87,1]},
    '命':{scale:[.48,.93,1.05,1],rotate:[-75,-18,0,0]},
  };
  return {...base,...(visual[word]||{})};
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
          try{
             const handle=context.play(loaded,0,0,0);
             const tuning=effect.tuning;
             if(tuning?.scale)handle.setScale(tuning.scale,tuning.scale,tuning.scale);
             if(tuning?.rotationZ!==undefined)handle.setRotation(0,0,tuning.rotationZ);
             if(tuning?.speed)handle.setSpeed(tuning.speed);
             started=true;
           }catch(error){setStatus('特效無法播放：'+String(error?.message||error));}
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
  const effect=useMemo(()=>runeEffectFor(rune),[rune?.english_name]);
  const semanticIcon=runeIconFor(rune);
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
      {visualReady&&semanticIcon?<motion.img key={'meaning-'+key} className="rune-effekseer-meaning-icon"
        src={semanticIcon} alt="" aria-hidden="true"
        initial={reduced?false:{opacity:0,scale:.8}}
        animate={reduced?{opacity:1,scale:1}:iconMotionFor(word)}
        transition={{duration:reduced?0:4.2,times:[0,.15,.78,1],ease:'easeInOut'}}/>:null}
      {visualReady?<SemanticIllustration key={'gesture-'+key} word={word} reduced={reduced}/>:null}
      <span className="rune-effekseer-english">{rune?.english_name||''}</span>
    </div>
    <button type="button" className="rune-effekseer-replay" onClick={()=>setReplay(value=>value+1)}>重播文字與效果</button>
    <span className="rune-effekseer-source" aria-hidden="true">{rune?.group_name||''}</span>
  </div>;
}
