'use client';

import { useEffect } from 'react';

const SEPARATOR=/\s*[·|｜]\s*/;
const CJK=/[\u3400-\u9fff]/;

function promoteHero(hero){
  if(hero.classList.contains('loc-home')) return false;
  if(hero.dataset.titleGoverned==='1') return false;

  const eyebrow=[...hero.children].find(node=>node.classList?.contains('loc-eyebrow'));
  const heading=[...hero.children].find(node=>/^H[123]$/.test(node.tagName));
  if(!eyebrow||!heading) return false;

  const eyebrowText=eyebrow.textContent.trim();
  const parts=eyebrowText.split(SEPARATOR);
  if(parts.length>1 && CJK.test(parts.at(-1))){
    const english=parts.slice(0,-1).join(' · ').trim();
    if(english) eyebrow.textContent=english;
  }

  if(!hero.querySelector(':scope > .loc-subtitle')){
    const description=[...hero.children].find(node=>
      node.tagName==='P' &&
      node!==eyebrow &&
      !node.classList.contains('loc-eyebrow') &&
      !node.classList.contains('loc-core-line') &&
      !node.classList.contains('loc-status') &&
      !node.classList.contains('loc-note')
    );
    if(description) description.classList.add('loc-subtitle');
  }

  hero.dataset.titleGoverned='1';
  return true;
}

export default function TitleGovernance(){
  useEffect(()=>{
    const root=document.body;
    const normalize=()=>{
      root.querySelectorAll('.loc-hero').forEach(hero=>promoteHero(hero));
    };
    normalize();
    const observer=new MutationObserver(normalize);
    observer.observe(root,{childList:true,subtree:true});
    return()=>observer.disconnect();
  },[]);

  return null;
}
