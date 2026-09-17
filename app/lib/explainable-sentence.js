export function composeRelationSentence({ influences = [], variable = '', outcomes = [] } = {}) {
  const cleanInfluences = influences.filter(Boolean);
  const cleanOutcomes = outcomes.filter(Boolean);

  if (cleanInfluences.length === 2 && variable && cleanOutcomes.length === 2) {
    return `在${cleanInfluences[0]}與${cleanInfluences[1]}的雙重影響下，${variable}成為主要變數，使事情可能朝${cleanOutcomes[0]}或${cleanOutcomes[1]}所代表的方向發展。`;
  }

  if (cleanInfluences.length === 2 && variable) {
    return `在${cleanInfluences[0]}與${cleanInfluences[1]}的雙重影響下，${variable}成為主要變數。`;
  }

  if (cleanInfluences.length === 2) {
    return `${cleanInfluences[0]}與${cleanInfluences[1]}形成共同影響。`;
  }

  if (cleanInfluences.length === 1) {
    return `${cleanInfluences[0]}是目前主要影響。`;
  }

  return '';
}

export function composeEvidenceSentence({ subject = '', evidence = [], conclusion = '' } = {}) {
  const cleanEvidence = evidence.filter(Boolean);
  if (!subject && !conclusion) return '';
  if (!cleanEvidence.length) return conclusion ? `${subject}${subject ? '：' : ''}${conclusion}` : subject;
  return `${subject}${subject ? '：' : ''}依據${cleanEvidence.join('、')}，${conclusion}`;
}
