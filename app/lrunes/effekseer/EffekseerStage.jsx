'use client';

import {useEffect,useRef,useState} from 'react';
import {AnimatePresence,motion,useReducedMotion} from 'motion/react';
import * as THREE from 'three';

const SOURCE='/vendor/effekseer/';
const WASM='https://raw.githubusercontent.com/effekseer/EffekseerForWebGL/e8c3ce076644789918695b0cba0031461c817890/docs/effekseer.wasm';
// Only pre-authored Effekseer effects with semantically appropriate meanings.
// No custom emitters, particles, shaders, or synthetic effect substitutes.
const LIBRARY=Object.freeze({
  Radiance:'Light',Blessing:'Cure1',Wind:'Blow1',Water:'ToonWater'
});
const FONT_BY_GROUP=Object.freeze({
  '靈魂':'brush','連結':'brush','生命':'handwritten','自然':'brush',
  '礦物':'engraved','元素':'brush','秩序':'engraved','無序':'handwritten','特殊':'brush'
});
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
function glyphGroup(rune){return String(rune?.group_name||'元素').replace(/組$/,'');}
function EffekseerCanvas({effect,reduced}){
  const canvas=useRef(null);
  const [status,setStatus]=useState('正在啟動 Effekseer…');
  useEffect(()=>{
    let active=true,frame=0,observer;
    let renderer,context,clock;
    const target=canvas.current;
    if(reduced){setStatus('已依系統設定減少動畫');return;}
    if(!effect){setStatus('尚無語義相符的現成魔法效果');return;}
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
        const effectFile=SOURCE+'Resources/'+effect+'.efkefc';
        let loaded;
        loaded=context.loadEffect(effectFile,1,()=>{
          if(!active)return;
          setStatus('');
          context.play(loaded,0,0,0);
        },(message,url)=>{if(active)setStatus('特效素材載入失敗：'+String(message||url));});
        clock=new THREE.Clock();
        let elapsed=0;
        const draw=()=>{
          if(!active)return;
          frame=requestAnimationFrame(draw);
          const delta=Math.min(clock.getDelta(),.05);
          if(document.hidden)return;
          elapsed+=delta;
          if(elapsed>=4.8){
            // One brief appearance per selected Rune. Replay is explicit.
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
        };
        draw();
      }catch(error){if(active)setStatus('Effekseer 無法啟動：'+String(error?.message||error));}
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
  const word=nameOf(rune);
  const group=glyphGroup(rune);
  const key=String(rune?.rune_id??word)+'-'+word+'-'+replay;
  const effect=LIBRARY[String(rune?.english_name||'').trim()]||null;
  return <div className="rune-effekseer-stage" data-source="effekseer" data-rune={word}>
    <EffekseerCanvas key={key} effect={effect} reduced={reduced}/>
    <div className="rune-effekseer-glyph-position">
      <AnimatePresence mode="wait">
        <motion.button key={key} type="button"
          className={'rune-effekseer-glyph rune-effekseer-glyph--'+(FONT_BY_GROUP[group]||'handwritten')}
          aria-label={'查看 '+word+' 之符文'} onClick={onGlyphClick}
          initial={reduced?false:{opacity:0,scale:.75}}
          animate={reduced?{opacity:1,scale:1}:animationFor(word)}
          exit={{opacity:0}}
          transition={{duration:reduced?0:4.2,times:[0,.17,.78,1],ease:'easeInOut'}}>
          {word}
        </motion.button>
      </AnimatePresence>
      <SemanticIllustration key={'gesture-'+key} word={word} reduced={reduced}/>
      <span className="rune-effekseer-english">{rune?.english_name||''}</span>
    </div>
    <button type="button" className="rune-effekseer-replay" onClick={()=>setReplay(value=>value+1)}>重播文字與效果</button>
    <p className="rune-effekseer-source">
      {effect?'Effekseer · '+effect+'.efkefc':'文字動畫展示 · 尚未匹配適當的現成效果'}
    </p>
  </div>;
}
