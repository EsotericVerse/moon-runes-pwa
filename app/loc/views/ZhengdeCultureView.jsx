'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchLocJson, LOC_DATA } from '../data';

const TIMELINE = [
  ['感受與自省','從個人經驗、記憶與身體感受出發，以提問理解自己與世界。'],
  ['微月光','不否認黑暗，也不把希望寫成保證；以溫暖、渺小、可選擇的小建議，替需要的人留下一點辨認方向的亮度。'],
  ['浪潮推進','從承受轉向移動：借力前行，不逆浪而行。'],
  ['白晝之月','看清現實，仍願相信微光；浪漫開始受到現實校正。'],
  ['人生月台','人生轉換階段的中繼站，也是過去的自己與現在的自己交錯的邊界區；允許暫時不知道，先整理過去、辨認當下，再等待或選擇下一班車。'],
  ['順其自然','不預設結果，不預支期待；允許可能性存在，但不把願望當成事實。'],
  ['自由的風','從離開限制走向取得行動權，開始主動選擇自己的方向。'],
  ['自由的月','自由之後進入自我治理：整理、邊界、取捨、責任、收尾與航向。']
];

export default function ZhengdeCultureView(){
  const [data,setData]=useState(null);
  const [error,setError]=useState('');

  useEffect(()=>{
    fetchLocJson(LOC_DATA.LO3RWANG_CULTURE_KEYWORDS)
      .then(setData)
      .catch(err=>setError(err.message));
  },[]);

  const keywords=useMemo(()=>Array.isArray(data?.keywords)?data.keywords:[],[data]);

  return <section className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">Zhengde Culture · 政德文化</p>
      <h1>政德文化</h1>
      <p>這裡不是單一風格說明書，而是政德的文字、歌曲、價值觀與語言治理如何隨時間形成、轉變與互相影響的文化入口。</p>
      <p className="loc-core-line">感受自己 → 理解自己 → 定義自己 → 校對現實 → 治理自己</p>
      <div className="loc-actions"><a className="loc-button primary" href="/search?c=%E6%94%BF%E5%BE%B7%E6%96%87%E5%8C%96">搜尋政德文化</a><a className="loc-button" href="/context">脈絡分析</a></div>
    </header>

    <section className="loc-card">
      <p className="loc-eyebrow">Current · 現在</p>
      <h2>{data?.current_stage?.name||'自由的月'}｜{data?.current_stage?.focus||'治理自己'}</h2>
      <p>{data?.current_stage?.summary||'自由之後，開始治理自己的選擇、邊界與航向。'}</p>
      <p><strong>政德風</strong>保留為文字與歌曲的表達風格；<strong>政德文化</strong>則是更大的時間性集合，包含風格、作品、價值觀、治理方法、意象與時期演化。</p>
    </section>

    <section className="loc-card" id="culture-evolution">
      <p className="loc-eyebrow">Evolution · 文化變化</p>
      <h2>從微光到治理自己</h2>
      <div className="loc-list">
        {TIMELINE.map(([name,summary],index)=><article key={name} className="loc-subcard"><p className="loc-result-meta"><span>{String(index+1).padStart(2,'0')}</span></p><h3>{name}</h3><p>{summary}</p></article>)}
      </div>
    </section>

    <section className="loc-card" id="culture-layers">
      <p className="loc-eyebrow">Layers · 分析層</p>
      <h2>文化歸文化，脈絡歸脈絡</h2>
      <p><strong>政德文化頁</strong>記錄長時間形成的文化狀態：時期、關鍵字、作品與價值觀演變。</p>
      <p><strong>Context／脈絡分析</strong>處理具體文本、符文、作品或概念之間的語意關係，不用文化首頁取代分析工具。</p>
      <p><strong>Search／搜尋</strong>負責把兩者接起來：搜尋政德關鍵字時，先給大意與演化大綱，再列出實際命中的歌曲、文字、治理資料與其他作品。</p>
    </section>

    <section className="loc-card" id="culture-keywords">
      <p className="loc-eyebrow">Keywords · 政德關鍵字</p>
      <h2>文化概念索引</h2>
      <p>關鍵字不是一般 Tag，而是具有時間、意義與作品證據的文化節點。點選後會進入政德文化搜尋，作品列表由現有索引即時產生。</p>
      {error&&<p className="loc-status error">{error}</p>}
      <div className="loc-list">
        {keywords.map(keyword=><article className="loc-subcard" key={keyword.id}>
          <h3><a href={`/search?c=${encodeURIComponent('政德文化')}&q=${encodeURIComponent(keyword.name)}`}>{keyword.name}</a></h3>
          <p>{keyword.summary}</p>
          {!!keyword.eras?.length&&<p className="loc-note">時期：{keyword.eras.join('／')}</p>}
          {!!keyword.related?.length&&<p className="loc-note">相關：{keyword.related.join('、')}</p>}
        </article>)}
      </div>
    </section>

    <section className="loc-card">
      <p className="loc-eyebrow">Style · 政德風</p>
      <h2>表達風格仍保留，但不再承擔全部文化內容</h2>
      <p>早期核心仍然存在：感性與理性交錯、畫面意象、短句節奏、自省探究、時間與身體記憶。後期則增加語意校正、邊界、版本、分類與治理句法。政德風的核心不在於每一篇作品最後一定要給希望，而在於先把情感與現實說準，再提供一個真的做得到的小調整。</p>
      <p>建議可以採用，也可以不採用；不把個人答案強加給別人，不用不切實際的口號代替現實。微月光因此不是「唯一的光」，而是迷失時可供參考的一點亮度。</p>
      <p className="loc-core-line">真實描述 · 細膩感受 · 有限建議 · 不過度承諾 · 選擇權留給自己</p>
    </section>
  </section>;
}
