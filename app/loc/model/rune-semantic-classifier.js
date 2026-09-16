// LunaRunes reference semantic classifier.
// Canon: keywords create candidates; semantic rules resolve them.
// No API, embeddings, fuzzy matching, numeric semantic weights, or forced unique rune.
export const RUNE_SEMANTIC_RULESET='canon-2026-09-16';
const GROUP_BY_RUNE=Object.freeze({靈:'靈魂',魂:'靈魂',彩:'靈魂',憶:'靈魂',界:'靈魂',域:'靈魂',鏡:'靈魂',核:'靈魂',向:'連結',斷:'連結',封:'連結',鍊:'連結',啟:'連結',分:'連結',悟:'連結',誤:'連結',生:'生命',老:'生命',病:'生命',死:'生命',心:'生命',愛:'生命',語:'生命',韻:'生命',樹:'自然',花:'自然',葉:'自然',草:'自然',根:'自然',種:'自然',實:'自然',枝:'自然',金:'礦物',玉:'礦物',晶:'礦物',地:'礦物',石:'礦物',鑽:'礦物',礦:'礦物',塵:'礦物',光:'元素',暗:'元素',水:'元素',火:'元素',風:'元素',土:'元素',雷:'元素',氣:'元素',日:'定序',月:'定序',星:'定序',辰:'定序',明:'定序',時:'定序',空:'定序',因:'定序',福:'無序',禍:'無序',無:'無序',夢:'無序',幻:'無序',緣:'無序',虛:'無序',果:'無序',德:'系統特別',玄:'系統特別',命:'系統特別'});
const RULES=Object.freeze([
{id:'override-sun-moon-clarity',operation:'OVERRIDE',pattern:'日月當空',runes:['明'],reason:'治理保留的完整文化義，按完整詞義歸明。'},
{id:'error-data',operation:'OVERRIDE',pattern:'錯誤資料',runes:['誤'],reason:'資訊／資料本身錯誤。'},
{id:'override-solar-term-qingming',operation:'OVERRIDE',pattern:'清明',runes:['辰'],reason:'清明作為節氣／時期完整義時歸辰。'},
{id:'override-time-phase',operation:'OVERRIDE',pattern:'時辰',runes:['辰'],reason:'完整詞表示時間區段／Phase。'},
{id:'plus-heavenly-timing',operation:'PLUS',pattern:'天時',runes:['時','緣'],reason:'時間語義保留，並增加條件交會形成適合時機的語義。'},
{id:'and-time-space',operation:'AND',pattern:'時空',runes:['時','空'],reason:'時間與空間語義同時成立。'},
{id:'and-wind-direction',operation:'AND',pattern:'風向',runes:['風','向'],reason:'風與方向語義同時成立。'},
{id:'and-bright-fire',operation:'AND',pattern:'明火',runes:['明','火'],reason:'明亮與火焰語義同時成立。'},
{id:'defer-solar-eclipse',operation:'DEFER',pattern:'日蝕',runes:['日'],reason:'日的 Canon 語義為日蝕；完整詞確認後成立。'},
{id:'defer-lunar-eclipse',operation:'DEFER',pattern:'月蝕',runes:['月'],reason:'月的 Canon 語義為月蝕／月蝕陰暗面；完整詞確認後成立。'},
{id:'defer-date',operation:'DEFER',pattern:'日期',runes:['時'],reason:'日字面不直接歸日；完整詞表示時間／日期。'},
{id:'defer-sun-moon-period',operation:'DEFER',pattern:'日月',runes:['辰'],reason:'日月作歲月／一段時期解時歸辰；特殊長詞日月當空已優先處理。'},
{id:'phase-solar-term',operation:'OVERRIDE',pattern:'節氣',runes:['辰'],reason:'節氣屬時期／Phase。'},
{id:'phase-period',operation:'OVERRIDE',pattern:'時期',runes:['辰'],reason:'時期屬時間區段／Phase。'},
{id:'phase-stage',operation:'OVERRIDE',pattern:'階段',runes:['辰'],reason:'階段屬 Phase 語義。'},
{id:'karma-late',operation:'OVERRIDE',pattern:'遲到',runes:['緣'],reason:'描述未在適合的時間條件交會。'},
{id:'karma-delay',operation:'OVERRIDE',pattern:'延誤',runes:['緣'],reason:'描述適合時機未能成立；不因含誤字歸誤。'},
{id:'karma-missed',operation:'OVERRIDE',pattern:'錯過',runes:['緣'],reason:'描述錯過適合時機／條件交會。'},
{id:'error-misunderstand',operation:'OVERRIDE',pattern:'誤解',runes:['誤'],reason:'理解本身發生錯誤。'},
{id:'error-misjudge',operation:'OVERRIDE',pattern:'誤判',runes:['誤'],reason:'判斷本身發生錯誤。'}]);
const AUTHOR_RULES=Object.freeze([['微月光','德'],['人生月台','德'],['斜教','德'],['OW3gs','德']]);
const DEFERRED_LITERAL_RUNES=new Set(['日','月','德']);
function unique(values){return [...new Set(values)]}
function groupsFor(runes){return unique(runes.map(r=>GROUP_BY_RUNE[r]).filter(Boolean))}
function occupiedByLongerRule(index,rune,matchedRules){return matchedRules.some(rule=>rule.pattern.length>1&&rule.pattern.includes(rune)&&index>=rule.index&&index<rule.index+rule.pattern.length)}
export function classifyRuneSemantics(input,{authorScope=false}={}){
 const text=String(input??'');const matchedRules=[];const occupied=[];
 for(const rule of [...RULES].sort((a,b)=>b.pattern.length-a.pattern.length)){let from=0;while(from<text.length){const index=text.indexOf(rule.pattern,from);if(index<0)break;const overlaps=occupied.some(([start,end])=>index<end&&index+rule.pattern.length>start);if(!overlaps){matchedRules.push({...rule,index});occupied.push([index,index+rule.pattern.length])}from=index+rule.pattern.length}}
 if(authorScope){for(const [pattern,rune] of AUTHOR_RULES){let from=0;while(from<text.length){const index=text.indexOf(pattern,from);if(index<0)break;matchedRules.push({id:`author-${pattern}`,operation:'OVERRIDE',pattern,runes:[rune],reason:'Author Governance 保留詞。',index});from=index+pattern.length}}}
 const semanticHits=matchedRules.flatMap(rule=>rule.runes.map(rune=>({rune,group:GROUP_BY_RUNE[rune],operation:rule.operation,pattern:rule.pattern,index:rule.index,reason:rule.reason,rule:rule.id})));
 const deferred=[];const literalCandidates=[];
 for(let index=0;index<text.length;index++){const rune=text[index];if(!GROUP_BY_RUNE[rune])continue;if(occupiedByLongerRule(index,rune,matchedRules))continue;if(DEFERRED_LITERAL_RUNES.has(rune)){deferred.push({rune,index,reason:`${rune} 為 DEFER／Scope 管理字面候選，不能只憑字元命中。`});continue}literalCandidates.push({rune,index,group:GROUP_BY_RUNE[rune],reason:'字面只建立候選；需要完整上下文確認實際語意。'})}
 const runes=unique(semanticHits.map(hit=>hit.rune));return{text,runes,groups:groupsFor(runes),semantic_hits:semanticHits,candidates:literalCandidates,deferred,disputed:deferred.length>0||literalCandidates.length>0,ruleset_version:RUNE_SEMANTIC_RULESET,api_used:false}
}
export function classifyRuneCorpus(records,{textKey='text',eraKey='era',authorScope=false}={}){const rows=[];const runeCounts=new Map();const eraCounts=new Map();for(const record of records||[]){const result=classifyRuneSemantics(record?.[textKey]??'',{authorScope});rows.push({...record,lunarunes:result});for(const hit of result.semantic_hits){runeCounts.set(hit.rune,(runeCounts.get(hit.rune)||0)+1);const era=String(record?.[eraKey]??'未分期');if(!eraCounts.has(era))eraCounts.set(era,new Map());const map=eraCounts.get(era);map.set(hit.rune,(map.get(hit.rune)||0)+1)}}return{records:rows,rune_counts:[...runeCounts.entries()].map(([rune,count])=>({rune,group:GROUP_BY_RUNE[rune],count})).sort((a,b)=>b.count-a.count||a.rune.localeCompare(b.rune,'zh-Hant')),era_counts:[...eraCounts.entries()].map(([era,map])=>({era,runes:[...map.entries()].map(([rune,count])=>({rune,group:GROUP_BY_RUNE[rune],count})).sort((a,b)=>b.count-a.count||a.rune.localeCompare(b.rune,'zh-Hant'))})),ruleset_version:RUNE_SEMANTIC_RULESET,api_used:false}}
export function getRuneSemanticRules(){return{rules:RULES,authorRules:AUTHOR_RULES,deferredLiteralRunes:[...DEFERRED_LITERAL_RUNES]}}
