'use client';

const GROUP_ORDER=['靈魂','連結','生命','自然','礦物','元素','秩序','無序','特殊'];
const GROUP_META={
  靈魂:{english:'Soul',image:'/pics/01.soul.jpg',description:'由靈、魂、彩、憶、界、域、鏡、核構成，聚焦精神本源、記憶、內外界線、自我映照與核心。'},
  連結:{english:'Connection',image:'/pics/02_connection.jpg',description:'由向、斷、封、鍊、啟、分、悟、誤構成，描述方向、連結、切斷、封閉、啟動、分化、理解與誤解。'},
  生命:{english:'Life',image:'/pics/03_life.jpg',description:'由生、老、病、死、心、愛、語、韻構成，涵蓋生命歷程，以及情感、語言與韻律所形成的人類經驗。'},
  自然:{english:'Nature',image:'/pics/04_nature.jpg',description:'由樹、花、葉、草、根、種、實、枝構成，以植物生命的根、萌發、生長、展開與結果呈現自然結構。'},
  礦物:{english:'Mineral',image:'/pics/05_mineral.jpg',description:'由金、玉、晶、地、石、鑽、礦、塵構成，從地質、材質、結晶與壓力呈現物質形成與凝聚。'},
  元素:{english:'Element',image:'/pics/06_element.jpg',description:'由光、暗、水、火、風、土、雷、氣構成，呈現不同自然元素各自的性質、力量與交互作用。'},
  秩序:{english:'Order',image:'/pics/07_order.jpg',description:'由日、月、星、辰、明、時、空、因構成，描述天體、時序、空間、清晰與因果等可辨識的秩序結構。'},
  無序:{english:'Disorder',image:'/pics/08_disorder.jpg',description:'由福、禍、無、夢、幻、緣、虛、果構成，處理偶然、轉折、虛實、緣起與結果等較不穩定的變化。'},
  特殊:{english:'Special',image:'/pics/09_specia.jpg',description:'由玄與命構成的特殊組；玄對應 Chaos，命對應 Fate，作為八個常規群組之外的特殊符文。'}
};

function RuneQuickCard({card}){
  const number=String(card?.編號??'').padStart(2,'0');
  const name=String(card?.符文名稱||'').replace(/之符文$/,'');
  const definition=card?.符文說明||'';
  const archetype=card?.人格原型||'';
  return <article className="runes-library-card" data-rune-id={card?.編號}>
    <strong>{number}. <span className="runes-rune-link">&lt;{name}之符文&gt;</span> {card?.圖騰||''} {card?.英文?`(${card.英文})`:''}</strong>
    <span>{[definition,archetype].filter(Boolean).join(' ／ ')}</span>
  </article>;
}

export default function RuneAtlas({runes=[],groups=[],group='全部',setGroup}){
  const availableGroups=new Set(groups.filter(name=>name&&name!=='全部'));
  const groupNames=[...GROUP_ORDER.filter(name=>availableGroups.has(name)),...Array.from(availableGroups).filter(name=>!GROUP_ORDER.includes(name)).sort((a,b)=>String(a).localeCompare(String(b),'zh-Hant'))];
  const visibleGroups=(group==='全部'?groupNames:[group]).filter(name=>groupNames.includes(name));
  const sortedRunes=[...runes].sort((a,b)=>Number(a?.編號||0)-Number(b?.編號||0));
  return <section className="loc-card" id="library">
    <p className="loc-eyebrow">Rune Atlas · 符文圖鑑</p>
    <h2>符文圖鑑</h2>
    <div className="runes-atlas-intro">
      <img src="/pics/LunaRunes.jpg" alt="月之符文概念圖" width="128" height="128" loading="lazy" decoding="async"/>
      <p>以群組快速查找 66 枚符文。每張簡卡只保留名稱、圖騰、英文、定義與人格原型；先從下方群組分類選擇，再查看該組符文。</p>
    </div>

    <div className="runes-group-filter-head">
      <h3>群組分類</h3>
      <button type="button" className={`loc-button ${group==='全部'?'primary':''}`} onClick={()=>setGroup?.('全部')}>全部群組</button>
    </div>
    <div className="runes-group-picker">{groupNames.map(name=>{const meta=GROUP_META[name]||{english:name,image:'',description:''};return <button key={name} type="button" className={`runes-group-choice ${group===name?'active':''}`} aria-pressed={group===name} onClick={()=>setGroup?.(name)}>
      {meta.image&&<img src={meta.image} alt={`${name}組概念圖`} width="144" height="96" loading="lazy" decoding="async"/>}
      <span className="runes-group-choice-copy"><strong>{name} ({meta.english}) 組</strong><small>{meta.description}</small></span>
    </button>})}</div>

    <div className="runes-group-list">{visibleGroups.map(name=>{const meta=GROUP_META[name]||{english:name,description:''};const items=sortedRunes.filter(card=>card?.所屬分組===name);return <section className="runes-group-section" key={name} data-rune-group={name}>
      <header className="runes-group-title"><h3>{name} ({meta.english}) 組</h3><p>{meta.description}</p></header>
      <div className="runes-library-grid">{items.map(card=><RuneQuickCard card={card} key={card.編號}/>)}</div>
    </section>})}</div>
    <div className="runes-print-card"><div><strong>實體卡片印製／裁切 PDF</strong><p>這是月之符文實體卡製作用原始排版檔，不是新手教學文件。</p></div><a className="loc-button primary" href="/LunarRunesCardCut.pdf">開啟實體卡印製 PDF</a></div>
  </section>;
}
