// LunaRunes ERA is historical/descriptive only. RC counts are transition details, not separate eras.
export const LUNARUNES_ERAS=Object.freeze([
  {id:'P1',label:'P1.0',runeCount:14,description:'第一次正式整理：14 符。'},
  {id:'P2',label:'P2.0',runeCount:24,description:'第二次正式擴充：24 符。'},
  {id:'P3',label:'P3.0',runeCount:32,description:'第三次正式擴充：32 符。'},
  {id:'P4',label:'P4.0',runeCount:42,rcCount:40,description:'第四正式版：42 符；40 為 RC 過渡狀態。'},
  {id:'P5',label:'P5.0',runeCount:66,rcCount:64,description:'第五正式版：66 符；64 為 RC 過渡狀態。'}
]);
export const LUNARUNES_ERA_BOUNDARIES='14 → 24 → 32 → 42 → 66';
export const CULTURE_CHANGE_MODES=Object.freeze(['形成','延續','變化','分裂','淡出','回歸','擺盪']);
export function eraForRuneCount(count){const n=Number(count);return [...LUNARUNES_ERAS].reverse().find(era=>n>=era.runeCount)||null}
