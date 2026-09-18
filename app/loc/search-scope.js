'use client';

// Current search scope is selected by canonical hostname and collection.
// URL parameters must not redefine Scope.
export function readSearchScope(){
  return {};
}

export function partitionSegmentsByScope(segments){
  return {matched:[...(segments||[])],unknown:[],excluded:[]};
}
