'use client';

import {useEffect,useRef,useState} from 'react';
import {runeImage} from './rune-directory.mjs';

const DIRECTIONS=Object.freeze({
  '正位':{rgb:[0.24,0.65,1],broken:false},
  '半正位':{rgb:[0.48,0.74,1],broken:true},
  '半逆位':{rgb:[1,0.49,0.53],broken:true},
  '逆位':{rgb:[1,0.24,0.31],broken:false}
});
const PHASES=['','新月','上弦','滿月','下弦'];
const PHASE_ICONS=['','●','◐','○','◑'];
const FONT='900 220px "BiauKai","DFKai-SB","Noto Serif TC","PMingLiU",serif';
function chineseRune(card){
  const title=String(card?.rune_name||'').replace(/之符文$/,'').trim();
  const totem=String(card?.totem||'').trim();
  return title.length===1?title:totem.length===1?totem:title.slice(0,1)||'月';
}
function groupNumber(card){
  const id=Number(card?.rune_id);
  return id>=1&&id<=64?Math.ceil(id/8):0;
}
function shader(gl,type,source){
  const part=gl.createShader(type);
  gl.shaderSource(part,source);gl.compileShader(part);
  if(!gl.getShaderParameter(part,gl.COMPILE_STATUS)){const info=gl.getShaderInfoLog(part);gl.deleteShader(part);throw Error(info||'Shader 無法編譯');}
  return part;
}
function setup(gl,character,dir){
  const vertex=shader(gl,gl.VERTEX_SHADER,`#version 300 es
    layout(location=0) in vec2 aPos;
    out vec2 vUv;
    void main(){vUv=(aPos+1.0)*0.5;gl_Position=vec4(aPos,0.0,1.0);}
  `);
  const fragment=shader(gl,gl.FRAGMENT_SHADER,`#version 300 es
    precision highp float;
    in vec2 vUv;
    out vec4 pixel;
    uniform sampler2D uGlyph;
    uniform float uTime;
    uniform float uPulse;
    uniform float uBroken;
    uniform vec3 uHalo;
    float glyph(vec2 uv){return texture(uGlyph,uv).a;}
    void main(){
      float front=glyph(vUv);
      float side=0.0;
      for(int i=1;i<=11;i++){
        float d=float(i)/11.0;
        side=max(side,glyph(vUv+vec2(-0.026*d,0.043*d))*(0.70+0.20*d));
      }
      float around=0.0;
      vec2 d=vec2(0.008,0.009);
      around=max(around,glyph(vUv+vec2(d.x,0.0)));
      around=max(around,glyph(vUv-vec2(d.x,0.0)));
      around=max(around,glyph(vUv+vec2(0.0,d.y)));
      around=max(around,glyph(vUv-vec2(0.0,d.y)));
      around=max(around,glyph(vUv+d));
      around=max(around,glyph(vUv-d));
      around=max(around,glyph(vUv+vec2(d.x,-d.y)));
      around=max(around,glyph(vUv+vec2(-d.x,d.y)));
      float outline=max(0.0,around-front);
      float angle=atan(vUv.y-0.50,vUv.x-0.50);
      float segments=uBroken>0.5?step(-0.05,sin(angle*7.0)):1.0;
      float light=0.56+0.24*sin(uTime*1.45);
      vec3 gold=vec3(0.96,0.79,0.50);
      vec3 material=mix(vec3(0.81,0.85,0.96),gold,0.18+0.25*light);
      float emboss=clamp(0.54+0.27*(vUv.x-vUv.y)+0.14*sin(vUv.y*23.0+uTime*0.4),0.2,1.0);
      vec3 face=material*(emboss+0.23+0.20*uPulse);
      float glow=outline*segments*(0.42+0.35*light+uPulse*0.25);
      vec3 color=face*front+vec3(0.27,0.22,0.38)*side*(1.0-front)+uHalo*glow;
      float alpha=clamp(front+side*(1.0-front)+glow*0.62,0.0,1.0);
      pixel=vec4(color,alpha);
    }
  `);
  const program=gl.createProgram();
  gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
  gl.deleteShader(vertex);gl.deleteShader(fragment);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program)||'Shader 無法連結');
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(0);
  const surface=document.createElement('canvas');surface.width=512;surface.height=512;
  const ctx=surface.getContext('2d');
  if(!ctx)throw Error('Canvas 2D 不可用');
  ctx.clearRect(0,0,512,512);ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle='white';ctx.font=FONT;
  const measured=ctx.measureText(character).width;
  const factor=Math.min(1,330/Math.max(measured,1));
  ctx.save();ctx.translate(256,268);ctx.scale(factor,factor);ctx.fillText(character,0,0);ctx.restore();
  const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,surface);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.useProgram(program);
  gl.uniform1i(gl.getUniformLocation(program,'uGlyph'),0);
  gl.uniform1f(gl.getUniformLocation(program,'uBroken'),dir.broken?1:0);
  gl.uniform3fv(gl.getUniformLocation(program,'uHalo'),new Float32Array(dir.rgb));
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  return {program,buffer,texture,time:gl.getUniformLocation(program,'uTime'),pulse:gl.getUniformLocation(program,'uPulse')};
}

export default function RuneGlyph3D({card,direction='正位',quality='standard',active=false,className=''}) {
  const canvas=useRef(null);
  const pulse=useRef(0);
  const [failed,setFailed]=useState(false);
  const character=chineseRune(card);
  const number=Number(card?.rune_id);
  const group=groupNumber(card);
  const phase=Number(card?.moon_phase)||0;
  const fallback=quality==='static'||failed;
  useEffect(()=>{
    if(quality==='static')return;
    const node=canvas.current;
    if(!node)return;
    let gl,object,frame=0,disposed=false,last=0;
    try{
      gl=node.getContext('webgl2',{alpha:true,antialias:quality==='high',powerPreference:quality==='high'?'high-performance':'low-power',premultipliedAlpha:false});
      if(!gl){setFailed(true);return;}
      object=setup(gl,character,DIRECTIONS[direction]||DIRECTIONS['正位']);
      gl.viewport(0,0,node.width,node.height);
      const fps=quality==='high'?60:24;
      const paint=now=>{
        if(disposed)return;
        frame=requestAnimationFrame(paint);
        if(now-last<1000/fps)return;
        last=now;
        pulse.current=Math.max(0,pulse.current-0.052);
        gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(object.program);
        gl.uniform1f(object.time,now*0.001);
        gl.uniform1f(object.pulse,pulse.current+(active?0.17:0));
        gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      };
      frame=requestAnimationFrame(paint);
    }catch(error){console.warn('Rune WebGL fallback:',error);setFailed(true);}
    return()=>{
      disposed=true;cancelAnimationFrame(frame);
      if(gl&&object){gl.deleteTexture(object.texture);gl.deleteBuffer(object.buffer);gl.deleteProgram(object.program);}
    };
  },[character,direction,quality,active]);
  return <div className={`rune-skin-glyph ${className}`} data-rune-group={group} data-quality={fallback?'static':quality}>
    <button type="button" className="rune-skin-glyph-touch" aria-label={`觸碰${character}符文`} onClick={()=>{pulse.current=1;}}>
      <span className="rune-skin-aura" aria-hidden="true"/>
      {fallback?<img src={runeImage(card)} className="rune-skin-static-card" alt={`${character}之符文`} loading="lazy"/>:
        <canvas ref={canvas} width={320} height={320} aria-hidden="true" className="rune-skin-canvas"/>}
      {direction&&<svg className="rune-skin-position-ring" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="41" fill="none" stroke={DIRECTIONS[direction]?.rgb[2]===1?'#6cbaff':'#f57c89'} strokeWidth="1.15" strokeDasharray={DIRECTIONS[direction]?.broken?'12 8':undefined}/>
      </svg>}
      <span className="rune-skin-card-moon" title={PHASES[phase]||'卡片月相'} aria-label={PHASES[phase]||'卡片月相'}>{PHASE_ICONS[phase]||'◌'}</span>
    </button>
  </div>;
}
