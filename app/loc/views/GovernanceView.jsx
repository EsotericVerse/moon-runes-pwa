export default function GovernanceView(){
  return <section className="loc-view">
    <header className="loc-hero" id="top">
      <p className="loc-eyebrow">Governance</p>
      <h1>治理</h1>
      <p className="loc-subtitle">用可解釋的原則治理分類，而不是累積例外字典</p>
      <p>LOC 治理要求分類方法說得清楚、可以重複使用，也可以在規則更新後重新分析原始資料。月之符文是 LOC 的參照實作：它展示如何以少量基本語意原則完成簡單分類，而不是要求其他語言或文化採用相同符文答案。</p>
    </header>

    <div className="loc-grid two">
      <section className="loc-card" id="principles">
        <p className="loc-eyebrow">LOC Governance</p><h2>治理方法</h2><p className="loc-subtitle">先建立判別原則，再讓演算法執行</p>
        <p className="loc-core-line">基本語意 → 完整詞義 → 判別原則 → 可解釋結果</p>
        <p><strong>關鍵字只是候選。</strong> 字面命中不能直接當成分類結果；系統必須確認完整詞／詞組中，符文的實際語意是否成立。</p>
        <p><strong>從例外找原則。</strong> 新案例先嘗試由既有原則解決；若多個案例反覆呈現同一種語意行為，就整理成可重複使用的原則，而不是把每一筆結果加入 Exception Keywords。</p>
        <p><strong>例外維持最小化。</strong> 只有無法由通則推出、且具有穩定完整義或明確 Scope 的內容，才保留為特殊治理義。</p>
        <p><strong>沒有數值語意權重。</strong> 分類靠語意成立與否、完整義與組合關係判定，不靠分數競賽決定唯一答案。</p>
        <p><strong>多個語意可以同時成立。</strong> 不為了得到唯一主符文而刪除真正存在的其他語意。</p>
      </section>

      <section className="loc-card" id="rune-algorithm">
        <p className="loc-eyebrow">Rune Algorithm</p><h2>四種基本判別</h2><p className="loc-subtitle">LunaRunes 的簡單原則式語意分類</p>
        <p><strong>AND｜並列：</strong>多個符文語意都實際存在，全部保留。時空 → 時 + 空；風向 → 風 + 向；明火 → 明 + 火。</p>
        <p><strong>PLUS｜增義：</strong>原義仍成立，完整詞再增加另一個語意維度。天時 → 時 + 緣。</p>
        <p><strong>OVERRIDE｜完整義：</strong>完整詞已形成穩定專屬義，依完整義判定，不再機械拆字。時辰 → 辰；清明 → 辰；日月當空 → 明。</p>
        <p><strong>DEFER｜延後判別：</strong>字面候選先等待完整語意。日、月是現行代表：日蝕 → 日；月蝕 → 月；日期 → 時；日月表示歲月／一段時期 → 辰。</p>
      </section>

      <section className="loc-card" id="classification">
        <p className="loc-eyebrow">Classification Flow</p><h2>實際分類流程</h2><p className="loc-subtitle">No API、可解釋、可重跑</p>
        <p className="loc-core-line">文字 → 完整詞／詞組 → 候選證據 → AND / PLUS / OVERRIDE / DEFER → 符文歸屬</p>
        <p>詞性與句內語意角色用來協助消歧；符文群組與基本定義提供語意邊界。演算法最後可以得到零枚、一枚或多枚符文，而不是先強迫文章只能落入一個群組。</p>
        <p>若上下文不足，就保留 disputed／待判定資訊；不使用虛構分數或臨時權重製造假精確。</p>
        <p>Context 應顯示判定結果與理由；Statistics 只統計經演算法確認的 semantic hits，不把中文字面出現次數直接當符文統計。</p>
      </section>

      <section className="loc-card" id="semantic-boundaries">
        <p className="loc-eyebrow">Semantic Boundaries</p><h2>語意邊界</h2><p className="loc-subtitle">完整語意高於字面命中</p>
        <p><strong>時：</strong>時間本身、時間規則、尺度、期間計量；日期、幾日、幾月、多久等依實際語意歸時。</p>
        <p><strong>辰（Phase）：</strong>時期、階段與節氣。清明、節氣、時辰、時期等依完整義歸辰。</p>
        <p><strong>緣（Karma）：</strong>時間與事件、條件、對象交互後形成的適合時機。遲到、延誤、錯過描述相合時機未成立時，可歸緣；不是宿命式的「有緣／沒緣」。</p>
        <p><strong>誤（Error）：</strong>資訊、理解或判斷本身的錯誤。誤解、誤判、錯誤資料歸誤；延誤不能因含「誤」字就歸誤。</p>
        <p><strong>日／月：</strong>日固定為日蝕語意，月固定為月蝕／月蝕陰暗面語意；一般字面日、月採 DEFER。</p>
        <p><strong>其他固定邊界：</strong>水 = Water；流動核心歸氣；氣 = Air；暗 = Shadow；空 = Space；無 = Blank；虛 = Void；玄 = Chaos，不回退 Mystery。</p>
      </section>

      <section className="loc-card" id="author-governance">
        <p className="loc-eyebrow">Author Governance</p><h2>德之符文</h2><p className="loc-subtitle">個人風格治理具有明確 Scope</p>
        <p>德（0）保留但不屬 66 符抽取池。它是作者治理指派，不是看到「德」字就自動分類。</p>
        <p>現行作者治理保留詞：<strong>微月光、人生月台、斜教、OW3gs</strong> → 德。</p>
        <p>Author Scope 必須成立；其他人的姓名、一般道德詞彙或無關內容不會因相同字元自動繼承德的分類。</p>
      </section>

      <section className="loc-card" id="culture-positioning">
        <p className="loc-eyebrow">Culture Scope</p><h2>文化與分類主體</h2><p className="loc-subtitle">參照實作不是普遍真理</p>
        <p>LunaRunes 可以依自己的 Canon 對文字做 LunaRunes projection，但這個結果不是對來源文化的正誤判決。</p>
        <p>其他語言、文化、作者或符號系統可以建立自己的基本語意、組合原則與特殊治理；不需要照搬 LunaRunes 的 66 符分類。</p>
        <p>對自身作品的治理權，不延伸為對其他人的思想、文化或獨立符文體系的治理權。</p>
      </section>

      <section className="loc-card" id="era">
        <p className="loc-eyebrow">ERA & Culture</p><h2>時期與歷史觀察</h2><p className="loc-subtitle">先分類，再比較不同時期</p>
        <p>Rune ERA 正式節點為 <strong>14 → 24 → 32 → 42 → 66</strong>；40 與 64 保留為 RC／轉換歷史，不另立正式 ERA。</p>
        <p>Culture 觀察形成、延續、轉變、分化、消退、回返與擺盪。它描述歷史資料，不負責預測未來。</p>
        <p className="loc-core-line">Corpus → Rune Algorithm → Semantic Hits → ERA → Statistics → Culture</p>
        <p>因此規則更新後可以重新掃描同一份 corpus，比較新舊 ERA 的符文與群組差異；原始資料本身保持不變。</p>
      </section>

      <section className="loc-card" id="neutrality">
        <p className="loc-eyebrow">Neutrality</p><h2>中立與個人決定權</h2><p className="loc-subtitle">分析、價值判斷與決定分開</p>
        <p>LOC／LunaRunes 整理可觀察資料、語意、關係與歷史差異，不把分類結果變成使用者必須接受的價值結論。</p>
        <p>內容描述與價值判斷分開治理。題材具有黑暗、暴力、爭議或其他敏感描述，不構成修改其實際語意的理由。</p>
        <p>抽牌與解讀同樣只提供語意與情境參考；位向不建立宿命結論，最後選擇仍由使用者決定。</p>
      </section>

      <section className="loc-card" id="copyleft">
        <p className="loc-eyebrow">Copyleft & Audit</p><h2>開放參考與衍生治理</h2><p className="loc-subtitle">開放不等於放棄作者權益</p>
        <p>任何人都可以學習、參考並建立自己的符文或符號式語言；單純名稱相同、個別概念相似或一般性參考，不因此自動成為 LunaRunes 衍生作品。</p>
        <p>當作品實質沿用 LunaRunes 具有辨識性的內容、資料或整體特質時，應尊重並揭示來源，依衍生治理處理。</p>
        <p><strong>Attribution ≠ Endorsement。</strong>標示原作者或通過衍生治理 Audit，不代表原作者推薦、認可或背書；背書必須另有明確授權。</p>
      </section>
    </div>
  </section>
}
