'use client';

import { useEffect } from 'react';

const SEPARATOR=/\s*[·|｜]\s*/;
const CJK=/[\u3400-\u9fff]/;
const ENGINEERING=/\b(?:JSON|API|Graph|registry|manifest|corpus|runtime|database|canonical|I\/O|HTTP|cache|fetch|download|payload|dataset|shard|Next\.js|IndexedDB|Render|KV|No API)\b/i;

const HERO_SUBTITLES={
  '/context':'文字、事件與關係的脈絡分析',
  '/statics':'符文、來源與每日資料的統計觀察',
  '/evolution':'治理已知、觀察文化，再決定可能',
  '/search':'搜尋文字、作品與知識，回到原始內容確認脈絡',
  '/classify':'在本機依群組規則整理文字的分類',
  '/library':'保存、整理與管理自己的文字資料',
  '/my-style':'管理顯示、抽牌反應與個人語言分類設定',
  '/game':'以符文語意建立互動情境與遊戲',
  '/governance':'分類、判斷、歷史保存與語意邊界',
  '/style-groups':'觀察文字形成的風格群組與語意傾向'
};

function splitName(text){
  const parts=String(text||'').trim().split(SEPARATOR);
  if(parts.length<2||!CJK.test(parts.at(-1))) return null;
  const english=parts.slice(0,-1).join(' · ').trim();
  const chinese=parts.at(-1).trim();
  return english&&chinese?{english,chinese}:null;
}

function normalizeHeading(container){
  const eyebrow=[...container.children].find(node=>node.classList?.contains('loc-eyebrow'));
  const heading=[...container.children].find(node=>/^H[123]$/.test(node.tagName));
  if(!eyebrow||!heading) return;
  const parsed=splitName(eyebrow.textContent);
  if(parsed && (heading.textContent.trim()===parsed.chinese || container.classList.contains('loc-hero'))){
    eyebrow.textContent=parsed.english;
  }
}

function ensureHeroSubtitle(hero){
  if(hero.querySelector(':scope > .loc-subtitle')) return;
  const path=window.location.pathname.replace(/\/$/,'')||'/';
  const text=HERO_SUBTITLES[path];
  if(!text) return;
  const heading=[...hero.children].find(node=>/^H[123]$/.test(node.tagName));
  if(!heading) return;
  const subtitle=document.createElement('p');
  subtitle.className='loc-subtitle';
  subtitle.textContent=text;
  heading.insertAdjacentElement('afterend',subtitle);
}

function cleanExistingSubtitle(subtitle){
  const text=subtitle.textContent.replace(/\s+/g,' ').trim();
  if(!text||ENGINEERING.test(text)) subtitle.classList.remove('loc-subtitle');
}

export default function TitleGovernance(){
  useEffect(()=>{
    const root=document.body;
    const normalize=()=>{
      root.querySelectorAll('.loc-hero').forEach(hero=>{
        normalizeHeading(hero);
        ensureHeroSubtitle(hero);
      });
      root.querySelectorAll('.loc-card,.loc-panel').forEach(container=>normalizeHeading(container));
      root.querySelectorAll('.loc-subtitle').forEach(cleanExistingSubtitle);
    };
    normalize();
    const observer=new MutationObserver(normalize);
    observer.observe(root,{childList:true,subtree:true});
    return()=>observer.disconnect();
  },[]);

  return null;
}
