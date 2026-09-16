const RULESET_VERSION='canon-1.1-2026-09-15';

const SEMANTIC_RULES=[
  {id:'override-period',operation:'OVERRIDE',pattern:/時辰|清明/gu,runes:['辰'],reason:'完整詞義指向節氣、時期或階段，不拆成字面符文。'},
  {id:'override-clear-light',operation:'OVERRIDE',pattern:/日月當空/gu,runes:['明'],reason:'完整詞義形成明亮狀態，依專屬完整義判定。'},
  {id:'plus-opportunity',operation:'PLUS',pattern:/天時/gu,runes:['時','緣'],reason:'保留時間語義，並加入條件交互形成的適合時機。'},
  {id:'and-time-space',operation:'AND',pattern:/時空/gu,runes:['時','空'],reason:'時間與空間語義在完整詞中同時成立。'},
  {id:'and-direction',operation:'AND',pattern:/風向/gu,runes:['風','向'],reason:'風的元素語義與方向語義同時成立。'},
  {id:'and-clear-fire',operation:'AND',pattern:/明火/gu,runes:['明','火'],reason:'明確可見與火的元素語義同時成立。'},
  {id:'defer-sun-eclipse',operation:'DEFER',pattern:/日蝕/gu,runes:['日'],reason:'日為特製語義；完整詞確認為預料中的意外後才歸日。'},
  {id:'defer-moon-eclipse',operation:'DEFER',pattern:/月蝕/gu,runes:['月'],reason:'月為特製語義；完整詞確認為預料中的最壞後才歸月。'},
  {id:'defer-date',operation:'DEFER',pattern:/日期/gu,runes:['時'],reason:'完整詞描述時間規則或計量，不依「日」字面歸日。'},
  {id:'defer-sun-moon-period',operation:'DEFER',pattern:/日月(?=.{0,8}(?:歲月|時期|年月|長久|流逝))|(?:歲月|時期|年月)(?=.{0,8}日月)/gu,runes:['辰'],reason:'日月在歲月／時期義中表示階段，歸辰。'},
  {id:'timing-opportunity',operation:'OVERRIDE',pattern:/遲到|延誤|錯過(?:時機|機會)?/gu,runes:['緣'],reason:'描述條件與時機未相合，歸緣；不因「誤」字面歸誤。'},
  {id:'information-error',operation:'OVERRIDE',pattern:/誤解|誤判|錯誤(?:資料|資訊|理解|判斷)?/gu,runes:['誤'],reason:'資訊、理解或判斷本身發生錯誤。'},
  {id:'period-phase',operation:'OVERRIDE',pattern:/節氣|時期|階段|年代|時代/gu,runes:['辰'],reason:'描述具有區段意義的時間階段，歸辰。'},
  {id:'time-measure',operation:'OVERRIDE',pattern:/幾日|幾月|多久|日期|時間(?:尺度|計量|規則)?/gu,runes:['時'],reason:'描述時間本身、尺度或計量，歸時。'}
];

const DEFERRED_LITERALS=[
  {rune:'日',pattern:/日/gu,reason:'「日」不得僅因字面出現直接歸屬；需等待完整詞義。'},
  {rune:'月',pattern:/月/gu,reason:'「月」不得僅因字面出現直接歸屬；需等待完整詞義。'}
];

const rangesOverlap=(left,right)=>left.start<right.end&&right.start<left.end;

function matchesForRule(source,rule){
  return [...source.matchAll(rule.pattern)].map(match=>({
    rule_id:rule.id,text:match[0],start:match.index,end:match.index+match[0].length,
    operation:rule.operation,runes:[...rule.runes],reason:rule.reason
  }));
}

export function classifyRuneSemantics(text){
  const source=String(text||'');
  const decisions=[];
  for(const rule of SEMANTIC_RULES){
    for(const decision of matchesForRule(source,rule)){
      if(!decisions.some(existing=>rangesOverlap(existing,decision)))decisions.push(decision);
    }
  }
  decisions.sort((a,b)=>a.start-b.start||b.end-a.end);

  const deferred=[];
  for(const literal of DEFERRED_LITERALS){
    for(const match of source.matchAll(literal.pattern)){
      const range={start:match.index,end:match.index+match[0].length};
      if(decisions.some(decision=>rangesOverlap(decision,range)))continue;
      deferred.push({text:match[0],...range,rune:literal.rune,reason:literal.reason});
    }
  }

  return {
    analysis_mode:'lunarunes_rune_semantic_classifier',ruleset_version:RULESET_VERSION,api_used:false,source,
    decisions,deferred,runes:[...new Set(decisions.flatMap(decision=>decision.runes))],
    requires_review:deferred.length>0||decisions.length===0,
    note:decisions.length||deferred.length
      ?'結果依完整詞義與 Canon 語意操作產生；字面命中不會自行升格為符文歸屬。'
      :'目前通則不足以形成可解釋判定，保留待判，不新增逐筆例外。'
  };
}

export {RULESET_VERSION,SEMANTIC_RULES};
