'use client';

// Compatibility-only exports. All callers must use the existing direct DB
// readers while ISR is indefinitely suspended; this module never fetches.
export function usesNumericIsr(_scopeId){
  return false;
}

export async function readNumericIsr(){
  throw new Error('Remote numeric ISR is suspended; use the direct data provider');
}
