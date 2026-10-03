const RULE_SEPARATOR=/[、,，\n\r]+/;
const RULE_OPERATOR=/(TO|AND|NAME|NOR)/i;

export function parseRuneKeywordRuleToken(value){
  const token=String(value||'').trim();
  if(!token)return null;

  const operatorMatch=token.match(RULE_OPERATOR);
  if(!operatorMatch)return null;
  const operator=operatorMatch[1].toUpperCase();
  const at=operatorMatch.index;
  const source=token.slice(0,at).trim();
  const target=token.slice(at+operatorMatch[0].length).trim();

  if(operator==='NAME'){
    if(!source)return null;
    return {operator,source,target:'',token};
  }
  if(!source||!target)return null;
  return {operator,source,target,token};
}

export function parseRuneKeywordRuleSentence(value){
  const tokens=Array.isArray(value)?value:String(value||'').split(RULE_SEPARATOR);
  const rules=[];
  const notes=[];
  const seen=new Set();

  for(const raw of tokens){
    const token=String(raw||'').trim();
    if(!token)continue;
    const rule=parseRuneKeywordRuleToken(token);
    if(!rule){
      notes.push(token);
      continue;
    }
    const key=[rule.operator,rule.source,rule.target].join('\u0000');
    if(seen.has(key))continue;
    seen.add(key);
    rules.push(rule);
  }
  return {rules,notes};
}
