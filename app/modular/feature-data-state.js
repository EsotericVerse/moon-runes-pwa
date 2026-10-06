function errorText(error){
  return [
    error?.message,
    error?.code,
    error?.table,
    error?.cause?.message,
    error?.cause?.code,
    error?.cause?.details,
    error?.cause?.hint,
    error?.cause?.status
  ].filter(value=>value!==undefined&&value!==null&&String(value).trim()).join(' | ');
}

function namedMatch(text,patterns){
  for(const pattern of patterns){
    const match=text.match(pattern);
    if(match?.[1])return match[1];
  }
  return '';
}

export function featureDataErrorMessage(error){
  const raw=errorText(error);
  const message=raw.toLowerCase();
  if(!message)return '目前資料讀取失敗。';

  const column=namedMatch(raw,[
    /column\s+["']?([^"'\s]+)["']?\s+(?:does not exist|not found)/i,
    /could not find the ['"]?([^'"]+)['"]? column/i,
    /unknown column\s+["']?([^"'\s]+)["']?/i
  ]);
  if(column)return `欄位「${column}」無法讀取或不存在。`;
  if(/column .*does not exist|could not find .* column|unknown column|42703/.test(message)){
    return '目前有資料欄位無法讀取或不存在。';
  }

  const relation=namedMatch(raw,[
    /relation\s+["']?([^"'\s]+)["']?\s+does not exist/i,
    /table\s+["']?([^"'\s]+)["']?\s+(?:does not exist|not found)/i,
    /schema\s+["']?([^"'\s]+)["']?\s+(?:does not exist|not found)/i
  ]);
  if(relation)return `資料表或 Schema「${relation}」無法讀取或不存在。`;
  if(/relation .*does not exist|table .*does not exist|schema .*does not exist|42p01|3f000/.test(message)){
    return '目前有資料表或 Schema 無法讀取或不存在。';
  }

  if(/pgrst123|aggregate functions? (?:are )?(?:disabled|not allowed)|db_aggregates_enabled/.test(message)){
    return '目前資料查詢功能與資料庫介面不相容。';
  }
  if(/permission denied|insufficient privilege|not allowed|42501/.test(message)){
    return '目前資料讀取權限不足。';
  }
  if(/jwt|authentication|authorization|bearer token|jwk not found|401|403/.test(message)){
    return '目前資料驗證失敗。';
  }
  if(/timeout|statement timeout|57014/.test(message)){
    return '目前資料查詢逾時。';
  }
  if(/fetch|network|connect|offline|502|503|504/.test(message)){
    return '目前資料庫連結失敗。';
  }
  if(/invalid row shape|validation|zod|invalid response/.test(message)){
    return '目前資料格式驗證失敗。';
  }
  return '目前資料查詢失敗。';
}

export const FEATURE_LOADING_MESSAGE='正在讀取資料中，資料量較大時可能需要一些時間。';
export const FEATURE_EMPTY_MESSAGE='目前沒有資料。';
