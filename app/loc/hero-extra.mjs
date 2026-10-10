// The Registry stores the one-time assigned Extra Sign key.
// These copyrighted personal-IP presentations are intentionally not generic
// Scope defaults. No email or session is checked during page rendering.
const SIGN_DEFINITIONS=Object.freeze({
  codex:Object.freeze({scopeId:'loc',scopeKind:'group',label:'LOC 圓環中心實心點標誌',text:''}),
  anchor:Object.freeze({scopeId:'lo3rwang',scopeKind:'scope',label:'光之定錨點',text:'光之定錨點'}),
  moon:Object.freeze({scopeId:'lrunes',scopeKind:'scope',label:'玄韻家黃色圓點標誌',text:''})
});

export function heroExtraFor({scopeId='',scopeKind='',extraSign=''}={}){
  const key=String(extraSign||'').trim();
  const definition=SIGN_DEFINITIONS[key];
  if(!definition||definition.scopeId!==scopeId||definition.scopeKind!==scopeKind)return null;
  return {key,...definition};
}
