// Event32 restored from the historical Alpha scenario corpus.
// Requirement signatures are preserved as Alpha compatibility metadata.
// They do not redefine the Current eight-group model.

const rows=[
  ['E01','記憶','靈魂','SL + SL','過去重新浮現。'],
  ['E02','自我懷疑','靈魂','SL + OC','你開始質疑自己的定義。'],
  ['E03','真實表達','靈魂','SL + ML','必須說出真正的想法。'],
  ['E04','內在映照','靈魂','SL + NE','環境反映出你的狀態。'],
  ['E05','誤解','連結','SL + ML','訊息產生偏差。'],
  ['E06','合作','連結','ML + ML','單獨完成變得困難。'],
  ['E07','切斷','連結','ML + OC','某條連結必須結束。'],
  ['E08','重建關係','連結','ML + NE','關係進入新階段。'],
  ['E09','疾病','生命','SL + NE','系統需要修復。'],
  ['E10','康復','生命','SL + ML','開始回到正常軌道。'],
  ['E11','愛','生命','SL + OC','接受某種無法控制的情感。'],
  ['E12','韻律','生命','SL + NE + ML','找回自己的節奏。'],
  ['E13','發芽','自然','NE + NE','成長開始。'],
  ['E14','修剪','自然','NE + ML','去除不必要部分。'],
  ['E15','等待','自然','NE + OC','時機尚未成熟。'],
  ['E16','豐收','自然','NE + ML + OC','長期累積開始回收。'],
  ['E17','建立基礎','礦物','ML + ML','穩定優先。'],
  ['E18','資源不足','礦物','ML + NE','必須重新分配。'],
  ['E19','重建','礦物','ML + OC','舊結構失效。'],
  ['E20','結晶','礦物','ML + SL + OC','經驗開始固化。'],
  ['E21','火花','元素','NE + OC','新變化出現。'],
  ['E22','風向改變','元素','NE + ML','環境開始轉向。'],
  ['E23','洪流','元素','NE + NE + OC','變化超出預期。'],
  ['E24','平衡','元素','NE + SL + ML','多種力量需要協調。'],
  ['E25','選擇','秩序','OC + ML','必須取捨。'],
  ['E26','時機','秩序','OC + NE','不是不能做，而是何時做。'],
  ['E27','規則','秩序','OC + ML + SL','建立新的邊界。'],
  ['E28','定錨','秩序','OC + OC','做出不可逆決定。'],
  ['E29','偶然','無序','OC + NE','預期外事件發生。'],
  ['E30','幻象','無序','OC + SL','真假難辨。'],
  ['E31','空窗','無序','OC + ML','沒有明顯答案。'],
  ['E32','未知來信','無序','SL + ML + NE + OC','世界要求全面回應。']
];

function compatRequirement(signature){
  return String(signature||'')
    .split('+')
    .map(value=>value.trim())
    .filter(Boolean)
    .map(value=>value==='OC'?'OD':value);
}

export const GAME_EVENTS=Object.freeze(rows.map(([id,name,group,requirement,description])=>Object.freeze({
  id,
  name,
  group,
  requirement,
  req:Object.freeze(compatRequirement(requirement)),
  description,
  desc:description,
  status:'Alpha'
})));

export const GAME_EVENT_COUNT=GAME_EVENTS.length;
