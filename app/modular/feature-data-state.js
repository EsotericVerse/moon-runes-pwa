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

import {UI_COPY} from '../i18n/ui-copy';

export function featureDataErrorMessage(error,copy=UI_COPY){
  const l=copy.uiExtra.dataErrors;
  const raw=errorText(error);
  const message=raw.toLowerCase();
  if(!message)return l.readFailed;

  const column=namedMatch(raw,[
    /column\s+["']?([^"'\s]+)["']?\s+(?:does not exist|not found)/i,
    /could not find the ['"]?([^'"]+)['"]? column/i,
    /unknown column\s+["']?([^"'\s]+)["']?/i
  ]);
  if(column)return l.columnNamed.replace('{column}',column);
  if(/column .*does not exist|could not find .* column|unknown column|42703/.test(message)){
    return l.columnUnknown;
  }

  const relation=namedMatch(raw,[
    /relation\s+["']?([^"'\s]+)["']?\s+does not exist/i,
    /table\s+["']?([^"'\s]+)["']?\s+(?:does not exist|not found)/i,
    /schema\s+["']?([^"'\s]+)["']?\s+(?:does not exist|not found)/i
  ]);
  if(relation)return l.relationNamed.replace('{relation}',relation);
  if(/relation .*does not exist|table .*does not exist|schema .*does not exist|42p01|3f000/.test(message)){
    return l.relationUnknown;
  }

  if(/pgrst123|aggregate functions? (?:are )?(?:disabled|not allowed)|db_aggregates_enabled/.test(message)){
    return l.incompatibleQuery;
  }
  if(/permission denied|insufficient privilege|not allowed|42501/.test(message)){
    return l.permissionDenied;
  }
  if(/jwt|authentication|authorization|bearer token|jwk not found|401|403/.test(message)){
    return l.authenticationFailed;
  }
  if(/timeout|statement timeout|57014/.test(message)){
    return l.timeout;
  }
  if(/fetch|network|connect|offline|502|503|504/.test(message)){
    return l.connectionFailed;
  }
  if(/invalid row shape|validation|zod|invalid response/.test(message)){
    return l.invalidFormat;
  }
  return l.queryFailed;
}

export const FEATURE_LOADING_MESSAGE='正在讀取資料中，資料量較大時可能需要一些時間。';
export const FEATURE_EMPTY_MESSAGE='目前沒有資料。';
