// Settings Rune draw access is a two-axis policy: device origin and actual
// LunaRunes Scope authority. OAuth alone never grants record/import rights.
export function settingsRunePolicy({native=false,authenticated=false,scopeManager=false,loading=false}={}){
  const canDraw=!loading&&(Boolean(native)||Boolean(authenticated));
  const canRecord=canDraw&&Boolean(authenticated)&&Boolean(scopeManager);
  return Object.freeze({canDraw,canRecord,canImport:canRecord,canExport:canRecord});
}
