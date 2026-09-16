import LocApp from '../loc/LocApp';
export const metadata={title:'治理｜LOC 月典'};

export default function GovernancePage(){
  return <>
    <section className="loc-view" aria-label="LOC 治理理念">
      <section className="loc-card">
        <p className="loc-eyebrow">Governance · 治理</p>
        <h2>治理</h2>
        <p className="loc-subtitle">每個文化有每個不同的治理。</p>
        <p>治理頁集中呈現與索引不同文化、系統與作者脈絡中已經存在的治理理念、規則與歷史。把內容放在這裡，是為了方便查閱與比較，不代表這些內容從屬於 Governance，也不建立新的架構層級。</p>
        <p>LOC 面對其他文化時，先辨識該文化自己的語言、脈絡、規則、歷史與治理，再保存來源、差異與演變。LOC 不以 LunaRunes 或自身 Canon 判定其他文化的對錯、有效無效或優劣；沒有既定治理時，以描述、來源與不確定性為主，不替該文化創造規則。</p>
      </section>

      <section className="loc-card">
        <p className="loc-eyebrow">LunaRunes · 月之符文</p>
        <h3>LunaRunes 治理</h3>
        <p>LunaRunes 有自己的 Canon 與固定資料邊界。現行正式定義優先於舊版顯示；歷史演變仍保留來源與版本，不因正名或修正而抹除。</p>
        <p>Base66／母資料是現行固定語彙的權威來源，公開功能與衍生分析只讀取它，不由抽牌、搜尋、Graph、統計或其他 View 反向改寫。LunaRunes 內部可依自己的 Canon 檢查術語、資料與衍生結果是否受到舊版污染。</p>
        <p>語意分析先辨識完整詞／詞組與句內角色，再依符文基本定義套用語意操作；關鍵字只產生候選，不能直接決定符文。No API、可解釋、可重複執行優先。分類是 LunaRunes 的語意投影，不是對來源文化本身的價值判斷。</p>
      </section>

      <section className="loc-card">
        <p className="loc-eyebrow">Rune Algorithm · 符文演算法</p>
        <h3>從完整詞義到符文歸屬</h3>
        <p className="loc-subtitle">符文演算法不是 Keyword Search。</p>
        <div className="loc-grid two">
          <article className="loc-context-item"><b>AND｜並列</b><p>多個符文語義在完整詞義中都成立，全部保留。</p><small>時空 → 時 + 空／風向 → 風 + 向／明火 → 明 + 火</small></article>
          <article className="loc-context-item"><b>PLUS｜增義</b><p>原有語義仍成立，完整組合再增加新的語義維度。</p><small>天時 → 時 + 緣</small></article>
          <article className="loc-context-item"><b>OVERRIDE｜專屬完整義</b><p>完整詞已形成專屬語義，不因內部字元再增加符文。</p><small>時辰／清明 → 辰；日月當空 → 明</small></article>
          <article className="loc-context-item"><b>DEFER｜延後判別</b><p>特製符文先等待完整詞義，不依字面直接歸屬。</p><small>日蝕 → 日；月蝕 → 月；日期 → 時；日月的歲月／時期義 → 辰</small></article>
        </div>
        <div className="loc-note"><strong>從例外找原則</strong><p>新案例先檢查能否由既有語意操作推出；反覆出現的判別方式提升為通則。只有通則無法推出且具有穩定完整義時，才保留少量 Governance 特殊義。禁止把分類器擴張成大型 keyword → rune Exception Dictionary。</p></div>
      </section>

      <section className="loc-card">
        <p className="loc-eyebrow">Semantic Boundaries · 語意邊界</p>
        <h3>時／辰／緣／誤</h3>
        <div className="loc-context-list">
          <article className="loc-context-item compact"><b>時</b><p>時間規則、尺度與計量；日期、幾日、幾月、多久歸時。</p></article>
          <article className="loc-context-item compact"><b>辰</b><p>節氣、時期、階段與區段；清明、節氣、時辰歸辰。</p></article>
          <article className="loc-context-item compact"><b>緣</b><p>時間、事件、條件與對象交互形成的適合時機；遲到、延誤、錯過歸緣，不是宿命式的有緣／沒緣。</p></article>
          <article className="loc-context-item compact"><b>誤</b><p>資訊、理解或判斷本身的錯誤；誤解、誤判、錯誤資料歸誤，不因「延誤」含誤字而命中。</p></article>
        </div>
      </section>

      <section className="loc-card">
        <p className="loc-eyebrow">Author Context · 作者脈絡</p>
        <h3>作者治理</h3>
        <p>作者身份、名稱、創作風格、作品版本、公開連結與合作界線屬於作者自己的治理脈絡。作者個人的思想、生活經驗與創作偏好，與 LOC 的系統治理分開保存；兩者可以互相說明來源，但不視為同一件事。</p>
        <p>名稱與定義發生變化時，保留歷史並標示現行定位；公開頁使用目前正式身份與對外資訊，不讓舊名稱或舊定義覆蓋現行資料。</p>
        <p>德之符文的 Author Governance 僅在作者 Scope 維護穩定風格詞：微月光、人生月台、斜教、OW3gs。這些詞不自動提升為公共 LunaRunes 或其他人的分類規則。</p>
      </section>

      <section className="loc-card">
        <p className="loc-eyebrow">Reading & Culture · 解牌與文化</p>
        <h3>不預測，也不建立宿命結論</h3>
        <p>一張牌代表一次 Random Event；1／2／3／5／11 張依各自牌位與組合語法建立語意，月相只作低程度時間情境修飾，不覆蓋符文本義或牌位語法。</p>
        <p>緣的位向只描述當次時機與條件狀態，不得解成「正位＝有緣、逆位＝沒緣」。其他符文亦只修飾當次狀態，不建立命定論。</p>
        <p>Rune ERA 正式節點為 14 → 24 → 32 → 42 → 66；40／64 只保留為 RC 轉換歷史。Culture 沒有預測責任，只觀察形成、延續、轉變、分化、消退、回返與擺盪。</p>
      </section>

      <section className="loc-card">
        <p className="loc-eyebrow">Open Core · 開放與延伸</p>
        <h3>使用與延伸</h3>
        <p>LOC 與 LunaRunes 的部分核心採開放與 Copyleft 思路，允許理解、研究與延伸；引用既有 LunaRunes 資料時應保留來源與標注。衍生系統可以建立自己的文化與治理，但不應把衍生定義回寫成 LunaRunes 的現行 Canon。</p>
        <p>Audit 只處理 LunaRunes 的引用與實質衍生治理，不是對所有符文體系的審批，也不代表原作者推薦、認可或背書。個人的風格定義、價值判斷與最終決定權仍歸個人。</p>
        <p>顧問判斷、架構設計、資料整理、解析介面、系統實作、個案研究與持續治理屬於專業實作範圍。</p>
      </section>
    </section>
    <LocApp/>
  </>;
}
