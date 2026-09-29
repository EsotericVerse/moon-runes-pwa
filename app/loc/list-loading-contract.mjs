export const DEFAULT_LIST_BATCH_SIZE=10;
export const RUNE_LIST_BATCH_SIZE=16;
export const LIST_LOAD_COOLDOWN_MS=1500;

export function listBatchSize(kind='default'){
  return kind==='rune'?RUNE_LIST_BATCH_SIZE:DEFAULT_LIST_BATCH_SIZE;
}
