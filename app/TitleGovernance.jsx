'use client';

import { useEffect } from 'react';

const SEPARATOR=/\s*[·|｜]\s*/;
const CJK=/[\u3400-\u9fff]/;
const DESCRIPTION_BLOCKERS=/^(載入|最新|目前|可比對|資料符文|總數|紀錄數|主抽|補抽|第\s*\d|輸入|請先|已更新|沒有命中|只顯示|搜尋「|狀態|State\s*→)/;

function splitName(text){
  const parts=String(text||'').trim().split(SEPARATOR);
  if(parts.length<2||!CJK.test(parts.at(-1))) return null;
  const english=parts.slice(0,-1).join(' · ').trim();
  const chinese=parts.at(-1).trim();
  return english&&chinese?{english,chinese}:null;
}

function promoteDescription(container,heading){
  if(container.querySelector(':scope > .loc-subtitle')) return;
  const children=[...container.children];
  const headingIndex=children.indexOf(heading);
  if(headingIndex<0) return;
  const candidate=children.slice(headingIndex+1).find(node=>
    node.tagName==='P' &&
    !node.classList.contains('loc-subtitle') &&
    !node.classList.contains('loc-eyebrow') &&
    !node.classList.contains('loc-core-line') &&
    !node.classList.contains('loc-status') &&
    !node.classList.contains('loc-note')
  );
  if(!candidate) return;
  const text=candidate.textContent.replace(/\s+/g,' ').trim();
  if(!text||DESCRIPTION_BLOCKERS.test(text)) return;
  candidate.classList.add('loc-subtitle');
}

function governContainer(container,hero=false){
  if(container.dataset.titleGoverned==='1') return;
  const eyebrow=[...container.children].find(node=>node.classList?.contains('loc-eyebrow'));
  const heading=[...container.children].find(node=>/^H[123]$/.test(node.tagName));
  if(!eyebrow||!heading) return;

  const parsed=splitName(eyebrow.textContent);
  if(parsed){
    const keepChinese=hero || heading.textContent.trim()===parsed.chinese || parsed.chinese.includes(heading.textContent.trim());
    if(keepChinese) eyebrow.textContent=parsed.english;
  }

  promoteDescription(container,heading);
  container.dataset.titleGoverned='1';
}

export default function TitleGovernance(){
  useEffect(()=>{
    const root=document.body;
    const normalize=()=>{
      root.querySelectorAll('.loc-hero').forEach(node=>governContainer(node,true));
      root.querySelectorAll('.loc-card,.loc-panel').forEach(node=>governContainer(node,false));
    };
    normalize();
    const observer=new MutationObserver(normalize);
    observer.observe(root,{childList:true,subtree:true});
    return()=>observer.disconnect();
  },[]);

  return null;
}
