'use client';

export function databaseScopeId(scope){
  return scope==='moon-runes'||scope==='lunarunes'?'lrunes':scope;
}

export async function getScopeContact(){
  return null;
}

export async function getScopeThemeDefault(){
  return null;
}

export async function updateScopeThemeDefault(){
  throw new Error('Scope Theme 不再儲存在 silver.manage；目前 Theme 為瀏覽工作階段設定。');
}
