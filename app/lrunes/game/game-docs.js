export const GAME_DOC_SECTIONS=Object.freeze([
  ['rules','遊戲規則'],
  ['events','Event32'],
  ['roles','八職'],
  ['history','版本與歷史']
]);

export const GAME_ROLES=Object.freeze([
  {
    group:'靈魂',name:'魂者／薩滿',formalName:'魂者',publicName:'薩滿',
    focus:'承載、記錄、傾聽',mode:'介入姿態',intervention:'暫時借用',
    tool:'靈魂之書（符咒書籤）',tagline:'保存發生過的一切，使其不被抹除。'
  },
  {
    group:'連結',name:'仲裁／判官',formalName:'仲裁',publicName:'判官',
    focus:'裁斷、結案（不可逆）',mode:'限定介入',intervention:'暫時延後裁斷',
    tool:'裁斷鐮刀（整合鏈刃）',tagline:'宣告何時必須結束，且不得回頭。'
  },
  {
    group:'生命',name:'療癒／醫者',formalName:'療癒',publicName:'醫者',
    focus:'回歸基準、逆向校正',mode:'介入姿態',intervention:'暫時回歸',
    tool:'心律權杖（內嵌透鏡）',tagline:'將偏移拉回仍可修正的範圍。'
  },
  {
    group:'自然',name:'培育／德魯伊',formalName:'培育',publicName:'德魯伊',
    focus:'成長、等待、修剪',mode:'介入姿態',intervention:'暫時催化成長',
    tool:'生長長弓（近身輔助結構）',tagline:'讓時間完成它原本該完成的事。'
  },
  {
    group:'礦物',name:'盾衛／戰士',formalName:'盾衛',publicName:'戰士',
    focus:'承擔、延遲、承重',mode:'介入姿態',intervention:'暫時守護',
    tool:'地核盾錘（盾即擊器）',tagline:'站在衝擊之前，為系統爭取時間。'
  },
  {
    group:'元素',name:'元素／法師',formalName:'元素',publicName:'法師',
    focus:'導流、切換、臨界控制',mode:'介入姿態',intervention:'暫時超載',
    tool:'相位長劍（劍心晶核）',tagline:'將變數轉為可操作的能量流向。'
  },
  {
    group:'秩序',name:'策士／學者',formalName:'策士',publicName:'學者',
    focus:'校準、排除、對齊時序',mode:'限定介入',intervention:'暫時限縮變數',
    tool:'星序法杖（整合量天尺）',tagline:'確認哪些未來不成立。'
  },
  {
    group:'無序',name:'混沌／方士',formalName:'混沌',publicName:'方士',
    focus:'啟動變數（不可逆）',mode:'無態',intervention:'暫時清空定向',
    tool:'無序迴旋弩（迴旋標與弩的同源機構）',tagline:'不是製造混亂，而是拒絕定義。'
  }
]);

export const GAME_HISTORY=Object.freeze([
  'Historical LOC2／LOC SP／Semantic Playground 是早期開發名稱；Current 名稱為 LunaRunes Game。',
  'Current 回合固定為 8 回合：R1–R3 Event → R4 Resonance → R5–R7 Event → R8 Resonance。',
  'R8 結算後若平分，才進入 R9 Duel；R9 不是一般第九回合。',
  'Current De 為 0–8；到達 8 不是立即勝利，仍需完成 R8 結算。',
  'Event32 已恢復為 Alpha 事件文字牌庫；其 SL／ML／NE／OC 簡稱只保留作早期 Alpha 相容標記，不重新定義八分組。',
  '早期 v1.3 的 De16、16★、R3/R6 RP、0′ RP 等流程只保留作歷史，不屬 Current。',
  'Game 與占卜／duel 分離；Game 不反向定義 LunaRunes Canon。',
  '八職的基本語義與器物設定保留；細部玩法仍可再議。',
  '四張雙群組圖是既有 Event 視覺資產，不代表 Event 只限四類。'
]);
