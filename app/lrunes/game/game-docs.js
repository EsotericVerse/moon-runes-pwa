export const GAME_DOC_SECTIONS=Object.freeze([
  ['rules','遊戲規則'],
  ['events','Event'],
  ['roles','八職'],
  ['history','版本與歷史']
]);

export const GAME_ROLES=Object.freeze([
  {group:'靈魂',name:'魂者／薩滿',focus:'承載、記錄、傾聽',mode:'Intervention'},
  {group:'連結',name:'仲裁／判官',focus:'裁斷、結案',mode:'Restricted'},
  {group:'生命',name:'療癒／醫者',focus:'回歸基準、逆向校正',mode:'Intervention'},
  {group:'自然',name:'培育／德魯伊',focus:'成長、等待、修剪',mode:'Intervention'},
  {group:'礦物',name:'盾衛／戰士',focus:'承擔、延遲、承重',mode:'Intervention'},
  {group:'元素',name:'元素／法師',focus:'導流、切換、臨界控制',mode:'Intervention'},
  {group:'秩序',name:'策士／學者',focus:'校準、排除、對齊時序',mode:'Restricted'},
  {group:'無序',name:'混沌／方士',focus:'啟動變數',mode:'Null'}
]);

export const GAME_HISTORY=Object.freeze([
  'Historical LOC2／Semantic Playground 是本遊戲的早期來源名稱；Current 名稱為 LunaRunes Game。',
  'Current 2P Alpha：De 0–8；R1–R3 Event → R4 Resonance → R5–R7 Event → R8 Resonance；R8 才結算，同分才進 Duel。',
  'Game 與占卜／duel 分離；Game 不反向定義 LunaRunes Canon。',
  '八職與 Event 的細部規則仍可再議；現階段保留八分組對應與既有文字紀錄。',
  '四張雙群組圖是目前既有 Event 視覺資產，不代表 Event 最終只限四類。'
]);
