const RULE_SEPARATOR=/[、,，\n\r]+/;

function ruleFromToken(value){
  const token=String(value||'').trim();
  const match=token.match(/^(AND|NOR)\s*(.+)$/i);
  if(!match)return null;
  const keyword=match[2].trim();
  if(!keyword)return null;
  const operator=match[1].toUpperCase();
  return {operator,keyword,token:operator+keyword};
}

export function parseRuneKeywordRules(value){
  const tokens=Array.isArray(value)?value:String(value||'').split(RULE_SEPARATOR);
  const rules=[];
  const invalid=[];
  const seen=new Set();
  for(const raw of tokens){
    const token=String(raw||'').trim();
    if(!token)continue;
    const normalized=ruleFromToken(token);
    if(!normalized){invalid.push(token);continue;}
    const key=normalized.operator+'\u0000'+normalized.keyword;
    if(seen.has(key))continue;
    seen.add(key);
    rules.push(normalized);
  }
  return {rules,invalid};
}

export function splitRuneKeywordEntries(value){
  const tokens=Array.isArray(value)?value:String(value||'').split(RULE_SEPARATOR);
  const keywords=[];
  const rules=[];
  const seenKeywords=new Set();
  const seenRules=new Set();
  for(const raw of tokens){
    const token=String(raw||'').trim();
    if(!token)continue;
    const rule=ruleFromToken(token);
    if(rule){
      const key=rule.operator+'\u0000'+rule.keyword;
      if(!seenRules.has(key)){seenRules.add(key);rules.push(rule);}
    }else if(!seenKeywords.has(token)){
      seenKeywords.add(token);
      keywords.push(token);
    }
  }
  return {keywords,rules};
}

export function serializeRuneKeywordRules(value){
  const parsed=parseRuneKeywordRules(value);
  if(parsed.invalid.length)throw new TypeError('規則只接受 AND關鍵詞 或 NOR關鍵詞，例如 AND日、NOR月。');
  return parsed.rules.map(rule=>rule.token).join('、');
}
