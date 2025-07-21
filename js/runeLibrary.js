// runeLibrary.js - 統一 fetch 和 cache 邏輯


import { rune } from './runes64.js';

async function getData(cacheKey, url, validator) {
    const cacheTimestampKey = `${cacheKey}_timestamp`;
    const cacheDuration = 24 * 60 * 60 * 1000; // 24 小時
    const cachedData = localStorage.getItem(cacheKey);
    const cachedTimestamp = localStorage.getItem(cacheTimestampKey);
    const now = Date.now();
    let data;

    if (cachedData && cachedTimestamp && (now - parseInt(cachedTimestamp) < cacheDuration)) {
        try {
            data = JSON.parse(cachedData);
            if (validator(data)) {
                console.log(`使用快取中的 ${cacheKey} 資料`);
                return data;
            } else {
                console.warn(`快取 ${cacheKey} 資料無效，重新載入`);
            }
        } catch (error) {
            console.warn(`快取 ${cacheKey} 解析失敗，重新載入：`, error);
        }
    }

    try {
        const response = await fetch(url, { mode: 'cors' });
        if (!response.ok) throw new Error(`無法載入 ${cacheKey}.json，狀態碼：${response.status}`);
        data = await response.json();
        localStorage.setItem(cacheKey, JSON.stringify(data));
        localStorage.setItem(cacheTimestampKey, now.toString());
        console.log(`已從 URL 載入並快取 ${cacheKey} 資料`);
        return data;
    } catch (error) {
        console.error(`載入 ${cacheKey} 資料失敗：`, error);
        throw error; // 讓呼叫者處理錯誤
    }
}

import { rune } from './runes64.js';

export function getRunes64() {
  return rune; // 同步返回陣列
}

import { allData } from './runes_all_data.js';

export function getAllData() {
  return allData;
}


// 暴露到 window，讓其他 JS 用
window.getRunes64 = getRunes64;
window.getAllData = getAllData;
