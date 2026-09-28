'use client';

const REFERENCE_ONLY_CONTENT_TYPES=Object.freeze(new Set(['instruction']));

export function isReferenceOnlyContentType(value){
  return REFERENCE_ONLY_CONTENT_TYPES.has(String(value||'').trim().toLowerCase());
}

export function publicContentFilters(filters=[]){
  return [
    ...(Array.isArray(filters)?filters:[]),
    {column:'content_type',operator:'neq',value:'instruction'}
  ];
}
