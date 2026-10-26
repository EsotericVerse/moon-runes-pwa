// The lo3rwang Time status column is retired; other Scope and on-device
// Time schemas keep their independent column contracts.
const BASE_TIME_COLUMNS='uid,type,title,description,address,anchor_ids';

export function timeReadColumns(table){
  const relation=String(table||'').replace(/^silver\./,'');
  return relation==='lo3rwang_time'?BASE_TIME_COLUMNS:BASE_TIME_COLUMNS+',status';
}
