'use client';

import {useMemo} from 'react';
import {scopeHrefV2} from '../scope-registry.v2';

const ROOT_NODES=Object.freeze([
  {
    id:'loc',
    title:'月典（LOC／LunaCodex）',
    position:'模型化語言框架。',
    description:'以月為鑑，照亮你的文字。',
    angle:-90,
    href:''
  },
  {
    id:'runes',
    title:'月之符文（LunaRunes）',
    position:'符號式語言，籤詩系統。',
    description:'當你迷惘時，給你建議方向。',
    angle:30,
    href:scopeHrefV2('runes')
  },
  {
    id:'lo3rwang',
    title:'Lucas Oscar Wang 政德（lo3rwang）',
    position:'語言治理架構者。',
    description:'架構這一切的建築師。',
    angle:150,
    href:scopeHrefV2('lo3rwang')
  }
]);

const RUNE_BRANCH=Object.freeze([
  {id:'rune-soul',label:'靈魂'},
  {id:'rune-link',label:'連結'},
  {id:'rune-life',label:'生命'},
  {id:'rune-nature',label:'自然'},
  {id:'rune-mineral',label:'礦物'},
  {id:'rune-element',label:'元素'},
  {id:'rune-order',label:'秩序'},
  {id:'rune-disorder',label:'無序'},
  {id:'rune-special',label:'特殊'},
  {id:'rune-derived',label:'衍生作品'}
]);

function circlePoint(angle,radius=250,centerX=600,centerY=375){
  const rad=angle*Math.PI/180;
  return {x:centerX+Math.cos(rad)*radius,y:centerY+Math.sin(rad)*radius};
}

function branchLayout(children){
  const count=Math.max(children.length,1);
  return children.map((node,index)=>{
    const point=circlePoint(-90+(360/count)*index,245);
    return {...node,...point};
  });
}

function textAnchorFor(x){
  if(x<500)return 'end';
  if(x>700)return 'start';
  return 'middle';
}

function textXFor(x){
  if(x<500)return x-24;
  if(x>700)return x+24;
  return x;
}

export default function ContextWorkbenchV2({scopeId='loc',rows=[]}){
  const graph=useMemo(()=>{
    if(scopeId==='loc'){
      return {nodes:ROOT_NODES.map(node=>({...node,...circlePoint(node.angle)})),ring:true};
    }

    if(scopeId==='lo3rwang'){
      const periods=(Array.isArray(rows)?rows:[])
        .filter(row=>row?.context_type==='period')
        .sort((a,b)=>Number(a?.payload?.order||0)-Number(b?.payload?.order||0))
        .map(row=>({id:String(row.context_key),label:String(row.title||row.context_key)}));
      return {
        nodes:[
          {id:'lo3rwang-periods',label:'我的時期',...circlePoint(-90,0)},
          ...branchLayout(periods)
        ],
        ring:true
      };
    }

    if(scopeId==='runes'){
      return {
        nodes:[
          {id:'runes-66',label:'符文 66',...circlePoint(-90,0)},
          ...branchLayout(RUNE_BRANCH)
        ],
        ring:true
      };
    }

    return {nodes:ROOT_NODES.map(node=>({...node,...circlePoint(node.angle)})),ring:true};
  },[scopeId,rows]);

  function activate(node){
    if(!node?.href)return;
    window.location.href=node.href;
  }

  if(scopeId==='loc'){
    return <section className="loc-view context-workbench">
      <svg viewBox="0 0 1200 760" role="img" aria-label="LOC Scope 導引圖" className="context-workbench-svg">
        <circle cx="600" cy="375" r="250" fill="none" stroke="currentColor" strokeOpacity=".18" strokeWidth="2"/>
        {graph.nodes.map(node=>{
          const clickable=Boolean(node.href);
          const anchor=textAnchorFor(node.x);
          const tx=textXFor(node.x);
          const titleY=node.y+(node.y<200?42:node.y>540?-64:-18);
          return <g key={node.id}
            role={clickable?'link':undefined}
            tabIndex={clickable?0:undefined}
            onClick={()=>clickable&&activate(node)}
            onKeyDown={event=>{if(clickable&&(event.key==='Enter'||event.key===' ')){event.preventDefault();activate(node);}}}
            style={clickable?{cursor:'pointer'}:undefined}>
            <circle cx={node.x} cy={node.y} r={clickable?16:13}
              fill={clickable?'var(--loc-accent)':'var(--loc-panel-2)'}
              stroke="currentColor" strokeWidth="2"/>
            <text x={tx} y={titleY} textAnchor={anchor} fill="currentColor">
              <tspan x={tx} dy="0" fontSize="15" fontWeight="700">{node.title}</tspan>
              <tspan x={tx} dy="24" fontSize="13" fontWeight="600">{node.position}</tspan>
              <tspan x={tx} dy="21" fontSize="13">{node.description}</tspan>
            </text>
          </g>;
        })}
      </svg>
    </section>;
  }

  return <section className="loc-view context-workbench">
    <svg viewBox="0 0 1200 760" role="img" aria-label="Scope 脈絡關係圖" className="context-workbench-svg">
      <circle cx="600" cy="375" r="245" fill="none" stroke="currentColor" strokeOpacity=".18" strokeWidth="2"/>
      {graph.nodes.map((node,index)=>{
        const isCenter=index===0;
        return <g key={node.id}>
          <circle cx={node.x} cy={node.y} r={isCenter?20:13}
            fill={isCenter?'var(--loc-panel-2)':'var(--loc-accent)'}
            stroke="currentColor" strokeWidth="2"/>
          <text x={node.x} y={node.y+(isCenter?42:34)} textAnchor="middle" fontSize="14" fontWeight={isCenter?700:600} fill="currentColor">
            {node.label}
          </text>
        </g>;
      })}
    </svg>
  </section>;
}
