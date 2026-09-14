const clean=value=>String(value??'').normalize('NFKC').trim();
const matchNorm=value=>clean(value).toLocaleLowerCase('zh-Hant').replace(/[\s\u3000]+/g,'');
const unique=values=>[...new Set(values.filter(Boolean))];

function compileOutOfDomain(pattern){
  if(!pattern)return null;
  try{return new RegExp(String(pattern),'i')}catch{return null}
}

export function applySearchGovernance(query,registry={}){
  const raw=clean(query);
  const normalized=matchNorm(raw);
  const terms=[raw];
  for(const group of registry?.concept_bridge||[]){
    const groupTerms=(group?.terms||[]).map(clean).filter(Boolean);
    if(groupTerms.some(term=>normalized.includes(matchNorm(term))))terms.push(...groupTerms);
  }
  const governedTerms=unique(terms);
  const outOfDomain=compileOutOfDomain(registry?.out_of_domain_regex)?.test(raw)||false;
  return {
    query:raw,
    terms:governedTerms,
    routingQuery:governedTerms.join(' '),
    outOfDomain
  };
}

export function firstGovernedMatch(value,terms=[]){
  const haystack=matchNorm(value);
  for(const term of terms){
    if(haystack.includes(matchNorm(term)))return term;
  }
  return '';
}

export function searchIntentBoost(query,item,registry={}){
  const normalizedQuery=matchNorm(query);
  const category=matchNorm(item?.category||'');
  let best=0;
  for(const rule of registry?.intent_boosts||[]){
    const matches=(rule?.query_terms||[]).some(term=>normalizedQuery.includes(matchNorm(term)));
    const label=matchNorm(rule?.category_contains||'');
    if(matches&&label&&category.includes(label))best=Math.max(best,Number(rule?.weight)||0);
  }
  return best;
}
