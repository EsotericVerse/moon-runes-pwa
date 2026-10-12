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
        let loaded,started=false,playingHandle=null;
        const extras=[];
        loaded=context.loadEffect(effectFile,1,()=>{
          if(!active)return;
          setStatus('');
          try{
             const handle=context.play(loaded,0,0,0);
             playingHandle=handle;
             const tuning=effect.tuning;
             if(tuning?.scale)handle.setScale(tuning.scale,tuning.scale,tuning.scale);
             if(tuning?.rotationZ!==undefined)handle.setRotation(0,0,tuning.rotationZ);
             if(tuning?.speed)handle.setSpeed(tuning.speed);
             if(tuning?.color)handle.setAllColor(...tuning.color);
             started=true;
             // Overlay authored assets only when the base effect has loaded successfully.
             for(const overlay of effect.overlays||[]){
               let authoredOverlay;
               authoredOverlay=context.loadEffect(overlay.path,1,()=>{
                 if(!active||!started)return;
                 try{
                   const other=context.play(authoredOverlay,0,0,0);
                   if(overlay.role==='mirror-surface'){
                     other.setScale(-1.2,1.5,1.2);
                     other.setAllColor(236,239,242,180);
                   }
                   else if(overlay.role.startsWith('cross-')){
                     other.setScale(1.65,1.65,1.65);
                     other.setRotation(0,0,overlay.role==='cross-forward'?Math.PI/4:-Math.PI/4);
                     other.setAllColor(255,70,78,255);
                   }else if(overlay.role==='jade-reflection'){
                     other.setScale(1.3,1.05,1.3);
                     other.setAllColor(113,233,154,155);
                   }else if(overlay.role==='dust-left'||overlay.role==='dust-right'){
                     const sign=overlay.role==='dust-left'?-1:1;
                     other.setScale(.8,.95,.8);
                     other.setLocation(sign*.45,-.15,0);
                     other.setAllColor(188,181,165,95);
                   }else if(overlay.role==='root-outer-left'||overlay.role==='root-outer-right'){
                     const sign=overlay.role==='root-outer-left'?-1:1;
                     other.setScale(.55,1.35,.6);
                     other.setRotation(0,0,sign*.75);
                     other.setAllColor(131,100,72,225);
                   }else if(overlay.role==='branch-outer-left'||overlay.role==='branch-outer-right'){
                     const sign=overlay.role==='branch-outer-left'?-1:1;
                     other.setScale(.65,1.2,.65);
                     other.setRotation(0,0,sign*.8);
                     other.setAllColor(140,207,130,225);
                   }else if(overlay.role==='root-left'||overlay.role==='root-right'){
                     const sign=overlay.role==='root-left'?-1:1;
                     other.setScale(.7,.9,.7);
                     other.setRotation(0,0,sign*.52);
                     other.setLocation(sign*.35,.2,0);
                     other.setAllColor(151,121,88,255);
                   }else if(overlay.role==='branch-left'||overlay.role==='branch-right'){
                     const sign=overlay.role==='branch-left'?-1:1;
                     other.setScale(.7,1.1,.7);
                     other.setRotation(0,0,sign*.56);
                     other.setLocation(sign*.38,.3,0);
                     other.setAllColor(140,181,125,255);
                   }else if(overlay.role==='mirror-frame'){
                     other.setScale(1.45,1.8,1.45);
                     other.setAllColor(218,231,242,230);
                   }else if(overlay.role==='counter-orbit'){
                     other.setScale(1.95,1.95,1.95);
                     other.setAllColor(149,210,255,255);
                   }
                   extras.push({handle:other,role:overlay.role});
                 }catch(error){if(active)setStatus('附加特效無法播放：'+String(error?.message||error));}
               },(message,url)=>{if(active)setStatus('附加 Effekseer 素材載入失敗：'+String(message||url));});
             }
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
            // Move the actual licensed Effekseer effect handle, not a decorative SVG.
            // These fixed transforms never emit particles or alter the authored package.
            const tuning=effect.tuning;
            if(playingHandle&&tuning?.motion){
              const base=tuning.scale||1;
              const phase=elapsed/4.8;
              switch(tuning.motion){
                case 'collapse': {
                  const size=base*Math.pow(Math.max(0,1-phase),2);
                  playingHandle.setScale(size,size,size);break;
                }
                case 'pulse': {
                  const size=base*(1+.21*Math.sin(elapsed*2*Math.PI*3.5));
                  playingHandle.setScale(size,size,size);break;
                }
                case 'hourglass-scale': {
                  const size=base*(1+.24*Math.sin(elapsed*2*Math.PI/2.1));
                  playingHandle.setScale(size,size,size);break;
                }
                case 'hourglass-turn':playingHandle.setRotation(0,0,elapsed*2*Math.PI/3.2);break;
                case 'hourglass-wobble':playingHandle.setRotation(0,0,.37*Math.exp(-elapsed*.9)*Math.sin(elapsed*14));break;
                case 'chaotic':{
                  const s=base*(1+.14*Math.sin(elapsed*11)+.11*Math.cos(elapsed*17));
                  playingHandle.setScale(s,s,s);playingHandle.setRotation(0,0,.31*Math.sin(elapsed*9));break;
                }
                case 'chaos-orbit':playingHandle.setRotation(0,0,elapsed*1.95);break;
                case 'revelation':{
                  const s=base*(.45+.55*Math.min(1,elapsed/.85));
                  playingHandle.setScale(s,s,s);break;
                }
                case 'sprout':{
                  const s=base*(.28+.72*Math.min(1,phase*1.8));
                  playingHandle.setScale(s,s,s);playingHandle.setLocation(0,-1.5+1.75*Math.min(1,phase*1.8),0);break;
                }
                case 'root-down':playingHandle.setLocation(0,.9-2.4*Math.min(1,phase*1.4),0);break;
                case 'root-branch-down':{
                  const grow=Math.min(1,elapsed/2.8);
                  playingHandle.setLocation(0,.6-2.3*grow,0);
                  playingHandle.setScale(base*(.35+.65*grow),base*(.35+.65*grow),base);
                  break;
                }
                case 'branch-up':{
                  const grow=Math.min(1,elapsed/2.5);
                  playingHandle.setLocation(0,-.85+2.1*grow,0);
                  playingHandle.setScale(base*(.35+.65*grow),base*(.35+.65*grow),base);
                  break;
                }
                case 'root-spread':{
                  const g=Math.min(1,elapsed/2.9);
                  playingHandle.setScale(base*(.18+.82*g),base*(.32+.68*g),base);
                  playingHandle.setLocation(0,.65-1.7*g,0);break;
                }
                case 'branch-out':{
                  const grow=Math.min(1,phase*1.7);
                  playingHandle.setScale(.28+base*grow,base*(.4+.6*grow),base);break;
                }
                case 'ore-rise':{
                  const rise=Math.min(1,phase*1.5);
                  playingHandle.setLocation(0,-2+2.7*rise,0);
                  playingHandle.setScale(base*(.38+.62*rise),base*(.38+.62*rise),base);break;
                }
                case 'dust-drift':playingHandle.setLocation(-1.15+phase*2.45,.2+Math.sin(elapsed*.8)*.38,0);break;
                case 'space-contract':{
                  const s=base*(1.35-.85*Math.min(1,phase*1.6));
                  playingHandle.setScale(s,s,s);break;
                }
                case 'mist':playingHandle.setLocation(Math.sin(elapsed*.7)*.38,Math.cos(elapsed*.43)*.23,0);break;
                case 'mist-drift':{
                  playingHandle.setLocation(-1.1+elapsed*.52,Math.sin(elapsed*.65)*.24,0);
                  playingHandle.setAllColor(207,204,221,Math.round(55+105*Math.sin(Math.min(1,phase)*Math.PI)));
                  break;
                }
                case 'clarify':{
                  const g=Math.min(1,elapsed/2.2);
                  playingHandle.setAllColor(255,255,245,Math.round(30+225*g));
                  playingHandle.setScale(base*(.7+.3*g),base*(.7+.3*g),base);
                  break;
                }
                case 'fate-converge':{
                  const r=1.6*Math.pow(Math.max(0,1-phase),1.3);
                  playingHandle.setLocation(Math.cos(elapsed*2.1)*r,Math.sin(elapsed*2.1)*r,0);
                  playingHandle.setRotation(0,0,elapsed*.45);break;
                }
                case 'radiate':{
                  const s=base*(.85+.13*Math.sin(elapsed*2.2));playingHandle.setScale(s,s,s);break;
                }
                case 'gentle':playingHandle.setRotation(0,0,.05*Math.sin(elapsed*.8));break;
                case 'facet':playingHandle.setRotation(0,0,.12*Math.sin(elapsed*.9));break;
                case 'weight':playingHandle.setLocation(0,.45-.45*Math.min(1,elapsed/.55),0);break;
                case 'reflect':playingHandle.setRotation(0,0,.06*Math.sin(elapsed*1.1));break;
                case 'result':{
                  const size=base*(.6+.4*Math.min(1,elapsed/.95));playingHandle.setScale(size,size,size);break;
                }
                default:break;
              }
              for(const {handle,role} of extras){
                if(role==='counter-orbit')handle.setRotation(0,0,-elapsed*2.3);
                else if(role==='root-left'||role==='root-right'){
                  const sign=role==='root-left'?-1:1,g=Math.min(1,elapsed/3.2);
                  handle.setLocation(sign*(.2+1.2*g),.15-1.6*g,0);
                  handle.setRotation(0,0,sign*(.27+.42*g));
                }else if(role==='dust-left'||role==='dust-right'){
                  const sign=role==='dust-left'?-1:1;
                  handle.setLocation(sign*(.5+elapsed*.19),-.2+Math.sin(elapsed*.65)*.22,0);
                }else if(role==='root-outer-left'||role==='root-outer-right'){
                  const sign=role==='root-outer-left'?-1:1,g=Math.min(1,elapsed/3.2);
                  handle.setLocation(sign*(.25+1.55*g),.2-2.4*g,0);
                  handle.setScale(.15+.9*g,.2+1.2*g,.6);
                }else if(role==='branch-outer-left'||role==='branch-outer-right'){
                  const sign=role==='branch-outer-left'?-1:1,g=Math.min(1,elapsed/2.5);
                  handle.setLocation(sign*(.3+1.45*g),-.65+2.3*g,0);
                  handle.setScale(.18+1.0*g,.3+1.3*g,.65);
                }else if(role==='branch-left'||role==='branch-right'){
                  const sign=role==='branch-left'?-1:1,g=Math.min(1,elapsed/2.6);
                  handle.setLocation(sign*(.27+1.45*g),.3+.75*g,0);
                  handle.setScale(.25+1.0*g,.3+1.0*g,.7);
                }
              }
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
export default function EffekseerStage({rune,onGlyphClick,vfxOnly=false,direction=null}){
  const reduced=useReducedMotion();
  const [replay,setReplay]=useState(0);
  const [visibleKey,setVisibleKey]=useState('');
  const word=nameOf(rune);
  const profile=runeGlyphProfile(rune);
  const key=String(rune?.rune_id??word)+'-'+word+'-'+replay;
  const effect=useMemo(()=>runeEffectFor(rune),[rune?.english_name]);
  const semanticIcon=runeIconFor(rune);
  const visualReady=reduced||!effect||visibleKey===key;
  return <div className="rune-effekseer-stage" data-source="effekseer" data-rune={word}
    data-direction={direction==='正位'?'upright':direction==='半正位'?'semi-upright':direction==='半逆位'?'semi-reversed':direction==='逆位'?'reversed':undefined}>
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
          {direction?<span className="rune-direction-stroke" aria-hidden="true">{word}</span>:null}
        </motion.button>:null}
      </AnimatePresence>
      {!vfxOnly&&visualReady&&semanticIcon?<motion.img key={'meaning-'+key} className="rune-effekseer-meaning-icon"
        src={semanticIcon} alt="" aria-hidden="true"
        initial={reduced?false:{opacity:0,scale:.8}}
        animate={reduced?{opacity:1,scale:1}:iconMotionFor(word)}
        transition={{duration:reduced?0:4.2,times:[0,.15,.78,1],ease:'easeInOut'}}/>:null}
      {!vfxOnly&&visualReady?<SemanticIllustration key={'gesture-'+key} word={word} reduced={reduced}/>:null}
      <span className="rune-effekseer-english">{rune?.english_name||''}</span>
    </div>
    <button type="button" className="rune-effekseer-replay" onClick={()=>setReplay(value=>value+1)}>重播文字與效果</button>
    <span className="rune-effekseer-source" aria-hidden="true">{rune?.group_name||''}</span>
  </div>;
}
