export const RUNES_HOME_CONTENT = {
  relation: {
    eyebrow: 'LunaRunes · 月之符文',
    title: '月之符文與 LOC',
    subtitle: '先看重點，再閱讀完整文字說明。',
    highlights: [
      { label: '符號式語言', text: '用簡單符號與關鍵詞建立可讀的語彙入口。' },
      { label: '分類參考', text: '提供群組與關鍵詞座標，但不把分類當成唯一答案。' },
      { label: 'LOC 框架', text: '月之符文提供參考，LOC 負責承接整理、關聯與後續應用。' }
    ],
    paragraphs: [
      '月之符文是一套簡單易懂的符號式語言，提供關鍵詞與群組分類的參考，讓文字可以先被快速整理與觀察。',
      'LOC 提供中立、通用的語言處理框架；月之符文提供參考座標，但不是唯一標準。你可以直接使用這套分類，也可以依自己的需求建立自己的設定。'
    ],
    note: '月之符文提供參考，LOC 提供框架，兩者相輔相成。'
  },
  modes: {
    eyebrow: 'Basic Modes · 基本模式',
    title: '抽牌方式一次展開',
    subtitle: '每個模式先說用途，直接選擇，不用先讀一整段規則。',
    highlights: [
      { label: '單卡', text: '看一個核心焦點。', href: '/runes?mode=single#draw' },
      { label: '每日', text: '以今天為單位，作為日常的一張指示。', href: '/runes?mode=daily#draw' },
      { label: '雙卡', text: '以「因 → 果」觀察兩者關係。', href: '/runes?mode=2card#draw' },
      { label: '三卡', text: '以「源 → 轉 → 合」觀察基本結構。', href: '/runes?mode=3card#draw' },
      { label: '五卡', text: '展開過去、現在、未來與內外狀態。', href: '/runes?mode=5card#draw' },
      { label: '11 卡 OW3gs', text: '用較完整的結構觀察事件描述與核心判定。', href: '/runes?mode=ow3gs#draw' }
    ],
    paragraphs: [
      '不需要先學會全部符文。依照想觀察的範圍，直接選擇需要的卡數即可。',
      '每個模式的完整規則、位置與判讀方式，會在實際抽牌功能中展開。'
    ]
  },
  reference: {
    eyebrow: 'Reference · 分類參考',
    title: '分類是參考，不是標準答案',
    subtitle: '系統先提供共同座標，進一步分類仍保留個人設定。',
    highlights: [
      { label: '群組', text: '先用固定群組建立基本分類座標。' },
      { label: '關鍵詞', text: '用可觀察的詞彙協助找到文字分布。' },
      { label: '個人設定', text: '進一步命名、分類與解釋由使用者自行決定。' }
    ],
    paragraphs: [
      '月之符文提供預設群組與關鍵詞，協助快速找到文字分布與可能的分類方向。',
      '這些內容是參考層，不會取代使用者自己的分類、命名與解釋。'
    ]
  }
};
