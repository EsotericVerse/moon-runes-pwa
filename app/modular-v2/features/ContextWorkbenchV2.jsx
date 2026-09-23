'use client';

import {useMemo,useState} from 'react';

const ROOT_NODES=Object.freeze([
  {id:'loc',label:'LOC',x:600,y:155},
  {id:'runes',label:'月之符文',x:350,y:500},
  {id:'lo3rwang',label:'lo3rwang',x:850,y:500}
]);

const ROOT_EDGES=Object.freeze([
  {id:'loc-runes',source:'loc',target:'runes'},
  {id:'loc-lo3rwang',source:'loc',target:'lo3rwang'}
]);

const AUTHOR_BRANCH=Object.freeze([
  {id:'author-novel',label:'個人小說'},
  {id:'author-lyrics',label:'歌詞'},
  {id:'author-mood',label:'個人心情文文字體系'}
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

function branchLayout(parent,children){
  const startX=150;
  const endX=1050;
  const gap=children.length>1?(endX-startX)/(children.length-1):0;
  return children.map((node,index)=>({...node,x:startX+gap*index,y:665,parent}));
}

function nodeBox(node){
  const width=Math.max(110,Math.min(230,String(node.label).length*16+38));
  return {width,height:44,x:node.x-width/2,y:node.y-22};
}

export default function ContextWorkbenchV2(){
  const [open,setOpen]=useState(null);

  const graph=useMemo(()=>{
    const nodes=[...ROOT_NODES];
    const edges=[...ROOT_EDGES];

    if(open==='lo3rwang'){
      const children=branchLayout('lo3rwang',AUTHOR_BRANCH);
      nodes.push(...children);
      edges.push(...children.map(node=>({id:`lo3rwang-${node.id}`,source:'lo3rwang',target:node.id})));
    }

    if(open==='runes'){
      const children=branchLayout('runes',RUNE_BRANCH);
      nodes.push(...children);
      edges.push(...children.map(node=>({id:`runes-${node.id}`,source:'runes',target:node.id})));
    }

    return {nodes,edges};
  },[open]);

  const byId=useMemo(()=>new Map(graph.nodes.map(node=>[node.id,node])),[graph.nodes]);

  function activate(id){
    if(id==='runes'||id==='lo3rwang')setOpen(current=>current===id?null:id);
  }

  return <section className="loc-view context-workbench">
    <svg viewBox="0 0 1200 760" role="img" aria-label="LOC 脈絡三合一關係圖" className="context-workbench-svg">
      <defs>
        <marker id="context-arrow" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
          <path d="M0,0 L9,4.5 L0,9 z" fill="currentColor"/>
        </marker>
      </defs>

      {graph.edges.map(edge=>{
        const source=byId.get(edge.source),target=byId.get(edge.target);
        if(!source||!target)return null;
        return <line key={edge.id} x1={source.x} y1={source.y} x2={target.x} y2={target.y}
          stroke="currentColor" strokeOpacity=".5" strokeWidth="1.8" markerEnd="url(#context-arrow)"/>;
      })}

      {graph.nodes.map(node=>{
        const box=nodeBox(node);
        const clickable=node.id==='runes'||node.id==='lo3rwang';
        const active=open===node.id;
        return <g key={node.id}
          role={clickable?'button':undefined}
          tabIndex={clickable?0:undefined}
          onClick={()=>clickable&&activate(node.id)}
          onKeyDown={event=>{if(clickable&&(event.key==='Enter'||event.key===' ')){event.preventDefault();activate(node.id);}}}
          style={clickable?{cursor:'pointer'}:undefined}>
          <rect x={box.x} y={box.y} width={box.width} height={box.height} rx="12"
            fill={active?'var(--loc-panel)':'var(--loc-panel-2)'} stroke="currentColor" strokeWidth={active?2.4:1.5}/>
          <text x={node.x} y={node.y+5} textAnchor="middle" fontSize="14" fontWeight={node.id==='loc'?700:600} fill="currentColor">
            {node.label}
          </text>
        </g>;
      })}
    </svg>
  </section>;
}
