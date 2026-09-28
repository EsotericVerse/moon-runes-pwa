'use client';

export function isReferenceOnlyResource(row){
  return row?.reference_only===true;
}

export function publicContentFilters(filters=[]){
  return [
    ...(Array.isArray(filters)?filters:[]),
    {column:'reference_only',operator:'eq',value:false}
  ];
}
