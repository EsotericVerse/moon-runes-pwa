// runeLibrary.js - 統一 fetch 和 cache 邏輯


import { rune } from './runes64.js';
import { allData } from './runes_all_data_all.js';

export function getRunes64() {
  return rune; // 同步返回陣列
}

export function getAllData() {
  return allData;
}


// 暴露到 window，讓其他 JS 用
window.getRunes64 = getRunes64;
window.getAllData = getAllData;
