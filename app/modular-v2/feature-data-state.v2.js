export function featureDataErrorMessage(error){
  const message=String(error?.message||error||'').toLowerCase();
  if(!message)return '目前資料庫連結失敗。';
  if(/fetch|network|connect|timeout|failed|offline|503|502|504|permission|not allowed|query failed|neon|database|relation|table/.test(message)){
    return '目前資料庫連結失敗。';
  }
  return '目前資料庫連結失敗。';
}

export const FEATURE_EMPTY_MESSAGE='目前沒有資料。';
