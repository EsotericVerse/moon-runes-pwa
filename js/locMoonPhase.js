/*
 * LOC1 真實月相離線判定
 * 規則來源：命運句語法圖鑑 MoonSyntax
 *
 * 注意：
 * 1. 這不是天文台的瞬時月相。
 * 2. 農曆日期由瀏覽器內建 Intl Chinese Calendar 取得。
 * 3. LOC1 再依自己的五段規則判定真實月相。
 *
 * 農曆日 1-7   = 新月
 * 農曆日 8-14  = 上弦
 * 農曆日 15-21 = 滿月
 * 農曆日 22-28 = 下弦
 * 農曆日 29-30 = 空亡
 */
(function (global) {
  "use strict";

  function getLunarDay(date = new Date()) {
    try {
      const formatter = new Intl.DateTimeFormat("zh-TW-u-ca-chinese", {
        year: "numeric",
        month: "numeric",
        day: "numeric"
      });

      const parts = formatter.formatToParts(date);
      const dayPart = parts.find(part => part.type === "day");
      const day = Number(dayPart?.value);

      return Number.isInteger(day) && day >= 1 && day <= 30 ? day : null;
    } catch (error) {
      console.warn("LOC Moon Phase: Chinese calendar is not supported.", error);
      return null;
    }
  }

  function phaseFromLunarDay(day) {
    if (day >= 1 && day <= 7) return "新月";
    if (day >= 8 && day <= 14) return "上弦";
    if (day >= 15 && day <= 21) return "滿月";
    if (day >= 22 && day <= 28) return "下弦";
    if (day >= 29 && day <= 30) return "空亡";
    return "未知";
  }

  function getRealPhase(date = new Date()) {
    const lunarDay = getLunarDay(date);
    return lunarDay ? phaseFromLunarDay(lunarDay) : "未知";
  }

  function getDetails(date = new Date()) {
    const lunarDay = getLunarDay(date);

    return {
      solar: {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate()
      },
      lunarDay,
      phase: lunarDay ? phaseFromLunarDay(lunarDay) : "未知",
      source: "Intl.DateTimeFormat zh-TW-u-ca-chinese",
      rule: "LOC MoonSyntax"
    };
  }

  global.LOCMoonPhase = Object.freeze({
    getLunarDay,
    phaseFromLunarDay,
    getRealPhase,
    getDetails
  });
})(window);
