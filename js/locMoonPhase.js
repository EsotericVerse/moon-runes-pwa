/*
 * LOC1 真實月相離線判定
 * 規則來源：命運句語法圖鑑 MoonSyntax
 * 注意：這不是天文台的瞬時月相。
 *
 * 農曆日 1-7   = 新月
 * 農曆日 8-14  = 上弦
 * 農曆日 15-21 = 滿月
 * 農曆日 22-28 = 下弦
 * 農曆日 29-30 = 空亡
 */
(function (global) {
  "use strict";

  const lunarInfo = [
    0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
    0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
    0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
    0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
    0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
    0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,
    0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
    0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,
    0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
    0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,
    0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,
    0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,
    0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,
    0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,
    0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,
    0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,
    0x092e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,
    0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,
    0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,
    0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a4d0,0x0d150,0x0f252,
    0x0d520
  ];

  const leapMonth = y => lunarInfo[y - 1900] & 0xf;
  const leapDays = y => leapMonth(y) ? ((lunarInfo[y - 1900] & 0x10000) ? 30 : 29) : 0;
  const monthDays = (y, m) => (lunarInfo[y - 1900] & (0x10000 >> m)) ? 30 : 29;

  function lunarYearDays(y) {
    let sum = 348;
    for (let bit = 0x8000; bit > 0x8; bit >>= 1) {
      if (lunarInfo[y - 1900] & bit) sum++;
    }
    return sum + leapDays(y);
  }

  function solarToLunar(y, m, d) {
    y = Number(y); m = Number(m); d = Number(d);
    if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return null;
    if (y < 1900 || y > 2100 || m < 1 || m > 12) return null;
    if (y === 1900 && m === 1 && d < 31) return null;

    const test = new Date(Date.UTC(y, m - 1, d));
    if (test.getUTCFullYear() !== y || test.getUTCMonth() !== m - 1 || test.getUTCDate() !== d) return null;

    let offset = Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(1900, 0, 31)) / 86400000);
    let lunarYear = 1900;

    while (lunarYear <= 2100) {
      const yd = lunarYearDays(lunarYear);
      if (offset < yd) break;
      offset -= yd;
      lunarYear++;
    }
    if (lunarYear > 2100) return null;

    const leap = leapMonth(lunarYear);
    let lunarMonth = 1;
    let isLeap = false;

    while (lunarMonth <= 12) {
      let md;
      if (leap > 0 && lunarMonth === leap + 1 && !isLeap) {
        lunarMonth--;
        isLeap = true;
        md = leapDays(lunarYear);
      } else {
        md = monthDays(lunarYear, lunarMonth);
      }

      if (offset < md) break;
      offset -= md;

      if (isLeap && lunarMonth === leap) isLeap = false;
      lunarMonth++;
    }

    return { lYear: lunarYear, lMonth: lunarMonth, lDay: offset + 1, isLeap };
  }

  function phaseFromLunarDay(day) {
    if (day >= 1 && day <= 7) return "新月";
    if (day >= 8 && day <= 14) return "上弦";
    if (day >= 15 && day <= 21) return "滿月";
    if (day >= 22 && day <= 28) return "下弦";
    if (day >= 29 && day <= 30) return "空亡";
    return "未知";
  }

  function getDetails(date = new Date()) {
    const lunar = solarToLunar(date.getFullYear(), date.getMonth() + 1, date.getDate());
    return {
      solar: { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() },
      lunar,
      phase: lunar ? phaseFromLunarDay(lunar.lDay) : "未知"
    };
  }

  function getRealPhase(date = new Date()) {
    return getDetails(date).phase;
  }

  global.LOCMoonPhase = Object.freeze({ solarToLunar, phaseFromLunarDay, getDetails, getRealPhase });
})(window);
