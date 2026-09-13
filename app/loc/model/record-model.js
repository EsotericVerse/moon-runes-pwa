const clean=value=>String(value??'').trim();

export const LOC_RECORD_SCHEMA='loc-record-v1';
export const LOC_RECORD_TYPES=Object.freeze({
  DAILY_RUNE:'daily-rune',
  DRAW:'draw',
  CONTEXT_EVENT:'context-event',
  CONTEXT_RELATION:'context-relation',
  EVOLUTION:'evolution'
});

function generatedId(prefix='record'){
  if(typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function')return `${prefix}:${crypto.randomUUID()}`;
  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

export function normalizeLocRecord(record={},defaults={}){
  const merged={...defaults,...record};
  const type=clean(merged.type||defaults.type||'record');
  return {
    ...merged,
    id:clean(merged.id)||generatedId(type),
    schema_version:clean(merged.schema_version)||LOC_RECORD_SCHEMA,
    type,
    date:clean(merged.date),
    source:clean(merged.source)||'local',
    person:clean(merged.person),
    family:clean(merged.family),
    updated_at:new Date().toISOString()
  };
}

export function normalizeDailyRuneRecord(record={}){
  const row=normalizeLocRecord(record,{type:LOC_RECORD_TYPES.DAILY_RUNE});
  return {
    ...row,
    draw_kind:clean(row.draw_kind)||'daily_draw',
    rune_id:clean(row.rune_id),
    rune:clean(row.rune),
    direction:clean(row.direction),
    note:clean(row.note),
    confidence:clean(row.confidence)||'recorded'
  };
}

export function normalizeRecordForStorage(record={}){
  const type=clean(record.type);
  const drawKind=clean(record.draw_kind);
  if(type===LOC_RECORD_TYPES.DAILY_RUNE||drawKind==='daily_draw')return normalizeDailyRuneRecord(record);
  return normalizeLocRecord(record);
}
