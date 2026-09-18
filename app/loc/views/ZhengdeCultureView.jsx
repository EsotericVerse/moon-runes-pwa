'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchLocJson, LOC_DATA } from '../data';

const CREATIVE_LINEAGE = [
  ['Suno 摸索期','像回到學生時代面對未知工具：先使用、先學習，不預設自己最後會成為什麼。順其自然不是放任，而是允許還不知道。'],
  ['節奏王者','初步掌握 Suno 後，先辨認出自己的強項不是歌唱技巧本身，而是節拍、句子落點、推進與情緒節奏。'],
  ['微月光／暗影篇章','開始把細膩情緒寫準。微月光不是強迫性的希望；暗影篇章則直接描述低潮、痛苦與陰影，因為真正經驗過，才知道微小建議應該落在哪裡。'],
  ['浪潮系列','把情緒做成潮汐與鼓動：低潮、推進、高潮、退潮。重點不是成功那一刻，而是如何借力、如何面對成功之後，以及下一個浪來時怎麼站穩。'],
  ['單身也很好／情緒權威','關係不再用「有沒有伴侶」證明完整；感情可以存在，也可以不成立，重點轉向尊重、自我位置與不預支期待。'],
  ['白晝之月','微月光經過現實校正：月亮白天仍在，只是淡到幾乎看不見。日蝕對應親近者突然離去的生離死別；月蝕對應親密關係中的背叛，兩種陰暗面分開處理。'],
  ['人生月台','人生轉換的中繼站與邊界區。允許不知道，回看過去、整理現在、做好斷捨離，等待適合的下一班車。'],
  ['自由的風','班次已進站，開始上車找位子。像自由座：方向已經打開，但位置尚未固定，對應「無／Blank／all possibilities」的任意可能。'],
  ['自由的月／治理自己','車子已經開了。現在不再只描述受過什麼，而是整理過去、解析經驗、確認邊界與責任，讓舊經驗不再替未來做決定。LOC 也因此像一份可供參考的時刻表。']
];

const TIMELINE = [
  ['感受與自省','從個人經驗、記憶與身體感受出發，以提問理解自己與世界。'],
  ['微月光','不否認黑暗，也不把希望寫成保證；以溫暖、渺小、可選擇的小建議，替需要的人留下一點辨認方向的亮度。'],
  ['浪潮推進','從承受轉向移動：借力前行，不逆浪而行。'],
  ['白晝之月','看清現實，仍願相信微光；浪漫開始受到現實校正。'],
  ['人生月台','人生轉換階段的中繼站，也是過去的自己與現在的自己交錯的邊界區；允許暫時不知道，先整理過去、辨認當下，再等待或選擇下一班車。'],
  ['順其自然','不預設結果，不預支期待；允許可能性存在，但不把願望當成事實。'],
  ['自由的風','人生月台的新班次已進站，準備上車並尋找自己的位置；方向開始打開，但位置尚未確定，像自由座一樣保留任意可能。'],
  ['自由的月','不是單純描寫自由，而是承載啟程的車子本身；人在移動中整理選擇、位置、邊界與航向，真正開始往新的未來前進。']
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

    <section className="loc-card" id="creative-lineage">
      <p className="loc-eyebrow">Creative Lineage · 創作脈絡</p>
      <h2>從摸索工具，到整理自己的時刻表</h2>
      <p>這條線描述歌曲、文字與個人風格怎麼長出來；它不取代正式 ERA 日期，而是解釋每一批作品在學習、情感與治理上的位置。</p>
      <div className="loc-list">
        {CREATIVE_LINEAGE.map(([name,summary],index)=><article key={name} className="loc-subcard"><p className="loc-result-meta"><span>{String(index+1).padStart(2,'0')}</span></p><h3>{name}</h3><p>{summary}</p></article>)}
      </div>
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
