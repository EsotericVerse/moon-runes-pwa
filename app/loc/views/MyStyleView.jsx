'use client';

import { useEffect, useMemo, useState } from 'react';
import ThemeControl from '../ThemeControl';
import { localRecordStorage } from '../storage';
import { useLocalStore } from '../local-store';
import { INITIAL_MY_STYLE, INITIAL_STYLE_PROFILE, LIBRARY_RECORD_TYPE, MY_STYLE_STORAGE_KEY, STYLE_STORAGE_KEY } from '../model/style-profile';
import StyleGroupsView from './StyleGroupsView';

const UI_SETTINGS_KEY='loc-ui-settings-v1';
const DEFAULT_UI_SETTINGS={draw_response:'ritual',list_page_size:10};
const LIST_PAGE_OPTIONS=[5,10,15,20,25,50];
const STYLE_NOTE = `政德風不是固定模板，而是從長期文字中觀察出的個人語言傾向。核心特徵包括感性與理性交錯、畫面意象、短句節奏、自省探究，以及對時間、身體感與治理邊界的重視。近年的表達更偏向克制、清楚、可回看與可治理。這些描述只作為作者公開參考，不作為任何使用者必須接受的分類標準。`;

const AUTHOR_PRINCIPLES = [
  ['校準','先確認位置、尺度、語意與脈絡，再辨認偏差。校準不是把所有東西修成同一個答案，而是讓每件事回到它真正應該描述的位置。'],
  ['治理','確認權責、界線、來源、版本與後續處置。需要保留的保留，需要修正的修正，需要分流的分流；歷史可以重新理解，但不為了現行版本抹除過去。'],
  ['擺盪','光明與陰暗都可以是自己的狀態。重要的不是永遠停在同一側，而是看見自己目前的位置、理解變化，並在自己的界線內決定如何治理下一步。']
];

const AUTHOR_LINES = [
  ['價值觀的價值','先問一套價值觀在目前情境究竟產生什麼價值，而不是只問它是否符合某個唯一正確答案。'],
  ['我允許錯誤發生，只要錯的有價值。','錯誤若能帶來辨識、學習、校準或下一次更好的選擇，就不是白白發生。'],
  ['免錢的最貴。','沒有價格不等於沒有交換；時間、注意力、人情、自由、資料、依賴都可能是成本。'],
  ['我不跟你走劇本。','先拆開別人預設的問題、選項與角色，再決定自己的位置與選擇。'],
  ['你在玩話術，我在改規則。','當問題反覆發生，真正需要處理的可能不是某一句話，而是讓那句話一直有效的規則與權責。'],
  ['慈悲不是投降。','理解他人與保留自己的界線可以同時存在。'],
  ['畫出界線，界線內自我治理。','界線之外是別人的選擇、價值與人生；界線之內是自己的思想、行動、光明與陰暗。治理自己的世界，不把自己的答案強加給別人。'],
  ['我不治理別人的光暗，只治理自己在光暗之間的擺盪。','接受陰暗面不是合理化傷害，而是承認拒絕、警戒、自保與必要防衛也是自己的能力；光暗都由自己觀察與治理。'],
  ['我不是要當王，我只要系統能跑。','治理的目的不是取得最高位置，而是讓結構能運作、能修正、能留下責任與歷史。'],
  ['治理過去的已知，是為了把時間還給現在的未知，才有更充裕的未來。','整理已知，是為了降低反覆消耗現在的成本，把時間還給還沒有答案的地方。']
];

export default function MyStyleView(){
  const {value:profile}=useLocalStore(STYLE_STORAGE_KEY,INITIAL_STYLE_PROFILE);
  const {value:meta,setValue:setMeta}=useLocalStore(MY_STYLE_STORAGE_KEY,INITIAL_MY_STYLE);
  const {value:uiSettings,setValue:setUiSettings}=useLocalStore(UI_SETTINGS_KEY,DEFAULT_UI_SETTINGS);
  const [records,setRecords]=useState([]);

  useEffect(()=>{localRecordStorage.list(LIBRARY_RECORD_TYPE).then(setRecords)},[]);

  const stats=useMemo(()=>{
    const groupCounts=new Map();
    const keywordCounts=new Map();
    let classified=0;
    let fallback=0;
    for(const record of records){
      if(!record.classification)continue;
      classified+=1;
      if(record.classification.fallback)fallback+=1;
      for(const match of record.classification.matches||[]){
        if(match.id!==profile?.fallback?.id)groupCounts.set(match.name,(groupCounts.get(match.name)||0)+1);
        for(const hit of match.hits||[])keywordCounts.set(hit,(keywordCounts.get(hit)||0)+1);
      }
    }
    const groups=[...groupCounts.entries()].sort((a,b)=>b[1]-a[1]);
    const keywords=[...keywordCounts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,24);
    const totalHits=groups.reduce((sum,[,count])=>sum+count,0);
    return {classified,fallback,groups,keywords,totalHits};
  },[records,profile]);

  const drawResponse=uiSettings?.draw_response==='instant'?'instant':'ritual';
  const listPageSize=LIST_PAGE_OPTIONS.includes(Number(uiSettings?.list_page_size))?Number(uiSettings.list_page_size):10;

  return <section className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">Personal Settings · 個人設定</p>
      <h1>個人設定</h1>
      <p>顯示、抽牌反應、列表筆數、個人風格與群組規則都集中在本機設定。設定預設只存在這台瀏覽器，不因一般操作自動連線同步。</p>
    </header>

    <section className="loc-card">
      <p className="loc-eyebrow">Interface · 介面</p>
      <h2>顯示與操作</h2>
      <ThemeControl />
      <div className="loc-record-form">
        <label>抽牌反應
          <select value={drawResponse} onChange={e=>setUiSettings(current=>({...DEFAULT_UI_SETTINGS,...current,draw_response:e.target.value}))}>
            <option value="ritual">儀式等待 · 4 秒</option>
            <option value="instant">即時反應 · 0 秒</option>
          </select>
        </label>
        <label>一般列表每頁
          <select value={listPageSize} onChange={e=>setUiSettings(current=>({...DEFAULT_UI_SETTINGS,...current,list_page_size:Number(e.target.value)}))}>
            {LIST_PAGE_OPTIONS.map(value=><option key={value} value={value}>{value} 筆</option>)}
          </select>
        </label>
        <label>符文圖鑑每頁<input value="8 枚（固定）" readOnly/></label>
      </div>
      <p className="loc-note">符文圖鑑固定每頁 8 枚，不受一般列表設定影響；其他支援分頁的列表預設 10 筆，可由這裡調整。</p>
      <div className="loc-actions"><a className="loc-button" href="/library">Database · 資料庫</a><a className="loc-button" href="/classify">分類</a><a className="loc-button" href="/governance">治理</a></div>
    </section>

    <section className="loc-card">
      <p className="loc-eyebrow">Profile · 個人風格</p>
      <h2>{meta?.name||'我的風格'}</h2>
      <div className="loc-record-form">
        <label>風格名稱<input value={meta?.name||''} onChange={e=>setMeta(current=>({...current,name:e.target.value}))}/></label>
        <label>說明<input value={meta?.description||''} onChange={e=>setMeta(current=>({...current,description:e.target.value}))}/></label>
      </div>
      <p>{meta?.description||'由本機資料庫的分類結果統計形成。'} 不另建語意資料庫；Database 是來源，群組設定是規則。</p>
    </section>

    <StyleGroupsView embedded />

    <section className="loc-card" id="author-method">
      <p className="loc-eyebrow">Author Method · 作者中心理念</p>
      <h2>用自己的工具建立自己的風格</h2>
      <p><strong>政德風是 LOC 的作者範例，也是作者自己的 IP 實作。</strong> 我先用自己的文字資料建立文化設定與分類規則，再由工具持續統計關鍵詞、群組、作品與時期分布，形成可以回查、比較與更新的個人風格。</p>
      <p><strong>風格不是先寫好答案，再要求資料符合。</strong> 設定提供觀察座標，資料留下實際紀錄；當時間持續累積，就能看見風格如何形成、改變與延伸。</p>
      <p><strong>月之符文展示的是同一方法的另一套標準。</strong> 它證明 LOC 的文化定位不必只描述作者本人：分類標準可以是一個人、一套理念、一種作品風格或其他文化體系。不同標準可以使用相同模組框架，各自留下自己的文化紀錄。</p>
      <p className="loc-core-line">文化設定 → 分類與統計 → 時期比較 → 文化紀錄 → 軌跡 → Oscillation → 趨勢觀察</p>
    </section>

    <section className="loc-card" id="oscillation-governance">
      <p className="loc-eyebrow">Oscillation · Boundary · Self-Governance</p>
      <h2>光暗兩面的擺盪與治理</h2>
      <p><strong>光明與陰暗不是互相排斥的固定身分。</strong> 它們可以是同一個人在不同時間與情境下呈現的狀態。政德風關注的不是消滅其中一面，而是觀察光暗之間如何擺盪，以及這些變化如何留下可回看的軌跡。</p>
      <p><strong>治理從界線開始。</strong> 界線之外是別人的選擇、價值與人生，不由我治理；界線之內是自己的思想、行動、光明與陰暗，由自己承擔治理責任。</p>
      <p><strong>陰暗面也可以被觀察與治理。</strong> 承認拒絕、警戒、自保與必要防衛，不等於主動傷害別人。仁慈可以保留，但不必以放棄自己的界線為代價。</p>
      <p><strong>擺盪不是失去原則。</strong> 能看見自己現在位於哪一側、為什麼改變，並決定下一步，是自我治理的一部分。這套治理只指向自己，不把個人的適配結果變成要求所有人接受的規則。</p>
      <p className="loc-core-line">畫出界線 → 觀察自己 → 看見擺盪 → 自我治理 → 自己承擔</p>
    </section>

    <section className="loc-card">
      <p className="loc-eyebrow">Author Reference</p>
      <h2>政德風公開說明</h2>
      <p>{STYLE_NOTE}</p>
      <p className="loc-core-line">政德風的治理方法 = 校準 + 治理 + Oscillation</p>
      <div className="loc-grid two">
        {AUTHOR_PRINCIPLES.map(([title,copy])=><div className="loc-panel" key={title}><h2>{title}</h2><p>{copy}</p></div>)}
      </div>
    </section>

    <section className="loc-card">
      <p className="loc-eyebrow">Author Language</p>
      <h2>已確認的治理語句</h2>
      <div className="loc-link-list">
        {AUTHOR_LINES.map(([line,copy])=><div className="loc-link-card" key={line}><strong>{line}</strong><span>{copy}</span></div>)}
      </div>
      <aside className="loc-note"><small>Growth · Structure</small><p><strong>成長不是一直往上長，而是讓已形成的根、幹與枝各自有位置；該延展的延展，該修剪的修剪，讓成長變成能長久承載自己的結構。</strong></p></aside>
    </section>

    <section className="loc-card">
      <div className="loc-metrics"><div><small>Database</small><strong>{records.length}</strong></div><div><small>已分類</small><strong>{stats.classified}</strong></div><div><small>Fallback</small><strong>{stats.fallback}</strong></div></div>
      {!records.length&&<p className="loc-status">先把文字存進 Database；有資料後這裡才會形成你的風格分布。</p>}
    </section>

    <section className="loc-card">
      <p className="loc-eyebrow">Group Distribution</p>
      <h2>風格群組分布</h2>
      <div className="loc-style-bars">{stats.groups.map(([name,count])=>{const percent=stats.totalHits?Math.round(count/stats.totalHits*100):0;return <div key={name}><div><strong>{name}</strong><span>{count} · {percent}%</span></div><progress value={count} max={Math.max(stats.totalHits,1)}/></div>})}</div>
      {!stats.groups.length&&<p className="loc-status">目前沒有非 fallback 的群組命中。</p>}
    </section>

    <section className="loc-card">
      <p className="loc-eyebrow">Keyword Evidence</p>
      <h2>常見命中關鍵詞</h2>
      <div className="loc-chip-list">{stats.keywords.map(([term,count])=><span key={term}>{term} · {count}</span>)}</div>
      {!stats.keywords.length&&<p className="loc-status">尚無關鍵詞統計。</p>}
    </section>
  </section>;
}
