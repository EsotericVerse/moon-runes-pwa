export const RUNES_HOME_CONTENT = {
  relation: {
    eyebrow: 'LunaRunes · 月之符文',
    title: '從月之符文開始',
    subtitle: '不必先背完所有符文，也不必先學會解牌；先理解它怎麼使用，再往下探索。',
    highlights: [
      { label: '66 枚符文', text: '以固定符文資料建立共同的語意座標與閱讀入口。' },
      { label: '四種方向', text: '正位、半正位、半逆位、逆位，描述同一符文在不同狀態下的表現。' },
      { label: '月相交互', text: '月相是閱讀時的時間修飾層，不取代符文本身的語意。' }
    ],
    paragraphs: [
      '月之符文（LunaRunes）是一套符號式語言。每一枚符文都有自己的基本語意、群組位置與卡片資料，可以作為閱讀文字、事件與關係的共同座標。',
      '月之符文是 LOC 的種子，但不是使用 LOC 的門檻。你可以從抽牌、符文圖鑑或脈絡開始，不需要先記住全部符文，也不需要先理解整套語言系統。'
    ],
    note: '先使用，再逐步理解；符文提供語意座標，不替使用者做唯一答案。'
  },
  modes: {
    eyebrow: 'Reading Structure · 閱讀結構',
    title: '從一張牌到 OW3gs',
    subtitle: '一張牌就是一次 Random Event；多卡模式是在位置結構中組合多次事件。',
    highlights: [
      { label: '單卡', text: '符文本義＋卡牌方向＋月相交互。', href: '/runes?mode=single#draw' },
      { label: '每日', text: '以今日為時間範圍的一張符文。', href: '/runes?mode=daily#draw' },
      { label: '雙卡', text: '因 → 果。', href: '/runes?mode=2card#draw' },
      { label: '三卡', text: '源 → 轉 → 合。', href: '/runes?mode=3card#draw' },
      { label: '五卡', text: '兩張過去成因＋一個意外變化＋兩張現在狀況。', href: '/runes?mode=5card#draw' },
      { label: '11 卡 OW3gs', text: '1–6 因的描述層＋7–11 果的判定層。', href: '/runes?mode=ow3gs#draw' }
    ],
    paragraphs: [
      '閱讀順序固定為：詞彙層 → 卡片位置層 → 治理層 → 時間修飾層。月相與時間提供低權重修飾，不覆寫符文本義。',
      '雙卡看因果；三卡看源、轉、合；五卡使用「雙卡＋單卡＋雙卡」的完整結構；OW3gs 則先以 1–6 建立事件描述，再由 7–11 進行核心判定。'
    ]
  },
  reference: {
    eyebrow: 'Semantic Reference · 語意參考',
    title: '符文不是關鍵字搜尋',
    subtitle: '分類先判斷語意角色，再決定群組與符文歸屬。',
    highlights: [
      { label: '語意優先', text: '先看詞性與句內語意角色，不以單字命中直接決定符文。' },
      { label: '唯一群組', text: '分類結果以一個主要群組為歸屬；接近的候選可標記爭議。' },
      { label: '可解釋', text: '優先使用可追溯、可說明的判斷原則，而不是累積例外字典。' }
    ],
    paragraphs: [
      '月之符文的分類順序是「詞性／句內語意角色 → 群組主體性 → 符文語意歸屬」。同一個字出現在不同脈絡中，不代表一定屬於同一枚符文。',
      '遇到真正接近的語意，可以保留爭議候選供後續治理；但系統不應把所有難以判斷的內容都丟進特殊組。'
    ],
    note: '從例外找原則，而不是為每個例外增加一條硬編碼。'
  }
};
